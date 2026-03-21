import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  resolveSessionUserMock,
  prismaMock,
  buildCollectionProjectionV2Mock,
  buildProgressionSummariesV2Mock,
  buildCanonicalCardViewOrThrowMock,
} = vi.hoisted(() => ({
  resolveSessionUserMock: vi.fn(),
  prismaMock: {
    $transaction: vi.fn(),
    user: { findUnique: vi.fn((args:any) => ({ __op: "user.findUnique", args })) },
    ownedCardInstance: { findMany: vi.fn((args:any) => ({ __op: "ownedCardInstance.findMany", args })) },
    packOpeningEvent: { count: vi.fn((args:any) => ({ __op: "packOpeningEvent.count", args })) },
  },
  buildCollectionProjectionV2Mock: vi.fn(),
  buildProgressionSummariesV2Mock: vi.fn(),
  buildCanonicalCardViewOrThrowMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ resolveSessionUser: resolveSessionUserMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/domain/projections/collection", () => ({ buildCollectionProjectionV2: buildCollectionProjectionV2Mock }));
vi.mock("@/lib/domain/progression/profile-summary", () => ({ buildProgressionSummariesV2: buildProgressionSummariesV2Mock }));
vi.mock("@/lib/domain/cards/canonical-card-builder", () => ({ buildCanonicalCardViewOrThrow: buildCanonicalCardViewOrThrowMock }));

import { GET } from "@/app/api/me/route";

const buildRequest = () => new Request("http://localhost/api/me");

describe("/api/me MVP read model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses instance-aware v2 payload and returns mvpCollection", async () => {
    resolveSessionUserMock.mockResolvedValue({ ok: true, user: { id: "u1" }, sessionId: "s1", expiresAt: new Date("2026-01-01T00:00:00.000Z") });
    prismaMock.$transaction.mockResolvedValue([
      { id: "u1", handle: "user", displayName: "User", avatarUrl: null, points: 300, packsOpened: 3 },
      [
        {
          cardTemplate: {
            id: "tpl_1",
            plannedSupply: 120,
            issuedSupply: 10,
            rarity: { code: "COMMON" },
            edition: { code: "BASE" },
            tokenProject: { slug: "dogecoin" },
          },
        },
      ],
      2,
    ]);
    buildCollectionProjectionV2Mock.mockResolvedValue({
      totalOwnedInstances: 2,
      ownedTemplateCount: 1,
      missingTemplateCount: 1249,
      completionPct: 0.08,
      byTokenId: [],
      byRarity: [],
      byEdition: [],
    });
    buildCanonicalCardViewOrThrowMock.mockReturnValue({
      templateId: "tpl_1",
      tokenId: "tok_doge",
      displayName: "Dogecoin",
      symbol: "DOGE",
      slug: "dogecoin",
      imageUrl: null,
      primaryChain: null,
      faction: null,
      rarity: "COMMON",
      edition: "BASE",
      plannedSupply: 120,
      issuedSupply: 10,
      remainingSupply: 110,
      owned: true,
      instanceCount: 1,
      cardText: "Flavor",
      cardNumber: "S01-001",
      setCode: "GENESIS",
      setEditionLabel: "Edition 1",
    });
    buildProgressionSummariesV2Mock.mockResolvedValue({
      accountProgression: { level: 1, xp: 300, levelXpFloor: 0, levelXpCeil: 100, progressPct: 0, nextMilestoneLevel: 2, pointsBalance: 300 },
      collectionProgression: { totalOwnedInstances: 2, ownedTemplateCount: 1, missingTemplateCount: 1249, completionPct: 0.08, topRarityCode: null, topEditionCode: null },
      competitiveProgression: { contestsEntered: 0, activeEntries: 0, settledEntries: 0, contestsWon: 0, bestRank: null, averageRank: null, rating: null, recentResults: [] },
    });

    const response = await GET(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.openingsCount).toBe(2);
    expect(Array.isArray(body.mvpCollection)).toBe(true);
    expect(Array.isArray(body.collection)).toBe(false);
  });

  it("fails explicitly when canonical card dependencies are missing", async () => {
    resolveSessionUserMock.mockResolvedValue({ ok: true, user: { id: "u1" }, sessionId: "s1", expiresAt: new Date("2026-01-01T00:00:00.000Z") });
    prismaMock.$transaction.mockResolvedValue([
      { id: "u1", handle: "user", displayName: "User", avatarUrl: null, points: 300, packsOpened: 3 },
      [
        {
          cardTemplate: {
            id: "tpl_1",
            plannedSupply: 120,
            issuedSupply: 10,
            rarity: { code: "COMMON" },
            edition: { code: "BASE" },
            tokenProject: undefined,
          },
        },
      ],
      2,
    ]);

    const response = await GET(buildRequest());
    expect(response.status).toBe(500);
  });

  it("returns 401 for missing session", async () => {
    resolveSessionUserMock.mockResolvedValue({ ok: false, reason: "missing_cookie" });

    const response = await GET(buildRequest());
    expect(response.status).toBe(401);
  });
});
