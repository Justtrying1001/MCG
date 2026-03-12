import { prisma } from "@/lib/prisma";
import {
  ContestEntryStatus,
  ContestStatus,
  Prisma,
  RewardLedgerReasonType,
  RewardType,
} from "@prisma/client";

import { applyContestEntryQuestProgressionTx } from "@/lib/domain/quests/runtime";
import { debitPointsWithLedger } from "@/lib/domain/rewards/ledger";

const DEFAULT_LINEUP_SIZE = 5;
const TEAM_SIZE_MODE_EXACT = "EXACT";
const ELIGIBILITY_MODE_CARD_SET_ONLY = "CARD_SET_ONLY";
const ACTIVE_LOCK_STATUSES: ContestStatus[] = [ContestStatus.OPEN, ContestStatus.LOCKED, ContestStatus.LIVE];

export type ContestLineupValidationResult = {
  contestId: string;
  lineupInstanceIds: string[];
  maxRosterSize: number;
};

export type ScoreSubmission = {
  userId: string;
  score: number;
};

export type RewardGrantInput = {
  userId: string;
  type: RewardType;
  amount?: number;
  packDefinitionId?: string;
};

export class ContestRuntimeError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ContestRuntimeError";
    this.status = status;
  }
}

function assertFiniteScore(score: number) {
  if (!Number.isFinite(score)) {
    throw new ContestRuntimeError("Score must be a finite number", 400);
  }
}

function normalizeLineupIds(lineupInstanceIds: unknown): string[] {
  if (!Array.isArray(lineupInstanceIds)) {
    throw new ContestRuntimeError("lineupInstanceIds must be an array of instance IDs", 400);
  }

  const normalized = lineupInstanceIds
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);

  if (normalized.length === 0) {
    throw new ContestRuntimeError("Lineup cannot be empty", 400);
  }

  const deduped = [...new Set(normalized)];
  if (deduped.length !== normalized.length) {
    throw new ContestRuntimeError("Lineup cannot contain duplicate card instances", 400);
  }

  return deduped;
}

async function getContestRule(tx: Prisma.TransactionClient, contestId: string) {
  return tx.contestRule.findFirst({
    where: { contestId },
    orderBy: { id: "asc" },
  });
}

export async function listContestsMvp() {
  return prismaSafe((tx) =>
    tx.contest.findMany({
      where: { status: { in: [ContestStatus.OPEN, ContestStatus.LOCKED, ContestStatus.LIVE, ContestStatus.SETTLED] } },
      include: {
        rules: true,
        _count: { select: { entries: true } },
      },
      orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
      take: 50,
    })
  );
}

export async function getContestDetailMvp(contestId: string, userId?: string) {
  return prismaSafe(async (tx) => {
    const contest = await tx.contest.findUnique({
      where: { id: contestId },
      include: {
        rules: true,
        _count: { select: { entries: true } },
      },
    });

    if (!contest) {
      throw new ContestRuntimeError("Contest not found", 404);
    }

    const userEntry = userId
      ? await tx.contestEntry.findUnique({
          where: { contestId_userId: { contestId, userId } },
          include: { rosterLocks: true },
        })
      : null;

    return { contest, userEntry };
  });
}

