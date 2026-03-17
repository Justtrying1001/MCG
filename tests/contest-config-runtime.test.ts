import { describe, expect, it } from "vitest";

import { validateContestDraftEntity } from "@/lib/domain/contests/config-runtime";

function baseContest() {
  return {
    openAt: new Date("2026-03-01T09:00:00.000Z"),
    lockAt: new Date("2026-03-01T10:00:00.000Z"),
    liveAt: new Date("2026-03-01T11:00:00.000Z"),
    endsAt: new Date("2026-03-01T12:00:00.000Z"),
    rules: [
      {
        teamSizeMode: "EXACT",
        maxRosterSize: 5,
        entryFeeEnabled: false,
        entryFeeCurrency: "POINTS",
        entryFeeAmount: null,
        eligibilityMode: "ANY",
        cardSetId: null,
        config: {
          rewardConfig: {
            pointsPool: 1000,
            packPool: 20,
            rewardedTopPercent: 25,
            distributionProfile: "balanced",
          },
        },
      },
    ],
    rewardPolicy: {
      bundles: [],
      distributionRules: [],
    },
  } as any;
}

describe("contest config runtime validation", () => {
  it("accepts new reward config", () => {
    const issues = validateContestDraftEntity(baseContest());
    expect(issues.filter((item) => item.severity === "ERROR")).toHaveLength(0);
  });

  it("validates reward pools and percent range", () => {
    const contest = baseContest();
    contest.rules[0].config.rewardConfig.pointsPool = 0;
    contest.rules[0].config.rewardConfig.packPool = -1;
    contest.rules[0].config.rewardConfig.rewardedTopPercent = 101;

    const issues = validateContestDraftEntity(contest);
    expect(issues.some((issue) => issue.code === "REWARD_POINTS_POOL_INVALID")).toBe(true);
    expect(issues.some((issue) => issue.code === "REWARD_PACK_POOL_INVALID")).toBe(true);
    expect(issues.some((issue) => issue.code === "REWARD_PERCENT_INVALID")).toBe(true);
  });
});
