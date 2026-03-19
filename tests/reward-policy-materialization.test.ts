import { describe, expect, it } from "vitest";

import { materializeRewardPolicyFromConfig } from "@/lib/domain/contests/reward-plan";

describe("materializeRewardPolicyFromConfig", () => {
  it("freezes simple reward config into fixed-rank bundles and rules from final field size", () => {
    const policy = materializeRewardPolicyFromConfig({
      participantCount: 10,
      rewardConfig: {
        pointsPool: 1000,
        packPool: 2,
        rewardedTopPercent: 40,
        distributionProfile: "balanced",
      },
      defaultPackDefinitionId: "pack-1",
    });

    expect(policy.bundles.length).toBeGreaterThan(0);
    expect(policy.distributionRules.every((rule) => rule.ruleType === "FIXED_RANKS")).toBe(true);
    expect(policy.distributionRules[0]).toMatchObject({ rankFrom: 1, rankTo: 1, bundleRef: "Rank 1" });
    expect(policy.bundles[0]).toMatchObject({
      name: "Rank 1",
      components: expect.arrayContaining([expect.objectContaining({ type: "POINTS" })]),
    });
  });

  it("groups adjacent equal reward shapes into rank ranges", () => {
    const policy = materializeRewardPolicyFromConfig({
      participantCount: 8,
      rewardConfig: {
        pointsPool: 8,
        packPool: 0,
        rewardedTopPercent: 50,
        distributionProfile: "balanced",
      },
    });

    expect(policy.distributionRules).toContainEqual(expect.objectContaining({ rankFrom: 3, rankTo: 4 }));
    expect(policy.bundles).toContainEqual(expect.objectContaining({ name: "Ranks 3-4" }));
  });
});
