import { describe, expect, it } from "vitest";

import { computeRewards } from "@/lib/domain/contests/reward-distribution";

describe("computeRewards", () => {
  it("distributes exact pool totals", () => {
    const rows = computeRewards({
      participantsCount: 10,
      ranking: ["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8", "u9", "u10"],
      config: { pointsPool: 1000, packPool: 20, rewardedTopPercent: 30, distributionProfile: "balanced" },
    });

    expect(rows).toHaveLength(3);
    expect(rows.reduce((sum, row) => sum + row.pointsReward, 0)).toBe(1000);
    expect(rows.reduce((sum, row) => sum + row.packsReward, 0)).toBe(20);
  });

  it("always rewards at least one participant", () => {
    const rows = computeRewards({
      participantsCount: 4,
      ranking: ["u1", "u2", "u3", "u4"],
      config: { pointsPool: 10, packPool: 2, rewardedTopPercent: 1, distributionProfile: "very-top-heavy" },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe("u1");
  });
});
