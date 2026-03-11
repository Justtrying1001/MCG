import {
  Prisma,
  QuestSubmissionStatus,
  QuestType,
  QuestValidationMode,
  RewardLedgerEntryType,
  RewardLedgerReasonType,
  UserQuestStatus,
  type QuestDefinition,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { LedgerConventions } from "@/lib/domain/rewards/conventions";
import { creditPointsWithLedger } from "@/lib/domain/rewards/ledger";

export class QuestRuntimeError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "QuestRuntimeError";
    this.status = status;
  }
}

type SocialQuestConfigSummary = {
  proofRequired: boolean;
  targetUrl: string | null;
  instructions: string | null;
};


export type InternalQuestAnalytics = {
  progressCount: number;
  completedCount: number;
  pendingSubmissionCount: number;
  approvedSubmissionCount: number;
  rejectedSubmissionCount: number;
  totalPointsDistributed: number;
};

export type InternalQuestDetail = {
  quest: QuestDefinition;
  analytics: InternalQuestAnalytics;
  latestSubmissions: Array<{
    id: string;
    status: QuestSubmissionStatus;
    proofUrl: string | null;
    note: string | null;
    reviewedByAdmin: string | null;
    reviewedAt: string | null;
    createdAt: string;
    user: { id: string; xUsername: string; displayName: string };
  }>;
  recentlyCompletedUsers: Array<{
    userId: string;
    completedAt: string;
    progressValue: number;
    user: { id: string; xUsername: string; displayName: string };
  }>;
  latestLedgerCredits: Array<{
    id: string;
    userId: string;
    amount: number;
    idempotencyKey: string | null;
    createdAt: string;
    metadata: Prisma.JsonValue | null;
    user: { id: string; xUsername: string; displayName: string };
  }>;
};

export type QuestForUserRow = {
  id: string;
  code: string;
  type: QuestType;
  title: string;
  description: string | null;
  rewardPoints: number;
  validationMode: QuestValidationMode;
  oneTime: boolean;
  isActive: boolean;
  status: UserQuestStatus;
  progressValue: number;
  targetValue: number | null;
  completedAt: string | null;
  claimedAt: string | null;
  latestSubmissionStatus: QuestSubmissionStatus | null;
  latestSubmission: {
    id: string;
    status: QuestSubmissionStatus;
    proofUrl: string | null;
    note: string | null;
    createdAt: string;
    reviewedAt: string | null;
  } | null;
  configSummary: {
    threshold?: number;
    proofRequired?: boolean;
    targetUrl?: string | null;
    instructions?: string | null;
  };
};

function nowInActiveWindow(now: Date, quest: { startAt: Date | null; endAt: Date | null }) {
  if (quest.startAt && quest.startAt > now) return false;
  if (quest.endAt && quest.endAt < now) return false;
  return true;
}

function isSocialSubmitQuest(type: QuestType) {
  return type === QuestType.SOCIAL_FOLLOW_X || type === QuestType.SOCIAL_ENGAGEMENT_X;
}

function parseContestMilestoneThreshold(config: Prisma.JsonValue | null): number | null {
  if (!config || typeof config !== "object" || Array.isArray(config)) return null;

  const threshold = (config as Record<string, unknown>).threshold;
  if (!Number.isInteger(threshold) || Number(threshold) <= 0) return null;

  return Number(threshold);
}

function parseSocialSubmitConfig(config: Prisma.JsonValue | null): SocialQuestConfigSummary {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return { proofRequired: false, targetUrl: null, instructions: null };
  }

  const root = config as Record<string, unknown>;

  return {
    proofRequired: Boolean(root.proofRequired),
    targetUrl: typeof root.targetUrl === "string" && root.targetUrl.trim() ? root.targetUrl.trim() : null,
    instructions: typeof root.instructions === "string" && root.instructions.trim() ? root.instructions.trim() : null,
  };
}

function normalizeRewardPoints(value: unknown) {
  const rewardPoints = Number(value);
  if (!Number.isInteger(rewardPoints) || rewardPoints < 0) {
    throw new QuestRuntimeError("rewardPoints must be a non-negative integer", 400);
  }

  return rewardPoints;
}

