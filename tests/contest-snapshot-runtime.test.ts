import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, resolveEligibleTokensForContestMock, fetchCoinsMarketsMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
  },
  resolveEligibleTokensForContestMock: vi.fn(),
  fetchCoinsMarketsMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/domain/contests/eligibility-runtime", () => ({ resolveEligibleTokensForContest: resolveEligibleTokensForContestMock }));
vi.mock("@/lib/domain/contests/coingecko-client", () => ({ fetchCoinsMarkets: fetchCoinsMarketsMock }));

import { captureEndSnapshot, captureStartSnapshot } from "@/lib/domain/contests/snapshot-runtime";

describe("contest snapshot runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("captures START snapshots from eligible tokens with CoinGecko fields including last_updated", async () => {
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
      { tokenProjectId: "tp2", slug: "pepe", coingeckoId: "pepe" },
    ]);
    fetchCoinsMarketsMock.mockResolvedValue([
      { id: "dogecoin", current_price: 0.12, market_cap: 1000, total_volume: 50, market_cap_rank: 8, last_updated: "2026-03-14T10:00:00Z" },
      { id: "pepe", current_price: 0.22, market_cap: 2000, total_volume: 70, market_cap_rank: 21, last_updated: "2026-03-14T10:00:00Z" },
    ]);

    const result = await captureStartSnapshot("c1");

    expect(result.phase).toBe("START");
    expect(result.capturedCount).toBe(2);
    expect(upserts).toHaveLength(2);
    expect(upserts[0].create.marketDataUpdatedAt).toBeInstanceOf(Date);
  });

  it("uses START canonical token population when capturing END", async () => {
    const upserts: any[] = [];
    const tx: any = {
      contest: { findUnique: vi.fn().mockResolvedValue({ id: "c1" }) },
      contestTokenSnapshot: {
        findMany: vi.fn().mockResolvedValue([
          { tokenProjectId: "tp1", geckoId: "dogecoin", tokenProject: { slug: "dogecoin", coingeckoId: null } },
          { tokenProjectId: "tp2", geckoId: "pepe", tokenProject: { slug: "pepe", coingeckoId: "pepe" } },
        ]),
        upsert: vi.fn(async (args: any) => {
          upserts.push(args);
          return { id: `e_${upserts.length}` };
        }),
      },
    };
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));
    fetchCoinsMarketsMock.mockResolvedValue([
      { id: "dogecoin", current_price: 0.13, market_cap: 1100, total_volume: 65, market_cap_rank: 7, last_updated: "2026-03-14T10:10:00Z" },
      { id: "pepe", current_price: 0.2, market_cap: 1900, total_volume: 60, market_cap_rank: 25, last_updated: "2026-03-14T10:10:00Z" },
    ]);

    const result = await captureEndSnapshot("c1");
    expect(result.phase).toBe("END");
    expect(result.tokenCount).toBe(2);
    expect(upserts).toHaveLength(2);
  });
});
