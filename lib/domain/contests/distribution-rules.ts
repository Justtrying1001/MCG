export const DISTRIBUTION_RULE_TYPES = {
  FIXED_RANKS: "FIXED_RANKS",
  TOP_N: "TOP_N",
  TOP_PERCENT: "TOP_PERCENT",
  POINTS_POOL_TOP_PERCENT: "POINTS_POOL_TOP_PERCENT",
} as const;

export type DistributionRuleType = (typeof DISTRIBUTION_RULE_TYPES)[keyof typeof DISTRIBUTION_RULE_TYPES];

export type DistributionRuleLike = {
  id: string;
  ruleType: DistributionRuleType;
  rankFrom: number | null;
  rankTo: number | null;
  topN: number | null;
  topPercent: number | null;
};

export function matchesDistributionRule(rule: Omit<DistributionRuleLike, "id">, rank: number, rankingSize: number) {
  if (rule.ruleType === DISTRIBUTION_RULE_TYPES.FIXED_RANKS) {
    if (!rule.rankFrom || !rule.rankTo) return false;
    return rank >= rule.rankFrom && rank <= rule.rankTo;
  }

  if (rule.ruleType === DISTRIBUTION_RULE_TYPES.TOP_N) {
    return !!rule.topN && rank <= rule.topN;
  }

  if (rule.ruleType === DISTRIBUTION_RULE_TYPES.TOP_PERCENT || rule.ruleType === DISTRIBUTION_RULE_TYPES.POINTS_POOL_TOP_PERCENT) {
    if (!rule.topPercent || rankingSize <= 0) return false;
    const winnerCount = Math.ceil((rankingSize * rule.topPercent) / 100);
    return rank <= Math.max(1, winnerCount);
  }

  return false;
}

export function findMatchingDistributionRulesForRank<T extends DistributionRuleLike>(rules: T[], rank: number, rankingSize: number): T[] {
  return rules.filter((rule) => matchesDistributionRule(rule, rank, rankingSize));
}
