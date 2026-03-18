import { ContestStatus } from "@prisma/client";

import { getAllowedContestTransitions, type ContestLifecycleMode } from "@/lib/domain/contests/contest-lifecycle-spec";
import { finalizeContestFromEndSnapshotTrigger } from "@/lib/domain/contests/finalization-runtime";
import { ContestRuntimeError } from "@/lib/domain/contests/runtime";
import { captureStartSnapshot } from "@/lib/domain/contests/snapshot-runtime";
import { prisma } from "@/lib/prisma";

export type ContestLifecycleIssue = {
  code: string;
  severity: "ERROR" | "WARN";
  message: string;
  operatorHint: string;
};

export type ContestLifecycleSnapshot = {
  id: string;
  status: ContestStatus;
  configPublishedAt: Date | null;
  openAt: Date | null;
  liveAt: Date | null;
  lockAt: Date | null;
  endsAt: Date | null;
  _count: {
    entries: number;
    rankings: number;
    settlements: number;
  };
};

export type ContestTransitionValidation = {
  contest: ContestLifecycleSnapshot;
  currentStatus: ContestStatus;
  targetStatus: ContestStatus;
  mode: ContestLifecycleMode;
  blocking: boolean;
  issues: ContestLifecycleIssue[];
  sideEffects: {
    startSnapshot: boolean;
    finalization: boolean;
  };
  isNoOp: boolean;
};

export type ContestTransitionExecutionResult = {
  contest: { id: string; status: ContestStatus };
  previousStatus: ContestStatus;
  targetStatus: ContestStatus;
  mode: ContestLifecycleMode;
  executed: boolean;
  validation: ContestTransitionValidation;
  automation: {
    startSnapshotTriggered: boolean;
    finalizationTriggered: boolean;
  };
};

export async function getContestLifecycleSnapshot(contestId: string): Promise<ContestLifecycleSnapshot> {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: {
      id: true,
      status: true,
      configPublishedAt: true,
      openAt: true,
      liveAt: true,
      lockAt: true,
      endsAt: true,
      _count: {
        select: {
          entries: true,
          rankings: true,
          settlements: true,
        },
      },
    },
  });

  if (!contest) throw new ContestRuntimeError("Contest not found", 404);
  return contest;
}

export function validateContestTransitionState(
  contest: ContestLifecycleSnapshot,
  targetStatus: ContestStatus,
  mode: ContestLifecycleMode,
): ContestTransitionValidation {
  const currentStatus = contest.status;
  const issues: ContestLifecycleIssue[] = [];
  const allowedTransitions = getAllowedContestTransitions(currentStatus);

  if (currentStatus !== targetStatus && !allowedTransitions.includes(targetStatus)) {
    issues.push({
      code: "CONTEST_TRANSITION_NOT_ALLOWED",
      severity: "ERROR",
      message: `Transition ${currentStatus} -> ${targetStatus} is not allowed`,
      operatorHint: "Use the next valid lifecycle phase",
    });
  }

  if (targetStatus === ContestStatus.OPEN && !contest.configPublishedAt) {
    issues.push({
      code: "CONTEST_NOT_PUBLISHED",
      severity: "ERROR",
      message: "Contest must be published before opening",
      operatorHint: "Publish contest configuration first",
    });
  }

  if (targetStatus === ContestStatus.SETTLED && contest._count.settlements > 0) {
    issues.push({
      code: "CONTEST_ALREADY_SETTLED",
      severity: "ERROR",
      message: "Contest already has a settlement",
      operatorHint: "Do not execute settlement transition again",
    });
  }

  if (targetStatus === ContestStatus.SETTLED && contest._count.entries === 0) {
    issues.push({
      code: "CONTEST_ZERO_ENTRY_SETTLEMENT",
      severity: "WARN",
      message: "Zero-entry contest will settle with an empty settlement plan",
      operatorHint: "No rewards will be distributed",
    });
  }

  if (targetStatus === ContestStatus.SETTLED && contest._count.entries > 0 && contest._count.rankings === 0) {
    issues.push({
      code: "CONTEST_FINALIZATION_REQUIRED",
      severity: "WARN",
      message: "Ranking rows are missing and will be generated during finalization",
      operatorHint: "Execution will capture END snapshot, compute scores, and generate ranking rows before settlement",
    });
  }

  return {
    contest,
    currentStatus,
    targetStatus,
    mode,
    blocking: issues.some((issue) => issue.severity === "ERROR"),
    issues,
    sideEffects: {
      startSnapshot: currentStatus !== targetStatus && targetStatus === ContestStatus.LIVE,
      finalization: currentStatus !== targetStatus && targetStatus === ContestStatus.SETTLED,
    },
    isNoOp: currentStatus === targetStatus,
  };
}

