import { reconcileDueContestsByTime } from "@/lib/domain/contests/lifecycle-reconciliation";

declare global {
  // eslint-disable-next-line no-var
  var __mcgContestLifecycleSchedulerStarted: boolean | undefined;
}

async function runScheduledReconciliation() {
  try {
    await reconcileDueContestsByTime();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[contest-scheduler] lifecycle reconciliation failed: ${message}`);
  }
}

export function ensureContestLifecycleSchedulerStarted() {
  if (typeof window !== "undefined") return;
  if (process.env.NODE_ENV === "test") return;
  if (process.env.ENABLE_CONTEST_LIFECYCLE_SCHEDULER !== "1") return;
  if (globalThis.__mcgContestLifecycleSchedulerStarted) return;

  globalThis.__mcgContestLifecycleSchedulerStarted = true;

  const intervalMs = Number(process.env.CONTEST_LIFECYCLE_SCHEDULER_INTERVAL_MS ?? "60000");
  const safeIntervalMs = Number.isFinite(intervalMs) && intervalMs >= 10_000 ? intervalMs : 60_000;

  void runScheduledReconciliation();
  const timer = setInterval(() => {
    void runScheduledReconciliation();
  }, safeIntervalMs);
  if (typeof (timer as NodeJS.Timeout).unref === "function") {
    (timer as NodeJS.Timeout).unref();
  }

  console.info(`[contest-scheduler] started with interval=${safeIntervalMs}ms`);
}
