import { DISTRIBUTION_RULE_TYPES, DistributionRuleType, findMatchingDistributionRulesForRank } from "@/lib/domain/contests/distribution-rules";
import { computeRewards, type ContestRewardConfig } from "@/lib/domain/contests/reward-distribution";

export type ResolvedRewardComponent =
  | { type: "POINTS"; amount: number }
  | { type: "XP"; amount: number }
  | { type: "PACK"; packDefinitionId: string | null; quantity: number };

export type RewardPlanRuleLike = {
  id: string;
  priority: number;
  ruleType: DistributionRuleType;
  rankFrom: number | null;
  rankTo: number | null;
  topN: number | null;
  topPercent: number | null;
  poolAmount: number | null;
  bundleId: string;
};

export type RewardPlanBundleLike = {
  id: string;
  name: string;
  components: Array<{
    type: "POINTS" | "XP" | "PACK";
    pointsAmount: number | null;
    xpAmount: number | null;
    packDefinitionId: string | null;
    packQuantity: number | null;
  }>;
};

export type RewardPlanRankingRow = {
  userId: string;
  rank: number;
  displayName?: string | null;
};

export type RewardPlanItem = {
  userId: string;
  rank: number;
  displayName: string | null;
  sourceRuleId: string | null;
  sourceRuleType: string | null;
  sourceBundleId: string | null;
  sourceBundleName: string | null;
  rewardComponents: ResolvedRewardComponent[];
  pointsTotal: number;
  xpTotal: number;
  packsTotal: number;
};

export function buildContestRewardPlanItems(input: {
  participantCount: number;
  rankingRows: RewardPlanRankingRow[];
  rewardConfig: ContestRewardConfig | null;
  rules: RewardPlanRuleLike[];
  bundles: RewardPlanBundleLike[];
  defaultPackDefinitionId?: string | null;
}): RewardPlanItem[] {
  const participantCount = Math.max(0, Math.floor(input.participantCount));
  if (participantCount === 0) return [];

  const rankingRows = normalizeRankingRows(input.rankingRows, participantCount);
  if (rankingRows.length === 0) return [];

  if (input.rewardConfig) {
    return buildSimplePoolRewardItems({
      rankingRows,
      participantCount,
      rewardConfig: input.rewardConfig,
      defaultPackDefinitionId: input.defaultPackDefinitionId ?? null,
    });
  }

  return buildPolicyRewardItems({
    rankingRows,
    participantCount,
    rules: input.rules,
    bundles: input.bundles,
  });
}

function buildSimplePoolRewardItems(input: {
  rankingRows: RewardPlanRankingRow[];
  participantCount: number;
  rewardConfig: ContestRewardConfig;
  defaultPackDefinitionId: string | null;
}): RewardPlanItem[] {
  const rewards = computeRewards({
    participantsCount: input.participantCount,
    ranking: input.rankingRows.map((row) => row.userId),
    config: input.rewardConfig,
  });

  return rewards.map((reward) => {
    const rankingRow = input.rankingRows.find((row) => row.rank === reward.rank) ?? null;
    const rewardComponents: ResolvedRewardComponent[] = [];
    if (reward.pointsReward > 0) rewardComponents.push({ type: "POINTS", amount: reward.pointsReward });
    if (reward.packsReward > 0) {
      rewardComponents.push({ type: "PACK", packDefinitionId: input.defaultPackDefinitionId, quantity: reward.packsReward });
    }

    return {
      userId: reward.userId,
      rank: reward.rank,
      displayName: rankingRow?.displayName ?? null,
      sourceRuleId: null,
      sourceRuleType: "SIMPLE_POOL",
      sourceBundleId: null,
      sourceBundleName: "Simple pool",
      rewardComponents,
      pointsTotal: reward.pointsReward,
      xpTotal: 0,
      packsTotal: reward.packsReward,
    };
  });
}

