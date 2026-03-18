import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    contest: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET } from "@/app/api/contests/[contestId]/reward-preview/route";

describe("contest reward preview route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns per-rank LIVE preview rows for policy contests before settlement", async () => {
    prismaMock.contest.findUnique.mockResolvedValue({
      id: "c-live",
      _count: { entries: 8 },
      rules: [{ config: {} }],
      rankings: [],
      rewardPolicy: {
        status: "PUBLISHED",
        bundles: [
          {
            id: "bundle-a",
            name: "Top quarter",
            components: [
              { type: "POINTS", pointsAmount: 100, xpAmount: null, packDefinitionId: null, packQuantity: null },
              { type: "PACK", pointsAmount: null, xpAmount: null, packDefinitionId: "pack-1", packQuantity: 1 },
            ],
          },
        ],
        distributionRules: [
          { id: "rule-top-25", priority: 0, ruleType: "TOP_PERCENT", rankFrom: null, rankTo: null, topN: null, topPercent: 25, poolAmount: null, bundleId: "bundle-a" },
        ],
      },
    });

    const response = await GET(new Request("http://localhost") as any, { params: { contestId: "c-live" } });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.hasPolicyData).toBe(true);
    expect(payload.tiers).toEqual([
      expect.objectContaining({ label: "Rank #1", bundleName: "Top quarter", pointsAmount: 100, packsCount: 1 }),
      expect.objectContaining({ label: "Rank #2", bundleName: "Top quarter", pointsAmount: 100, packsCount: 1 }),
    ]);
  });
});
