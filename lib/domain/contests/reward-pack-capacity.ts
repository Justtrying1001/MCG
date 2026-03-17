import { ContestRewardDistributionRuleType, ContestRewardType, Prisma, RewardType } from "@prisma/client";

import { MVP_REWARD_PACK_CODE, MVP_REWARD_PACK_TOTAL_SUPPLY } from "@/lib/domain/acquisition/constants";
import { prisma } from "@/lib/prisma";

export type ContestRewardPackCapacityVerdict =
  | "OK"
  | "INSUFFICIENT_SUPPLY"
  | "INVALID_REWARD_CONFIG"
  | "UNKNOWN_PACK"
  | "REWARD_POOL_MISSING";

type CapacityTx = Prisma.TransactionClient | typeof prisma;

type ContestDraftForCapacity = {
  id: string;
  rewardPolicy: {
    bundles: ReadonlyArray<{
      id: string;
      components: ReadonlyArray<{
        type: ContestRewardType;
        packDefinitionId: string | null;
        packQuantity: number | null;
      }>;
    }>;
    distributionRules: ReadonlyArray<{
      id: string;
      bundleId: string;
      priority: number;
      ruleType: ContestRewardDistributionRuleType;
      rankFrom: number | null;
      rankTo: number | null;
      topN: number | null;
      topPercent: number | null;
    }>;
  } | null;
};

type ContestRewardDistributionRuleForCapacity = NonNullable<ContestDraftForCapacity["rewardPolicy"]>["distributionRules"][number];

export type ContestRewardPackCapacityIssue = {
  verdict: Exclude<ContestRewardPackCapacityVerdict, "OK">;
  message: string;
  field?: string;
};

export type ContestRewardPackCapacityRow = {
  packDefinitionId: string;
  packCode: string | null;
  required: number;
  totalSupply: number;
  attributed: number;
  available: number;
  shortfall: number;
  verdict: ContestRewardPackCapacityVerdict;
};

export type ContestRewardPackCapacityResult = {
  verdict: ContestRewardPackCapacityVerdict;
  isPublishable: boolean;
  requiredTotal: number;
  availableTotal: number;
  shortfallTotal: number;
  rows: ContestRewardPackCapacityRow[];
  issues: ContestRewardPackCapacityIssue[];
};

function ruleWinnerCount(rule: ContestRewardDistributionRuleForCapacity) {
  if (rule.ruleType === ContestRewardDistributionRuleType.FIXED_RANKS) {
    if (!Number.isInteger(rule.rankFrom) || !Number.isInteger(rule.rankTo) || (rule.rankFrom ?? 0) <= 0 || (rule.rankTo ?? 0) <= 0 || (rule.rankTo ?? 0) < (rule.rankFrom ?? 0)) {
      return null;
    }
    return (rule.rankTo as number) - (rule.rankFrom as number) + 1;
  }

  if (rule.ruleType === ContestRewardDistributionRuleType.TOP_N) {
    if (!Number.isInteger(rule.topN) || (rule.topN ?? 0) <= 0) {
      return null;
    }
    return rule.topN as number;
  }

  return null;
}

function totalSupplyForPack(packCode: string, plannedPackCount: number, trackedTotalSupply: number | null) {
  if (trackedTotalSupply !== null) return trackedTotalSupply;
  if (packCode === MVP_REWARD_PACK_CODE) return MVP_REWARD_PACK_TOTAL_SUPPLY;
  return Math.max(plannedPackCount, 0);
}

function globalVerdict(rows: ContestRewardPackCapacityRow[], issues: ContestRewardPackCapacityIssue[]): ContestRewardPackCapacityVerdict {
  if (issues.some((issue) => issue.verdict === "INVALID_REWARD_CONFIG")) return "INVALID_REWARD_CONFIG";
  if (rows.some((row) => row.verdict === "UNKNOWN_PACK")) return "UNKNOWN_PACK";
  if (rows.some((row) => row.verdict === "REWARD_POOL_MISSING")) return "REWARD_POOL_MISSING";
  if (rows.some((row) => row.verdict === "INSUFFICIENT_SUPPLY")) return "INSUFFICIENT_SUPPLY";
  return "OK";
}