function buildPolicyRewardItems(input: {
  rankingRows: RewardPlanRankingRow[];
  participantCount: number;
  rules: RewardPlanRuleLike[];
  bundles: RewardPlanBundleLike[];
}): RewardPlanItem[] {
  const bundleById = new Map(input.bundles.map((bundle) => [bundle.id, bundle]));
  const items: RewardPlanItem[] = [];

  for (const ranking of input.rankingRows) {
    const matchedRules = findMatchingDistributionRulesForRank<RewardPlanRuleLike>(input.rules, ranking.rank, input.participantCount);
    if (matchedRules.length === 0) continue;

    const rewardComponents: ResolvedRewardComponent[] = [];
    const ruleIds: string[] = [];
    const bundleIds: string[] = [];
    const bundleNames: string[] = [];

    for (const matchedRule of matchedRules) {
      const bundle = bundleById.get(matchedRule.bundleId);
      if (!bundle) continue;

      ruleIds.push(matchedRule.id);
      bundleIds.push(bundle.id);
      bundleNames.push(bundle.name);

      if (matchedRule.ruleType === DISTRIBUTION_RULE_TYPES.POINTS_POOL_TOP_PERCENT) {
        const topPercent = matchedRule.topPercent ?? 0;
        const poolAmount = matchedRule.poolAmount ?? 0;
        if (topPercent <= 0 || topPercent > 100 || !Number.isInteger(poolAmount) || poolAmount <= 0) {
          continue;
        }

        const winnerCount = Math.max(1, Math.ceil((input.participantCount * topPercent) / 100));
        const baseShare = Math.floor(poolAmount / winnerCount);
        const remainder = poolAmount % winnerCount;
        const bonus = ranking.rank <= remainder ? 1 : 0;
        const amount = baseShare + bonus;
        if (amount > 0) rewardComponents.push({ type: "POINTS", amount });
        continue;
      }

      rewardComponents.push(...resolveBundleComponents(bundle.components));
    }

    const pointsTotal = rewardComponents.reduce((sum, component) => sum + (component.type === "POINTS" ? component.amount : 0), 0);
    const xpTotal = rewardComponents.reduce((sum, component) => sum + (component.type === "XP" ? component.amount : 0), 0);
    const packsTotal = rewardComponents.reduce((sum, component) => sum + (component.type === "PACK" ? component.quantity : 0), 0);

    items.push({
      userId: ranking.userId,
      rank: ranking.rank,
      displayName: ranking.displayName ?? null,
      sourceRuleId: ruleIds.join(",") || null,
      sourceRuleType: matchedRules.length > 1 ? "MULTI_RULE" : matchedRules[0]?.ruleType ?? null,
      sourceBundleId: [...new Set(bundleIds)].join(",") || null,
      sourceBundleName: [...new Set(bundleNames)].join(" + ") || null,
      rewardComponents,
      pointsTotal,
      xpTotal,
      packsTotal,
    });
  }

  return items;
}

function normalizeRankingRows(rankingRows: RewardPlanRankingRow[], participantCount: number): RewardPlanRankingRow[] {
  const normalized = rankingRows
    .filter((row) => Number.isInteger(row.rank) && row.rank > 0)
    .slice()
    .sort((a, b) => a.rank - b.rank || a.userId.localeCompare(b.userId));

  if (normalized.length >= participantCount) {
    return normalized.slice(0, participantCount);
  }

  const byRank = new Map(normalized.map((row) => [row.rank, row]));
  const rows: RewardPlanRankingRow[] = [];
  for (let rank = 1; rank <= participantCount; rank += 1) {
    rows.push(byRank.get(rank) ?? { userId: `rank-${rank}`, rank, displayName: null });
  }
  return rows;
}

function resolveBundleComponents(
  components: Array<{
    type: "POINTS" | "PACK" | "XP";
    pointsAmount: number | null;
    xpAmount: number | null;
    packDefinitionId: string | null;
    packQuantity: number | null;
  }>
): ResolvedRewardComponent[] {
  const resolved: ResolvedRewardComponent[] = [];

  for (const component of components) {
    if (component.type === "POINTS" && Number.isInteger(component.pointsAmount) && (component.pointsAmount ?? 0) > 0) {
      resolved.push({ type: "POINTS", amount: component.pointsAmount! });
      continue;
    }

    if (component.type === "XP" && Number.isInteger(component.xpAmount) && (component.xpAmount ?? 0) > 0) {
      resolved.push({ type: "XP", amount: component.xpAmount! });
      continue;
    }

    if (component.type === "PACK" && component.packDefinitionId && Number.isInteger(component.packQuantity) && (component.packQuantity ?? 0) > 0) {
      resolved.push({ type: "PACK", packDefinitionId: component.packDefinitionId, quantity: component.packQuantity! });
    }
  }

  return resolved;
}
