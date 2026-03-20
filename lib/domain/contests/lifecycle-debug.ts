import { ContestStatus, type Prisma } from "@prisma/client";

import { getContestLifecycleSnapshot, validateContestTransitionState } from "@/lib/domain/contests/contest-lifecycle-runtime";
import {
  deriveTargetStatus,
  nextStatus,
  reconcileContestLifecycleByTime,
  resolveOpenPhaseEndAt,
  type ContestLifecycleAttempt,
  type ContestLifecycleReconciliationResult,
} from "@/lib/domain/contests/lifecycle-reconciliation";
import { prisma } from "@/lib/prisma";
import { getSiteOrigin } from "@/lib/site-url";

const contestLifecycleDebugSelect = {
  id: true,
  status: true,
  configPublishedAt: true,
  openAt: true,
  lockAt: true,
  liveAt: true,
  endsAt: true,
  qstashOpenJobId: true,
  qstashLiveJobId: true,
  qstashSettleJobId: true,
  _count: {
    select: {
      entries: true,
      rankings: true,
      settlements: true,
    },
  },
} satisfies Prisma.ContestSelect;

type ContestLifecycleDebugRow = Prisma.ContestGetPayload<{ select: typeof contestLifecycleDebugSelect }>;

export type ContestLifecycleDriver = "QSTASH" | "IN_PROCESS_SCHEDULER" | "NONE";

export type ContestLifecycleDebugInfo = {
  contestId: string;
  currentStatus: ContestStatus;
  now: string;
  openAt: string | null;
  lockAt: string | null;
  liveAt: string | null;
  endsAt: string | null;
  openPhaseEndAt: string | null;
  expectedTargetStatus: ContestStatus | null;
  canTransitionToLive: boolean;
  reasonIfBlocked: string | null;
  hasStartSnapshot: boolean;
  hasEndSnapshot: boolean;
  hasEntries: boolean;
  qstashOpenJobId: string | null;
  qstashLiveJobId: string | null;
  qstashSettleJobId: string | null;
  publishedWithoutLifecycleJobs: boolean;
  schedulerEnabled: boolean;
  qstashConfigured: boolean;
  lastKnownLifecycleDriver: ContestLifecycleDriver;
  whatShouldHaveHappened: string;
  whatActuallyHappened: string;
  nextActionRecommended: string;
  humanSummary: string;
  schedulerDiagnosis: string;
  blockers: string[];
};

export type ForceContestLifecycleResult = {
  contestId: string;
  now: string;
  statusBefore: ContestStatus;
  statusAfter: ContestStatus;
  transitionAttempted: string | null;
  startSnapshotAttempted: boolean;
  success: boolean;
  error: string | null;
  reconcileResult: ContestLifecycleReconciliationResult | null;
  attempts: ContestLifecycleAttempt[];
  before: ContestLifecycleDebugInfo;
  after: ContestLifecycleDebugInfo;
};

export function isContestLifecycleSchedulerEnabled() {
  if (process.env.NODE_ENV === "test") return false;
  const explicit = process.env.ENABLE_CONTEST_LIFECYCLE_SCHEDULER;
  if (explicit === "0") return false;
  if (explicit === "1") return true;
  return !Boolean(process.env.QSTASH_TOKEN);
}

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function buildDriverState(contest: ContestLifecycleDebugRow) {
  const qstashConfigured = Boolean(process.env.QSTASH_TOKEN && getSiteOrigin());
  const schedulerEnabled = isContestLifecycleSchedulerEnabled();
  const hasQstashJobs = Boolean(contest.qstashOpenJobId || contest.qstashLiveJobId || contest.qstashSettleJobId);

  const lastKnownLifecycleDriver: ContestLifecycleDriver = qstashConfigured && hasQstashJobs
    ? "QSTASH"
    : schedulerEnabled
      ? "IN_PROCESS_SCHEDULER"
      : "NONE";

  let schedulerDiagnosis = "Lifecycle automation is healthy.";
  if (!qstashConfigured && !schedulerEnabled) {
    schedulerDiagnosis = "No automatic lifecycle driver is active: QStash is not configured and the in-process scheduler is disabled.";
  } else if (!qstashConfigured && schedulerEnabled) {
    schedulerDiagnosis = "Lifecycle relies on the in-process scheduler fallback because QStash is not configured.";
  } else if (qstashConfigured && !hasQstashJobs) {
    schedulerDiagnosis = "QStash is configured but this contest has no recorded lifecycle jobs.";
  } else if (qstashConfigured && hasQstashJobs) {
    schedulerDiagnosis = "Lifecycle relies on QStash jobs for this contest.";
  }

  return {
    qstashConfigured,
    schedulerEnabled,
    lastKnownLifecycleDriver,
    schedulerDiagnosis,
  };
}

