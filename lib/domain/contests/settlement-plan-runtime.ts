import { ContestStatus, Prisma, RewardType, ContestEntryStatus } from "@prisma/client";

import { ContestRuntimeError } from "@/lib/domain/contests/runtime";
import { DistributionRuleType } from "@/lib/domain/contests/distribution-rules";
import type { ContestRewardConfig } from "@/lib/domain/contests/reward-distribution";
import { buildContestRewardPlanItems, type RewardPlanBundleLike, type RewardPlanRuleLike, type ResolvedRewardComponent } from "@/lib/domain/contests/reward-plan";
import { prisma } from "@/lib/prisma";
import { grantRewardPackByDefinitionTx } from "@/lib/domain/acquisition/open-pack";

const SETTLEMENT_PLAN_STATUS = {
  DRAFT: "DRAFT",
  EXECUTED: "EXECUTED",
  CANCELED: "CANCELED",
} as const;

type RuleLike = RewardPlanRuleLike & {
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

    const rankingSize = contest.rankings.length;

    let defaultPackDefinitionId: string | null = null;
    if (rewardConfig && rewardConfig.packPool > 0) {
      const defaultPackDefinition = await tx.packDefinition.findFirst({
        where: { source: "REWARD", isActive: true },
        orderBy: [{ createdAt: "asc" }],
        select: { id: true },
      });

      if (!defaultPackDefinition) {
        throw new ContestRuntimeError("No active REWARD pack definition found for contest settlement", 409);
      }

      defaultPackDefinitionId = defaultPackDefinition.id;
    }

    const items = buildContestRewardPlanItems({
      participantCount: rankingSize,
      rankingRows: contest.rankings.map((row) => ({ userId: row.userId, rank: row.rank })),
      rewardConfig,
      rules: rules as RuleLike[],
      bundles: bundles as unknown as RewardPlanBundleLike[],
      defaultPackDefinitionId,
    }).map((item) => ({
      userId: item.userId,
      rank: item.rank,
      sourceRuleId: item.sourceRuleId,
      sourceRuleType: item.sourceRuleType,
      sourceBundleId: item.sourceBundleId,
      rewardComponents: item.rewardComponents,
      pointsTotal: item.pointsTotal,
      xpTotal: item.xpTotal,
      packsTotal: item.packsTotal,
    }));

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

type ExecuteSettlementPlanOptions = {
  finalizeContestStatus?: boolean;
};

export async function executeSettlementPlan(planId: string, options?: ExecuteSettlementPlanOptions) {
  const finalizeContestStatus = options?.finalizeContestStatus ?? true;
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
      const components = Array.isArray(item.rewardComponents) ? item.rewardComponents as unknown as ResolvedRewardComponent[] : [];
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
          if (!component.packDefinitionId) {
            throw new ContestRuntimeError(`Settlement plan item ${item.id} is missing packDefinitionId`, 500);
          }

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

    if (finalizeContestStatus) {
      await tx.contest.update({ where: { id: plan.contestId }, data: { status: ContestStatus.SETTLED } });
    }
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

type ExecuteAutoSettlementOptions = {
  finalizeContestStatus?: boolean;
};

export async function executeAutoSettlementForContest(contestId: string, options?: ExecuteAutoSettlementOptions) {
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
  const execution = await executeSettlementPlan(plan.planId, options);

  return {
    executed: execution.executed,
    contestId,
    planId: plan.planId,
    settlementId: execution.settlementId,
    rewardCount: execution.rewardCount,
  };
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
