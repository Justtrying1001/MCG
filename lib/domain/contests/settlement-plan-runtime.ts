import { ContestStatus, Prisma, RewardType, ContestEntryStatus } from "@prisma/client";

import { ContestRuntimeError } from "@/lib/domain/contests/runtime";
import { DISTRIBUTION_RULE_TYPES, DistributionRuleType, findMatchingDistributionRulesForRank } from "@/lib/domain/contests/distribution-rules";
import { computeRewards, type ContestRewardConfig } from "@/lib/domain/contests/reward-distribution";
import { prisma } from "@/lib/prisma";
import { grantRewardPackByDefinitionTx } from "@/lib/domain/acquisition/open-pack";

const SETTLEMENT_PLAN_STATUS = {
  DRAFT: "DRAFT",
  EXECUTED: "EXECUTED",
  CANCELED: "CANCELED",
} as const;

type ResolvedComponent =
  | { type: "POINTS"; amount: number }
  | { type: "XP"; amount: number }
  | { type: "PACK"; packDefinitionId: string; quantity: number };

type RuleLike = {
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

export async function generateSettlementPlan(contestId: string) {
  return prisma.$transaction(async (tx) => {
    const contest = await tx.contest.findUnique({
      where: { id: contestId },
      include: {
        _count: { select: { entries: true } },
        rules: { orderBy: { id: "asc" } },
        rewardPolicy: {
          include: {
            bundles: { include: { components: true } },
            distributionRules: { orderBy: [{ priority: "asc" }, { id: "asc" }] },
          },
        },
        rankings: { orderBy: [{ rank: "asc" }], select: { userId: true, rank: true, score: true } },
        settlements: { select: { id: true } },
      },
    });

    if (!contest) throw new ContestRuntimeError("Contest not found", 404);
    if (contest.settlements.length > 0) throw new ContestRuntimeError("Contest already settled", 409);
    const entryCount = contest._count.entries;
    const rankingCount = contest.rankings.length;
    const isZeroEntryContest = entryCount === 0;
    if (!isZeroEntryContest && rankingCount === 0) {
      throw new ContestRuntimeError("Cannot generate settlement plan without ranking rows", 409);
    }

    const policy = contest.rewardPolicy;
    if (!policy || policy.status !== "PUBLISHED") {
      throw new ContestRuntimeError("Published reward policy is required for auto settlement plan", 409);
    }

    const rewardConfig = parseRewardConfig((contest.rules[0]?.config as Record<string, unknown> | null)?.rewardConfig);

    const rules = policy.distributionRules as unknown as RuleLike[];
    const bundles = policy.bundles;
    if (!rewardConfig && (rules.length === 0 || bundles.length === 0)) {
      throw new ContestRuntimeError("Reward policy must include bundles and distribution rules", 409);
    }

    const bundleById = new Map(bundles.map((bundle) => [bundle.id, bundle]));
    const rankingSize = contest.rankings.length;

    const items: Array<{
      userId: string;
      rank: number;
      sourceRuleId: string | null;
      sourceRuleType: string | null;
      sourceBundleId: string | null;
      rewardComponents: ResolvedComponent[];
      pointsTotal: number;
      xpTotal: number;
      packsTotal: number;
    }> = [];

    if (rewardConfig) {
      const defaultPackDefinition = await tx.packDefinition.findFirst({
        where: { source: "REWARD", isActive: true },
        orderBy: [{ createdAt: "asc" }],
        select: { id: true },
      });

      if (!defaultPackDefinition) {
        throw new ContestRuntimeError("No active REWARD pack definition found for contest settlement", 409);
      }

      const rewards = computeRewards({
        participantsCount: rankingSize,
        ranking: contest.rankings.map((row) => row.userId),
        config: rewardConfig,
      });

      for (const reward of rewards) {
        const aggregatedComponents: ResolvedComponent[] = [];
        if (reward.pointsReward > 0) aggregatedComponents.push({ type: "POINTS", amount: reward.pointsReward });
        if (reward.packsReward > 0) aggregatedComponents.push({ type: "PACK", packDefinitionId: defaultPackDefinition.id, quantity: reward.packsReward });
        items.push({
          userId: reward.userId,
          rank: reward.rank,
          sourceRuleId: null,
          sourceRuleType: "SIMPLE_POOL",
          sourceBundleId: null,
          rewardComponents: aggregatedComponents,
          pointsTotal: reward.pointsReward,
          xpTotal: 0,
          packsTotal: reward.packsReward,
        });
      }
    } else {
      for (const ranking of contest.rankings) {
      const matchedRules = findMatchingDistributionRulesForRank<RuleLike>(rules, ranking.rank, rankingSize);
      if (matchedRules.length === 0) continue;

      const aggregatedComponents: ResolvedComponent[] = [];
      const ruleIds: string[] = [];
      const bundleIds: string[] = [];

      for (const matchedRule of matchedRules) {
        const bundle = bundleById.get(matchedRule.bundleId);
        if (!bundle) {
          throw new ContestRuntimeError(`Rule ${matchedRule.id} references an unknown bundle`, 500);
        }

        ruleIds.push(matchedRule.id);
        bundleIds.push(bundle.id);

        if (matchedRule.ruleType === DISTRIBUTION_RULE_TYPES.POINTS_POOL_TOP_PERCENT) {
          const topPercent = matchedRule.topPercent ?? 0;
          const poolAmount = matchedRule.poolAmount ?? 0;
          if (topPercent <= 0 || topPercent > 100 || !Number.isInteger(poolAmount) || poolAmount <= 0) {
            throw new ContestRuntimeError(`Invalid POINTS_POOL_TOP_PERCENT rule ${matchedRule.id}`, 409);
          }

          const winnerCount = Math.max(1, Math.ceil((rankingSize * topPercent) / 100));
          const baseShare = Math.floor(poolAmount / winnerCount);
          const remainder = poolAmount % winnerCount;
          const bonus = ranking.rank <= remainder ? 1 : 0;
          const amount = baseShare + bonus;
          if (amount > 0) aggregatedComponents.push({ type: "POINTS", amount });
          continue;
        }

        aggregatedComponents.push(...resolveBundleComponents(bundle.components));
      }

      const pointsTotal = aggregatedComponents.reduce((sum, component) => sum + (component.type === "POINTS" ? component.amount : 0), 0);
      const xpTotal = aggregatedComponents.reduce((sum, component) => sum + (component.type === "XP" ? component.amount : 0), 0);
      const packsTotal = aggregatedComponents.reduce((sum, component) => sum + (component.type === "PACK" ? component.quantity : 0), 0);

      items.push({
        userId: ranking.userId,
        rank: ranking.rank,
        sourceRuleId: ruleIds.join(",") || null,
        sourceRuleType: matchedRules.length > 1 ? "MULTI_RULE" : matchedRules[0]?.ruleType ?? null,
        sourceBundleId: [...new Set(bundleIds)].join(",") || null,
        rewardComponents: aggregatedComponents,
        pointsTotal,
        xpTotal,
        packsTotal,
      });
      }
    }

    const latestDraftPlans = await tx.contestSettlementPlan.findMany({
      where: { contestId, status: SETTLEMENT_PLAN_STATUS.DRAFT },
      select: { id: true },
    });
    if (latestDraftPlans.length > 0) {
      await tx.contestSettlementPlan.updateMany({
        where: { id: { in: latestDraftPlans.map((plan) => plan.id) } },
        data: { status: SETTLEMENT_PLAN_STATUS.CANCELED },
      });
    }

    const plan = await tx.contestSettlementPlan.create({
      data: {
        contestId,
        status: SETTLEMENT_PLAN_STATUS.DRAFT,
        source: "AUTO_POLICY_V1",
        policySnapshot: {
          policyId: policy.id,
          policyStatus: policy.status,
          configPublishedAt: contest.configPublishedAt?.toISOString() ?? null,
          rewardConfig,
          rules: rules.map((rule) => ({
            id: rule.id,
            priority: rule.priority,
            ruleType: rule.ruleType,
            rankFrom: rule.rankFrom,
            rankTo: rule.rankTo,
            topN: rule.topN,
            topPercent: rule.topPercent,
            poolAmount: rule.poolAmount ?? null,
            bundleId: rule.bundleId,
          })),
        },
        rankingSnapshotSize: rankingSize,
        ...(items.length > 0
          ? {
              items: {
                createMany: {
                  data: items.map((item) => ({
                    userId: item.userId,
                    rank: item.rank,
                    sourceRuleId: item.sourceRuleId,
                    sourceRuleType: item.sourceRuleType,
                    sourceBundleId: item.sourceBundleId,
                    rewardComponents: item.rewardComponents as unknown as Prisma.InputJsonValue,
                    pointsTotal: item.pointsTotal,
                    xpTotal: item.xpTotal,
                    packsTotal: item.packsTotal,
                  })),
                },
              },
            }
          : {}),
      },
      include: {
        items: { orderBy: [{ rank: "asc" }] },
      },
    });

    return {
      planId: plan.id,
      contestId,
      status: plan.status,
      totals: summarizePlanItems(plan.items),
      rankingSize,
      matchedUsers: plan.items.length,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function getSettlementPlan(planId: string, contestId?: string) {
  const plan = await prisma.contestSettlementPlan.findUnique({
    where: { id: planId },
    include: {
      items: {
        orderBy: [{ rank: "asc" }],
        include: { user: { select: { id: true, displayName: true, xUsername: true } } },
      },
      contest: { select: { id: true, code: true, title: true, status: true } },
    },
  });

  if (!plan) throw new ContestRuntimeError("Settlement plan not found", 404);
  if (contestId && plan.contestId !== contestId) throw new ContestRuntimeError("Settlement plan does not belong to contest", 404);

  return { plan };
}

export async function previewSettlementPlan(planId: string, contestId?: string) {
  const { plan } = await getSettlementPlan(planId, contestId);
  return {
    planId: plan.id,
    contestId: plan.contestId,
    status: plan.status,
    generatedAt: plan.generatedAt,
    rankingSnapshotSize: plan.rankingSnapshotSize,
    totals: summarizePlanItems(plan.items),
    rows: plan.items.map((item) => ({
      id: item.id,
      rank: item.rank,
      userId: item.userId,
      displayName: item.user.displayName,
      sourceRuleId: item.sourceRuleId,
      sourceRuleType: item.sourceRuleType,
      sourceBundleId: item.sourceBundleId,
      rewardComponents: item.rewardComponents,
      pointsTotal: item.pointsTotal,
      xpTotal: item.xpTotal,
      packsTotal: item.packsTotal,
    })),
  };
}

export async function executeSettlementPlan(planId: string) {
  return prisma.$transaction(async (tx) => {
    const plan = await tx.contestSettlementPlan.findUnique({
      where: { id: planId },
      include: {
        items: true,
        contest: { include: { settlements: { select: { id: true } } } },
      },
    });

    if (!plan) throw new ContestRuntimeError("Settlement plan not found", 404);

    if (plan.status === SETTLEMENT_PLAN_STATUS.EXECUTED) {
      const existingSettlement = await tx.contestSettlement.findUnique({ where: { contestId: plan.contestId }, select: { id: true } });
      return {
        executed: false,
        contestId: plan.contestId,
        planId: plan.id,
        settlementId: existingSettlement?.id ?? null,
        rewardCount: plan.items.length,
      };
    }

    if (plan.contest.settlements.length > 0) {
      throw new ContestRuntimeError("Contest already has a settlement execution", 409);
    }

    if (plan.status !== SETTLEMENT_PLAN_STATUS.DRAFT) {
      throw new ContestRuntimeError("Only DRAFT plans can be executed", 409);
    }

    const settlement = await tx.contestSettlement.create({ data: { contestId: plan.contestId } });

    let rewardCount = 0;
    for (const item of plan.items) {
      const components = Array.isArray(item.rewardComponents) ? item.rewardComponents as unknown as ResolvedComponent[] : [];
      for (const component of components) {
        if (component.type === "POINTS") {
          await tx.rewardGrant.create({
            data: {
              userId: item.userId,
              type: RewardType.POINTS,
              amount: component.amount,
              sourceContestSettlementId: settlement.id,
            },
          });
          await tx.user.update({ where: { id: item.userId }, data: { points: { increment: component.amount } } });
          rewardCount += 1;
          continue;
        }

        if (component.type === "PACK") {
          for (let i = 0; i < component.quantity; i += 1) {
            await grantRewardPackByDefinitionTx(tx, {
              userId: item.userId,
              packDefinitionId: component.packDefinitionId,
              sourceContestSettlementId: settlement.id,
            });
            rewardCount += 1;
          }
          continue;
        }

        if (component.type === "XP") {
          await tx.rewardGrant.create({
            data: {
              userId: item.userId,
              type: RewardType.XP,
              amount: component.amount,
              sourceContestSettlementId: settlement.id,
            },
          });
          await tx.userProgression.upsert({
            where: { userId: item.userId },
            create: { userId: item.userId, xp: component.amount, level: 1 },
            update: { xp: { increment: component.amount } },
          });
          rewardCount += 1;
        }
      }
    }

    await tx.contest.update({ where: { id: plan.contestId }, data: { status: ContestStatus.SETTLED } });
    await tx.contestEntry.updateMany({ where: { contestId: plan.contestId }, data: { status: ContestEntryStatus.SETTLED } });

    await tx.contestSettlementPlan.update({
      where: { id: plan.id },
      data: { status: SETTLEMENT_PLAN_STATUS.EXECUTED, executedAt: new Date() },
    });

    return {
      executed: true,
      contestId: plan.contestId,
      planId: plan.id,
      settlementId: settlement.id,
      rewardCount,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function executeAutoSettlementForContest(contestId: string) {
  const existingSettlement = await prisma.contestSettlement.findUnique({ where: { contestId }, select: { id: true } });
  if (existingSettlement) {
    return {
      executed: false,
      contestId,
      settlementId: existingSettlement.id,
      reason: "ALREADY_SETTLED",
    };
  }

  const plan = await generateSettlementPlan(contestId);
  const execution = await executeSettlementPlan(plan.planId);

  return {
    executed: execution.executed,
    contestId,
    planId: plan.planId,
    settlementId: execution.settlementId,
    rewardCount: execution.rewardCount,
  };
}

function resolveBundleComponents(
  components: Array<{
    type: "POINTS" | "PACK" | "XP";
    pointsAmount: number | null;
    xpAmount: number | null;
    packDefinitionId: string | null;
    packQuantity: number | null;
  }>
): ResolvedComponent[] {
  const resolved: ResolvedComponent[] = [];

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

function summarizePlanItems(items: Array<{ pointsTotal: number; xpTotal: number; packsTotal: number }>) {
  return {
    usersCount: items.length,
    pointsCreditTotal: items.reduce((sum, item) => sum + item.pointsTotal, 0),
    xpCreditTotal: items.reduce((sum, item) => sum + item.xpTotal, 0),
    packsGrantTotal: items.reduce((sum, item) => sum + item.packsTotal, 0),
    rewardActionsCount: items.reduce((sum, item) => sum + Number(item.pointsTotal > 0) + Number(item.xpTotal > 0) + Number(item.packsTotal > 0), 0),
  };
}

function parseRewardConfig(value: unknown): ContestRewardConfig | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (
    (raw.distributionProfile !== "balanced" && raw.distributionProfile !== "top-heavy" && raw.distributionProfile !== "very-top-heavy") ||
    !Number.isInteger(raw.pointsPool) ||
    !Number.isInteger(raw.packPool) ||
    typeof raw.rewardedTopPercent !== "number"
  ) {
    return null;
  }
  return {
    pointsPool: raw.pointsPool as number,
    packPool: raw.packPool as number,
    rewardedTopPercent: raw.rewardedTopPercent as number,
    distributionProfile: raw.distributionProfile as "balanced" | "top-heavy" | "very-top-heavy",
  };
}
