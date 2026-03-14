import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  computeContestScoresFromSnapshots,
  computeTokenScore,
  marketCapScoreFromChange,
  priceScoreFromChange,
  rankMultiplierFromChange,
  rankScoreFromChange,
  volumeScoreFromChange,
} from "@/lib/domain/contests/scoring-engine-runtime";

describe("contest scoring engine runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("implements bounded component scores and rank bonus", () => {
    expect(priceScoreFromChange(-1)).toBe(0);
    expect(priceScoreFromChange(0)).toBe(50);
    expect(priceScoreFromChange(0.5)).toBe(100);

    expect(volumeScoreFromChange(-1)).toBe(0);
    expect(volumeScoreFromChange(0)).toBe(50);
    expect(volumeScoreFromChange(1)).toBe(100);

    expect(marketCapScoreFromChange(-1)).toBe(0);
    expect(marketCapScoreFromChange(0)).toBe(50);
    expect(marketCapScoreFromChange(0.5)).toBe(100);

    expect(rankScoreFromChange(-1)).toBe(0);
    expect(rankScoreFromChange(0)).toBe(50);
    expect(rankScoreFromChange(0.3)).toBe(100);

    expect(rankMultiplierFromChange(-0.1)).toBe(1);
    expect(rankMultiplierFromChange(0)).toBe(1);
    expect(rankMultiplierFromChange(0.3)).toBeCloseTo(1.1, 6);
  });

  it("keeps token score bounded to 100 and centered when no movement", () => {
    const neutral = computeTokenScore({ priceChange: 0, marketCapChange: 0, volumeChange: 0, rankChange: 0 });
    expect(neutral).toBeCloseTo(50, 6);

    const upper = computeTokenScore({ priceChange: 50, marketCapChange: 50, volumeChange: 50, rankChange: 50 });
    expect(upper).toBeLessThanOrEqual(100);

    const lower = computeTokenScore({ priceChange: -50, marketCapChange: -50, volumeChange: -50, rankChange: -50 });
    expect(lower).toBeGreaterThanOrEqual(0);
  });

  it("computes token->card->user scores as sum of card scores and rebuilds ranking", async () => {
    const rankingCreates: any[] = [];
    const scoreUpserts: any[] = [];
    const breakdownCreates: any[] = [];
    const tokenScoreUpserts: any[] = [];

    const tx: any = {
      contest: { findUnique: vi.fn().mockResolvedValue({ id: "c1", status: "LOCKED" }) },
      contestTokenSnapshot: {
        findMany: vi.fn()
          .mockResolvedValueOnce([
            { tokenProjectId: "tp1", priceUsd: { toNumber: () => 10 }, marketCapUsd: { toNumber: () => 100 }, volume24hUsd: { toNumber: () => 50 }, marketCapRank: 10 },
            { tokenProjectId: "tp2", priceUsd: { toNumber: () => 20 }, marketCapUsd: { toNumber: () => 200 }, volume24hUsd: { toNumber: () => 100 }, marketCapRank: 20 },
          ])
          .mockResolvedValueOnce([
            { tokenProjectId: "tp1", priceUsd: { toNumber: () => 12 }, marketCapUsd: { toNumber: () => 130 }, volume24hUsd: { toNumber: () => 80 }, marketCapRank: 8 },
            { tokenProjectId: "tp2", priceUsd: { toNumber: () => 18 }, marketCapUsd: { toNumber: () => 180 }, volume24hUsd: { toNumber: () => 90 }, marketCapRank: 22 },
          ]),
      },
      contestTokenScore: { upsert: vi.fn(async (args: any) => { tokenScoreUpserts.push(args); return args; }) },
      contestEntry: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "e1",
            userId: "u1",
            rosterLocks: [
              { id: "l1", ownedCardInstanceId: "i1", ownedCardInstance: { cardTemplate: { tokenProjectId: "tp1", rarity: { code: "LEGENDARY" }, edition: { code: "FULL_ART" } } } },
              { id: "l2", ownedCardInstanceId: "i2", ownedCardInstance: { cardTemplate: { tokenProjectId: "tp1", rarity: { code: "LEGENDARY" }, edition: { code: "FULL_ART" } } } },
              { id: "l3", ownedCardInstanceId: "i3", ownedCardInstance: { cardTemplate: { tokenProjectId: "tp1", rarity: { code: "LEGENDARY" }, edition: { code: "FULL_ART" } } } },
              { id: "l4", ownedCardInstanceId: "i4", ownedCardInstance: { cardTemplate: { tokenProjectId: "tp1", rarity: { code: "LEGENDARY" }, edition: { code: "FULL_ART" } } } },
              { id: "l5", ownedCardInstanceId: "i5", ownedCardInstance: { cardTemplate: { tokenProjectId: "tp1", rarity: { code: "LEGENDARY" }, edition: { code: "FULL_ART" } } } },
            ],
          },
          {
            id: "e2",
            userId: "u2",
            rosterLocks: [
              { id: "l6", ownedCardInstanceId: "i6", ownedCardInstance: { cardTemplate: { tokenProjectId: "tp2", rarity: { code: "COMMON" }, edition: { code: "BASE" } } } },
              { id: "l7", ownedCardInstanceId: "i7", ownedCardInstance: { cardTemplate: { tokenProjectId: "tp2", rarity: { code: "COMMON" }, edition: { code: "BASE" } } } },
              { id: "l8", ownedCardInstanceId: "i8", ownedCardInstance: { cardTemplate: { tokenProjectId: "tp2", rarity: { code: "COMMON" }, edition: { code: "BASE" } } } },
              { id: "l9", ownedCardInstanceId: "i9", ownedCardInstance: { cardTemplate: { tokenProjectId: "tp2", rarity: { code: "COMMON" }, edition: { code: "BASE" } } } },
              { id: "l10", ownedCardInstanceId: "i10", ownedCardInstance: { cardTemplate: { tokenProjectId: "tp2", rarity: { code: "COMMON" }, edition: { code: "BASE" } } } },
            ],
          },
        ]),
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      contestEntryScoreBreakdown: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn(async (args: any) => {
          breakdownCreates.push(args);
          return args;
        }),
      },
      contestScore: {
        upsert: vi.fn(async (args: any) => {
          scoreUpserts.push(args);
          return args;
        }),
      },
      contestRanking: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn(async ({ data }: any) => {
          rankingCreates.push(...data);
          return { count: data.length };
        }),
      },
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const result = await computeContestScoresFromSnapshots("c1");

    expect(result.tokenScoresCount).toBe(2);
    expect(result.userScoresCount).toBe(2);
    expect(tokenScoreUpserts).toHaveLength(2);
    expect(breakdownCreates).toHaveLength(10);
    expect(scoreUpserts).toHaveLength(2);
    expect(rankingCreates).toHaveLength(2);

    const u1Score = scoreUpserts.find((row) => row.where.contestId_userId.userId === "u1")?.create.score;
    const u2Score = scoreUpserts.find((row) => row.where.contestId_userId.userId === "u2")?.create.score;

    expect(u1Score).toBeGreaterThan(u2Score);
    const u1Cards = breakdownCreates.filter((row) => row.data.entryId === "e1");
    const u1CardSum = u1Cards.reduce((acc, row) => acc + row.data.finalScore, 0);
    expect(u1Score).toBeCloseTo(u1CardSum, 8);

    expect(rankingCreates[0].userId).toBe("u1");
  });
});
