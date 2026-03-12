import { describe, expect, it } from "vitest";

import { validateContestDraftEntity } from "@/lib/domain/contests/config-runtime";

function baseContest() {
  return {
    startsAt: new Date("2026-03-01T10:00:00.000Z"),
    lockAt: new Date("2026-03-01T11:00:00.000Z"),
    endsAt: new Date("2026-03-01T12:00:00.000Z"),
    rules: [
      {
        teamSizeMode: "EXACT",
        teamSizeValue: 5,
        entryFeeEnabled: false,
        entryFeeCurrency: "POINTS",
        entryFeeAmount: null,
        eligibilityMode: "ANY",
        cardSetId: null,
      },
    ],
    rewardPolicy: {
      bundles: [
        {
          id: "b1",
          name: "rank_1",
          components: [{ type: "POINTS", pointsAmount: 1000, xpAmount: null, packDefinitionId: null, packQuantity: null }],
        },
      ],
      distributionRules: [
        {
          bundleId: "b1",
          priority: 1,
          ruleType: "FIXED_RANKS",
          rankFrom: 1,
          rankTo: 1,
          topN: null,
          topPercent: null,
        },
      ],
    },
  } as any;
}

describe("contest config runtime validation", () => {
  it("accepts a valid draft shape", () => {
    const issues = validateContestDraftEntity(baseContest());
    expect(issues.filter((item) => item.severity === "ERROR")).toHaveLength(0);
  });

  it("rejects invalid team size and missing distribution", () => {
    const contest = baseContest();
    contest.rules[0].teamSizeValue = 4;
    contest.rewardPolicy.distributionRules = [];

    const issues = validateContestDraftEntity(contest);
    expect(issues.some((issue) => issue.code === "TEAM_SIZE_INVALID")).toBe(true);
    expect(issues.some((issue) => issue.code === "DISTRIBUTION_RULE_REQUIRED")).toBe(true);
  });

  it("rejects invalid entry fee and top percent", () => {
    const contest = baseContest();
    contest.rules[0].entryFeeEnabled = true;
    contest.rules[0].entryFeeAmount = 0;
    contest.rewardPolicy.distributionRules = [
      {
        bundleId: "b1",
        priority: 1,
        ruleType: "TOP_PERCENT",
        topPercent: 120,
      },
    ];

    const issues = validateContestDraftEntity(contest);
    expect(issues.some((issue) => issue.code === "ENTRY_FEE_INVALID")).toBe(true);
    expect(issues.some((issue) => issue.code === "DISTRIBUTION_TOP_PERCENT_INVALID")).toBe(true);
  });
});