export async function enterContestMvp(params: {
  contestId: string;
  userId: string;
  lineupInstanceIds: unknown;
}) {
  const lineupInstanceIds = normalizeLineupIds(params.lineupInstanceIds);

  return prismaSafe(async (tx) => {
    const contest = await tx.contest.findUnique({ where: { id: params.contestId } });
    if (!contest) {
      throw new ContestRuntimeError("Contest not found", 404);
    }

    if (contest.status !== ContestStatus.OPEN) {
      throw new ContestRuntimeError("Contest is not accepting entries", 400);
    }

    if (contest.lockAt && contest.lockAt <= new Date()) {
      throw new ContestRuntimeError("Contest entry lock time has passed", 400);
    }

    const existingEntry = await tx.contestEntry.findUnique({
      where: { contestId_userId: { contestId: params.contestId, userId: params.userId } },
      select: { id: true },
    });

    if (existingEntry) {
      throw new ContestRuntimeError("User already entered this contest", 409);
    }

    const rule = await getContestRule(tx, params.contestId);
    const teamSizeMode = rule?.teamSizeMode ?? TEAM_SIZE_MODE_EXACT;
    const maxRosterSize = rule?.teamSizeValue ?? rule?.maxRosterSize ?? DEFAULT_LINEUP_SIZE;

    if (teamSizeMode !== TEAM_SIZE_MODE_EXACT) {
      throw new ContestRuntimeError("Only EXACT team size mode is currently supported", 400);
    }

    if (lineupInstanceIds.length !== maxRosterSize) {
      throw new ContestRuntimeError(`Lineup must contain exactly ${maxRosterSize} cards`, 400);
    }

    const ownedInstances = await tx.ownedCardInstance.findMany({
      where: {
        id: { in: lineupInstanceIds },
        userId: params.userId,
      },
      select: { id: true, cardTemplateId: true },
    });

    if (ownedInstances.length !== lineupInstanceIds.length) {
      throw new ContestRuntimeError(
        "One or more lineup card instances are not owned by the user (ownership truth: OwnedCardInstance)",
        400
      );
    }

    const effectiveEligibilityMode = rule?.eligibilityMode ?? "ANY";
    if ((effectiveEligibilityMode === ELIGIBILITY_MODE_CARD_SET_ONLY || rule?.cardSetId) && rule?.cardSetId) {
      const templateIds = ownedInstances.map((instance) => instance.cardTemplateId);
      const allowedTemplates = await tx.cardTemplate.findMany({
        where: {
          id: { in: templateIds },
          cardSetId: rule.cardSetId,
        },
        select: { id: true },
      });

      if (allowedTemplates.length !== templateIds.length) {
        throw new ContestRuntimeError("One or more lineup card instances violate contest card set eligibility", 400);
      }
    }

    const activeLocks = await tx.rosterLock.findMany({
      where: {
        ownedCardInstanceId: { in: lineupInstanceIds },
        contestEntry: {
          contest: { status: { in: ACTIVE_LOCK_STATUSES } },
          status: { in: [ContestEntryStatus.SUBMITTED, ContestEntryStatus.LOCKED, ContestEntryStatus.SCORED] },
        },
      },
      select: {
        ownedCardInstanceId: true,
        contestEntry: { select: { contestId: true } },
      },
    });

    if (activeLocks.length > 0) {
      throw new ContestRuntimeError(
        "One or more card instances are already locked in an active contest",
        409
      );
    }

    const entry = await tx.contestEntry.create({
      data: {
        contestId: params.contestId,
        userId: params.userId,
        status: ContestEntryStatus.LOCKED,
        rosterLocks: {
          createMany: {
            data: lineupInstanceIds.map((ownedCardInstanceId) => ({ ownedCardInstanceId })),
          },
        },
      },
      include: { rosterLocks: true },
    });

    const entryFeeEnabled = rule?.entryFeeEnabled ?? false;
    const entryFeeAmount = rule?.entryFeeAmount ?? 0;
    if (entryFeeEnabled) {
      if (!Number.isInteger(entryFeeAmount) || entryFeeAmount <= 0) {
        throw new ContestRuntimeError("Contest entry fee is misconfigured", 500);
      }

      try {
        await debitPointsWithLedger(tx, {
          userId: params.userId,
          amount: entryFeeAmount,
          reasonType: RewardLedgerReasonType.CONTEST_ENTRY_FEE,
          reasonRef: params.contestId,
          idempotencyKey: `contest-entry-fee:${params.contestId}:${params.userId}`,
          metadata: {
            contestId: params.contestId,
            entryId: entry.id,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Entry fee debit failed";
        if (message.toLowerCase().includes("not enough points")) {
          throw new ContestRuntimeError("Insufficient points for contest entry fee", 409);
        }
        throw new ContestRuntimeError("Contest entry fee debit failed", 500);
      }
    }

    await tx.ownedCardInstance.updateMany({
      where: { id: { in: lineupInstanceIds }, userId: params.userId },
      data: { lockState: `CONTEST:${params.contestId}:ENTRY:${entry.id}` },
    });

    await applyContestEntryQuestProgressionTx(tx, params.userId);

    return { contestId: params.contestId, entry };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function recordContestScoresMvp(params: { contestId: string; scores: ScoreSubmission[] }) {
  if (!Array.isArray(params.scores) || params.scores.length === 0) {
    throw new ContestRuntimeError("scores must be a non-empty array", 400);
  }

  const deduped = new Map<string, number>();
  for (const row of params.scores) {
    if (!row || typeof row.userId !== "string" || row.userId.trim().length === 0) {
      throw new ContestRuntimeError("Each score row must include userId", 400);
    }
    if (typeof row.score !== "number") {
      throw new ContestRuntimeError("Each score row must include numeric score", 400);
    }

    assertFiniteScore(row.score);
    deduped.set(row.userId.trim(), row.score);
  }

  return prismaSafe(async (tx) => {
    const contest = await tx.contest.findUnique({ where: { id: params.contestId } });
    if (!contest) throw new ContestRuntimeError("Contest not found", 404);

    if (contest.status !== ContestStatus.LIVE && contest.status !== ContestStatus.LOCKED) {
      throw new ContestRuntimeError("Contest must be LOCKED or LIVE to record scores", 400);
    }

    const rows = [...deduped.entries()].map(([userId, score]) => ({ userId, score }));

    for (const row of rows) {
      await tx.contestScore.upsert({
        where: { contestId_userId: { contestId: params.contestId, userId: row.userId } },
        create: { contestId: params.contestId, userId: row.userId, score: row.score },
        update: { score: row.score, scoredAt: new Date() },
      });
    }

    const scoredRows = await tx.contestScore.findMany({
      where: { contestId: params.contestId },
      orderBy: [{ score: "desc" }, { userId: "asc" }],
      select: { userId: true, score: true },
    });

    await tx.contestRanking.deleteMany({ where: { contestId: params.contestId } });

    if (scoredRows.length > 0) {
      await tx.contestRanking.createMany({
        data: scoredRows.map((row, index) => ({
          contestId: params.contestId,
          userId: row.userId,
          rank: index + 1,
          score: row.score,
        })),
      });
    }

    await tx.contestEntry.updateMany({
      where: { contestId: params.contestId, userId: { in: rows.map((row) => row.userId) } },
      data: { status: ContestEntryStatus.SCORED },
    });

    return { contestId: params.contestId, rankingsCount: scoredRows.length };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function settleContestMvp(params: { contestId: string; rewards: RewardGrantInput[] }) {
  return prismaSafe(async (tx) => {
    const contest = await tx.contest.findUnique({ where: { id: params.contestId } });
    if (!contest) throw new ContestRuntimeError("Contest not found", 404);

    if (contest.status === ContestStatus.SETTLED) {
      throw new ContestRuntimeError("Contest already settled", 409);
    }

    if (!Array.isArray(params.rewards)) {
      throw new ContestRuntimeError("rewards must be an array", 400);
    }

    const existingSettlement = await tx.contestSettlement.findUnique({
      where: { contestId: params.contestId },
      select: { id: true },
    });

    if (existingSettlement) {
      throw new ContestRuntimeError("Contest settlement already exists", 409);
    }

    const settlement = await tx.contestSettlement.create({
      data: { contestId: params.contestId },
    });

    for (const reward of params.rewards) {
      if (reward.type === RewardType.POINTS && typeof reward.amount !== "number") {
        throw new ContestRuntimeError("POINTS rewards require amount", 400);
      }

      await tx.rewardGrant.create({
        data: {
          userId: reward.userId,
          type: reward.type,
          amount: reward.amount,
          packDefinitionId: reward.packDefinitionId,
          sourceContestSettlementId: settlement.id,
        },
      });

      if (reward.type === RewardType.POINTS && reward.amount) {
        await tx.user.update({
          where: { id: reward.userId },
          data: { points: { increment: reward.amount } },
        });
      }
    }

    await tx.contest.update({
      where: { id: params.contestId },
      data: { status: ContestStatus.SETTLED },
    });

    await tx.contestEntry.updateMany({
      where: { contestId: params.contestId },
      data: { status: ContestEntryStatus.SETTLED },
    });

    return { contestId: params.contestId, settlementId: settlement.id, rewardCount: params.rewards.length };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function createContestMvp(input: {
  code: string;
  title: string;
  startsAt?: string | null;
  lockAt?: string | null;
  endsAt?: string | null;
  status?: ContestStatus;
  maxRosterSize?: number;
  cardSetId?: string | null;
  config?: Prisma.InputJsonValue;
}) {
  const code = input.code.trim();
  const title = input.title.trim();

  if (!code || !title) {
    throw new ContestRuntimeError("code and title are required", 400);
  }

  const status = input.status ?? ContestStatus.DRAFT;

  return prismaSafe((tx) =>
    tx.contest.create({
      data: {
        code,
        title,
        status,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        lockAt: input.lockAt ? new Date(input.lockAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        rules: {
          create: {
            maxRosterSize: input.maxRosterSize ?? DEFAULT_LINEUP_SIZE,
            cardSetId: input.cardSetId ?? null,
            config: input.config,
          },
        },
      },
      include: { rules: true },
    })
  );
}

export async function updateContestStatusMvp(contestId: string, status: ContestStatus) {
  return prismaSafe((tx) =>
    tx.contest.update({
      where: { id: contestId },
      data: { status },
    })
  );
}

export async function getContestRankingMvp(contestId: string) {
  return prismaSafe(async (tx) => {
    const contest = await tx.contest.findUnique({
      where: { id: contestId },
      select: { id: true, status: true, title: true },
    });
    if (!contest) throw new ContestRuntimeError("Contest not found", 404);

    const rankings = await tx.contestRanking.findMany({
      where: { contestId },
      orderBy: [{ rank: "asc" }],
    });

    return { contest, rankings };
  });
}

async function prismaSafe<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>, options?: { isolationLevel?: Prisma.TransactionIsolationLevel }) {
  return prisma.$transaction(fn, options);
}
