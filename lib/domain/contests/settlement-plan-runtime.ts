import { ContestStatus, Prisma, RewardType, ContestEntryStatus } from "@prisma/client";

import { ContestRuntimeError } from "@/lib/domain/contests/runtime";
import { prisma } from "@/lib/prisma";

const DISTRIBUTION_RULE_TYPES = {
  FIXED_RANKS: "FIXED_RANKS",
  TOP_N: "TOP_N",
  TOP_PERCENT: "TOP_PERCENT",
} as const;

const SETTLEMENT_PLAN_STATUS = {
  DRAFT: "DRAFT",
  APPROVED: "APPROVED",
  EXECUTED: "EXECUTED",
  CANCELED: "CANCELED",
} as const;

type DistributionRuleType = (typeof DISTRIBUTION_RULE_TYPES)[keyof typeof DISTRIBUTION_RULE_TYPES];

type ResolvedComponent =
  | { type: "POINTS"; amount: number }
  | { type: "XP"; amount: number }
  | { type: "PACK"; packDefinitionId: string; quantity: number };

export async function generateSettlementPlan(contestId: string) {
  return prisma.$transaction(async (tx) => {
    const contest = await tx.contest.findUnique({
      where: { id: contestId },
      include: {
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
    if (contest.rankings.length === 0) throw new ContestRuntimeError("Cannot generate settlement plan without ranking rows", 409);

    const policy = contest.rewardPolicy;
    if (!policy || policy.status !== "PUBLISHED") {
      throw new ContestRuntimeError("Published reward policy is required for auto settlement plan", 409);
    }

    const rules = policy.distributionRules;
    const bundles = policy.bundles;
    if (rules.length === 0 || bundles.length === 0) {
      throw new ContestRuntimeError("Reward policy must include bundles and distribution rules", 409);
    }

    const bundleById = new Map(bundles.map((bundle) => [bundle.id, bundle]));

    const overlapErrors = findRuleOverlapIssues(rules, contest.rankings.length);
    if (overlapErrors.length > 0) {
      throw new ContestRuntimeError(`Distribution rules overlap ambiguously: ${overlapErrors.join("; ")}`, 409);
    }

    const items: Array<{
      userId: string;
      rank: number;
      sourceRuleId: string;
      sourceRuleType: string;
      sourceBundleId: string;
      rewardComponents: ResolvedComponent[];
      pointsTotal: number;
      xpTotal: number;
      packsTotal: number;
    }> = [];

    for (const ranking of contest.rankings) {
      const matchedRule = rules.find((rule) => matchesRule(rule, ranking.rank, contest.rankings.length));
      if (!matchedRule) continue;

      const bundle = bundleById.get(matchedRule.bundleId);
      if (!bundle) {
        throw new ContestRuntimeError(`Rule ${matchedRule.id} references an unknown bundle`, 500);
      }

      const rewardComponents = resolveBundleComponents(bundle.components);
      const pointsTotal = rewardComponents.reduce((sum, component) => sum + (component.type === "POINTS" ? component.amount : 0), 0);
      const xpTotal = rewardComponents.reduce((sum, component) => sum + (component.type === "XP" ? component.amount : 0), 0);
      const packsTotal = rewardComponents.reduce((sum, component) => sum + (component.type === "PACK" ? component.quantity : 0), 0);

      items.push({
        userId: ranking.userId,
        rank: ranking.rank,
        sourceRuleId: matchedRule.id,
        sourceRuleType: matchedRule.ruleType,
        sourceBundleId: bundle.id,
        rewardComponents,
        pointsTotal,
        xpTotal,
        packsTotal,
      });
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
          rules: rules.map((rule) => ({
            id: rule.id,
            priority: rule.priority,
            ruleType: rule.ruleType,
            rankFrom: rule.rankFrom,
            rankTo: rule.rankTo,
            topN: rule.topN,
            topPercent: rule.topPercent,
            bundleId: rule.bundleId,
          })),
        },
        rankingSnapshotSize: contest.rankings.length,
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
      rankingSize: contest.rankings.length,
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

    if (plan.status !== SETTLEMENT_PLAN_STATUS.DRAFT && plan.status !== SETTLEMENT_PLAN_STATUS.APPROVED) {
      throw new ContestRuntimeError("Only DRAFT or APPROVED plans can be executed", 409);
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
          await tx.rewardGrant.create({
            data: {
              userId: item.userId,
              type: RewardType.PACK,
              amount: component.quantity,
              packDefinitionId: component.packDefinitionId,
              sourceContestSettlementId: settlement.id,
            },
          });
          rewardCount += 1;
          continue;
        }

        if (component.type === "XP") {
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
    await tx.ownedCardInstance.updateMany({
      where: {
        contestRosterLocks: {
          some: {
            contestEntry: { contestId: plan.contestId },
          },
        },
      },
      data: { lockState: null },
    });
    await tx.rosterLock.deleteMany({ where: { contestEntry: { contestId: plan.contestId } } });
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

function findRuleOverlapIssues(
  rules: Array<{
    id: string;
    ruleType: DistributionRuleType;
    rankFrom: number | null;
    rankTo: number | null;
    topN: number | null;
    topPercent: number | null;
  }>,
  rankingSize: number
) {
  const issues: string[] = [];

  for (let rank = 1; rank <= rankingSize; rank += 1) {
    const matches = rules.filter((rule) => matchesRule(rule, rank, rankingSize));
    if (matches.length > 1) {
      issues.push(`rank ${rank} matches multiple rules (${matches.map((rule) => rule.id).join(", ")})`);
      if (issues.length >= 5) break;
    }
  }

  return issues;
}

function matchesRule(
  rule: {
    ruleType: DistributionRuleType;
    rankFrom: number | null;
    rankTo: number | null;
    topN: number | null;
    topPercent: number | null;
  },
  rank: number,
  rankingSize: number
) {
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

function summarizePlanItems(items: Array<{ pointsTotal: number; xpTotal: number; packsTotal: number }>) {
  return {
    usersCount: items.length,
    pointsCreditTotal: items.reduce((sum, item) => sum + item.pointsTotal, 0),
    xpCreditTotal: items.reduce((sum, item) => sum + item.xpTotal, 0),
    packsGrantTotal: items.reduce((sum, item) => sum + item.packsTotal, 0),
    rewardActionsCount: items.reduce((sum, item) => sum + Number(item.pointsTotal > 0) + Number(item.xpTotal > 0) + Number(item.packsTotal > 0), 0),
  };
}
