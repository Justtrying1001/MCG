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

  it("builds human-readable preview", () => {
    const rule = createRewardRuleDraft({
      id: "pack-1",
      rewardType: "PACK",
      amount: 2,
      packDefinitionId: "starter-pack-v2",
      distributionType: "TOP_N",
      distributionValue: 10,
    });

    expect(describeRewardRule(rule)).toContain("Top 10 receive 2 pack(s) each");
  });

  it("maps rules to contest reward payload", () => {
    const payload = toContestRewardPayload([
      createRewardRuleDraft({ id: "a", rewardType: "POINTS", amount: 1000, distributionType: "FIXED_RANKS", distributionValue: 1 }),
      createRewardRuleDraft({ id: "b", rewardType: "XP", amount: 100, distributionType: "TOP_PERCENT", distributionValue: 25 }),
    ]);

    expect(payload.rewardBundles).toHaveLength(2);
    expect(payload.distributionRules).toHaveLength(2);
    expect(payload.distributionRules[0]).toMatchObject({ ruleType: "FIXED_RANKS", rankFrom: 1, rankTo: 1 });
    expect(payload.distributionRules[1]).toMatchObject({ ruleType: "TOP_PERCENT", topPercent: 25 });
  });

  it("detects overlapping reward distribution rules", () => {
    const payload = toContestRewardPayload([
      createRewardRuleDraft({ id: "r1", rewardType: "POINTS", amount: 1000, distributionType: "FIXED_RANKS", distributionValue: 1 }),
      createRewardRuleDraft({ id: "r2", rewardType: "XP", amount: 100, distributionType: "TOP_N", distributionValue: 1 }),
    ]);

    expect(payload.overlapIssues).toHaveLength(1);
    expect(payload.overlapIssues[0].message).toContain("rank 1");
    expect(payload.overlapIssues[0].conflictingRuleIds).toEqual(["r1", "r2"]);
  });

});