function normalizeOptionalDate(raw: unknown): Date | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === "") return null;

  const value = new Date(String(raw));
  if (Number.isNaN(value.getTime())) {
    throw new QuestRuntimeError("Invalid date value", 400);
  }

  return value;
}

function normalizeQuestConfig(type: QuestType, config: unknown, required: boolean): Prisma.InputJsonValue | undefined {
  if (type === QuestType.CONTEST_COUNT_MILESTONE) {
    if (config === undefined) {
      if (required) throw new QuestRuntimeError("CONTEST_COUNT_MILESTONE quests require config.threshold", 400);
      return undefined;
    }

    if (!config || typeof config !== "object" || Array.isArray(config)) {
      throw new QuestRuntimeError("config must be an object", 400);
    }

    const threshold = (config as Record<string, unknown>).threshold;
    if (!Number.isInteger(threshold) || Number(threshold) <= 0) {
      throw new QuestRuntimeError("config.threshold must be a positive integer", 400);
    }

    return { threshold: Number(threshold) };
  }

  if (isSocialSubmitQuest(type)) {
    if (config === undefined) {
      if (required) {
        return { proofRequired: false, targetUrl: null, instructions: null };
      }
      return undefined;
    }

    if (!config || typeof config !== "object" || Array.isArray(config)) {
      throw new QuestRuntimeError("config must be an object", 400);
    }

    const root = config as Record<string, unknown>;

    return {
      proofRequired: Boolean(root.proofRequired),
      targetUrl: typeof root.targetUrl === "string" && root.targetUrl.trim() ? root.targetUrl.trim() : null,
      instructions: typeof root.instructions === "string" && root.instructions.trim() ? root.instructions.trim() : null,
    };
  }

  if (config === undefined || config === null) return undefined;
  return config as Prisma.InputJsonValue;
}

export async function applyContestEntryQuestProgressionTx(tx: Prisma.TransactionClient, userId: string) {
  const now = new Date();
  const contestEntriesCount = await tx.contestEntry.count({ where: { userId } });

  const quests = await tx.questDefinition.findMany({
    where: {
      type: QuestType.CONTEST_COUNT_MILESTONE,
      isActive: true,
      validationMode: QuestValidationMode.AUTO,
    },
  });

  for (const quest of quests) {
    if (!nowInActiveWindow(now, quest)) continue;

    const threshold = parseContestMilestoneThreshold(quest.config);
    if (!threshold) continue;

    const reached = contestEntriesCount >= threshold;

    const existing = await tx.userQuestProgress.findUnique({
      where: {
        userId_questId: { userId, questId: quest.id },
      },
    });

    if (!existing) {
      const status = reached ? UserQuestStatus.COMPLETED : (contestEntriesCount > 0 ? UserQuestStatus.IN_PROGRESS : UserQuestStatus.AVAILABLE);
      const completedAt = reached ? now : null;
      const claimedAt = reached ? now : null;

      await tx.userQuestProgress.create({
        data: {
          userId,
          questId: quest.id,
          status,
          progressValue: contestEntriesCount,
          completedAt,
          claimedAt,
        },
      });
    } else {
      const nextProgress = Math.max(existing.progressValue, contestEntriesCount);

      if (existing.status === UserQuestStatus.COMPLETED) {
        if (nextProgress > existing.progressValue) {
          await tx.userQuestProgress.update({
            where: { id: existing.id },
            data: { progressValue: nextProgress },
          });
        }
      } else if (reached) {
        await tx.userQuestProgress.update({
          where: { id: existing.id },
          data: {
            status: UserQuestStatus.COMPLETED,
            progressValue: nextProgress,
            completedAt: existing.completedAt ?? now,
            claimedAt: existing.claimedAt ?? now,
          },
        });
      } else {
        await tx.userQuestProgress.update({
          where: { id: existing.id },
          data: {
            status: nextProgress > 0 ? UserQuestStatus.IN_PROGRESS : UserQuestStatus.AVAILABLE,
            progressValue: nextProgress,
          },
        });
      }
    }

    if (reached && quest.rewardPoints > 0) {
      await creditPointsWithLedger(tx, {
        userId,
        amount: quest.rewardPoints,
        reasonType: RewardLedgerReasonType.QUEST_REWARD,
        reasonRef: LedgerConventions.questReward.reasonRef(quest.id),
        idempotencyKey: LedgerConventions.questReward.autoMilestoneIdempotencyKey(quest.id, userId),
        metadata: {
          questCode: quest.code,
          questType: quest.type,
          trigger: "contest_entry_count",
        },
      });
    }
  }
}