function buildReadableExplanation(input: {
  contest: ContestLifecycleDebugRow;
  now: Date;
  openPhaseEndAt: Date | null;
  expectedTargetStatus: ContestStatus | null;
  canTransitionToLive: boolean;
  blockers: string[];
  driverState: ReturnType<typeof buildDriverState>;
}) {
  const { contest, now, openPhaseEndAt, expectedTargetStatus, canTransitionToLive, blockers, driverState } = input;

  if (expectedTargetStatus === ContestStatus.LIVE && canTransitionToLive) {
    const whatShouldHaveHappened = `At ${openPhaseEndAt?.toISOString() ?? "the end of OPEN"}, the contest should have auto-transitioned from ${contest.status} to LIVE and captured the START snapshot.`;
    const whatActuallyHappened = contest.status === ContestStatus.LIVE
      ? "The contest is already LIVE."
      : `It is still ${contest.status} at ${now.toISOString()}. ${driverState.schedulerDiagnosis}`;
    const nextActionRecommended = driverState.lastKnownLifecycleDriver === "NONE"
      ? "Call POST /api/internal/contests/{contestId}/force-lifecycle now, then enable a lifecycle driver (QStash or scheduler fallback)."
      : "Call POST /api/internal/contests/{contestId}/force-lifecycle now to reconcile immediately and inspect logs for the failing transition attempt.";

    return { whatShouldHaveHappened, whatActuallyHappened, nextActionRecommended };
  }

  if (expectedTargetStatus === ContestStatus.SETTLED) {
    return {
      whatShouldHaveHappened: `At ${contest.endsAt?.toISOString() ?? "endsAt"}, the contest should have finished LIVE, captured END snapshot, scored, ranked, rewarded, then become SETTLED.`,
      whatActuallyHappened: `Current status is ${contest.status}. ${driverState.schedulerDiagnosis}`,
      nextActionRecommended: "Force lifecycle now to finish pending settlement automation and inspect resulting logs if it fails.",
    };
  }

  if (!openPhaseEndAt) {
    return {
      whatShouldHaveHappened: "The contest needs lockAt or liveAt to know when OPEN ends.",
      whatActuallyHappened: "The code has no openPhaseEndAt value to compare against now, so no automatic OPEN -> LIVE target can be derived.",
      nextActionRecommended: "Fix timing fields on the contest configuration so lockAt or liveAt is present, then republish/reschedule lifecycle.",
    };
  }

  if (contest.status === ContestStatus.OPEN && now < openPhaseEndAt) {
    return {
      whatShouldHaveHappened: `The contest is still legitimately OPEN until ${openPhaseEndAt.toISOString()}.`,
      whatActuallyHappened: `No transition should happen before ${openPhaseEndAt.toISOString()}.`,
      nextActionRecommended: "Wait until OPEN phase end, or use force-lifecycle only if you intentionally need an early manual transition.",
    };
  }

  return {
    whatShouldHaveHappened: `No OPEN -> LIVE transition is currently expected for status ${contest.status}.`,
    whatActuallyHappened: blockers[0] ?? `Current status is ${contest.status}.`,
    nextActionRecommended: blockers.length > 0 ? blockers[0] : "Inspect lifecycle validation and logs for the next expected phase.",
  };
}

