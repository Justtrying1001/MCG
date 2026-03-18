import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, resolveEligibleTokensForContestMock, fetchCoinsMarketsMock, warnSpy } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    contestTokenSnapshot: { findMany: vi.fn() },
  },
  resolveEligibleTokensForContestMock: vi.fn(),
  fetchCoinsMarketsMock: vi.fn(),
  warnSpy: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/domain/contests/eligibility-runtime", () => ({ resolveEligibleTokensForContest: resolveEligibleTokensForContestMock }));
vi.mock("@/lib/domain/contests/coingecko-client", () => ({ fetchCoinsMarkets: fetchCoinsMarketsMock }));

import { captureEndSnapshot, captureStartSnapshot } from "@/lib/domain/contests/snapshot-runtime";

describe("snapshot runtime edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.spyOn(console, "warn").mockImplementation(warnSpy);
  });

  it("rejects END snapshot when START canonical rows are missing", async () => {
    // resolveCanonicalTokensFromStart calls prisma.contestTokenSnapshot.findMany directly (outside tx)
    prismaMock.contestTokenSnapshot.findMany.mockResolvedValue([]);
    fetchCoinsMarketsMock.mockResolvedValue([]);

    await expect(captureEndSnapshot("c1")).rejects.toThrow(/START snapshot is required/i);
  });

  it("is idempotent for START snapshot via upsert semantics", async () => {
    const upsertCalls: any[] = [];
    prismaMock.$transaction.mockImplementation(async (fn: any) => {
      const tx: any = {
        contest: { findUnique: vi.fn().mockResolvedValue({ id: "c1" }) },
        contestTokenSnapshot: {
          upsert: vi.fn(async (args: any) => {
            upsertCalls.push(args.where.contestId_tokenProjectId_phase);
            return { id: `s_${upsertCalls.length}` };
          }),
        },
      };
      return fn(tx);
    });

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

  it("throws after 3 retries when CoinGecko fails on START snapshot", async () => {
    vi.useFakeTimers();

    resolveEligibleTokensForContestMock.mockResolvedValue([
      { tokenProjectId: "tp1", slug: "dogecoin", coingeckoId: "dogecoin" },
    ]);
    fetchCoinsMarketsMock.mockRejectedValue(new Error("429 rate limit"));

    const assertion = expect(captureStartSnapshot("c1")).rejects.toThrow("429 rate limit");
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchCoinsMarketsMock).toHaveBeenCalledTimes(3);
    expect(warnSpy).toHaveBeenCalledTimes(3);
  });

  it("throws after 3 retries when CoinGecko fails on END snapshot", async () => {
    vi.useFakeTimers();

    prismaMock.contestTokenSnapshot.findMany.mockResolvedValue([
      { tokenProjectId: "tp1", geckoId: "dogecoin", tokenProject: { slug: "dogecoin", coingeckoId: "dogecoin" } },
      { tokenProjectId: "tp2", geckoId: "pepe", tokenProject: { slug: "pepe", coingeckoId: null } },
    ]);

    const upserts: any[] = [];
    prismaMock.$transaction.mockImplementation(async (fn: any) => {
      const tx: any = {
        contest: { findUnique: vi.fn().mockResolvedValue({ id: "c1" }) },
        contestTokenSnapshot: {
          upsert: vi.fn(async (args: any) => {
            upserts.push(args);
            return { id: `e_${upserts.length}` };
          }),
        },
      };
      return fn(tx);
    });

    fetchCoinsMarketsMock.mockRejectedValue(new Error("503 service unavailable"));

    const assertion = expect(captureEndSnapshot("c1")).rejects.toThrow("503 service unavailable");
    await vi.runAllTimersAsync();
    await assertion;

    expect(upserts).toHaveLength(0);
    expect(fetchCoinsMarketsMock).toHaveBeenCalledTimes(3);
    expect(warnSpy).toHaveBeenCalledTimes(3);
  });
});
