import { describe, expect, it } from "vitest";

import { buildContestRewardPreview, parseRewardConfig } from "@/lib/domain/contests/reward-preview";
import type { RewardPlanBundleLike, RewardPlanRuleLike } from "@/lib/domain/contests/reward-plan";

const rewardConfig = parseRewardConfig({
  pointsPool: 1200,
  packPool: 6,
  rewardedTopPercent: 25,
  distributionProfile: "balanced",
});

const rules: RewardPlanRuleLike[] = [
  {
    id: "rule-r1",
    priority: 1,
    ruleType: "FIXED_RANKS",
    rankFrom: 1,
    rankTo: 1,
    topN: null,
    topPercent: null,
    poolAmount: null,
    bundleId: "bundle-r1",
  },
  {
    id: "rule-r2",
    priority: 2,
    ruleType: "TOP_N",
    rankFrom: null,
    rankTo: null,
    topN: 3,
    topPercent: null,
    poolAmount: null,
    bundleId: "bundle-r2",
  },
];

const bundles: RewardPlanBundleLike[] = [
  {
    id: "bundle-r1",
    name: "Champion",
    components: [
      { type: "POINTS", pointsAmount: 900, xpAmount: null, packDefinitionId: null, packQuantity: null },
    ],
  },
  {
    id: "bundle-r2",
    name: "Top 3",
    components: [
      { type: "PACK", pointsAmount: null, xpAmount: null, packDefinitionId: "pack-1", packQuantity: 1 },
    ],
  },
];

describe("buildContestRewardPreview", () => {
  it("keeps OPEN contests on simple pool summary even when a reward policy is published", () => {
    const preview = buildContestRewardPreview({
      status: "OPEN",
      participantCount: 20,
      rankingRows: [],
      rewardConfig,
      rewardPolicyStatus: "PUBLISHED",
      rules,
      bundles,
    });

    expect(preview.summary).toMatchObject({ pointsPool: 1200, packPool: 6, rewardedTopPercent: 25 });
    expect(preview.tiers[0]).toMatchObject({ bundleName: "Simple pool", label: "Rank #1" });
  });

  it("prefers the published reward policy in LIVE contests", () => {
    const preview = buildContestRewardPreview({
      status: "LIVE",
      participantCount: 20,
      rankingRows: [],
      rewardConfig,
      rewardPolicyStatus: "PUBLISHED",
      rules,
      bundles,
    });

    expect(preview.summary).toBeNull();
    expect(preview.tiers).toEqual([
      expect.objectContaining({ label: "Rank #1", bundleName: "Champion + Top 3", pointsAmount: 900, packsCount: 1 }),
      expect.objectContaining({ label: "Rank #2", bundleName: "Top 3", pointsAmount: 0, packsCount: 1 }),
      expect.objectContaining({ label: "Rank #3", bundleName: "Top 3", pointsAmount: 0, packsCount: 1 }),
    ]);
  });

  it("keeps SETTLED contests aligned with the final published policy table", () => {
    const preview = buildContestRewardPreview({
      status: "SETTLED",
      participantCount: 4,
      rankingRows: [
        { userId: "u1", rank: 1, displayName: "Alice" },
        { userId: "u2", rank: 2, displayName: "Bob" },
        { userId: "u3", rank: 3, displayName: "Cara" },
        { userId: "u4", rank: 4, displayName: "Dan" },
      ],
      rewardConfig,
      rewardPolicyStatus: "PUBLISHED",
      rules,
      bundles,
    });

    expect(preview.tiers.map((tier) => tier.winnerLabel)).toEqual(["Alice", "Bob", "Cara"]);
    expect(preview.tiers).toHaveLength(3);
  });
});
