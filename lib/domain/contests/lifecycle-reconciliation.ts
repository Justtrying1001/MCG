import { ContestStatus } from "@prisma/client";

import { executeContestTransition } from "@/lib/domain/contests/contest-lifecycle-runtime";
import { prisma } from "@/lib/prisma";

type ReconciliationStep = {
  from: ContestStatus;
  to: ContestStatus;
  reason: "LOCK_AT_REACHED" | "STARTS_AT_REACHED" | "ENDS_AT_REACHED";
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

const ORDERED_STATUSES: ContestStatus[] = [ContestStatus.OPEN, ContestStatus.LOCKED, ContestStatus.LIVE, ContestStatus.SETTLED];

function deriveTargetStatus(contest: ContestLifecycleSnapshot, now: Date): { target: ContestStatus | null; reason: ReconciliationStep["reason"] | null } {
  if (contest.status === ContestStatus.DRAFT || contest.status === ContestStatus.CANCELED || contest.status === ContestStatus.SETTLED) {
    return { target: null, reason: null };
  }

  if (contest.endsAt && now >= contest.endsAt) {
    return { target: ContestStatus.SETTLED, reason: "ENDS_AT_REACHED" };
  }

  if ((contest.status === ContestStatus.OPEN || contest.status === ContestStatus.LOCKED) && contest.liveAt && now >= contest.liveAt) {
    return { target: ContestStatus.LIVE, reason: "STARTS_AT_REACHED" };
  }

  if (contest.status === ContestStatus.OPEN && contest.lockAt && now >= contest.lockAt) {
    return { target: ContestStatus.LOCKED, reason: "LOCK_AT_REACHED" };
  }

  return { target: null, reason: null };
}

function nextStatus(current: ContestStatus, target: ContestStatus): ContestStatus | null {
  const currentIndex = ORDERED_STATUSES.indexOf(current);
  const targetIndex = ORDERED_STATUSES.indexOf(target);
  if (currentIndex === -1 || targetIndex === -1 || currentIndex >= targetIndex) return null;
  return ORDERED_STATUSES[currentIndex + 1] ?? null;
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
        { status: { in: [ContestStatus.OPEN, ContestStatus.LOCKED] }, liveAt: { not: null, lte: now } },
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
