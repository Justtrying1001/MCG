import {
  ContestEntryStatus,
  ContestRewardPolicyStatus,
  ContestStatus,
  Prisma,
} from "@prisma/client";

import { validateContestTransitionState } from "@/lib/domain/contests/contest-lifecycle-runtime";
import { ContestRuntimeError } from "@/lib/domain/contests/runtime";
import { evaluateContestRewardPackCapacity } from "@/lib/domain/contests/reward-pack-capacity";
import { prisma } from "@/lib/prisma";
import { qstash } from "@/lib/qstash";

const TEAM_SIZE_MODE_EXACT = "EXACT" as const;
const ELIGIBILITY_MODE_ANY = "ANY" as const;
const ELIGIBILITY_MODE_CARD_SET_ONLY = "CARD_SET_ONLY" as const;

type RewardComponentInput = {
  type: "POINTS" | "PACK" | "XP";
  pointsAmount?: number;
  xpAmount?: number;
  packDefinitionId?: string | null;
  packQuantity?: number;
};

type RewardBundleInput = {
  name: string;
  priority?: number;
  components: RewardComponentInput[];
};

type DistributionRuleInput = {
  priority: number;
  ruleType: "FIXED_RANKS" | "TOP_N" | "TOP_PERCENT" | "POINTS_POOL_TOP_PERCENT";
  bundleRef: string;
  rankFrom?: number;
  rankTo?: number;
  topN?: number;
  topPercent?: number;
  poolAmount?: number;
};

type ContestRewardConfigInput = {
  pointsPool: number;
  packPool: number;
  rewardedTopPercent: number;
  distributionProfile: "balanced" | "top-heavy" | "very-top-heavy";
};

export type ContestConfigInput = {
  code: string;
  title: string;
  description?: string | null;
  openAt?: string | null;
  liveAt?: string | null;
  lockAt?: string | null;
  endsAt?: string | null;
  status?: ContestStatus;
  teamSizeMode?: "EXACT";
  maxRosterSize?: number;
  eligibilityMode?: "ANY" | "CARD_SET_ONLY";
  cardSetId?: string | null;
  entryFeeEnabled?: boolean;
  entryFeeCurrency?: "POINTS";
  entryFeeAmount?: number | null;
  ruleConfig?: Record<string, unknown> | null;
  rewardBundles?: RewardBundleInput[];
  distributionRules?: DistributionRuleInput[];
  rewardConfig?: ContestRewardConfigInput;
};

