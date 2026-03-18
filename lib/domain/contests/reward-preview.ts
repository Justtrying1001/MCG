import type { ContestStatus } from "@prisma/client";
import { type ContestRewardConfig } from "@/lib/domain/contests/reward-distribution";
import { buildContestRewardPlanItems, type RewardPlanBundleLike, type RewardPlanRuleLike } from "@/lib/domain/contests/reward-plan";

export type RewardPreviewTier = {
  label: string;
  bundleName: string;
  pointsAmount: number;
  xpAmount: number;
  packsCount: number;
  winnerLabel?: string | null;
};

export function parseRewardConfig(value: unknown): ContestRewardConfig | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const pointsPool = Number(raw.pointsPool);
  const packPool = Number(raw.packPool);
  const rewardedTopPercent = Number(raw.rewardedTopPercent);
  const distributionProfile = raw.distributionProfile;

  if (!Number.isFinite(pointsPool) || !Number.isFinite(packPool) || !Number.isFinite(rewardedTopPercent)) return null;
  if (distributionProfile !== "balanced" && distributionProfile !== "top-heavy" && distributionProfile !== "very-top-heavy") return null;

  return {
    pointsPool: Math.max(0, Math.floor(pointsPool)),
    packPool: Math.max(0, Math.floor(packPool)),
    rewardedTopPercent: Math.max(1, Math.min(100, Math.floor(rewardedTopPercent))),
    distributionProfile,
  };
}

export function buildContestRewardPreview(params: {
  status: ContestStatus;
  participantCount: number;
  rankingRows: Array<{ userId: string; rank: number; displayName?: string | null }>;
  rewardConfig: ContestRewardConfig | null;
  rewardPolicyStatus: string | null;
  rules: RewardPlanRuleLike[];
  bundles: RewardPlanBundleLike[];
}) {
  const participantCount = Math.max(0, params.participantCount);
  const hasPublishedPolicy = params.rewardPolicyStatus === "PUBLISHED" && params.rules.length > 0 && params.bundles.length > 0;
  const shouldPreferPolicy = hasPublishedPolicy && (params.status === "LIVE" || params.status === "SETTLED");
  const effectiveRewardConfig = shouldPreferPolicy ? null : params.rewardConfig;
  const effectiveRules = shouldPreferPolicy ? params.rules : [];
  const effectiveBundles = shouldPreferPolicy ? params.bundles : [];
  const hasPolicyData = Boolean(effectiveRewardConfig || shouldPreferPolicy);

  if (!hasPolicyData) {
    return { hasPolicyData: false, tiers: [] as RewardPreviewTier[], summary: null };
  }

  const rows = buildContestRewardPlanItems({
    participantCount,
    rankingRows: params.rankingRows,
    rewardConfig: effectiveRewardConfig,
    rules: effectiveRules,
    bundles: effectiveBundles,
    defaultPackDefinitionId: null,
  });

  const tiers: RewardPreviewTier[] = rows.map((row) => ({
    label: `Rank #${row.rank}`,
    bundleName: row.sourceBundleName ?? (effectiveRewardConfig ? "Simple pool" : "Reward tier"),
    pointsAmount: row.pointsTotal,
    xpAmount: row.xpTotal,
    packsCount: row.packsTotal,
    winnerLabel: row.displayName ?? null,
  }));

  return {
    hasPolicyData: true,
    tiers,
    summary: effectiveRewardConfig
      ? {
          pointsPool: effectiveRewardConfig.pointsPool,
          packPool: effectiveRewardConfig.packPool,
          rewardedTopPercent: effectiveRewardConfig.rewardedTopPercent,
          rewardedWinners: tiers.length,
          participantCount,
        }
      : null,
  };
}
