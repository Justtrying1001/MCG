import { describe, expect, it } from "vitest";

import {
  createRewardRuleDraft,
  describeRewardRule,
  rewardRuleReducer,
  toContestRewardPayload,
} from "@/lib/admin/contest-reward-builder";

describe("contest reward distribution builder", () => {
  it("adds and removes rules", () => {
    const initial = [createRewardRuleDraft({ id: "r1" })];
    const withAdded = rewardRuleReducer(initial, { type: "add", rule: { id: "r2", rewardType: "XP", amount: 500 } });
    expect(withAdded).toHaveLength(2);

    const afterRemove = rewardRuleReducer(withAdded, { type: "remove", id: "r1" });
    expect(afterRemove).toHaveLength(1);
    expect(afterRemove[0].id).toBe("r2");
  });

  it("builds human-readable preview for pool mode", () => {
    const rule = createRewardRuleDraft({
      id: "pool-1",
      rewardType: "POINTS",
      mode: "POOL",
      poolAmount: 15000,
      distributionType: "TOP_PERCENT",
      distributionValue: 25,
    });

    expect(describeRewardRule(rule)).toContain("share a 15,000 points pool");
  });

  it("maps pool, pack and bonus rules to contest payload", () => {
    const payload = toContestRewardPayload([
      createRewardRuleDraft({ id: "pool", rewardType: "POINTS", mode: "POOL", distributionType: "TOP_PERCENT", distributionValue: 25, poolAmount: 15000 }),
      createRewardRuleDraft({ id: "pack1", rewardType: "PACK", amount: 3, packDefinitionId: "pack-a", distributionType: "FIXED_RANKS", distributionValue: 1 }),
      createRewardRuleDraft({ id: "bonus", rewardType: "POINTS", amount: 500, distributionType: "TOP_N", distributionValue: 10 }),
    ]);

    expect(payload.invalidRules).toHaveLength(0);
    expect(payload.rewardBundles).toHaveLength(3);
    expect(payload.distributionRules).toHaveLength(3);
    expect(payload.distributionRules[0]).toMatchObject({ ruleType: "POINTS_POOL_TOP_PERCENT", topPercent: 25, poolAmount: 15000 });
    expect(payload.distributionRules[1]).toMatchObject({ ruleType: "FIXED_RANKS", rankFrom: 1, rankTo: 1 });
    expect(payload.distributionRules[2]).toMatchObject({ ruleType: "TOP_N", topN: 10 });
  });
});
