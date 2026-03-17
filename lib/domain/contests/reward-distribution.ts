export type ContestRewardDistributionProfile = "balanced" | "top-heavy" | "very-top-heavy";

export type ContestRewardConfig = {
  pointsPool: number;
  packPool: number;
  rewardedTopPercent: number;
  distributionProfile: ContestRewardDistributionProfile;
};

export type ComputedReward = {
  userId: string;
  rank: number;
  pointsReward: number;
  packsReward: number;
};

const PROFILE_ALPHA: Record<ContestRewardDistributionProfile, number> = {
  balanced: 0.8,
  "top-heavy": 1.2,
  "very-top-heavy": 1.6,
};

export function computeRewards(input: {
  participantsCount: number;
  ranking: string[];
  config: ContestRewardConfig;
}): ComputedReward[] {
  const participantsCount = Math.max(0, Math.floor(input.participantsCount));
  if (participantsCount === 0 || input.ranking.length === 0) return [];

  const { pointsPool, packPool, rewardedTopPercent, distributionProfile } = input.config;
  const effectivePercent = Math.max(1, Math.min(100, Math.floor(rewardedTopPercent)));
  const rewardedCount = Math.min(
    input.ranking.length,
    Math.max(1, Math.floor((participantsCount * effectivePercent) / 100))
  );

  const alpha = PROFILE_ALPHA[distributionProfile];
  const weights = Array.from({ length: rewardedCount }, (_, index) => 1 / Math.pow(index + 1, alpha));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);

  const rawPoints = weights.map((weight) => (weight / totalWeight) * Math.max(0, Math.floor(pointsPool)));
  const pointsReward = floorAndDistributeRemainder(rawPoints);

  const rawPacks = weights.map((weight) => (weight / totalWeight) * Math.max(0, Math.floor(packPool)));
  const packsReward = floorAndDistributeRemainder(rawPacks);

  return input.ranking.slice(0, rewardedCount).map((userId, index) => ({
    userId,
    rank: index + 1,
    pointsReward: pointsReward[index] ?? 0,
    packsReward: packsReward[index] ?? 0,
  }));
}

function floorAndDistributeRemainder(raw: number[]) {
  const floored = raw.map((value) => Math.floor(value));
  const remainder = Math.round(raw.reduce((sum, value) => sum + value, 0) - floored.reduce((sum, value) => sum + value, 0));

  if (remainder <= 0) return floored;

  const residualByIndex = raw
    .map((value, index) => ({ index, residual: value - Math.floor(value) }))
    .sort((a, b) => b.residual - a.residual || a.index - b.index);

  for (let i = 0; i < remainder; i += 1) {
    const target = residualByIndex[i % residualByIndex.length];
    floored[target.index] += 1;
  }

  return floored;
}