export async function getContestLifecycleDebugInfo(contestId: string, nowInput?: Date): Promise<ContestLifecycleDebugInfo | null> {
  const now = nowInput ?? new Date();
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: contestLifecycleDebugSelect,
  });

  if (!contest) return null;

  const [hasStartSnapshot, hasEndSnapshot, lifecycleSnapshot] = await Promise.all([
    prisma.contestTokenSnapshot.count({ where: { contestId, phase: "START" } }).then((count) => count > 0),
    prisma.contestTokenSnapshot.count({ where: { contestId, phase: "END" } }).then((count) => count > 0),
    getContestLifecycleSnapshot(contestId),
  ]);

  const openPhaseEndAt = resolveOpenPhaseEndAt(contest);
  const derived = deriveTargetStatus(contest, now);
  const liveValidation = validateContestTransitionState(lifecycleSnapshot, ContestStatus.LIVE, "auto");
  const driverState = buildDriverState(contest);
  const publishedWithoutLifecycleJobs = Boolean(
    contest.configPublishedAt && driverState.qstashConfigured && !contest.qstashOpenJobId && !contest.qstashLiveJobId && !contest.qstashSettleJobId,
  );

  const blockers: string[] = [];
  if (!contest.configPublishedAt) blockers.push("Contest is not published.");
  if (!openPhaseEndAt) blockers.push("OPEN -> LIVE is impossible because lockAt and liveAt are both missing.");
  if (contest.status === ContestStatus.OPEN && openPhaseEndAt && now < openPhaseEndAt) {
    blockers.push(`OPEN phase has not ended yet. openPhaseEndAt=${openPhaseEndAt.toISOString()}.`);
  }
  if (derived.target === ContestStatus.LIVE && liveValidation.blocking) {
    blockers.push(...liveValidation.issues.filter((issue) => issue.severity === "ERROR").map((issue) => issue.message));
  }
  if (publishedWithoutLifecycleJobs) {
    blockers.push("Contest was published without lifecycle jobs even though QStash is configured.");
  }
  if (derived.target === ContestStatus.LIVE && !driverState.qstashConfigured && !driverState.schedulerEnabled) {
    blockers.push("No lifecycle driver will call reconcileContestLifecycleByTime automatically: QStash is missing and scheduler fallback is disabled.");
  }
  if (derived.target === ContestStatus.LIVE && driverState.qstashConfigured && !contest.qstashLiveJobId && !driverState.schedulerEnabled) {
    blockers.push("Contest is due for LIVE but has no qstashLiveJobId and no scheduler fallback.");
  }

  const canTransitionToLive = derived.target === ContestStatus.LIVE && !liveValidation.blocking;
  const reasonIfBlocked = canTransitionToLive ? null : blockers[0] ?? (derived.target !== ContestStatus.LIVE ? `Current target status is ${derived.target ?? "none"}, not LIVE.` : "Transition is blocked.");
  const humanParts = [
    `Contest ${contestId} is ${contest.status}.`,
    openPhaseEndAt ? `OPEN ends at ${openPhaseEndAt.toISOString()}.` : "OPEN end cannot be derived because lockAt/liveAt are missing.",
    `Expected target status right now: ${derived.target ?? "none"}.`,
    reasonIfBlocked ? `Blocked because: ${reasonIfBlocked}` : "OPEN -> LIVE can run with the current state.",
    driverState.schedulerDiagnosis,
  ];

  const readable = buildReadableExplanation({
    contest,
    now,
    openPhaseEndAt,
    expectedTargetStatus: derived.target,
    canTransitionToLive,
    blockers,
    driverState,
  });

  return {
    contestId,
    currentStatus: contest.status,
    now: now.toISOString(),
    openAt: iso(contest.openAt),
    lockAt: iso(contest.lockAt),
    liveAt: iso(contest.liveAt),
    endsAt: iso(contest.endsAt),
    openPhaseEndAt: iso(openPhaseEndAt),
    expectedTargetStatus: derived.target,
    canTransitionToLive,
    reasonIfBlocked,
    hasStartSnapshot,
    hasEndSnapshot,
    hasEntries: contest._count.entries > 0,
    qstashOpenJobId: contest.qstashOpenJobId,
    qstashLiveJobId: contest.qstashLiveJobId,
    qstashSettleJobId: contest.qstashSettleJobId,
    publishedWithoutLifecycleJobs,
    schedulerEnabled: driverState.schedulerEnabled,
    qstashConfigured: driverState.qstashConfigured,
    lastKnownLifecycleDriver: driverState.lastKnownLifecycleDriver,
    whatShouldHaveHappened: readable.whatShouldHaveHappened,
    whatActuallyHappened: readable.whatActuallyHappened,
    nextActionRecommended: readable.nextActionRecommended,
    humanSummary: humanParts.join(" "),
    schedulerDiagnosis: driverState.schedulerDiagnosis,
    blockers,
  };
}

export async function forceContestLifecycleNow(contestId: string, nowInput?: Date): Promise<ForceContestLifecycleResult> {
  const now = nowInput ?? new Date();
  const before = await getContestLifecycleDebugInfo(contestId, now);
  if (!before) {
    throw new Error("Contest not found");
  }

  let reconcileResult: ContestLifecycleReconciliationResult | null = null;
  let attempts: ContestLifecycleAttempt[] = [];
  let error: string | null = null;

  try {
    reconcileResult = await reconcileContestLifecycleByTime(contestId, now);
    attempts = reconcileResult?.attempts ?? [];
  } catch (cause) {
    error = cause instanceof Error ? cause.message : String(cause);
  }

  const after = await getContestLifecycleDebugInfo(contestId, now);
  if (!after) {
    throw new Error("Contest disappeared during force lifecycle");
  }

  const transitionAttempted = attempts[0]
    ? `${attempts[0].from} -> ${attempts[0].target}`
    : before.expectedTargetStatus
      ? `${before.currentStatus} -> ${nextStatus(before.currentStatus, before.expectedTargetStatus) ?? before.expectedTargetStatus}`
      : null;

  return {
    contestId,
    now: now.toISOString(),
    statusBefore: before.currentStatus,
    statusAfter: after.currentStatus,
    transitionAttempted,
    startSnapshotAttempted: attempts.some((attempt) => attempt.startSnapshotAttempted) || transitionAttempted === `${before.currentStatus} -> LIVE`,
    success: error === null && before.currentStatus !== after.currentStatus,
    error,
    reconcileResult,
    attempts,
    before,
    after,
  };
}
