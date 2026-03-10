import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSessionUserMock,
  prismaMock,
  buildCollectionProjectionV2Mock,
  buildProgressionSummariesV2Mock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  prismaMock: {
    $transaction: vi.fn(),
    user: { findUnique: vi.fn((args:any) => ({ __op: "user.findUnique", args })) },
    ownedCardInstance: { findMany: vi.fn((args:any) => ({ __op: "ownedCardInstance.findMany", args })) },
    packOpeningEvent: { count: vi.fn((args:any) => ({ __op: "packOpeningEvent.count", args })) },
    userCard: { findMany: vi.fn() },
    packOpening: { count: vi.fn() },
  },
  buildCollectionProjectionV2Mock: vi.fn(),
  buildProgressionSummariesV2Mock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionUser: getSessionUserMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/domain/projections/collection", () => ({ buildCollectionProjectionV2: buildCollectionProjectionV2Mock }));
vi.mock("@/lib/domain/progression/profile-summary", () => ({ buildProgressionSummariesV2: buildProgressionSummariesV2Mock }));

import { GET } from "@/app/api/me/route";

describe("/api/me read model alignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses v2 instance-aware path when instances/events exist", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1" });
    prismaMock.$transaction.mockResolvedValue([
      { id: "u1", xUserId: "x1", xUsername: "user", displayName: "User", avatarUrl: null, authProvider: "x", points: 300, packsOpened: 3 },
      [
        { cardTemplate: { metadata: { legacy: { baseCardId: "base_dogecoin" } } } },
        { cardTemplate: { metadata: { legacy: { baseCardId: "base_dogecoin" } } } },
      ],
      2,
    ]);
    buildCollectionProjectionV2Mock.mockResolvedValue({
      totalOwnedInstances: 2,
      ownedTemplateCount: 1,
      missingTemplateCount: 1249,
      completionPct: 0.08,
      byBaseCard: [],
      byRarity: [],
      byEdition: [],
    });
    buildProgressionSummariesV2Mock.mockResolvedValue({
      accountProgression: { level: 1, xp: 300, levelXpFloor: 0, levelXpCeil: 100, progressPct: 0, nextMilestoneLevel: 2, pointsBalance: 300 },
      collectionProgression: { totalOwnedInstances: 2, ownedTemplateCount: 1, missingTemplateCount: 1249, completionPct: 0.08, topRarityCode: null, topEditionCode: null },
      competitiveProgression: { contestsEntered: 0, activeEntries: 0, settledEntries: 0, contestsWon: 0, bestRank: null, averageRank: null, rating: null, recentResults: [] },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.openingsCount).toBe(2);
    expect(body.collection[0].quantity).toBe(2);
    expect(prismaMock.userCard.findMany).not.toHaveBeenCalled();
    expect(prismaMock.packOpening.count).not.toHaveBeenCalled();
  });

  it("falls back to legacy reads for historical users with no v2 rows", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u2" });
    prismaMock.$transaction.mockResolvedValue([
      { id: "u2", xUserId: "x2", xUsername: "legacy", displayName: "Legacy", avatarUrl: null, authProvider: "x", points: 150, packsOpened: 5 },
      [],
      0,
    ]);
    prismaMock.userCard.findMany.mockResolvedValue([{ userId: "u2", baseCardId: "base_pepe", quantity: 3 }]);
    prismaMock.packOpening.count.mockResolvedValue(4);
    buildCollectionProjectionV2Mock.mockResolvedValue({
      totalOwnedInstances: 0,
      ownedTemplateCount: 0,
      missingTemplateCount: 1250,
      completionPct: 0,
      byBaseCard: [],
      byRarity: [],
      byEdition: [],
    });
    buildProgressionSummariesV2Mock.mockResolvedValue({
      accountProgression: { level: 1, xp: 150, levelXpFloor: 0, levelXpCeil: 100, progressPct: 0, nextMilestoneLevel: 2, pointsBalance: 150 },
      collectionProgression: { totalOwnedInstances: 0, ownedTemplateCount: 0, missingTemplateCount: 1250, completionPct: 0, topRarityCode: null, topEditionCode: null },
      competitiveProgression: { contestsEntered: 0, activeEntries: 0, settledEntries: 0, contestsWon: 0, bestRank: null, averageRank: null, rating: null, recentResults: [] },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.openingsCount).toBe(4);
    expect(body.collection[0].baseCardId).toBe("base_pepe");
    expect(prismaMock.userCard.findMany).toHaveBeenCalledOnce();
    expect(prismaMock.packOpening.count).toHaveBeenCalledOnce();
  });
});
