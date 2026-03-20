import type {
  ContestRewardConfig,
  ContestRewardDistributionProfile,
} from "@/lib/domain/contests/reward-distribution";

export type RewardPreviewAllocation = {
  participantsCount: number;
  winnersCount: number;
  rows: Array<{
    rank: number;
    pointsReward: number;
    packsReward: number;
  }>;
  totalPoints: number;
  totalPacks: number;
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
  const weights = buildRankWeights(winnersCount, input.rewardConfig.distributionProfile);
  const pointsReward = allocatePool(Math.max(0, Math.floor(input.rewardConfig.pointsPool)), weights);
  const packsReward = allocatePool(Math.max(0, Math.floor(input.rewardConfig.packPool)), weights);
  const rows = Array.from({ length: winnersCount }, (_, index) => ({
    rank: index + 1,
    pointsReward: pointsReward[index] ?? 0,
    packsReward: packsReward[index] ?? 0,
  }));

  return {
    participantsCount,
    winnersCount,
    rows,
    totalPoints: rows.reduce((sum, row) => sum + row.pointsReward, 0),
    totalPacks: rows.reduce((sum, row) => sum + row.packsReward, 0),
  };
}

const PROFILE_ALPHA: Record<ContestRewardDistributionProfile, number> = {
  balanced: 0.8,
  "top-heavy": 1.2,
  "very-top-heavy": 1.6,
};

function buildRankWeights(winnersCount: number, distributionProfile: ContestRewardDistributionProfile) {
  const alpha = PROFILE_ALPHA[distributionProfile];
  return Array.from({ length: winnersCount }, (_, index) => 1 / Math.pow(index + 1, alpha));
}

function allocatePool(pool: number, weights: number[]) {
  if (pool <= 0 || weights.length === 0) return weights.map(() => 0);

  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
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
