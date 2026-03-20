import type {
  ContestRewardConfig,
  ContestRewardDistributionProfile,
} from "@/lib/domain/contests/reward-distribution";

export type RewardPreviewAllocationRow = {
  rankStart: number;
  rankEnd: number;
  label: string;
  winnersCount: number;
  pointsReward: number;
  packsReward: number;
  pointsPerWinnerMin: number;
  pointsPerWinnerMax: number;
  packsPerWinnerMin: number;
  packsPerWinnerMax: number;
};

export type RewardPreviewAllocation = {
  participantsCount: number;
  winnersCount: number;
  rows: RewardPreviewAllocationRow[];
  totalPoints: number;
  totalPacks: number;
};

type RewardTierRange = {
  rankStart: number;
  rankEnd: number;
  size: number;
};

const PREVIEW_TIER_ENDS = [1, 2, 3, 5, 10, 15, 25, 50, 75, 100, 150, 250, 500] as const;

const BALANCED_POINTS_TIER_WEIGHTS = [4.5, 4.2, 4.0, 7.3, 11, 10, 15, 18, 13, 13, 10, 8, 6, 4] as const;
const BALANCED_PACKS_TIER_WEIGHTS = [3.5, 3.3, 3.2, 6.5, 10.5, 10.5, 15, 18, 14.5, 14.5, 12, 10, 8, 6] as const;

const PROFILE_ALPHA: Record<ContestRewardDistributionProfile, number> = {
  balanced: 0.8,
  "top-heavy": 1.2,
  "very-top-heavy": 1.6,
};

export function buildRewardPreviewAllocation(input: {
  participantsCount: number;
  rewardConfig: ContestRewardConfig;
}): RewardPreviewAllocation {
  const participantsCount = Math.max(0, Math.floor(input.participantsCount));
  if (participantsCount < 2) {
    return {
      participantsCount,
      winnersCount: 0,
      rows: [],
      totalPoints: 0,
      totalPacks: 0,
    };
  }

  const rewardedTopPercent = Math.max(1, Math.min(100, Math.floor(input.rewardConfig.rewardedTopPercent)));
  const winnersCount = Math.max(1, Math.floor((participantsCount * rewardedTopPercent) / 100));
  const pointsPool = Math.max(0, Math.floor(input.rewardConfig.pointsPool));
  const packsPool = Math.max(0, Math.floor(input.rewardConfig.packPool));
  const perRank = buildPerRankAllocation({
    winnersCount,
    pointsPool,
    packsPool,
    distributionProfile: input.rewardConfig.distributionProfile,
  });
  const previewTiers = buildPreviewTierRanges(winnersCount);
  const rows = previewTiers.map((tier) => buildPreviewRow(tier, perRank.points, perRank.packs));

  return {
    participantsCount,
    winnersCount,
    rows,
    totalPoints: perRank.points.reduce((sum, value) => sum + value, 0),
    totalPacks: perRank.packs.reduce((sum, value) => sum + value, 0),
  };
}

function buildPerRankAllocation(input: {
  winnersCount: number;
  pointsPool: number;
  packsPool: number;
  distributionProfile: ContestRewardDistributionProfile;
}) {
  if (input.distributionProfile === "balanced") {
    return buildBalancedPerRankAllocation(input.winnersCount, input.pointsPool, input.packsPool);
  }

  const weights = buildRankWeights(input.winnersCount, input.distributionProfile);
  return {
    points: allocatePointPoolByWeights(input.pointsPool, weights),
    packs: allocatePoolByWeights(input.packsPool, weights),
  };
}

function buildBalancedPerRankAllocation(winnersCount: number, pointsPool: number, packsPool: number) {
  const tiers = buildPreviewTierRanges(winnersCount);
  const tierPointTotals = allocatePointPoolByWeights(pointsPool, buildBalancedTierWeights(tiers, BALANCED_POINTS_TIER_WEIGHTS));
  const tierPackTotals = allocatePoolByWeights(packsPool, buildBalancedTierWeights(tiers, BALANCED_PACKS_TIER_WEIGHTS));
  const points = Array.from({ length: winnersCount }, () => 0);
  const packs = Array.from({ length: winnersCount }, () => 0);

  tiers.forEach((tier, tierIndex) => {
    const pointSplit = splitTierPointsForPreview(tierPointTotals[tierIndex] ?? 0, tier.size);
    const packSplit = splitTierEvenly(tierPackTotals[tierIndex] ?? 0, tier.size);

    for (let offset = 0; offset < tier.size; offset += 1) {
      const rankIndex = tier.rankStart - 1 + offset;
      points[rankIndex] = pointSplit[offset] ?? 0;
      packs[rankIndex] = packSplit[offset] ?? 0;
    }
  });

  return { points, packs };
}

