import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, resolveEligibleTokensForContestMock, fetchCoinsMarketsMock, warnSpy } = vi.hoisted(() => ({
  prismaMock: { $transaction: vi.fn() },
  resolveEligibleTokensForContestMock: vi.fn(),
  fetchCoinsMarketsMock: vi.fn(),
  warnSpy: vi.spyOn(console, "warn").mockImplementation(() => undefined),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/domain/contests/eligibility-runtime", () => ({ resolveEligibleTokensForContest: resolveEligibleTokensForContestMock }));
vi.mock("@/lib/domain/contests/coingecko-client", () => ({ fetchCoinsMarkets: fetchCoinsMarketsMock }));

import { captureEndSnapshot, captureStartSnapshot } from "@/lib/domain/contests/snapshot-runtime";

describe("snapshot runtime edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects END snapshot when START canonical rows are missing", async () => {
    const tx: any = {
      contest: { findUnique: vi.fn().mockResolvedValue({ id: "c1" }) },
      contestTokenSnapshot: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await expect(captureEndSnapshot("c1")).rejects.toThrow(/START snapshot is required/i);
  });

  it("is idempotent for START snapshot via upsert semantics", async () => {
    const upsertCalls: any[] = [];
    const tx: any = {
      contest: { findUnique: vi.fn().mockResolvedValue({ id: "c1" }) },
      contestTokenSnapshot: {
        upsert: vi.fn(async (args: any) => {
          upsertCalls.push(args.where.contestId_tokenProjectId_phase);
          return { id: `s_${upsertCalls.length}` };
        }),
      },
    };
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    resolveEligibleTokensForContestMock.mockResolvedValue([
      { tokenProjectId: "tp1", slug: "dogecoin", coingeckoId: "dogecoin" },
      { tokenProjectId: "tp2", slug: "pepe", coingeckoId: "pepe" },
    ]);
    fetchCoinsMarketsMock.mockResolvedValue([]);

    const first = await captureStartSnapshot("c1");
    const second = await captureStartSnapshot("c1");

    expect(first.tokenCount).toBe(2);
    expect(second.tokenCount).toBe(2);
    expect(upsertCalls).toHaveLength(4);
    expect(new Set(upsertCalls.map((r) => `${r.contestId}:${r.tokenProjectId}:${r.phase}`)).size).toBe(2);
  });

  it("does not crash on CoinGecko failure and stores null metrics", async () => {
    const upserts: any[] = [];
    const tx: any = {
      contest: { findUnique: vi.fn().mockResolvedValue({ id: "c1" }) },
      contestTokenSnapshot: {
        upsert: vi.fn(async (args: any) => {
          upserts.push(args);
          return { id: `s_${upserts.length}` };
        }),
      },
    };
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    resolveEligibleTokensForContestMock.mockResolvedValue([
      { tokenProjectId: "tp1", slug: "dogecoin", coingeckoId: "dogecoin" },
      { tokenProjectId: "tp2", slug: "pepe", coingeckoId: null },
    ]);
    fetchCoinsMarketsMock.mockRejectedValue(new Error("429 rate limit"));

    const result = await captureStartSnapshot("c1");

    expect(result.capturedCount).toBe(2);
    expect(result.missingGeckoIds).toBe(1);
    expect(upserts[0].create.priceUsd).toBeNull();
    expect(upserts[0].create.marketDataUpdatedAt).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });
});
