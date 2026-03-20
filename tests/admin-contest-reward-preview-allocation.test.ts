import { describe, expect, it } from "vitest";

import { buildRewardPreviewAllocation } from "@/app/admin/(protected)/contests/create/_lib/rewardPreviewAllocation";

describe("buildRewardPreviewAllocation", () => {
  it("keeps preview totals exactly aligned with both configured pools", () => {
    const preview = buildRewardPreviewAllocation({
      participantsCount: 100,
      rewardConfig: {
        pointsPool: 10_000,
        packPool: 17,
        rewardedTopPercent: 25,
        distributionProfile: "balanced",
      },
    });

    expect(preview.winnersCount).toBe(25);
    expect(preview.totalPoints).toBe(10_000);
    expect(preview.totalPacks).toBe(17);
  });

  it("allocates deterministic remainders from top ranks downward", () => {
    const preview = buildRewardPreviewAllocation({
      participantsCount: 10,
      rewardConfig: {
        pointsPool: 7,
        packPool: 3,
        rewardedTopPercent: 50,
        distributionProfile: "balanced",
      },
    });

    expect(preview.rows.map((row) => row.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(preview.rows.map((row) => row.pointsReward)).toEqual([3, 2, 2, 0, 0]);
    expect(preview.rows.map((row) => row.packsReward)).toEqual([2, 1, 0, 0, 0]);
    expect(preview.totalPoints).toBe(7);
    expect(preview.totalPacks).toBe(3);
  });

  it("stays preview-only when the field is too small to produce winners", () => {
    const preview = buildRewardPreviewAllocation({
      participantsCount: 1,
      rewardConfig: {
        pointsPool: 500,
        packPool: 2,
        rewardedTopPercent: 50,
        distributionProfile: "top-heavy",
      },
    });

    expect(preview.rows).toEqual([]);
    expect(preview.totalPoints).toBe(0);
    expect(preview.totalPacks).toBe(0);
  });
});
