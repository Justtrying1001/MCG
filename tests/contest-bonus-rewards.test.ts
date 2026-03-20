import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import {
  buildContestBonusRewardSummary,
  formatContestBonusRewardValue,
  formatContestPlacement,
  parseContestBonusRewards,
} from "@/components/contests/bonusRewards";

describe("contest bonus rewards helpers", () => {
  it("parses and sorts valid bonus reward rows", () => {
    expect(parseContestBonusRewards([
      { targetRank: "3", rewardType: "CUSTOM", amount: "", note: "Special pack" },
      { targetRank: 1, rewardType: "SOL", amount: "0.2", note: "" },
      { targetRank: "x", rewardType: "SOL", amount: "1", note: "ignored" },
    ])).toEqual([
      { targetRank: 1, rewardType: "SOL", amount: "0.2", note: "" },
      { targetRank: 3, rewardType: "CUSTOM", amount: "", note: "Special pack" },
    ]);
  });

  it("formats user-facing labels without implying payout automation", () => {
    expect(formatContestPlacement(1)).toBe("1st place");
    expect(formatContestPlacement(2)).toBe("2nd place");
    expect(formatContestBonusRewardValue({ targetRank: 1, rewardType: "SOL", amount: "0.2", note: "" })).toBe("0.2 SOL");
    expect(formatContestBonusRewardValue({ targetRank: 2, rewardType: "CUSTOM", amount: "", note: "Special pack" })).toBe("Special pack");
    expect(buildContestBonusRewardSummary([{ targetRank: 1, rewardType: "SOL", amount: "0.2", note: "" }])).toBe("1st place: 0.2 SOL");
  });
});

describe("contest bonus rewards ui smoke", () => {
  it("shows compact bonus rewards summary on contest cards", () => {
    const source = readFileSync("components/contests/ContestTile.tsx", "utf8");
    expect(source).toContain("Bonus rewards:");
    expect(source).toContain("buildContestBonusRewardSummary");
  });

  it("shows a dedicated bonus rewards section on the contest detail rewards panel", () => {
    const source = readFileSync("components/contests/ContestDetailPanels.tsx", "utf8");
    expect(source).toContain("Bonus rewards");
    expect(source).not.toContain("Configured showcase only");
    expect(source).toContain("formatContestPlacement");
  });
});