export async function generateUniqueContestCode(seed?: string | null) {
  const normalizedSeed = (seed ?? "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const base = (normalizedSeed || "CONTEST").slice(0, 16);

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const suffix = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const candidate = `${base}-${suffix}${attempt === 0 ? "" : `-${attempt + 1}`}`;
    const exists = await prisma.contest.findUnique({ where: { code: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }

  throw new ContestRuntimeError("Cannot generate a unique contest code", 500);
}

export async function createContestDraft(input: ContestConfigInput) {
  const normalized = normalizeContestInput(input);

  return prisma.$transaction(async (tx) => {
    const contest = await tx.contest.create({
      data: {
        code: normalized.code,
        title: normalized.title,
        description: normalized.description,
        status: normalized.status,
        openAt: normalized.openAt,
        liveAt: normalized.liveAt,
        lockAt: normalized.lockAt,
        endsAt: normalized.endsAt,
        configPublishedAt: null,
        rules: {
          create: {
            teamSizeMode: normalized.teamSizeMode,
            maxRosterSize: normalized.maxRosterSize,
            eligibilityMode: normalized.eligibilityMode,
            cardSetId: normalized.cardSetId,
            entryFeeEnabled: normalized.entryFeeEnabled,
            entryFeeCurrency: "POINTS",
            entryFeeAmount: normalized.entryFeeAmount,
            config: normalizeRuleConfig(normalized.ruleConfig, normalized.rewardConfig),
          },
        },
      },
    });

    await replaceRewardPolicyTx(tx, contest.id, normalized.rewardBundles, normalized.distributionRules, normalized.rewardConfig);

    const fullContest = await tx.contest.findUnique({ where: { id: contest.id }, include: contestDraftInclude });
    return { contest: fullContest };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function getContestDraft(contestId: string) {
  const contest = await prisma.contest.findUnique({ where: { id: contestId }, include: contestDraftInclude });
  if (!contest) throw new ContestRuntimeError("Contest not found", 404);
  return { contest };
}

export async function updateContestDraft(contestId: string, input: Partial<ContestConfigInput>) {
  const existing = await prisma.contest.findUnique({
    where: { id: contestId },
    include: {
      rules: true,
      rewardPolicy: {
        include: {
          bundles: { include: { components: true } },
          distributionRules: true,
        },
      },
    },
  });

  if (!existing) throw new ContestRuntimeError("Contest not found", 404);
  if (existing.configPublishedAt) throw new ContestRuntimeError("Contest draft is already published", 409);

  const existingRule = existing.rules[0];

  const normalized = normalizeContestInput({
    code: input.code ?? existing.code,
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    openAt: input.openAt ?? existing.openAt?.toISOString() ?? null,
    liveAt: input.liveAt ?? existing.liveAt?.toISOString() ?? null,
    lockAt: input.lockAt ?? existing.lockAt?.toISOString() ?? null,
    endsAt: input.endsAt ?? existing.endsAt?.toISOString() ?? null,
    status: input.status ?? existing.status,
    teamSizeMode: input.teamSizeMode ?? existingRule?.teamSizeMode ?? TEAM_SIZE_MODE_EXACT,
    maxRosterSize: input.maxRosterSize ?? existingRule?.maxRosterSize ?? 5,
    eligibilityMode: input.eligibilityMode ?? existingRule?.eligibilityMode ?? (existingRule?.cardSetId ? ELIGIBILITY_MODE_CARD_SET_ONLY : ELIGIBILITY_MODE_ANY),
    cardSetId: input.cardSetId ?? existingRule?.cardSetId ?? null,
    entryFeeEnabled: input.entryFeeEnabled ?? existingRule?.entryFeeEnabled ?? false,
    entryFeeCurrency: input.entryFeeCurrency ?? (existingRule?.entryFeeCurrency as "POINTS" | undefined) ?? "POINTS",
    entryFeeAmount: input.entryFeeAmount ?? existingRule?.entryFeeAmount ?? null,
    ruleConfig: input.ruleConfig ?? ((existingRule?.config as Record<string, unknown> | null) ?? null),
    rewardConfig: input.rewardConfig ?? parseRewardConfig((input.ruleConfig ?? (existingRule?.config as Record<string, unknown> | null) ?? null)?.rewardConfig),
    rewardBundles: input.rewardBundles ?? existing.rewardPolicy?.bundles.map((bundle) => ({
      name: bundle.name,
      priority: bundle.priority,
      components: bundle.components.map((component) => ({
        type: component.type,
        pointsAmount: component.pointsAmount ?? undefined,
        xpAmount: component.xpAmount ?? undefined,
        packDefinitionId: component.packDefinitionId ?? undefined,
        packQuantity: component.packQuantity ?? undefined,
      })),
    })) ?? [],
    distributionRules: input.distributionRules ?? existing.rewardPolicy?.distributionRules.map((rule) => ({
      priority: rule.priority,
      ruleType: rule.ruleType,
      bundleRef: existing.rewardPolicy?.bundles.find((bundle) => bundle.id === rule.bundleId)?.name ?? "",
      rankFrom: rule.rankFrom ?? undefined,
      rankTo: rule.rankTo ?? undefined,
      topN: rule.topN ?? undefined,
      topPercent: rule.topPercent ?? undefined,
      poolAmount: (rule as any).poolAmount ?? undefined,
    })) ?? [],
  });

  const timesChanged =
    normalized.openAt?.toISOString() !== (existing.openAt?.toISOString() ?? null) ||
    normalized.lockAt?.toISOString() !== (existing.lockAt?.toISOString() ?? null) ||
    normalized.liveAt?.toISOString() !== (existing.liveAt?.toISOString() ?? null) ||
    normalized.endsAt?.toISOString() !== (existing.endsAt?.toISOString() ?? null);

  const result = await prisma.$transaction(async (tx) => {
    await tx.contest.update({
      where: { id: contestId },
      data: {
        code: normalized.code,
        title: normalized.title,
        description: normalized.description,
        status: normalized.status,
        openAt: normalized.openAt,
        liveAt: normalized.liveAt,
        lockAt: normalized.lockAt,
        endsAt: normalized.endsAt,
      },
    });

    const rule = await tx.contestRule.findFirst({ where: { contestId }, orderBy: { id: "asc" }, select: { id: true } });
    const ruleData = {
      teamSizeMode: normalized.teamSizeMode,
      maxRosterSize: normalized.maxRosterSize,
      eligibilityMode: normalized.eligibilityMode,
      cardSetId: normalized.cardSetId,
      entryFeeEnabled: normalized.entryFeeEnabled,
      entryFeeCurrency: "POINTS",
      entryFeeAmount: normalized.entryFeeAmount,
      config: normalizeRuleConfig(normalized.ruleConfig, normalized.rewardConfig),
    };

    if (rule?.id) {
      await tx.contestRule.update({ where: { id: rule.id }, data: ruleData });
    } else {
      await tx.contestRule.create({ data: { contestId, ...ruleData } });
    }

    await replaceRewardPolicyTx(tx, contestId, normalized.rewardBundles, normalized.distributionRules, normalized.rewardConfig);

    const fullContest = await tx.contest.findUnique({ where: { id: contestId }, include: contestDraftInclude });
    return { contest: fullContest };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  if (timesChanged && existing.configPublishedAt && process.env.QSTASH_TOKEN && normalized.lockAt && normalized.liveAt && normalized.endsAt) {
    await rescheduleQStashJobs(contestId, existing, normalized.lockAt, normalized.liveAt, normalized.endsAt);
  }

  return result;
}

export async function validateContestDraft(contestId: string) {
  const { contest } = await getContestDraft(contestId);
  const issues = validateContestDraftEntity(contest as ContestWithConfig);
  const capacity = await evaluateContestRewardPackCapacity({
    contest: contest as ContestWithConfig,
  });

  for (const row of capacity.rows) {
    if (row.verdict === "OK") continue;
    if (row.verdict === "INSUFFICIENT_SUPPLY") {
      issues.push({
        code: "REWARD_PACK_CAPACITY_INSUFFICIENT",
        severity: "ERROR",
        field: `rewardPacks.${row.packCode ?? row.packDefinitionId}`,
        message: `Reward pack capacity insufficient for ${row.packCode ?? row.packDefinitionId}: required ${row.required}, available ${row.available}, missing ${row.shortfall}`,
      });
      continue;
    }

    if (row.verdict === "REWARD_POOL_MISSING") {
      issues.push({
        code: "REWARD_PACK_POOL_MISSING",
        severity: "ERROR",
        field: `rewardPacks.${row.packCode ?? row.packDefinitionId}`,
        message: `Reward pool missing for ${row.packCode ?? row.packDefinitionId} (expected rewardPackSupply.id=${row.packCode ?? "<pack_code>"}; run reward-pool bootstrap/backfill).`,
      });
      continue;
    }

    if (row.verdict === "UNKNOWN_PACK") {
      issues.push({
        code: "REWARD_PACK_UNKNOWN",
        severity: "ERROR",
        field: `rewardPacks.${row.packDefinitionId}`,
        message: `Reward packDefinitionId is unknown: ${row.packDefinitionId}`,
      });
      continue;
    }

    issues.push({
      code: "REWARD_PACK_CONFIG_INVALID",
      severity: "ERROR",
      field: `rewardPacks.${row.packCode ?? row.packDefinitionId}`,
      message: `Reward pack config invalid for ${row.packCode ?? row.packDefinitionId}`,
    });
  }

  for (const capacityIssue of capacity.issues) {
    issues.push({
      code: `REWARD_CAPACITY_${capacityIssue.verdict}`,
      severity: "ERROR",
      field: capacityIssue.field ?? "rewardPacks",
      message: capacityIssue.message,
    });
  }

  return {
    contestId,
    blocking: issues.some((issue) => issue.severity === "ERROR"),
    issues,
    rewardPackCapacity: capacity,
  };
}

export async function publishContest(contestId: string) {
  const hasQStash = Boolean(process.env.QSTASH_TOKEN);

  await prisma.$transaction(async (tx) => {
    const contest = await tx.contest.findUnique({ where: { id: contestId }, include: contestDraftInclude });
    if (!contest) throw new ContestRuntimeError("Contest not found", 404);
    if (contest.configPublishedAt) throw new ContestRuntimeError("Contest is already published", 409);

    const issues = validateContestDraftEntity(contest as ContestWithConfig);
    const blocking = issues.some((issue) => issue.severity === "ERROR");
    if (blocking) {
      throw new ContestRuntimeError(
        `Contest draft cannot be published: ${issues
          .filter((issue) => issue.severity === "ERROR")
          .map((issue) => issue.message)
          .join("; ")}`,
        400
      );
    }

    const transitionValidation = validateContestTransitionState({
      id: contest.id,
      status: contest.status,
      configPublishedAt: new Date(),
      openAt: contest.openAt,
      liveAt: contest.liveAt,
      lockAt: contest.lockAt,
      endsAt: contest.endsAt,
      _count: {
        entries: 0,
        rankings: 0,
        settlements: 0,
      },
    }, ContestStatus.OPEN, "manual");
    if (transitionValidation.blocking) {
      const firstError = transitionValidation.issues.find((issue) => issue.severity === "ERROR");
      throw new ContestRuntimeError(firstError?.message ?? "Contest cannot transition to OPEN", 409);
    }

    // Publishing always moves draft to OPEN immediately.
    // openAt controls when players can effectively register.
    await tx.contest.update({ where: { id: contestId }, data: { configPublishedAt: new Date(), status: ContestStatus.OPEN } });
    await tx.contestRewardPolicy.updateMany({ where: { contestId }, data: { status: ContestRewardPolicyStatus.PUBLISHED } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  if (hasQStash) {
    const contest = await prisma.contest.findUnique({ where: { id: contestId }, select: { lockAt: true, liveAt: true, endsAt: true } });
    if (contest?.lockAt && contest.liveAt && contest.endsAt) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
      try {
        const [lockJob, liveJob, settleJob] = await Promise.all([
          qstash.publishJSON({ url: `${baseUrl}/api/internal/jobs/contest-open`, body: { contestId }, notBefore: Math.floor(contest.lockAt.getTime() / 1000) }),
          qstash.publishJSON({ url: `${baseUrl}/api/internal/jobs/contest-live`, body: { contestId }, notBefore: Math.floor(contest.liveAt.getTime() / 1000) }),
          qstash.publishJSON({ url: `${baseUrl}/api/internal/jobs/contest-settle`, body: { contestId }, notBefore: Math.floor(contest.endsAt.getTime() / 1000) }),
        ]);
        await prisma.contest.update({
          where: { id: contestId },
          data: { qstashOpenJobId: lockJob.messageId, qstashLiveJobId: liveJob.messageId, qstashSettleJobId: settleJob.messageId },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[publish] Failed to schedule QStash jobs for contest ${contestId}: ${message}`);
      }
    } else {
      console.warn(`[publish] Contest ${contestId} missing lockAt/liveAt/endsAt — QStash jobs not scheduled`);
    }
  }

  const updated = await prisma.contest.findUnique({ where: { id: contestId }, include: contestDraftInclude });
  return { contest: updated };
}



export async function unpublishContest(contestId: string) {
  return prisma.$transaction(async (tx) => {
    const contest = await tx.contest.findUnique({
      where: { id: contestId },
      include: { _count: { select: { entries: true, scores: true, settlements: true } } },
    });
    if (!contest) throw new ContestRuntimeError("Contest not found", 404);
    if (!contest.configPublishedAt) throw new ContestRuntimeError("Contest is not published", 409);
    if (contest._count.entries > 0 || contest._count.scores > 0 || contest._count.settlements > 0) {
      throw new ContestRuntimeError("Cannot unpublish a contest that already has operations", 409);
    }

    const updated = await tx.contest.update({
      where: { id: contestId },
      data: { configPublishedAt: null, status: ContestStatus.DRAFT },
      include: contestDraftInclude,
    });
    await tx.contestRewardPolicy.updateMany({ where: { contestId }, data: { status: ContestRewardPolicyStatus.DRAFT } });
    return { contest: updated };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function archiveContest(contestId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.contest.findUnique({
      where: { id: contestId },
      select: { id: true, status: true, _count: { select: { entries: true } } },
    });

    if (!existing) throw new ContestRuntimeError("Contest not found", 404);

    if (existing.status === ContestStatus.LIVE || existing.status === ContestStatus.LOCKED) {
      throw new ContestRuntimeError(
        `Cannot cancel a ${existing.status} contest. Stop the contest lifecycle before archiving.`,
        409
      );
    }

    if (existing.status === ContestStatus.SETTLED) {
      throw new ContestRuntimeError("Cannot cancel an already SETTLED contest.", 409);
    }

    if (existing.status === ContestStatus.CANCELED) {
      throw new ContestRuntimeError("Contest is already CANCELED.", 409);
    }

    const activeLockCount = await tx.rosterLock.count({
      where: {
        contestEntry: {
          contestId,
          status: { in: [ContestEntryStatus.SUBMITTED, ContestEntryStatus.SCORED] },
        },
      },
    });

    if (activeLockCount > 0) {
      throw new ContestRuntimeError(
        `Contest has ${activeLockCount} active card lock(s). Clear entries before canceling.`,
        409
      );
    }

    await tx.contestEntry.updateMany({
      where: { contestId, status: { not: ContestEntryStatus.SETTLED } },
      data: { status: ContestEntryStatus.CANCELED },
    });

    const contest = await tx.contest.update({
      where: { id: contestId },
      data: { status: ContestStatus.CANCELED },
      include: contestDraftInclude,
    });

    return { contest };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function deleteContestDraft(contestId: string) {
  return prisma.$transaction(async (tx) => {
    const contest = await tx.contest.findUnique({
      where: { id: contestId },
      include: { _count: { select: { entries: true, scores: true, rankings: true, settlements: true } } },
    });
    if (!contest) throw new ContestRuntimeError("Contest not found", 404);

    const deletableStatuses: ContestStatus[] = [ContestStatus.CANCELED, ContestStatus.SETTLED, ContestStatus.DRAFT];
    if (!deletableStatuses.includes(contest.status)) {
      throw new ContestRuntimeError(
        `Cannot delete a ${contest.status} contest. Stop it first before deleting.`,
        409,
      );
    }

    await tx.contest.delete({ where: { id: contestId } });
    return { deleted: true };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
type DraftIssue = {
  code: string;
  severity: "ERROR" | "WARN";
  field: string;
  message: string;
};

type ContestWithConfig = Prisma.ContestGetPayload<{ include: typeof contestDraftInclude }>;

export function validateContestDraftEntity(contest: ContestWithConfig): DraftIssue[] {
  const issues: DraftIssue[] = [];
  const effectiveLiveAt = contest.lockAt ?? contest.liveAt;

  if (!contest.openAt || !effectiveLiveAt || !contest.endsAt) {
    issues.push({ code: "TIMING_REQUIRED", severity: "ERROR", field: "timing", message: "openAt, lockAt/liveAt and endsAt are required" });
  } else {
    if (contest.openAt > effectiveLiveAt) {
      issues.push({ code: "TIMING_INVALID_ORDER", severity: "ERROR", field: "openAt", message: "openAt must be before or equal to liveAt" });
    }
    if (contest.lockAt && contest.lockAt > effectiveLiveAt) {
      issues.push({ code: "TIMING_INVALID_ORDER", severity: "ERROR", field: "lockAt", message: "lockAt must be before or equal to liveAt" });
    }
    if (effectiveLiveAt >= contest.endsAt) {
      issues.push({ code: "TIMING_INVALID_ORDER", severity: "ERROR", field: "endsAt", message: "endsAt must be after liveAt" });
    }
  }

  const rule = contest.rules[0];
  if (!rule) {
    issues.push({ code: "RULE_REQUIRED", severity: "ERROR", field: "team", message: "Contest rule is missing" });
  } else {
    if (rule.teamSizeMode !== TEAM_SIZE_MODE_EXACT) {
      issues.push({ code: "TEAM_MODE_UNSUPPORTED", severity: "ERROR", field: "teamSizeMode", message: "Only EXACT team size mode is supported" });
    }
    if (![3, 5, 7].includes(rule.maxRosterSize ?? 0)) {
      issues.push({ code: "TEAM_SIZE_INVALID", severity: "ERROR", field: "maxRosterSize", message: "maxRosterSize must be one of 3, 5, 7" });
    }
    if (rule.entryFeeEnabled) {
      if (rule.entryFeeCurrency !== "POINTS") {
        issues.push({ code: "ENTRY_FEE_CURRENCY_INVALID", severity: "ERROR", field: "entryFeeCurrency", message: "Only POINTS entry fee is supported" });
      }
      if (!Number.isInteger(rule.entryFeeAmount) || (rule.entryFeeAmount ?? 0) <= 0) {
        issues.push({ code: "ENTRY_FEE_INVALID", severity: "ERROR", field: "entryFeeAmount", message: "entryFeeAmount must be a positive integer when fee is enabled" });
      }
    }
    if (rule.eligibilityMode === ELIGIBILITY_MODE_CARD_SET_ONLY && !rule.cardSetId) {
      issues.push({ code: "ELIGIBILITY_CARD_SET_REQUIRED", severity: "ERROR", field: "cardSetId", message: "cardSetId is required when eligibilityMode=CARD_SET_ONLY" });
    }
  }

  const policy = contest.rewardPolicy;
  if (!policy) {
    issues.push({ code: "REWARD_POLICY_REQUIRED", severity: "ERROR", field: "rewards", message: "Reward policy is required" });
    return issues;
  }

  const rewardConfig = parseRewardConfig((contest.rules[0]?.config as Record<string, unknown> | null)?.rewardConfig);
  if (rewardConfig) {
    if (!Number.isInteger(rewardConfig.pointsPool) || rewardConfig.pointsPool < 0) {
      issues.push({ code: "REWARD_POINTS_POOL_INVALID", severity: "ERROR", field: "rewardConfig.pointsPool", message: "pointsPool must be zero or a positive integer" });
    }
    if (!Number.isInteger(rewardConfig.packPool) || rewardConfig.packPool < 0) {
      issues.push({ code: "REWARD_PACK_POOL_INVALID", severity: "ERROR", field: "rewardConfig.packPool", message: "packPool must be zero or a positive integer" });
    }
    if (rewardConfig.pointsPool === 0 && rewardConfig.packPool === 0) {
      issues.push({ code: "REWARD_POOL_REQUIRED", severity: "ERROR", field: "rewardConfig", message: "At least one reward pool must be greater than zero" });
    }
    if (typeof rewardConfig.rewardedTopPercent !== "number" || rewardConfig.rewardedTopPercent < 1 || rewardConfig.rewardedTopPercent > 100) {
      issues.push({ code: "REWARD_PERCENT_INVALID", severity: "ERROR", field: "rewardConfig.rewardedTopPercent", message: "rewardedTopPercent must be between 1 and 100" });
    }
    return issues;
  }

  const bundles = policy.bundles;
  if (bundles.length === 0) {
    issues.push({ code: "REWARD_BUNDLE_REQUIRED", severity: "ERROR", field: "rewardBundles", message: "At least one reward bundle is required" });
  }

  for (const [bundleIndex, bundle] of bundles.entries()) {
    if (!bundle.name?.trim()) {
      issues.push({ code: "REWARD_BUNDLE_NAME_REQUIRED", severity: "ERROR", field: `rewardBundles[${bundleIndex}].name`, message: "Bundle name is required" });
    }

    if (bundle.components.length === 0) {
      issues.push({ code: "REWARD_COMPONENT_REQUIRED", severity: "ERROR", field: `rewardBundles[${bundleIndex}].components`, message: "Bundle must contain at least one component" });
      continue;
    }

    for (const [componentIndex, component] of bundle.components.entries()) {
      if (component.type === "POINTS" && (!Number.isInteger(component.pointsAmount) || (component.pointsAmount ?? 0) <= 0)) {
        issues.push({ code: "POINTS_COMPONENT_INVALID", severity: "ERROR", field: `rewardBundles[${bundleIndex}].components[${componentIndex}]`, message: "POINTS component requires positive integer pointsAmount" });
      }
      if (component.type === "XP" && (!Number.isInteger(component.xpAmount) || (component.xpAmount ?? 0) <= 0)) {
        issues.push({ code: "XP_COMPONENT_INVALID", severity: "ERROR", field: `rewardBundles[${bundleIndex}].components[${componentIndex}]`, message: "XP component requires positive integer xpAmount" });
      }
      if (component.type === "PACK") {
        if (!component.packDefinitionId) {
          issues.push({ code: "PACK_COMPONENT_MISSING_PACK", severity: "ERROR", field: `rewardBundles[${bundleIndex}].components[${componentIndex}]`, message: "PACK component requires packDefinitionId" });
        }
        if (!Number.isInteger(component.packQuantity) || (component.packQuantity ?? 0) <= 0) {
          issues.push({ code: "PACK_COMPONENT_INVALID_QTY", severity: "ERROR", field: `rewardBundles[${bundleIndex}].components[${componentIndex}]`, message: "PACK component requires positive integer packQuantity" });
        }
      }
    }
  }

  const rules = policy.distributionRules;
  if (rules.length === 0) {
    issues.push({ code: "DISTRIBUTION_RULE_REQUIRED", severity: "ERROR", field: "distributionRules", message: "At least one distribution rule is required" });
  }

  const seenPriorities = new Set<number>();
  for (const [index, rule] of rules.entries()) {
    if (seenPriorities.has(rule.priority)) {
      issues.push({ code: "DISTRIBUTION_PRIORITY_DUPLICATE", severity: "ERROR", field: `distributionRules[${index}].priority`, message: "Distribution priorities must be unique" });
    }
    seenPriorities.add(rule.priority);

    if (!bundles.some((bundle) => bundle.id === rule.bundleId)) {
      issues.push({ code: "DISTRIBUTION_BUNDLE_MISSING", severity: "ERROR", field: `distributionRules[${index}].bundleId`, message: "Distribution rule references unknown bundle" });
    }

    if (rule.ruleType === "FIXED_RANKS") {
      if (!Number.isInteger(rule.rankFrom) || !Number.isInteger(rule.rankTo) || (rule.rankFrom ?? 0) <= 0 || (rule.rankTo ?? 0) <= 0 || (rule.rankFrom ?? 0) > (rule.rankTo ?? 0)) {
        issues.push({ code: "DISTRIBUTION_FIXED_RANKS_INVALID", severity: "ERROR", field: `distributionRules[${index}]`, message: "FIXED_RANKS requires rankFrom/rankTo with rankFrom <= rankTo" });
      }
    }

    if (rule.ruleType === "TOP_N" && (!Number.isInteger(rule.topN) || (rule.topN ?? 0) <= 0)) {
      issues.push({ code: "DISTRIBUTION_TOP_N_INVALID", severity: "ERROR", field: `distributionRules[${index}].topN`, message: "TOP_N requires positive integer topN" });
    }

    if (rule.ruleType === "TOP_PERCENT" && (typeof rule.topPercent !== "number" || rule.topPercent <= 0 || rule.topPercent > 100)) {
      issues.push({ code: "DISTRIBUTION_TOP_PERCENT_INVALID", severity: "ERROR", field: `distributionRules[${index}].topPercent`, message: "TOP_PERCENT requires topPercent > 0 and <= 100" });
    }

    if (rule.ruleType === "POINTS_POOL_TOP_PERCENT") {
      if (typeof rule.topPercent !== "number" || rule.topPercent <= 0 || rule.topPercent > 100) {
        issues.push({ code: "DISTRIBUTION_POOL_TOP_PERCENT_INVALID", severity: "ERROR", field: `distributionRules[${index}].topPercent`, message: "POINTS_POOL_TOP_PERCENT requires topPercent > 0 and <= 100" });
      }
      if (!Number.isInteger((rule as any).poolAmount) || ((rule as any).poolAmount ?? 0) <= 0) {
        issues.push({ code: "DISTRIBUTION_POOL_AMOUNT_INVALID", severity: "ERROR", field: `distributionRules[${index}].poolAmount`, message: "POINTS_POOL_TOP_PERCENT requires positive integer poolAmount" });
      }
    }
  }

  return issues;
}

function normalizeContestInput(input: ContestConfigInput) {
  const code = input.code.trim();
  const title = input.title.trim();
  if (!code || !title) {
    throw new ContestRuntimeError("code and title are required", 400);
  }

  if (input.entryFeeCurrency && input.entryFeeCurrency !== "POINTS") {
    throw new ContestRuntimeError("Only POINTS entry fee currency is supported", 400);
  }

  const teamSizeMode = input.teamSizeMode ?? TEAM_SIZE_MODE_EXACT;
  const maxRosterSize = input.maxRosterSize ?? 5;
  const eligibilityMode = input.eligibilityMode ?? (input.cardSetId ? ELIGIBILITY_MODE_CARD_SET_ONLY : ELIGIBILITY_MODE_ANY);
  const entryFeeEnabled = input.entryFeeEnabled ?? false;
  const entryFeeAmount = entryFeeEnabled ? (input.entryFeeAmount ?? null) : null;

  if (teamSizeMode !== TEAM_SIZE_MODE_EXACT) {
    throw new ContestRuntimeError("Only EXACT team size mode is supported", 400);
  }

  if (![3, 5, 7].includes(maxRosterSize)) {
    throw new ContestRuntimeError("maxRosterSize must be one of 3, 5, 7", 400);
  }

  if (entryFeeEnabled && (!Number.isInteger(entryFeeAmount) || (entryFeeAmount ?? 0) <= 0)) {
    throw new ContestRuntimeError("entryFeeAmount must be a positive integer when entry fee is enabled", 400);
  }

  if (eligibilityMode === ELIGIBILITY_MODE_CARD_SET_ONLY && !input.cardSetId?.trim()) {
    throw new ContestRuntimeError("cardSetId is required when eligibilityMode=CARD_SET_ONLY", 400);
  }

  const openAt = input.openAt ? new Date(input.openAt) : null;
  const lockAt = input.lockAt ? new Date(input.lockAt) : null;
  const liveAtInput = input.liveAt ? new Date(input.liveAt) : null;
  const liveAt = lockAt ?? liveAtInput;
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;

  if (openAt && liveAt && openAt > liveAt) {
    throw new ContestRuntimeError("openAt must be before or equal to liveAt", 400);
  }
  if (lockAt && liveAtInput && lockAt > liveAtInput) {
    throw new ContestRuntimeError("lockAt must be before or equal to liveAt", 400);
  }
  if (liveAt && endsAt && liveAt >= endsAt) {
    throw new ContestRuntimeError("endsAt must be after liveAt", 400);
  }

  const rewardConfig = input.rewardConfig ?? parseRewardConfig((input.ruleConfig as Record<string, unknown> | null)?.rewardConfig);
  if (rewardConfig) {
    if (!Number.isInteger(rewardConfig.pointsPool) || rewardConfig.pointsPool < 0) {
      throw new ContestRuntimeError("pointsPool must be zero or a positive integer", 400);
    }
    if (!Number.isInteger(rewardConfig.packPool) || rewardConfig.packPool < 0) {
      throw new ContestRuntimeError("packPool must be zero or a positive integer", 400);
    }
    if (rewardConfig.pointsPool === 0 && rewardConfig.packPool === 0) {
      throw new ContestRuntimeError("At least one reward pool must be greater than zero", 400);
    }
    if (rewardConfig.rewardedTopPercent < 1 || rewardConfig.rewardedTopPercent > 100) {
      throw new ContestRuntimeError("rewardedTopPercent must be between 1 and 100", 400);
    }
  }

  return {
    code,
    title,
    description: input.description?.trim() || null,
    status: input.status ?? ContestStatus.DRAFT,
    openAt,
    liveAt,
    lockAt,
    endsAt,
    teamSizeMode,
    maxRosterSize,
    eligibilityMode,
    cardSetId: input.cardSetId?.trim() || null,
    entryFeeEnabled,
    entryFeeAmount,
    ruleConfig: (input.ruleConfig ?? null) as Record<string, unknown> | null,
    rewardConfig,
    rewardBundles: input.rewardBundles ?? [],
    distributionRules: input.distributionRules ?? [],
  };
}


function parseRewardConfig(value: unknown): ContestRewardConfigInput | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const pointsPool = Number(raw.pointsPool);
  const packPool = Number(raw.packPool);
  const rewardedTopPercent = Number(raw.rewardedTopPercent);
  const distributionProfile = raw.distributionProfile;
  if (!Number.isFinite(pointsPool) || !Number.isFinite(packPool) || !Number.isFinite(rewardedTopPercent)) return undefined;
  if (distributionProfile !== "balanced" && distributionProfile !== "top-heavy" && distributionProfile !== "very-top-heavy") return undefined;
  return { pointsPool: Math.floor(pointsPool), packPool: Math.floor(packPool), rewardedTopPercent, distributionProfile };
}

function normalizeRuleConfig(ruleConfig: Record<string, unknown> | null, rewardConfig?: ContestRewardConfigInput) {
  const merged = { ...(ruleConfig ?? {}) } as Record<string, unknown>;
  if (rewardConfig) merged.rewardConfig = rewardConfig;
  return (Object.keys(merged).length === 0 ? Prisma.JsonNull : merged) as Prisma.InputJsonValue | Prisma.NullTypes.JsonNull;
}

async function rescheduleQStashJobs(
  contestId: string,
  existing: { qstashOpenJobId: string | null; qstashLiveJobId: string | null; qstashSettleJobId: string | null },
  lockAt: Date,
  liveAt: Date,
  endsAt: Date
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
  try {
    // Cancel old jobs (best-effort — ignore 404s)
    await Promise.allSettled([
      existing.qstashOpenJobId ? qstash.messages.delete(existing.qstashOpenJobId) : Promise.resolve(),
      existing.qstashLiveJobId ? qstash.messages.delete(existing.qstashLiveJobId) : Promise.resolve(),
      existing.qstashSettleJobId ? qstash.messages.delete(existing.qstashSettleJobId) : Promise.resolve(),
    ]);

    const [lockJob, liveJob, settleJob] = await Promise.all([
      qstash.publishJSON({ url: `${baseUrl}/api/internal/jobs/contest-open`, body: { contestId }, notBefore: Math.floor(lockAt.getTime() / 1000) }),
      qstash.publishJSON({ url: `${baseUrl}/api/internal/jobs/contest-live`, body: { contestId }, notBefore: Math.floor(liveAt.getTime() / 1000) }),
      qstash.publishJSON({ url: `${baseUrl}/api/internal/jobs/contest-settle`, body: { contestId }, notBefore: Math.floor(endsAt.getTime() / 1000) }),
    ]);

    await prisma.contest.update({
      where: { id: contestId },
      data: { qstashOpenJobId: lockJob.messageId, qstashLiveJobId: liveJob.messageId, qstashSettleJobId: settleJob.messageId },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[update] Failed to reschedule QStash jobs for contest ${contestId}: ${message}`);
  }
}

async function replaceRewardPolicyTx(
  tx: Prisma.TransactionClient,
  contestId: string,
  rewardBundles: RewardBundleInput[],
  distributionRules: DistributionRuleInput[],
  rewardConfig?: ContestRewardConfigInput
) {
  const policy = await tx.contestRewardPolicy.upsert({
    where: { contestId },
    create: { contestId, status: ContestRewardPolicyStatus.DRAFT },
    update: {},
  });

  await tx.contestRewardDistributionRule.deleteMany({ where: { rewardPolicyId: policy.id } });
  await tx.contestRewardComponent.deleteMany({ where: { bundle: { rewardPolicyId: policy.id } } });
  await tx.contestRewardBundle.deleteMany({ where: { rewardPolicyId: policy.id } });

  if (rewardConfig) {
    return;
  }

  const bundles = await Promise.all(
    rewardBundles.map((bundle, index) =>
      tx.contestRewardBundle.create({
        data: {
          rewardPolicyId: policy.id,
          name: bundle.name,
          priority: bundle.priority ?? index,
        },
      })
    )
  );

  const bundleMap = new Map(bundles.map((bundle) => [bundle.name, bundle.id]));

  for (const bundle of rewardBundles) {
    const bundleId = bundleMap.get(bundle.name);
    if (!bundleId) continue;
    for (const component of bundle.components) {
      await tx.contestRewardComponent.create({
        data: {
          bundleId,
          type: component.type,
          pointsAmount: component.pointsAmount,
          xpAmount: component.xpAmount,
          packDefinitionId: component.packDefinitionId ?? null,
          packQuantity: component.packQuantity,
        },
      });
    }
  }

  for (const rule of distributionRules) {
    const bundleId = bundleMap.get(rule.bundleRef);
    if (!bundleId) {
      throw new ContestRuntimeError(`distributionRules reference unknown bundle: ${rule.bundleRef}`, 400);
    }

    await tx.contestRewardDistributionRule.create({
      data: {
        rewardPolicyId: policy.id,
        bundleId,
        priority: rule.priority,
        ruleType: rule.ruleType,
        rankFrom: rule.rankFrom ?? null,
        rankTo: rule.rankTo ?? null,
        topN: rule.topN ?? null,
        topPercent: rule.topPercent ?? null,
        poolAmount: (rule as any).poolAmount ?? null,
      },
    });
  }
}

const contestDraftInclude = {
  rules: true,
  rewardPolicy: {
    include: {
      bundles: {
        include: { components: true },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      },
      distributionRules: {
        include: { bundle: true },
        orderBy: [{ priority: "asc" }],
      },
    },
  },
} satisfies Prisma.ContestInclude;
