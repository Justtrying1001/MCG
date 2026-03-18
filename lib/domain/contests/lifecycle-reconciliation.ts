import { ContestStatus } from "@prisma/client";

import { executeContestTransition } from "@/lib/domain/contests/contest-lifecycle-runtime";
import { prisma } from "@/lib/prisma";

type ReconciliationStep = {
  from: ContestStatus;
  to: ContestStatus;
  reason: "OPEN_PHASE_ENDED" | "STARTS_AT_REACHED" | "ENDS_AT_REACHED";
};

type ContestLifecycleSnapshot = {
  id: string;
  status: ContestStatus;
  liveAt: Date | null;
  lockAt: Date | null;
  endsAt: Date | null;
};

export type ContestLifecycleReconciliationResult = {
  contestId: string;
  initialStatus: ContestStatus;
  finalStatus: ContestStatus;
  now: Date;
  steps: ReconciliationStep[];
};

function resolveOpenPhaseEndAt(contest: ContestLifecycleSnapshot) {
  return contest.lockAt ?? contest.liveAt;
}

function deriveTargetStatus(contest: ContestLifecycleSnapshot, now: Date): { target: ContestStatus | null; reason: ReconciliationStep["reason"] | null } {
  if (contest.status === ContestStatus.DRAFT || contest.status === ContestStatus.CANCELED || contest.status === ContestStatus.SETTLED) {
    return { target: null, reason: null };
  }

  if (contest.endsAt && now >= contest.endsAt) {
    return { target: ContestStatus.SETTLED, reason: "ENDS_AT_REACHED" };
  }

  const openPhaseEndAt = resolveOpenPhaseEndAt(contest);
  if ((contest.status === ContestStatus.OPEN || contest.status === ContestStatus.LOCKED) && openPhaseEndAt && now >= openPhaseEndAt) {
    return { target: ContestStatus.LIVE, reason: contest.status === ContestStatus.OPEN ? "OPEN_PHASE_ENDED" : "STARTS_AT_REACHED" };
  }

  return { target: null, reason: null };
}

function nextStatus(current: ContestStatus, target: ContestStatus): ContestStatus | null {
  if (target === ContestStatus.LIVE && (current === ContestStatus.OPEN || current === ContestStatus.LOCKED)) {
    return ContestStatus.LIVE;
  }
  if (target === ContestStatus.SETTLED && current === ContestStatus.OPEN) {
    return ContestStatus.LIVE;
  }
  if (target === ContestStatus.SETTLED && (current === ContestStatus.LIVE || current === ContestStatus.LOCKED)) {
    return ContestStatus.SETTLED;
  }
  return null;
}

export async function reconcileContestLifecycleByTime(contestId: string, nowInput?: Date): Promise<ContestLifecycleReconciliationResult | null> {
  const now = nowInput ?? new Date();
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { id: true, status: true, liveAt: true, lockAt: true, endsAt: true },
  });

  if (!contest) return null;

  let current = contest;
  const initialStatus = contest.status;
  const steps: ReconciliationStep[] = [];

  while (true) {
    const { target, reason } = deriveTargetStatus(current, now);
    if (!target || !reason) break;

    const next = nextStatus(current.status, target);
    if (!next) break;

    console.info(`[lifecycle] Contest ${contestId} transitioning ${current.status} → ${next} — reason: ${reason}`);
    await executeContestTransition(contestId, next, "auto");

    steps.push({ from: current.status, to: next, reason });
    const latest = await prisma.contest.findUnique({
      where: { id: contestId },
      select: { id: true, status: true, liveAt: true, lockAt: true, endsAt: true },
    });
    if (!latest) break;
    current = latest;
  }

  return {
    contestId,
    initialStatus,
    finalStatus: current.status,
    now,
    steps,
  };
}

export async function reconcileDueContestsByTime(nowInput?: Date) {
  const now = nowInput ?? new Date();
  const dueContests = await prisma.contest.findMany({
    where: {
      OR: [
        { status: ContestStatus.OPEN, lockAt: { not: null, lte: now } },
        { status: ContestStatus.OPEN, liveAt: { not: null, lte: now } },
        { status: ContestStatus.LOCKED, liveAt: { not: null, lte: now } },
        { status: { in: [ContestStatus.OPEN, ContestStatus.LOCKED, ContestStatus.LIVE] }, endsAt: { not: null, lte: now } },
      ],
    },
    select: { id: true },
    take: 200,
    orderBy: { updatedAt: "asc" },
  });

  const results: ContestLifecycleReconciliationResult[] = [];
  for (const contest of dueContests) {
    try {
      const result = await reconcileContestLifecycleByTime(contest.id, now);
      if (result) results.push(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[cron] reconcileContestLifecycleByTime failed for contest ${contest.id}: ${message}`);
    }
  }
  return results;
}
