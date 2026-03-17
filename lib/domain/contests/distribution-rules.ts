export const DISTRIBUTION_RULE_TYPES = {
  FIXED_RANKS: "FIXED_RANKS",
  TOP_N: "TOP_N",
  TOP_PERCENT: "TOP_PERCENT",
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

  if (rule.ruleType === DISTRIBUTION_RULE_TYPES.TOP_PERCENT) {
    if (!rule.topPercent || rankingSize <= 0) return false;
    const winnerCount = Math.ceil((rankingSize * rule.topPercent) / 100);
    return rank <= Math.max(1, winnerCount);
  }

  return false;
}

export function findDistributionRuleOverlapIssues(
  rules: DistributionRuleLike[],
  rankingSize: number,
  maxIssues = 5
) {
  const issues: string[] = [];

  for (let rank = 1; rank <= rankingSize; rank += 1) {
    const matches = rules.filter((rule) => matchesDistributionRule(rule, rank, rankingSize));
    if (matches.length <= 1) continue;

    issues.push(`rank ${rank} matches multiple rules (${matches.map((rule) => rule.id).join(", ")})`);
    if (issues.length >= maxIssues) break;
  }

  return issues;
}