export async function syncContestEntryQuestProgression(userId: string) {
  return prisma.$transaction(async (tx) => {
    await applyContestEntryQuestProgressionTx(tx, userId);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function submitSocialQuestMvp(params: {
  questId: string;
  userId: string;
  proofUrl?: string | null;
  note?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const quest = await tx.questDefinition.findUnique({ where: { id: params.questId } });
    if (!quest) throw new QuestRuntimeError("Quest not found", 404);

    if (!quest.isActive || !nowInActiveWindow(now, quest)) {
      throw new QuestRuntimeError("Quest is not active", 400);
    }

    if (!isSocialSubmitQuest(quest.type)) {
      throw new QuestRuntimeError("Quest does not accept user submissions", 400);
    }

    if (quest.validationMode !== QuestValidationMode.SUBMIT && quest.validationMode !== QuestValidationMode.MANUAL_REVIEW) {
      throw new QuestRuntimeError("Quest validation mode does not allow submit workflow", 400);
    }

    const socialConfig = parseSocialSubmitConfig(quest.config);
    const proofUrl = params.proofUrl?.trim() || null;
    const note = params.note?.trim() || null;

    if (socialConfig.proofRequired && !proofUrl) {
      throw new QuestRuntimeError("This quest requires a proof URL", 400);
    }

    const [latestSubmission, progress] = await Promise.all([
      tx.questSubmission.findFirst({
        where: { userId: params.userId, questId: params.questId },
        orderBy: [{ createdAt: "desc" }],
      }),
      tx.userQuestProgress.findUnique({
        where: { userId_questId: { userId: params.userId, questId: params.questId } },
      }),
    ]);

    if (latestSubmission?.status === QuestSubmissionStatus.SUBMITTED) {
      throw new QuestRuntimeError("A submission is already under review", 409);
    }

    if (latestSubmission?.status === QuestSubmissionStatus.APPROVED || progress?.status === UserQuestStatus.COMPLETED) {
      throw new QuestRuntimeError("Quest already completed", 409);
    }

    const submission = await tx.questSubmission.create({
      data: {
        userId: params.userId,
        questId: params.questId,
        status: QuestSubmissionStatus.SUBMITTED,
        proofUrl,
        note,
      },
    });

    if (!progress) {
      await tx.userQuestProgress.create({
        data: {
          userId: params.userId,
          questId: params.questId,
          status: UserQuestStatus.IN_PROGRESS,
          progressValue: 0,
        },
      });
    } else {
      await tx.userQuestProgress.update({
        where: { id: progress.id },
        data: { status: UserQuestStatus.IN_PROGRESS },
      });
    }

    return submission;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function reviewQuestSubmissionMvp(params: {
  submissionId: string;
  action: "APPROVE" | "REJECT";
  reviewedByAdmin: string;
  note?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const submission = await tx.questSubmission.findUnique({
      where: { id: params.submissionId },
      include: { quest: true },
    });

    if (!submission) throw new QuestRuntimeError("Submission not found", 404);

    if (!isSocialSubmitQuest(submission.quest.type)) {
      throw new QuestRuntimeError("Submission quest type is not social submit", 400);
    }

    if (submission.status !== QuestSubmissionStatus.SUBMITTED) {
      return { submission, alreadyReviewed: true as const };
    }

    const now = new Date();
    const reviewedSubmission = await tx.questSubmission.update({
      where: { id: submission.id },
      data: {
        status: params.action === "APPROVE" ? QuestSubmissionStatus.APPROVED : QuestSubmissionStatus.REJECTED,
        reviewedByAdmin: params.reviewedByAdmin,
        reviewedAt: now,
        note: params.note !== undefined ? (params.note?.trim() || null) : submission.note,
      },
    });

    const progress = await tx.userQuestProgress.findUnique({
      where: { userId_questId: { userId: submission.userId, questId: submission.questId } },
    });

    if (params.action === "APPROVE") {
      if (!progress) {
        await tx.userQuestProgress.create({
          data: {
            userId: submission.userId,
            questId: submission.questId,
            status: UserQuestStatus.COMPLETED,
            progressValue: 1,
            completedAt: now,
            claimedAt: now,
          },
        });
      } else {
        await tx.userQuestProgress.update({
          where: { id: progress.id },
          data: {
            status: UserQuestStatus.COMPLETED,
            progressValue: Math.max(progress.progressValue, 1),
            completedAt: progress.completedAt ?? now,
            claimedAt: progress.claimedAt ?? now,
          },
        });
      }

      if (submission.quest.rewardPoints > 0) {
        await creditPointsWithLedger(tx, {
          userId: submission.userId,
          amount: submission.quest.rewardPoints,
          reasonType: RewardLedgerReasonType.QUEST_REWARD,
          reasonRef: LedgerConventions.questReward.reasonRef(submission.questId),
          idempotencyKey: LedgerConventions.questReward.approvalIdempotencyKey(submission.questId, submission.userId),
          metadata: {
            questCode: submission.quest.code,
            questType: submission.quest.type,
            trigger: "manual_review_approval",
            submissionId: submission.id,
          },
        });
      }
    } else if (progress && progress.status !== UserQuestStatus.COMPLETED) {
      await tx.userQuestProgress.update({
        where: { id: progress.id },
        data: {
          status: UserQuestStatus.REJECTED,
        },
      });
    }

    return { submission: reviewedSubmission, alreadyReviewed: false as const };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function listQuestSubmissionsMvp(params?: { status?: QuestSubmissionStatus }) {
  return prisma.questSubmission.findMany({
    where: {
      ...(params?.status ? { status: params.status } : {}),
    },
    include: {
      user: { select: { id: true, xUsername: true, displayName: true } },
      quest: { select: { id: true, code: true, type: true, title: true, rewardPoints: true } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 300,
  });
}

export async function listUserQuestsMvp(userId: string): Promise<{ quests: QuestForUserRow[] }> {
  await syncContestEntryQuestProgression(userId);

  const now = new Date();

  const [quests, progressRows, submissions] = await prisma.$transaction([
    prisma.questDefinition.findMany({
      where: { isActive: true },
      orderBy: [{ createdAt: "desc" }],
      take: 200,
    }),
    prisma.userQuestProgress.findMany({
      where: { userId },
    }),
    prisma.questSubmission.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }],
      take: 500,
    }),
  ]);

  const progressByQuestId = new Map(progressRows.map((row) => [row.questId, row]));
  const latestSubmissionByQuestId = new Map<string, typeof submissions[number]>();
  for (const submission of submissions) {
    if (!latestSubmissionByQuestId.has(submission.questId)) {
      latestSubmissionByQuestId.set(submission.questId, submission);
    }
  }

  const rows = quests
    .filter((quest) => nowInActiveWindow(now, quest))
    .map((quest) => {
      const progress = progressByQuestId.get(quest.id);
      const threshold = quest.type === QuestType.CONTEST_COUNT_MILESTONE
        ? parseContestMilestoneThreshold(quest.config)
        : null;
      const latestSubmission = latestSubmissionByQuestId.get(quest.id) ?? null;
      const socialConfig = isSocialSubmitQuest(quest.type) ? parseSocialSubmitConfig(quest.config) : null;

      return {
        id: quest.id,
        code: quest.code,
        type: quest.type,
        title: quest.title,
        description: quest.description,
        rewardPoints: quest.rewardPoints,
        validationMode: quest.validationMode,
        oneTime: quest.oneTime,
        isActive: quest.isActive,
        status: progress?.status ?? UserQuestStatus.AVAILABLE,
        progressValue: progress?.progressValue ?? 0,
        targetValue: threshold,
        completedAt: progress?.completedAt?.toISOString() ?? null,
        claimedAt: progress?.claimedAt?.toISOString() ?? null,
        latestSubmissionStatus: latestSubmission?.status ?? null,
        latestSubmission: latestSubmission
          ? {
              id: latestSubmission.id,
              status: latestSubmission.status,
              proofUrl: latestSubmission.proofUrl,
              note: latestSubmission.note,
              createdAt: latestSubmission.createdAt.toISOString(),
              reviewedAt: latestSubmission.reviewedAt?.toISOString() ?? null,
            }
          : null,
        configSummary: {
          ...(threshold ? { threshold } : {}),
          ...(socialConfig ? socialConfig : {}),
        },
      };
    });

  return { quests: rows };
}

export async function listInternalQuestsMvp() {
  const quests = await prisma.questDefinition.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 300,
  });

  const questIds = quests.map((quest) => quest.id);
  if (questIds.length === 0) {
    return [];
  }

  const [progressGrouped, submissionGrouped, pointsGrouped] = await prisma.$transaction([
    prisma.userQuestProgress.groupBy({
      by: ["questId", "status"],
      where: { questId: { in: questIds } },
      orderBy: { questId: "asc" },
      _count: { questId: true },
    }),
    prisma.questSubmission.groupBy({
      by: ["questId", "status"],
      where: { questId: { in: questIds } },
      orderBy: { questId: "asc" },
      _count: { questId: true },
    }),
    prisma.rewardLedgerEntry.groupBy({
      by: ["reasonRef"],
      where: {
        entryType: RewardLedgerEntryType.CREDIT,
        reasonType: RewardLedgerReasonType.QUEST_REWARD,
        reasonRef: { in: questIds },
      },
      orderBy: { reasonRef: "asc" },
      _sum: { amount: true },
    }),
  ]);

  const progressMap = new Map<string, { progressCount: number; completedCount: number }>();
  for (const row of progressGrouped) {
    const entry = progressMap.get(row.questId) ?? { progressCount: 0, completedCount: 0 };
    const count = (row as { _count?: { questId?: number } })._count?.questId ?? 0;
    entry.progressCount += count;
    if (row.status === UserQuestStatus.COMPLETED) {
      entry.completedCount += count;
    }
    progressMap.set(row.questId, entry);
  }

  const submissionMap = new Map<string, { pendingSubmissionCount: number; approvedSubmissionCount: number; rejectedSubmissionCount: number }>();
  for (const row of submissionGrouped) {
    const entry = submissionMap.get(row.questId) ?? { pendingSubmissionCount: 0, approvedSubmissionCount: 0, rejectedSubmissionCount: 0 };
    const count = (row as { _count?: { questId?: number } })._count?.questId ?? 0;
    if (row.status === QuestSubmissionStatus.SUBMITTED) entry.pendingSubmissionCount += count;
    if (row.status === QuestSubmissionStatus.APPROVED) entry.approvedSubmissionCount += count;
    if (row.status === QuestSubmissionStatus.REJECTED) entry.rejectedSubmissionCount += count;
    submissionMap.set(row.questId, entry);
  }

  const pointsMap = new Map<string, number>();
  for (const row of pointsGrouped) {
    if (row.reasonRef) {
      pointsMap.set(row.reasonRef, row._sum?.amount ?? 0);
    }
  }

  return quests.map((quest) => ({
    ...quest,
    analytics: {
      progressCount: progressMap.get(quest.id)?.progressCount ?? 0,
      completedCount: progressMap.get(quest.id)?.completedCount ?? 0,
      pendingSubmissionCount: submissionMap.get(quest.id)?.pendingSubmissionCount ?? 0,
      approvedSubmissionCount: submissionMap.get(quest.id)?.approvedSubmissionCount ?? 0,
      rejectedSubmissionCount: submissionMap.get(quest.id)?.rejectedSubmissionCount ?? 0,
      totalPointsDistributed: pointsMap.get(quest.id) ?? 0,
    },
  }));
}

export async function createQuestDefinitionMvp(input: {
  code?: unknown;
  type?: unknown;
  title?: unknown;
  description?: unknown;
  rewardPoints?: unknown;
  validationMode?: unknown;
  oneTime?: unknown;
  isActive?: unknown;
  startAt?: unknown;
  endAt?: unknown;
  config?: unknown;
}) {
  const code = String(input.code ?? "").trim();
  const title = String(input.title ?? "").trim();

  if (!code || !title) {
    throw new QuestRuntimeError("code and title are required", 400);
  }

  const type = Object.values(QuestType).includes(input.type as QuestType)
    ? input.type as QuestType
    : QuestType.MANUAL;

  const validationMode = Object.values(QuestValidationMode).includes(input.validationMode as QuestValidationMode)
    ? input.validationMode as QuestValidationMode
    : QuestValidationMode.MANUAL_REVIEW;

  const rewardPoints = normalizeRewardPoints(input.rewardPoints ?? 0);
  const oneTime = input.oneTime === undefined ? true : Boolean(input.oneTime);
  const isActive = input.isActive === undefined ? true : Boolean(input.isActive);

  const startAt = normalizeOptionalDate(input.startAt);
  const endAt = normalizeOptionalDate(input.endAt);

  if (startAt && endAt && startAt > endAt) {
    throw new QuestRuntimeError("startAt must be before endAt", 400);
  }

  const config = normalizeQuestConfig(type, input.config, true);

  return prisma.questDefinition.create({
    data: {
      code,
      type,
      title,
      description: input.description ? String(input.description) : null,
      rewardPoints,
      validationMode,
      oneTime,
      isActive,
      startAt,
      endAt,
      config,
    },
  });
}

export async function updateQuestDefinitionMvp(
  questId: string,
  input: {
    code?: unknown;
    type?: unknown;
    title?: unknown;
    description?: unknown;
    rewardPoints?: unknown;
    validationMode?: unknown;
    oneTime?: unknown;
    isActive?: unknown;
    startAt?: unknown;
    endAt?: unknown;
    config?: unknown;
  }
) {
  const existing = await prisma.questDefinition.findUnique({ where: { id: questId } });
  if (!existing) {
    throw new QuestRuntimeError("Quest not found", 404);
  }

  const nextType = input.type !== undefined
    ? (Object.values(QuestType).includes(input.type as QuestType) ? input.type as QuestType : null)
    : existing.type;

  if (!nextType) {
    throw new QuestRuntimeError("Invalid quest type", 400);
  }

  const nextValidationMode = input.validationMode !== undefined
    ? (Object.values(QuestValidationMode).includes(input.validationMode as QuestValidationMode)
      ? input.validationMode as QuestValidationMode
      : null)
    : existing.validationMode;

  if (!nextValidationMode) {
    throw new QuestRuntimeError("Invalid validationMode", 400);
  }

  const nextStartAt = normalizeOptionalDate(input.startAt);
  const nextEndAt = normalizeOptionalDate(input.endAt);

  const startAt = nextStartAt === undefined ? existing.startAt : nextStartAt;
  const endAt = nextEndAt === undefined ? existing.endAt : nextEndAt;

  if (startAt && endAt && startAt > endAt) {
    throw new QuestRuntimeError("startAt must be before endAt", 400);
  }

  const config = normalizeQuestConfig(nextType, input.config, false);

  return prisma.questDefinition.update({
    where: { id: questId },
    data: {
      code: input.code !== undefined ? String(input.code).trim() : undefined,
      type: nextType,
      title: input.title !== undefined ? String(input.title).trim() : undefined,
      description: input.description !== undefined ? (input.description ? String(input.description) : null) : undefined,
      rewardPoints: input.rewardPoints !== undefined ? normalizeRewardPoints(input.rewardPoints) : undefined,
      validationMode: nextValidationMode,
      oneTime: input.oneTime !== undefined ? Boolean(input.oneTime) : undefined,
      isActive: input.isActive !== undefined ? Boolean(input.isActive) : undefined,
      startAt,
      endAt,
      config,
    },
  });
}

export async function getInternalQuestDetailMvp(questId: string): Promise<InternalQuestDetail> {
  const quest = await prisma.questDefinition.findUnique({ where: { id: questId } });
  if (!quest) throw new QuestRuntimeError("Quest not found", 404);

  const [progressGrouped, submissionGrouped, pointsGrouped, latestSubmissionsRaw, completedRows, latestLedgerRaw] = await prisma.$transaction([
    prisma.userQuestProgress.groupBy({
      by: ["status"],
      where: { questId },
      orderBy: { status: "asc" },
      _count: { status: true },
    }),
    prisma.questSubmission.groupBy({
      by: ["status"],
      where: { questId },
      orderBy: { status: "asc" },
      _count: { status: true },
    }),
    prisma.rewardLedgerEntry.aggregate({
      where: {
        entryType: RewardLedgerEntryType.CREDIT,
        reasonType: RewardLedgerReasonType.QUEST_REWARD,
        reasonRef: questId,
      },
      _sum: { amount: true },
    }),
    prisma.questSubmission.findMany({
      where: { questId },
      include: { user: { select: { id: true, xUsername: true, displayName: true } } },
      orderBy: [{ createdAt: "desc" }],
      take: 20,
    }),
    prisma.userQuestProgress.findMany({
      where: { questId, status: UserQuestStatus.COMPLETED },
      include: { user: { select: { id: true, xUsername: true, displayName: true } } },
      orderBy: [{ completedAt: "desc" }],
      take: 20,
    }),
    prisma.rewardLedgerEntry.findMany({
      where: {
        entryType: RewardLedgerEntryType.CREDIT,
        reasonType: RewardLedgerReasonType.QUEST_REWARD,
        reasonRef: questId,
      },
      include: { user: { select: { id: true, xUsername: true, displayName: true } } },
      orderBy: [{ createdAt: "desc" }],
      take: 20,
    }),
  ]);

  const analytics: InternalQuestAnalytics = {
    progressCount: 0,
    completedCount: 0,
    pendingSubmissionCount: 0,
    approvedSubmissionCount: 0,
    rejectedSubmissionCount: 0,
    totalPointsDistributed: pointsGrouped._sum.amount ?? 0,
  };

  for (const row of progressGrouped) {
    const count = (row as { _count?: { status?: number } })._count?.status ?? 0;
    analytics.progressCount += count;
    if (row.status === UserQuestStatus.COMPLETED) {
      analytics.completedCount += count;
    }
  }

  for (const row of submissionGrouped) {
    const count = (row as { _count?: { status?: number } })._count?.status ?? 0;
    if (row.status === QuestSubmissionStatus.SUBMITTED) analytics.pendingSubmissionCount += count;
    if (row.status === QuestSubmissionStatus.APPROVED) analytics.approvedSubmissionCount += count;
    if (row.status === QuestSubmissionStatus.REJECTED) analytics.rejectedSubmissionCount += count;
  }

  return {
    quest,
    analytics,
    latestSubmissions: latestSubmissionsRaw.map((row) => ({
      id: row.id,
      status: row.status,
      proofUrl: row.proofUrl,
      note: row.note,
      reviewedByAdmin: row.reviewedByAdmin,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      user: row.user,
    })),
    recentlyCompletedUsers: completedRows.map((row) => ({
      userId: row.userId,
      completedAt: row.completedAt?.toISOString() ?? row.updatedAt.toISOString(),
      progressValue: row.progressValue,
      user: row.user,
    })),
    latestLedgerCredits: latestLedgerRaw.map((row) => ({
      id: row.id,
      userId: row.userId,
      amount: row.amount,
      idempotencyKey: row.idempotencyKey,
      createdAt: row.createdAt.toISOString(),
      metadata: row.metadata,
      user: row.user,
    })),
  };
}