export async function evaluateContestRewardPackCapacity(params: {
  contest: ContestDraftForCapacity;
  tx?: CapacityTx;
}): Promise<ContestRewardPackCapacityResult> {
  const tx = params.tx ?? prisma;
  const issues: ContestRewardPackCapacityIssue[] = [];

  if (!params.contest.rewardPolicy) {
    return {
      verdict: "INVALID_REWARD_CONFIG",
      isPublishable: false,
      requiredTotal: 0,
      availableTotal: 0,
      shortfallTotal: 0,
      rows: [],
      issues: [{ verdict: "INVALID_REWARD_CONFIG", message: "Reward policy is missing", field: "rewardPolicy" }],
    };
  }

  const bundleById = new Map(params.contest.rewardPolicy.bundles.map((bundle) => [bundle.id, bundle]));
  const requiredByPackDefinition = new Map<string, number>();

  const sortedRules = [...params.contest.rewardPolicy.distributionRules].sort((a, b) => a.priority - b.priority);
  for (const rule of sortedRules) {

    if (rule.ruleType === "POINTS_POOL_TOP_PERCENT") {
      const bundle = bundleById.get(rule.bundleId);
      if (!bundle) {
        issues.push({
          verdict: "INVALID_REWARD_CONFIG",
          field: `distributionRules.${rule.id}.bundleId`,
          message: "Distribution rule references an unknown bundle",
        });
        continue;
      }

      const hasPackComponent = bundle.components.some((component) => component.type === ContestRewardType.PACK);
      if (hasPackComponent) {
        issues.push({
          verdict: "INVALID_REWARD_CONFIG",
          field: `distributionRules.${rule.id}`,
          message: "POINTS_POOL_TOP_PERCENT cannot be used with PACK bundle components",
        });
      }
      continue;
    }

    if (rule.ruleType === ContestRewardDistributionRuleType.TOP_PERCENT) {
      issues.push({
        verdict: "INVALID_REWARD_CONFIG",
        field: `distributionRules.${rule.id}`,
        message: "TOP_PERCENT rules are not capacity-estimable before publish. Use FIXED_RANKS or TOP_N for pack rewards.",
      });
      continue;
    }

    const bundle = bundleById.get(rule.bundleId);
    if (!bundle) {
      issues.push({
        verdict: "INVALID_REWARD_CONFIG",
        field: `distributionRules.${rule.id}.bundleId`,
        message: "Distribution rule references an unknown bundle",
      });
      continue;
    }

    const winners = ruleWinnerCount(rule);
    if (!winners || winners <= 0) {
      issues.push({
        verdict: "INVALID_REWARD_CONFIG",
        field: `distributionRules.${rule.id}`,
        message: "Distribution rule winner count is invalid",
      });
      continue;
    }

    for (const component of bundle.components) {
      if (component.type !== ContestRewardType.PACK) continue;

      if (!component.packDefinitionId) {
        issues.push({
          verdict: "INVALID_REWARD_CONFIG",
          field: `rewardBundle.${bundle.id}`,
          message: "PACK reward component is missing packDefinitionId",
        });
        continue;
      }

      if (!Number.isInteger(component.packQuantity) || (component.packQuantity ?? 0) <= 0) {
        issues.push({
          verdict: "INVALID_REWARD_CONFIG",
          field: `rewardBundle.${bundle.id}`,
          message: "PACK reward component requires positive integer packQuantity",
        });
        continue;
      }

      const requiredForComponent = winners * (component.packQuantity as number);
      requiredByPackDefinition.set(
        component.packDefinitionId,
        (requiredByPackDefinition.get(component.packDefinitionId) ?? 0) + requiredForComponent,
      );
    }
  }

  const requiredPackDefinitionIds = [...requiredByPackDefinition.keys()];
  if (requiredPackDefinitionIds.length === 0) {
    const verdict = globalVerdict([], issues);
    return {
      verdict,
      isPublishable: verdict === "OK",
      requiredTotal: 0,
      availableTotal: 0,
      shortfallTotal: 0,
      rows: [],
      issues,
    };
  }

  const packDefinitions = await tx.packDefinition.findMany({
    where: { id: { in: requiredPackDefinitionIds } },
    select: { id: true, code: true, source: true, plannedPackCount: true },
  });
  const packById = new Map(packDefinitions.map((pack) => [pack.id, pack]));

  const rows: ContestRewardPackCapacityRow[] = [];

  for (const packDefinitionId of requiredPackDefinitionIds) {
    const required = requiredByPackDefinition.get(packDefinitionId) ?? 0;
    const pack = packById.get(packDefinitionId);

    if (!pack) {
      rows.push({
        packDefinitionId,
        packCode: null,
        required,
        totalSupply: 0,
        attributed: 0,
        available: 0,
        shortfall: required,
        verdict: "UNKNOWN_PACK",
      });
      continue;
    }

    if (pack.source !== "REWARD") {
      issues.push({
        verdict: "INVALID_REWARD_CONFIG",
        field: `packDefinition.${pack.id}`,
        message: `Pack ${pack.code} is not a REWARD pack and cannot be used in contest reward policy`,
      });
      rows.push({
        packDefinitionId: pack.id,
        packCode: pack.code,
        required,
        totalSupply: 0,
        attributed: 0,
        available: 0,
        shortfall: required,
        verdict: "INVALID_REWARD_CONFIG",
      });
      continue;
    }

    const [trackedPool, attributed] = await Promise.all([
      tx.rewardPackSupply.findUnique({ where: { id: pack.code }, select: { totalSupply: true } }),
      tx.rewardGrant.count({ where: { type: RewardType.PACK, packDefinitionId: pack.id } }),
    ]);

    if (!trackedPool) {
      rows.push({
        packDefinitionId: pack.id,
        packCode: pack.code,
        required,
        totalSupply: 0,
        attributed,
        available: 0,
        shortfall: required,
        verdict: "REWARD_POOL_MISSING",
      });
      continue;
    }

    const totalSupply = totalSupplyForPack(pack.code, pack.plannedPackCount, trackedPool.totalSupply);
    const available = Math.max(totalSupply - attributed, 0);
    const shortfall = Math.max(required - available, 0);

    rows.push({
      packDefinitionId: pack.id,
      packCode: pack.code,
      required,
      totalSupply,
      attributed,
      available,
      shortfall,
      verdict: shortfall > 0 ? "INSUFFICIENT_SUPPLY" : "OK",
    });
  }

  const requiredTotal = rows.reduce((sum, row) => sum + row.required, 0);
  const availableTotal = rows.reduce((sum, row) => sum + row.available, 0);
  const shortfallTotal = rows.reduce((sum, row) => sum + row.shortfall, 0);
  const verdict = globalVerdict(rows, issues);

  return {
    verdict,
    isPublishable: verdict === "OK",
    requiredTotal,
    availableTotal,
    shortfallTotal,
    rows: rows.sort((a, b) => (b.shortfall - a.shortfall) || (b.required - a.required) || (a.packCode ?? "").localeCompare(b.packCode ?? "")),
    issues,
  };
}
