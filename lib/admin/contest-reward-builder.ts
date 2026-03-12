export type RewardType = "POINTS" | "XP" | "PACK";
export type DistributionType = "FIXED_RANKS" | "TOP_N" | "TOP_PERCENT";

export type RewardRuleDraft = {
  id: string;
  label: string;
  rewardType: RewardType;
  amount: number;
  packDefinitionId: string;
  distributionType: DistributionType;
  distributionValue: number;
};

export type RewardBuilderAction =
  | { type: "add"; rule?: Partial<RewardRuleDraft> }
  | { type: "remove"; id: string }
  | { type: "update"; id: string; patch: Partial<RewardRuleDraft> }
  | { type: "move"; id: string; direction: "up" | "down" };

export function createRewardRuleDraft(partial?: Partial<RewardRuleDraft>): RewardRuleDraft {
  return {
    id: partial?.id ?? `rule_${Math.random().toString(36).slice(2, 9)}`,
    label: partial?.label ?? "",
    rewardType: partial?.rewardType ?? "POINTS",
    amount: partial?.amount ?? 1000,
    packDefinitionId: partial?.packDefinitionId ?? "",
    distributionType: partial?.distributionType ?? "TOP_N",
    distributionValue: partial?.distributionValue ?? 10,
  };
}

export function rewardRuleReducer(state: RewardRuleDraft[], action: RewardBuilderAction): RewardRuleDraft[] {
  if (action.type === "add") {
    return [...state, createRewardRuleDraft(action.rule)];
  }

  if (action.type === "remove") {
    return state.filter((rule) => rule.id !== action.id);
  }

  if (action.type === "update") {
    return state.map((rule) => (rule.id === action.id ? { ...rule, ...action.patch } : rule));
  }

  const index = state.findIndex((rule) => rule.id === action.id);
  if (index < 0) return state;
  const target = action.direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= state.length) return state;
  const copy = [...state];
  const [item] = copy.splice(index, 1);
  copy.splice(target, 0, item);
  return copy;
}

export function describeDistribution(type: DistributionType, value: number) {
  if (!Number.isFinite(value) || value <= 0) return "No target";
  if (type === "FIXED_RANKS") return `Rank #${Math.floor(value)}`;
  if (type === "TOP_N") return `Top ${Math.floor(value)}`;
  return `Top ${Math.floor(value)}%`;
}

export function describeRewardRule(rule: RewardRuleDraft) {
  const target = describeDistribution(rule.distributionType, rule.distributionValue);
  const amount = Number.isFinite(rule.amount) ? Math.max(0, Math.floor(rule.amount)) : 0;
  if (rule.rewardType === "PACK") {
    const packId = rule.packDefinitionId.trim() || "pack-definition";
    return `${target} receive ${amount} pack(s) each (${packId}).`;
  }

  const unit = rule.rewardType === "XP" ? "XP" : "points";
  return `${target} receive ${amount.toLocaleString()} ${unit} each.`;
}

export function toContestRewardPayload(rules: RewardRuleDraft[]) {
  const validRules = rules.filter((rule) => {
    if (!Number.isInteger(rule.amount) || rule.amount <= 0) return false;
    if (!Number.isInteger(rule.distributionValue) || rule.distributionValue <= 0) return false;
    if (rule.rewardType === "PACK" && !rule.packDefinitionId.trim()) return false;
    return true;
  });

  const rewardBundles = validRules.map((rule, index) => {
    const name = `rule_bundle_${rule.id}`;
    const component = rule.rewardType === "PACK"
      ? { type: "PACK" as const, packDefinitionId: rule.packDefinitionId.trim(), packQuantity: rule.amount }
      : rule.rewardType === "XP"
        ? { type: "XP" as const, xpAmount: rule.amount }
        : { type: "POINTS" as const, pointsAmount: rule.amount };

    return {
      name,
      priority: index + 1,
      components: [component],
    };
  });

  const distributionRules = validRules.map((rule, index) => {
    const bundleRef = `rule_bundle_${rule.id}`;
    if (rule.distributionType === "FIXED_RANKS") {
      return { priority: index + 1, ruleType: "FIXED_RANKS" as const, bundleRef, rankFrom: rule.distributionValue, rankTo: rule.distributionValue };
    }
    if (rule.distributionType === "TOP_N") {
      return { priority: index + 1, ruleType: "TOP_N" as const, bundleRef, topN: rule.distributionValue };
    }
    return { priority: index + 1, ruleType: "TOP_PERCENT" as const, bundleRef, topPercent: rule.distributionValue };
  });

  return { rewardBundles, distributionRules };
}
