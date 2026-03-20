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
    expect(preview.rows.map((row) => row.label)).toEqual(["#1", "#2", "#3", "#4–10", "#11–25"]);
  });

  it("keeps point preview values on clean multiples of 10 while preserving the full pool", () => {
    const preview = buildRewardPreviewAllocation({
      participantsCount: 200,
      rewardConfig: {
        pointsPool: 84_000,
        packPool: 20,
        rewardedTopPercent: 50,
        distributionProfile: "balanced",
      },
    });

    expect(preview.totalPoints).toBe(84_000);
    expect(preview.rows.every((row) =>
      row.pointsReward % 10 === 0
      && row.pointsPerWinnerMin % 10 === 0
      && row.pointsPerWinnerMax % 10 === 0,
    )).toBe(true);

    const tier = preview.rows.find((row) => row.label === "#76–100");
    expect(tier).toMatchObject({
      rankStart: 76,
      rankEnd: 100,
    });
  });

  it("gives the podium distinct pack rewards when the pool can support it", () => {
    const preview = buildRewardPreviewAllocation({
      participantsCount: 100,
      rewardConfig: {
        pointsPool: 20_000,
        packPool: 120,
        rewardedTopPercent: 50,
        distributionProfile: "balanced",
      },
    });

    const rankOne = preview.rows.find((row) => row.label === "#1");
    const rankTwo = preview.rows.find((row) => row.label === "#2");
    const rankThree = preview.rows.find((row) => row.label === "#3");

    expect(rankOne?.packsReward).toBeGreaterThan(rankTwo?.packsReward ?? -1);
    expect(rankTwo?.packsReward).toBeGreaterThan(rankThree?.packsReward ?? -1);
    expect(rankOne?.packPreviewSegments).toEqual([{ rankStart: 1, rankEnd: 1, packs: rankOne?.packsReward ?? 0 }]);
    expect(rankTwo?.packPreviewSegments).toEqual([{ rankStart: 2, rankEnd: 2, packs: rankTwo?.packsReward ?? 0 }]);
    expect(rankThree?.packPreviewSegments).toEqual([{ rankStart: 3, rankEnd: 3, packs: rankThree?.packsReward ?? 0 }]);
  });

  it("uses grouped post-podium bands in the preview table", () => {
    const preview = buildRewardPreviewAllocation({
      participantsCount: 200,
      rewardConfig: {
        pointsPool: 20_000,
        packPool: 200,
        rewardedTopPercent: 50,
        distributionProfile: "balanced",
      },
    });

    expect(preview.rows.map((row) => row.label)).toEqual([
      "#1",
      "#2",
      "#3",
      "#4–10",
      "#11–25",
      "#26–50",
      "#51–75",
      "#76–100",
    ]);
  });

  it("keeps pack allocation globally monotonic across grouped bands", () => {
    const preview = buildRewardPreviewAllocation({
      participantsCount: 200,
      rewardConfig: {
        pointsPool: 20_000,
        packPool: 200,
        rewardedTopPercent: 50,
        distributionProfile: "balanced",
      },
    });

    const perRankPacks = preview.rows.flatMap((row) =>
      row.packPreviewSegments.flatMap((segment) =>
        Array.from({ length: segment.rankEnd - segment.rankStart + 1 }, () => segment.packs),
      ),
    );

    expect(perRankPacks).toHaveLength(preview.winnersCount);
    expect(perRankPacks.every((value, index) => index === 0 || (perRankPacks[index - 1] ?? 0) >= value)).toBe(true);
    expect(preview.rows.every((row, index, rows) => {
      if (index === 0) return true;
      return (rows[index - 1]?.packsPerWinnerMin ?? 0) >= row.packsPerWinnerMax;
    })).toBe(true);
  });

  it("preserves the exact total pack pool after grouped band allocation", () => {
    const preview = buildRewardPreviewAllocation({
      participantsCount: 100,
      rewardConfig: {
        pointsPool: 20_000,
        packPool: 17,
        rewardedTopPercent: 50,
        distributionProfile: "balanced",
      },
    });

    expect(preview.totalPacks).toBe(17);
    expect(preview.rows.reduce((sum, row) => sum + row.packsReward, 0)).toBe(17);
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
