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

export type ContestLifecycleAttempt = {
  from: ContestStatus;
  target: ContestStatus;
  reason: ReconciliationStep["reason"];
  outcome: "executed" | "noop" | "failed";
  startSnapshotAttempted: boolean;
  finalizationAttempted: boolean;
  error: string | null;
};

export type ContestLifecycleReconciliationResult = {
  contestId: string;
  initialStatus: ContestStatus;
  finalStatus: ContestStatus;
  now: Date;
  steps: ReconciliationStep[];
  attempts: ContestLifecycleAttempt[];
};

export function resolveOpenPhaseEndAt(contest: ContestLifecycleSnapshot) {
  return contest.lockAt ?? contest.liveAt;
}

export function deriveTargetStatus(contest: ContestLifecycleSnapshot, now: Date): { target: ContestStatus | null; reason: ReconciliationStep["reason"] | null } {
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

export function nextStatus(current: ContestStatus, target: ContestStatus): ContestStatus | null {
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
  console.info(`[lifecycle] reconcileContestLifecycleByTime called for contest=${contestId} now=${now.toISOString()}`);

  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { id: true, status: true, liveAt: true, lockAt: true, endsAt: true },
  });

  if (!contest) {
    console.warn(`[lifecycle] Contest ${contestId} not found during reconciliation`);
    return null;
  }

  let current = contest;
  const initialStatus = contest.status;
  const steps: ReconciliationStep[] = [];
  const attempts: ContestLifecycleAttempt[] = [];

  while (true) {
    const { target, reason } = deriveTargetStatus(current, now);
    console.info(
      `[lifecycle] Contest ${contestId} status=${current.status} target=${target ?? "none"} reason=${reason ?? "none"} openPhaseEndAt=${resolveOpenPhaseEndAt(current)?.toISOString() ?? "null"} endsAt=${current.endsAt?.toISOString() ?? "null"}`,
    );

    if (!target || !reason) break;

    const next = nextStatus(current.status, target);
    if (!next) {
      console.warn(`[lifecycle] Contest ${contestId} target=${target} could not be mapped from current=${current.status}`);
      break;
    }

    const attempt: ContestLifecycleAttempt = {
      from: current.status,
      target: next,
      reason,
      outcome: "failed",
      startSnapshotAttempted: next === ContestStatus.LIVE,
      finalizationAttempted: next === ContestStatus.SETTLED,
      error: null,
    };

    try {
      console.info(`[lifecycle] Contest ${contestId} attempting transition ${current.status} -> ${next} reason=${reason}`);
      const execution = await executeContestTransition(contestId, next, "auto");
      attempt.outcome = execution.executed ? "executed" : "noop";
      attempts.push(attempt);

      steps.push({ from: current.status, to: next, reason });
      const latest = await prisma.contest.findUnique({
        where: { id: contestId },
        select: { id: true, status: true, liveAt: true, lockAt: true, endsAt: true },
      });
      if (!latest) break;
      current = latest;
      console.info(`[lifecycle] Contest ${contestId} status after transition attempt=${current.status}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      attempt.error = message;
      attempts.push(attempt);
      console.error(`[lifecycle] Contest ${contestId} transition ${current.status} -> ${next} failed: ${message}`);
      throw error;
    }
  }

  console.info(`[lifecycle] Contest ${contestId} reconciliation finished initial=${initialStatus} final=${current.status} steps=${steps.length}`);

  return {
    contestId,
    initialStatus,
    finalStatus: current.status,
    now,
    steps,
    attempts,
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

  console.info(`[contest-scheduler] due contests at ${now.toISOString()}: count=${dueContests.length}`);

  const results: ContestLifecycleReconciliationResult[] = [];
  for (const contest of dueContests) {
    try {
      const result = await reconcileContestLifecycleByTime(contest.id, now);
      if (result) results.push(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[contest-scheduler] reconcileContestLifecycleByTime failed for contest ${contest.id}: ${message}`);
    }
  }
  return results;
}