export async function validateContestTransition(
  contestId: string,
  targetStatus: ContestStatus,
  mode: ContestLifecycleMode,
): Promise<ContestTransitionValidation> {
  const contest = await getContestLifecycleSnapshot(contestId);
  return validateContestTransitionState(contest, targetStatus, mode);
}

export async function executeContestTransition(
  contestId: string,
  targetStatus: ContestStatus,
  mode: ContestLifecycleMode,
): Promise<ContestTransitionExecutionResult> {
  console.info(`[lifecycle] executeContestTransition contest=${contestId} mode=${mode} target=${targetStatus}`);
  const validation = await validateContestTransition(contestId, targetStatus, mode);
  if (validation.blocking) {
    const firstError = validation.issues.find((issue) => issue.severity === "ERROR");
    console.error(
      `[lifecycle] executeContestTransition blocked for contest=${contestId} current=${validation.currentStatus} target=${targetStatus} reason=${firstError?.message ?? "unknown"}`,
    );
    throw new ContestRuntimeError(firstError?.message ?? "Contest transition blocked", 409);
  }

  if (validation.isNoOp) {
    console.info(`[lifecycle] executeContestTransition noop for contest=${contestId} status=${validation.contest.status}`);
    return {
      contest: { id: validation.contest.id, status: validation.contest.status },
      previousStatus: validation.currentStatus,
      targetStatus,
      mode,
      executed: false,
      validation,
      automation: {
        startSnapshotTriggered: false,
        finalizationTriggered: false,
      },
    };
  }

  const automation = {
    startSnapshotTriggered: false,
    finalizationTriggered: false,
  };

  if (targetStatus === ContestStatus.LIVE) {
    automation.startSnapshotTriggered = true;
    console.info(`[lifecycle] Contest ${contestId} OPEN -> LIVE transition attempted — starting START snapshot capture`);
    await runLiveTransitionSideEffects(contestId, mode);
  }

  if (targetStatus === ContestStatus.SETTLED) {
    automation.finalizationTriggered = true;
    console.info(`[lifecycle] Contest ${contestId} LIVE -> SETTLED transition attempted — starting finalization`);
    await finalizeContestFromEndSnapshotTrigger(contestId);
  }

  const updated = await prisma.contest.updateMany({
    where: { id: contestId, status: validation.currentStatus },
    data: { status: targetStatus },
  });

  if (updated.count === 0) {
    const latest = await getContestLifecycleSnapshot(contestId);
    if (latest.status === targetStatus) {
      console.info(`[lifecycle] Contest ${contestId} already reached target=${targetStatus} via concurrent update`);
      return {
        contest: { id: latest.id, status: latest.status },
        previousStatus: validation.currentStatus,
        targetStatus,
        mode,
        executed: false,
        validation: { ...validation, contest: latest, currentStatus: latest.status, isNoOp: true },
        automation,
      };
    }
    console.error(`[lifecycle] Contest ${contestId} concurrent update prevented ${validation.currentStatus} -> ${targetStatus}`);
    throw new ContestRuntimeError(
      `Contest transition ${validation.currentStatus} -> ${targetStatus} could not be applied due to a concurrent update`,
      409,
    );
  }

  console.info(`[lifecycle] Contest ${contestId} final status after transition attempt=${targetStatus}`);

  return {
    contest: { id: validation.contest.id, status: targetStatus },
    previousStatus: validation.currentStatus,
    targetStatus,
    mode,
    executed: true,
    validation,
    automation,
  };
}

async function runLiveTransitionSideEffects(contestId: string, mode: ContestLifecycleMode) {
  console.info(`[lifecycle] Contest ${contestId} START snapshot capture started mode=${mode}`);
  try {
    const result = await captureStartSnapshot(contestId);
    console.info(
      `[lifecycle] Contest ${contestId} START snapshot capture succeeded tokens=${result.tokenCount} captured=${result.capturedCount}`,
    );
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[lifecycle] Contest ${contestId} START snapshot capture failed: ${message}`);
    throw error;
  }
}
