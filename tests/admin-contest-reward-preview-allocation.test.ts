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
    expect(preview.rows.map((row) => row.label)).toEqual(["#1", "#2", "#3", "#4–5", "#6–10", "#11–15", "#16–25"]);
  });

  it("uses grouped tiers and deterministic higher-rank remainder handling for balanced previews", () => {
    const preview = buildRewardPreviewAllocation({
      participantsCount: 10,
      rewardConfig: {
        pointsPool: 70,
        packPool: 3,
        rewardedTopPercent: 50,
        distributionProfile: "balanced",
      },
    });

    expect(preview.rows).toEqual([
      {
        rankStart: 1,
        rankEnd: 1,
        label: "#1",
        winnersCount: 1,
        pointsReward: 20,
        packsReward: 1,
        pointsPerWinnerMin: 20,
        pointsPerWinnerMax: 20,
        packsPerWinnerMin: 1,
        packsPerWinnerMax: 1,
        packHighValueCount: 1,
        packPreviewSegments: [{ rankStart: 1, rankEnd: 1, packs: 1 }],
      },
      {
        rankStart: 2,
        rankEnd: 2,
        label: "#2",
        winnersCount: 1,
        pointsReward: 20,
        packsReward: 1,
        pointsPerWinnerMin: 20,
        pointsPerWinnerMax: 20,
        packsPerWinnerMin: 1,
        packsPerWinnerMax: 1,
        packHighValueCount: 1,
        packPreviewSegments: [{ rankStart: 2, rankEnd: 2, packs: 1 }],
      },
      {
        rankStart: 3,
        rankEnd: 3,
        label: "#3",
        winnersCount: 1,
        pointsReward: 10,
        packsReward: 0,
        pointsPerWinnerMin: 10,
        pointsPerWinnerMax: 10,
        packsPerWinnerMin: 0,
        packsPerWinnerMax: 0,
        packHighValueCount: 1,
        packPreviewSegments: [{ rankStart: 3, rankEnd: 3, packs: 0 }],
      },
      {
        rankStart: 4,
        rankEnd: 5,
        label: "#4–5",
        winnersCount: 2,
        pointsReward: 20,
        packsReward: 1,
        pointsPerWinnerMin: 10,
        pointsPerWinnerMax: 10,
        packsPerWinnerMin: 0,
        packsPerWinnerMax: 1,
        packHighValueCount: 1,
        packPreviewSegments: [
          { rankStart: 4, rankEnd: 4, packs: 1 },
          { rankStart: 5, rankEnd: 5, packs: 0 },
        ],
      },
    ]);
    expect(preview.totalPoints).toBe(70);
    expect(preview.totalPacks).toBe(3);
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
      && row.pointsPerWinnerMax % 10 === 0
    )).toBe(true);

    const tier = preview.rows.find((row) => row.label === "#76–100");
    expect(tier).toMatchObject({
      pointsPerWinnerMin: 430,
      pointsPerWinnerMax: 440,
    });
  });

  it("exposes exact grouped pack sub-ranges with higher values assigned to better ranks first", () => {
    const preview = buildRewardPreviewAllocation({
      participantsCount: 100,
      rewardConfig: {
        pointsPool: 20_000,
        packPool: 17,
        rewardedTopPercent: 50,
        distributionProfile: "balanced",
      },
    });

    const splitTier = preview.rows.find((row) => row.label === "#26–50");

    expect(splitTier?.packsPerWinnerMin).toBe(0);
    expect(splitTier?.packsPerWinnerMax).toBe(1);
    expect(splitTier?.packHighValueCount).toBe(4);
    expect(splitTier?.packPreviewSegments).toEqual([
      { rankStart: 26, rankEnd: 29, packs: 1 },
      { rankStart: 30, rankEnd: 50, packs: 0 },
    ]);
  });

  it("flattens the balanced profile for 100 participants and 50 winners", () => {
    const preview = buildRewardPreviewAllocation({
      participantsCount: 100,
      rewardConfig: {
        pointsPool: 20_000,
        packPool: 200,
        rewardedTopPercent: 50,
        distributionProfile: "balanced",
      },
    });

    const rankOne = preview.rows.find((row) => row.label === "#1");
    const lastTier = preview.rows.find((row) => row.label === "#26–50");

    expect(preview.rows.map((row) => row.label)).toEqual(["#1", "#2", "#3", "#4–5", "#6–10", "#11–15", "#16–25", "#26–50"]);
    expect(rankOne?.pointsReward).toBeLessThan(1_300);
    expect(rankOne?.packsReward).toBeLessThan(12);
    expect(lastTier?.pointsPerWinnerMin).toBeGreaterThanOrEqual(190);
    expect(lastTier?.packsPerWinnerMin).toBeGreaterThanOrEqual(1);
  });

  it("keeps later winner tiers meaningful for 200 participants and 100 winners", () => {
    const preview = buildRewardPreviewAllocation({
      participantsCount: 200,
      rewardConfig: {
        pointsPool: 20_000,
        packPool: 200,
        rewardedTopPercent: 50,
        distributionProfile: "balanced",
      },
    });

    const rankOne = preview.rows.find((row) => row.label === "#1");
    const lastTier = preview.rows.find((row) => row.label === "#76–100");

    expect(preview.rows.map((row) => row.label)).toEqual(["#1", "#2", "#3", "#4–5", "#6–10", "#11–15", "#16–25", "#26–50", "#51–75", "#76–100"]);
    expect(rankOne?.pointsReward).toBeLessThan(1_000);
    expect(rankOne?.packsReward).toBeLessThanOrEqual(8);
    expect(lastTier?.pointsPerWinnerMin).toBeGreaterThanOrEqual(100);
    expect(lastTier?.packsPerWinnerMin).toBeGreaterThanOrEqual(1);
    expect(lastTier?.packsPerWinnerMax).toBeLessThanOrEqual(2);
    expect(preview.rows.every((row) => row.pointsPerWinnerMin % 10 === 0 && row.pointsPerWinnerMax % 10 === 0)).toBe(true);
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
