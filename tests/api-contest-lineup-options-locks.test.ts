import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, getContestDetailMvpMock, prismaMock, findTokenMasterBySlugMock, toMvpCardViewFromTokenMasterRowMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  getContestDetailMvpMock: vi.fn(),
  prismaMock: {
    ownedCardInstance: { findMany: vi.fn() },
    rosterLock: { findMany: vi.fn() },
  },
  findTokenMasterBySlugMock: vi.fn(),
  toMvpCardViewFromTokenMasterRowMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionUser: getSessionUserMock }));
vi.mock("@/lib/domain/contests/runtime", () => ({ ContestRuntimeError: class ContestRuntimeError extends Error { status = 400; }, getContestDetailMvp: getContestDetailMvpMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/domain/cards/token-master", () => ({
  findTokenMasterBySlug: findTokenMasterBySlugMock,
  toMvpCardViewFromTokenMasterRow: toMvpCardViewFromTokenMasterRowMock,
}));

import { GET } from "@/app/api/contests/[contestId]/lineup-options/route";

describe("lineup options lock derivation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue({ id: "u1" });
    getContestDetailMvpMock.mockResolvedValue({ contest: { rules: [{ cardSetId: null }] } });
    findTokenMasterBySlugMock.mockImplementation((slug: string) => ({ tokenId: `tok_${slug}`, slug, displayName: slug.toUpperCase(), symbol: slug.toUpperCase(), imageUrl: null }));
    toMvpCardViewFromTokenMasterRowMock.mockImplementation((input: any) => ({
      templateId: input.templateId,
      tokenId: input.token.tokenId,
      displayName: input.token.displayName,
      symbol: input.token.symbol,
      slug: input.token.slug,
      imageUrl: input.token.imageUrl,
      primaryChain: null,
      faction: null,
      rarity: input.rarityCode,
      edition: input.editionCode,
      plannedSupply: input.plannedSupply,
      issuedSupply: input.issuedSupply,
      remainingSupply: Math.max(input.plannedSupply - input.issuedSupply, 0),
      owned: true,
      instanceCount: 1,
      cardText: "Flavor",
      cardNumber: "S01-001",
      setCode: "GENESIS",
      setEditionLabel: "Edition 1",
    }));
  });

  it("exposes isLockedByActiveContest from active roster locks", async () => {
    prismaMock.ownedCardInstance.findMany.mockResolvedValue([
      {
        id: "i1",
        cardTemplateId: "t1",
        cardTemplate: {
          cardSetId: "s1",
          cardSet: { code: "S1", displayName: "Set 1" },
          rarity: { code: "COMMON" },
          edition: { code: "BASE" },
          tokenProject: { id: "tp1", slug: "doge", displayName: "Dogecoin" },
          name: "DOGE",
          imageUrl: null,
          plannedSupply: 100,
          issuedSupply: 20,
        },
      },
      {
        id: "i2",
        cardTemplateId: "t2",
        cardTemplate: {
          cardSetId: "s1",
          cardSet: { code: "S1", displayName: "Set 1" },
          rarity: { code: "COMMON" },
          edition: { code: "BASE" },
          tokenProject: { id: "tp2", slug: "pepe", displayName: "Pepe" },
          name: "PEPE",
          imageUrl: null,
          plannedSupply: 80,
          issuedSupply: 10,
        },
      },
    ]);
    prismaMock.rosterLock.findMany.mockResolvedValue([
      { ownedCardInstanceId: "i1", contestEntry: { contestId: "c2" } },
      { ownedCardInstanceId: "i2", contestEntry: { contestId: "c1" } },
    ]);

    const response = await GET(new Request("http://localhost") as any, { params: { contestId: "c1" } });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.options).toHaveLength(2);
    expect(payload.options[0].instanceId).toBe("i1");
    expect(payload.options[0].isLockedByActiveContest).toBe(true);
    expect(payload.options[0].cardView.displayName).toBe("DOGE");
    expect(payload.options[1].instanceId).toBe("i2");
    expect(payload.options[1].isLockedByActiveContest).toBe(false);
    expect(payload.options[1].cardView.setCode).toBe("GENESIS");
  });
});