function buildBalancedTierWeights(tiers: RewardTierRange[], weightTemplate: readonly number[]) {
  return tiers.map((_, index) => weightTemplate[index] ?? weightTemplate[weightTemplate.length - 1] ?? 1);
}

function buildRankWeights(winnersCount: number, distributionProfile: ContestRewardDistributionProfile) {
  const alpha = PROFILE_ALPHA[distributionProfile];
  return Array.from({ length: winnersCount }, (_, index) => 1 / Math.pow(index + 1, alpha));
}

function allocatePoolByWeights(pool: number, weights: number[]) {
  if (pool <= 0 || weights.length === 0) return weights.map(() => 0);

  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  if (totalWeight <= 0) return weights.map(() => 0);

  const raw = weights.map((weight) => (weight / totalWeight) * pool);
  const allocated = raw.map((value) => Math.floor(value));
  let remainder = pool - allocated.reduce((sum, value) => sum + value, 0);

  for (let index = 0; index < allocated.length && remainder > 0; index += 1) {
    allocated[index] += 1;
    remainder -= 1;
    if (index === allocated.length - 1 && remainder > 0) index = -1;
  }

  return allocated;
}

function allocatePointPoolByWeights(pool: number, weights: number[]) {
  if (pool <= 0 || weights.length === 0) return weights.map(() => 0);

  const tenPointUnits = Math.floor(pool / 10);
  const allocatedUnits = allocatePoolByWeights(tenPointUnits, weights);
  const allocated = allocatedUnits.map((value) => value * 10);
  const leftover = pool - allocated.reduce((sum, value) => sum + value, 0);

  if (leftover > 0) {
    allocated[0] = (allocated[0] ?? 0) + leftover;
  }

  return allocated;
}

function splitTierEvenly(total: number, count: number) {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  let remainder = total - (base * count);
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

function splitTierPointsForPreview(total: number, count: number) {
  if (count <= 0) return [];
  if (total <= 0) return Array.from({ length: count }, () => 0);

  const baseRounded = Math.floor((total / count) / 10) * 10;
  const allocated = Array.from({ length: count }, () => baseRounded);
  let remainder = total - (baseRounded * count);

  for (let index = 0; index < allocated.length && remainder >= 10; index += 1) {
    allocated[index] += 10;
    remainder -= 10;
  }

  return allocated;
}

function buildPreviewTierRanges(winnersCount: number): RewardTierRange[] {
  if (winnersCount <= 0) return [];

  const tiers: RewardTierRange[] = [];
  let previousEnd = 0;

  for (const tierEnd of PREVIEW_TIER_ENDS) {
    if (previousEnd >= winnersCount) break;
    const boundedEnd = Math.min(tierEnd, winnersCount);
    if (boundedEnd <= previousEnd) continue;
    tiers.push({
      rankStart: previousEnd + 1,
      rankEnd: boundedEnd,
      size: boundedEnd - previousEnd,
    });
    previousEnd = boundedEnd;
  }

  if (previousEnd < winnersCount) {
    tiers.push({
      rankStart: previousEnd + 1,
      rankEnd: winnersCount,
      size: winnersCount - previousEnd,
    });
  }

  return tiers;
}

function buildPreviewRow(tier: RewardTierRange, perRankPoints: number[], perRankPacks: number[]): RewardPreviewAllocationRow {
  const pointSlice = perRankPoints.slice(tier.rankStart - 1, tier.rankEnd);
  const packSlice = perRankPacks.slice(tier.rankStart - 1, tier.rankEnd);

  return {
    rankStart: tier.rankStart,
    rankEnd: tier.rankEnd,
    label: formatTierLabel(tier.rankStart, tier.rankEnd),
    winnersCount: tier.size,
    pointsReward: pointSlice.reduce((sum, value) => sum + value, 0),
    packsReward: packSlice.reduce((sum, value) => sum + value, 0),
    pointsPerWinnerMin: pointSlice.length > 0 ? Math.min(...pointSlice) : 0,
    pointsPerWinnerMax: pointSlice.length > 0 ? Math.max(...pointSlice) : 0,
    packsPerWinnerMin: packSlice.length > 0 ? Math.min(...packSlice) : 0,
    packsPerWinnerMax: packSlice.length > 0 ? Math.max(...packSlice) : 0,
  };
}

function formatTierLabel(rankStart: number, rankEnd: number) {
  return rankStart === rankEnd ? `#${rankStart}` : `#${rankStart}–${rankEnd}`;
}
