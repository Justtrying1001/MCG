import {
  ContestEntryStatus,
  ContestRewardPolicyStatus,
  ContestStatus,
  Prisma,
} from "@prisma/client";

import { ContestRuntimeError } from "@/lib/domain/contests/runtime";
import { evaluateContestRewardPackCapacity } from "@/lib/domain/contests/reward-pack-capacity";
import { prisma } from "@/lib/prisma";
import { qstash } from "@/lib/qstash";

const TEAM_SIZE_MODE_EXACT = "EXACT" as const;
const ELIGIBILITY_MODE_ANY = "ANY" as const;
const ELIGIBILITY_MODE_CARD_SET_ONLY = "CARD_SET_ONLY" as const;
const REWARD_TYPE_POINTS = "POINTS" as const;
const REWARD_TYPE_PACK = "PACK" as const;
const REWARD_TYPE_XP = "XP" as const;
const DISTRIBUTION_RULE_FIXED_RANKS = "FIXED_RANKS" as const;
const DISTRIBUTION_RULE_TOP_N = "TOP_N" as const;
const DISTRIBUTION_RULE_TOP_PERCENT = "TOP_PERCENT" as const;

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
  ruleType: "FIXED_RANKS" | "TOP_N" | "TOP_PERCENT";
  bundleRef: string;
  rankFrom?: number;
  rankTo?: number;
  topN?: number;
  topPercent?: number;
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
  rewardBundles?: RewardBundleInput[];
  distributionRules?: DistributionRuleInput[];
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
          },
        },
      },
    });

    await replaceRewardPolicyTx(tx, contest.id, normalized.rewardBundles, normalized.distributionRules);

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
    })) ?? [],
  });

  const timesChanged =
    normalized.openAt?.toISOString() !== (existing.openAt?.toISOString() ?? null) ||
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
    };

    if (rule?.id) {
      await tx.contestRule.update({ where: { id: rule.id }, data: ruleData });
    } else {
      await tx.contestRule.create({ data: { contestId, ...ruleData } });
    }

    await replaceRewardPolicyTx(tx, contestId, normalized.rewardBundles, normalized.distributionRules);

    const fullContest = await tx.contest.findUnique({ where: { id: contestId }, include: contestDraftInclude });
    return { contest: fullContest };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  if (timesChanged && existing.configPublishedAt && process.env.QSTASH_TOKEN && normalized.openAt && normalized.liveAt && normalized.endsAt) {
    await rescheduleQStashJobs(contestId, existing, normalized.openAt, normalized.liveAt, normalized.endsAt);
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
        message: `Reward pool missing for ${row.packCode ?? row.packDefinitionId}`,
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

    // When QStash is configured the contest stays DRAFT until the contest-open job fires.
    // Without QStash (dev / test) we open immediately for backward compatibility.
    const statusUpdate = hasQStash ? {} : { status: ContestStatus.OPEN };
    await tx.contest.update({ where: { id: contestId }, data: { configPublishedAt: new Date(), ...statusUpdate } });
    await tx.contestRewardPolicy.updateMany({ where: { contestId }, data: { status: ContestRewardPolicyStatus.PUBLISHED } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  if (hasQStash) {
    const contest = await prisma.contest.findUnique({ where: { id: contestId }, select: { openAt: true, liveAt: true, endsAt: true } });
    if (contest?.openAt && contest.liveAt && contest.endsAt) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
      try {
        const [openJob, liveJob, settleJob] = await Promise.all([
          qstash.publishJSON({ url: `${baseUrl}/api/internal/jobs/contest-open`, body: { contestId }, notBefore: Math.floor(contest.openAt.getTime() / 1000) }),
          qstash.publishJSON({ url: `${baseUrl}/api/internal/jobs/contest-live`, body: { contestId }, notBefore: Math.floor(contest.liveAt.getTime() / 1000) }),
          qstash.publishJSON({ url: `${baseUrl}/api/internal/jobs/contest-settle`, body: { contestId }, notBefore: Math.floor(contest.endsAt.getTime() / 1000) }),
        ]);
        await prisma.contest.update({
          where: { id: contestId },
          data: { qstashOpenJobId: openJob.messageId, qstashLiveJobId: liveJob.messageId, qstashSettleJobId: settleJob.messageId },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[publish] Failed to schedule QStash jobs for contest ${contestId}: ${message}`);
      }
    } else {
      console.warn(`[publish] Contest ${contestId} missing openAt/liveAt/endsAt — QStash jobs not scheduled`);
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

    const hasOperations = contest._count.entries > 0 || contest._count.scores > 0 || contest._count.rankings > 0 || contest._count.settlements > 0;
    const deletableBecauseCanceled = contest.status === ContestStatus.CANCELED;

    if (hasOperations && !deletableBecauseCanceled) {
      throw new ContestRuntimeError(
        "Delete is blocked: this contest already has entries/scores/rankings/settlements. Cancel it first, then delete if you still need a full purge.",
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

  if (!contest.liveAt || !contest.lockAt || !contest.endsAt) {
    issues.push({ code: "TIMING_REQUIRED", severity: "ERROR", field: "timing", message: "liveAt, lockAt and endsAt are required" });
  } else {
    if (contest.lockAt >= contest.liveAt) {
      issues.push({ code: "TIMING_INVALID_ORDER", severity: "ERROR", field: "liveAt", message: "liveAt must be after lockAt" });
    }
    if (contest.lockAt > contest.endsAt) {
      issues.push({ code: "TIMING_INVALID_ORDER", severity: "ERROR", field: "endsAt", message: "endsAt must be at or after lockAt" });
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
      if (component.type === REWARD_TYPE_POINTS && (!Number.isInteger(component.pointsAmount) || (component.pointsAmount ?? 0) <= 0)) {
        issues.push({ code: "POINTS_COMPONENT_INVALID", severity: "ERROR", field: `rewardBundles[${bundleIndex}].components[${componentIndex}]`, message: "POINTS component requires positive integer pointsAmount" });
      }
      if (component.type === REWARD_TYPE_XP && (!Number.isInteger(component.xpAmount) || (component.xpAmount ?? 0) <= 0)) {
        issues.push({ code: "XP_COMPONENT_INVALID", severity: "ERROR", field: `rewardBundles[${bundleIndex}].components[${componentIndex}]`, message: "XP component requires positive integer xpAmount" });
      }
      if (component.type === REWARD_TYPE_PACK) {
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

    if (rule.ruleType === DISTRIBUTION_RULE_FIXED_RANKS) {
      if (!Number.isInteger(rule.rankFrom) || !Number.isInteger(rule.rankTo) || (rule.rankFrom ?? 0) <= 0 || (rule.rankTo ?? 0) <= 0 || (rule.rankFrom ?? 0) > (rule.rankTo ?? 0)) {
        issues.push({ code: "DISTRIBUTION_FIXED_RANKS_INVALID", severity: "ERROR", field: `distributionRules[${index}]`, message: "FIXED_RANKS requires rankFrom/rankTo with rankFrom <= rankTo" });
      }
    }

    if (rule.ruleType === DISTRIBUTION_RULE_TOP_N && (!Number.isInteger(rule.topN) || (rule.topN ?? 0) <= 0)) {
      issues.push({ code: "DISTRIBUTION_TOP_N_INVALID", severity: "ERROR", field: `distributionRules[${index}].topN`, message: "TOP_N requires positive integer topN" });
    }

    if (rule.ruleType === DISTRIBUTION_RULE_TOP_PERCENT && (typeof rule.topPercent !== "number" || rule.topPercent <= 0 || rule.topPercent > 100)) {
      issues.push({ code: "DISTRIBUTION_TOP_PERCENT_INVALID", severity: "ERROR", field: `distributionRules[${index}].topPercent`, message: "TOP_PERCENT requires topPercent > 0 and <= 100" });
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
  const liveAt = input.liveAt ? new Date(input.liveAt) : null;
  const lockAt = input.lockAt ? new Date(input.lockAt) : null;
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;

  if (lockAt && liveAt && lockAt >= liveAt) {
    throw new ContestRuntimeError("liveAt must be after lockAt", 400);
  }
  if (lockAt && endsAt && lockAt > endsAt) {
    throw new ContestRuntimeError("endsAt must be at or after lockAt", 400);
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
    rewardBundles: input.rewardBundles ?? [],
    distributionRules: input.distributionRules ?? [],
  };
}

async function rescheduleQStashJobs(
  contestId: string,
  existing: { qstashOpenJobId: string | null; qstashLiveJobId: string | null; qstashSettleJobId: string | null },
  openAt: Date,
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

    const [openJob, liveJob, settleJob] = await Promise.all([
      qstash.publishJSON({ url: `${baseUrl}/api/internal/jobs/contest-open`, body: { contestId }, notBefore: Math.floor(openAt.getTime() / 1000) }),
      qstash.publishJSON({ url: `${baseUrl}/api/internal/jobs/contest-live`, body: { contestId }, notBefore: Math.floor(liveAt.getTime() / 1000) }),
      qstash.publishJSON({ url: `${baseUrl}/api/internal/jobs/contest-settle`, body: { contestId }, notBefore: Math.floor(endsAt.getTime() / 1000) }),
    ]);

    await prisma.contest.update({
      where: { id: contestId },
      data: { qstashOpenJobId: openJob.messageId, qstashLiveJobId: liveJob.messageId, qstashSettleJobId: settleJob.messageId },
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
  distributionRules: DistributionRuleInput[]
) {
  const policy = await tx.contestRewardPolicy.upsert({
    where: { contestId },
    create: { contestId, status: ContestRewardPolicyStatus.DRAFT },
    update: {},
  });

  await tx.contestRewardDistributionRule.deleteMany({ where: { rewardPolicyId: policy.id } });
  await tx.contestRewardComponent.deleteMany({ where: { bundle: { rewardPolicyId: policy.id } } });
  await tx.contestRewardBundle.deleteMany({ where: { rewardPolicyId: policy.id } });

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
