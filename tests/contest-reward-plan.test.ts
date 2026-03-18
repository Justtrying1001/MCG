import { describe, expect, it } from "vitest";

import { buildContestRewardPlanItems } from "@/lib/domain/contests/reward-plan";

describe("buildContestRewardPlanItems", () => {
  it("builds a preview distribution from a simple reward pool", () => {
    const rows = buildContestRewardPlanItems({
      participantCount: 20,
      rankingRows: [],
      rewardConfig: { pointsPool: 500, packPool: 1, rewardedTopPercent: 25, distributionProfile: "balanced" },
      rules: [],
      bundles: [],
      defaultPackDefinitionId: null,
    });

    expect(rows).toHaveLength(5);
    expect(rows[0]).toMatchObject({ rank: 1, pointsTotal: expect.any(Number), packsTotal: expect.any(Number), sourceRuleType: "SIMPLE_POOL" });
    expect(rows.reduce((sum, row) => sum + row.pointsTotal, 0)).toBe(500);
    expect(rows.reduce((sum, row) => sum + row.packsTotal, 0)).toBe(1);
  });

  it("expands top-percent reward policy into per-rank preview rows using entrant count", () => {
    const rows = buildContestRewardPlanItems({
      participantCount: 8,
      rankingRows: [],
      rewardConfig: null,
      rules: [
        { id: "rule-top-25", priority: 0, ruleType: "TOP_PERCENT", rankFrom: null, rankTo: null, topN: null, topPercent: 25, poolAmount: null, bundleId: "bundle-a" },
      ],
      bundles: [
        {
          id: "bundle-a",
          name: "Top quarter",
          components: [
            { type: "POINTS", pointsAmount: 120, xpAmount: null, packDefinitionId: null, packQuantity: null },
            { type: "PACK", pointsAmount: null, xpAmount: null, packDefinitionId: "pack-1", packQuantity: 1 },
          ],
        },
      ],
      defaultPackDefinitionId: null,
    });

    expect(rows.map((row) => row.rank)).toEqual([1, 2]);
    expect(rows.every((row) => row.sourceBundleName === "Top quarter")).toBe(true);
    expect(rows[0]).toMatchObject({ pointsTotal: 120, packsTotal: 1, sourceRuleType: "TOP_PERCENT" });
    expect(rows[1]).toMatchObject({ pointsTotal: 120, packsTotal: 1, sourceRuleType: "TOP_PERCENT" });
  });
});
