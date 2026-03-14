import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { $transaction: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { computeContestScoresFromSnapshots } from "@/lib/domain/contests/scoring-engine-runtime";

describe("scoring engine edge cases", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects scoring compute when snapshots are missing", async () => {
    const tx: any = {
      contest: { findUnique: vi.fn().mockResolvedValue({ id: "c1", status: "LIVE" }) },
      contestTokenSnapshot: {
        findMany: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
      },
    };
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await expect(computeContestScoresFromSnapshots("c1")).rejects.toThrow(/Both START and END snapshots are required/i);
  });

  it("allows compute with zero entries and leaves ranking empty", async () => {
    const tx: any = {
      contest: { findUnique: vi.fn().mockResolvedValue({ id: "c1", status: "LOCKED" }) },
      contestTokenSnapshot: {
        findMany: vi.fn()
          .mockResolvedValueOnce([{ tokenProjectId: "tp1", priceUsd: { toNumber: () => 1 }, marketCapUsd: { toNumber: () => 1 }, volume24hUsd: { toNumber: () => 1 }, marketCapRank: 1 }])
          .mockResolvedValueOnce([{ tokenProjectId: "tp1", priceUsd: { toNumber: () => 1 }, marketCapUsd: { toNumber: () => 1 }, volume24hUsd: { toNumber: () => 1 }, marketCapRank: 1 }]),
      },
      contestTokenScore: { upsert: vi.fn().mockResolvedValue({}) },
      contestEntry: {
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      contestEntryScoreBreakdown: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn(),
      },
      contestScore: { upsert: vi.fn() },
      contestRanking: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn(),
      },
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const result = await computeContestScoresFromSnapshots("c1");
    expect(result.userScoresCount).toBe(0);
    expect(result.rankingsCount).toBe(0);
  });
});
