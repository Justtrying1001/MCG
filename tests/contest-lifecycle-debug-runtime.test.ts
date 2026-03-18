import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContestStatus } from "@prisma/client";

const {
  prismaMock,
  getContestLifecycleSnapshotMock,
  reconcileContestLifecycleByTimeMock,
} = vi.hoisted(() => ({
  prismaMock: {
    contest: {
      findUnique: vi.fn(),
    },
    contestTokenSnapshot: {
      count: vi.fn(),
    },
  },
  getContestLifecycleSnapshotMock: vi.fn(),
  reconcileContestLifecycleByTimeMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/domain/contests/contest-lifecycle-runtime", () => ({
  getContestLifecycleSnapshot: getContestLifecycleSnapshotMock,
  validateContestTransitionState: (contest: any, targetStatus: ContestStatus) => ({
    contest,
    currentStatus: contest.status,
    targetStatus,
    mode: "auto",
    blocking: false,
    issues: [],
    sideEffects: { startSnapshot: targetStatus === ContestStatus.LIVE, finalization: targetStatus === ContestStatus.SETTLED },
    isNoOp: contest.status === targetStatus,
  }),
}));
vi.mock("@/lib/domain/contests/lifecycle-reconciliation", async () => {
  const actual = await vi.importActual<typeof import("@/lib/domain/contests/lifecycle-reconciliation")>("@/lib/domain/contests/lifecycle-reconciliation");
  return {
    ...actual,
    reconcileContestLifecycleByTime: reconcileContestLifecycleByTimeMock,
  };
});

import { forceContestLifecycleNow, getContestLifecycleDebugInfo } from "@/lib/domain/contests/lifecycle-debug";

describe("contest lifecycle debug runtime", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalQStashToken = process.env.QSTASH_TOKEN;
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const originalSchedulerFlag = process.env.ENABLE_CONTEST_LIFECYCLE_SCHEDULER;

  beforeEach(() => {
    vi.clearAllMocks();
    (process.env as any).NODE_ENV = "development";
    delete process.env.QSTASH_TOKEN;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.ENABLE_CONTEST_LIFECYCLE_SCHEDULER;

    prismaMock.contest.findUnique.mockResolvedValue({
      id: "c1",
      status: ContestStatus.OPEN,
      configPublishedAt: new Date("2026-03-18T08:00:00.000Z"),
      openAt: new Date("2026-03-18T08:00:00.000Z"),
      lockAt: new Date("2026-03-18T09:00:00.000Z"),
      liveAt: new Date("2026-03-18T09:05:00.000Z"),
      endsAt: new Date("2026-03-18T10:00:00.000Z"),
      qstashOpenJobId: null,
      qstashLiveJobId: null,
      qstashSettleJobId: null,
      _count: { entries: 3, rankings: 0, settlements: 0 },
    });
    prismaMock.contestTokenSnapshot.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    getContestLifecycleSnapshotMock.mockResolvedValue({
      id: "c1",
      status: ContestStatus.OPEN,
      configPublishedAt: new Date("2026-03-18T08:00:00.000Z"),
      openAt: new Date("2026-03-18T08:00:00.000Z"),
      liveAt: new Date("2026-03-18T09:05:00.000Z"),
      lockAt: new Date("2026-03-18T09:00:00.000Z"),
      endsAt: new Date("2026-03-18T10:00:00.000Z"),
      _count: { entries: 3, rankings: 0, settlements: 0 },
    });
  });

  it("shows explicitly when scheduling/job coverage is absent", async () => {
    process.env.ENABLE_CONTEST_LIFECYCLE_SCHEDULER = "0";

    const debug = await getContestLifecycleDebugInfo("c1", new Date("2026-03-18T09:30:00.000Z"));

    expect(debug?.expectedTargetStatus).toBe(ContestStatus.LIVE);
    expect(debug?.canTransitionToLive).toBe(true);
    expect(debug?.blockers).toContain("No lifecycle driver will call reconcileContestLifecycleByTime automatically: QStash is missing and scheduler fallback is disabled.");
    expect(debug?.schedulerEnabled).toBe(false);
    expect(debug?.qstashConfigured).toBe(false);
    expect(debug?.lastKnownLifecycleDriver).toBe("NONE");
    expect(debug?.whatActuallyHappened).toMatch(/still OPEN/i);
    expect(debug?.nextActionRecommended).toMatch(/force-lifecycle/i);
  });

  it("flags contests published without lifecycle jobs when QStash is configured", async () => {
    process.env.QSTASH_TOKEN = "token";
    process.env.NEXT_PUBLIC_APP_URL = "https://example.test";
    process.env.ENABLE_CONTEST_LIFECYCLE_SCHEDULER = "0";

    const debug = await getContestLifecycleDebugInfo("c1", new Date("2026-03-18T09:30:00.000Z"));

    expect(debug?.publishedWithoutLifecycleJobs).toBe(true);
    expect(debug?.qstashConfigured).toBe(true);
    expect(debug?.lastKnownLifecycleDriver).toBe("NONE");
    expect(debug?.blockers).toContain("Contest was published without lifecycle jobs even though QStash is configured.");
  });

  it("reports before/after status change when force lifecycle can move OPEN to LIVE", async () => {
    reconcileContestLifecycleByTimeMock.mockResolvedValue({
      contestId: "c1",
      initialStatus: ContestStatus.OPEN,
      finalStatus: ContestStatus.LIVE,
      now: new Date("2026-03-18T09:30:00.000Z"),
      steps: [{ from: ContestStatus.OPEN, to: ContestStatus.LIVE, reason: "OPEN_PHASE_ENDED" }],
      attempts: [{
        from: ContestStatus.OPEN,
        target: ContestStatus.LIVE,
        reason: "OPEN_PHASE_ENDED",
        outcome: "executed",
        startSnapshotAttempted: true,
        finalizationAttempted: false,
        error: null,
      }],
    });

    prismaMock.contest.findUnique
      .mockResolvedValueOnce({
        id: "c1",
        status: ContestStatus.OPEN,
        configPublishedAt: new Date("2026-03-18T08:00:00.000Z"),
        openAt: new Date("2026-03-18T08:00:00.000Z"),
        lockAt: new Date("2026-03-18T09:00:00.000Z"),
        liveAt: new Date("2026-03-18T09:05:00.000Z"),
        endsAt: new Date("2026-03-18T10:00:00.000Z"),
        qstashOpenJobId: null,
        qstashLiveJobId: null,
        qstashSettleJobId: null,
        _count: { entries: 3, rankings: 0, settlements: 0 },
      })
      .mockResolvedValueOnce({
        id: "c1",
        status: ContestStatus.LIVE,
        configPublishedAt: new Date("2026-03-18T08:00:00.000Z"),
        openAt: new Date("2026-03-18T08:00:00.000Z"),
        lockAt: new Date("2026-03-18T09:00:00.000Z"),
        liveAt: new Date("2026-03-18T09:05:00.000Z"),
        endsAt: new Date("2026-03-18T10:00:00.000Z"),
        qstashOpenJobId: null,
        qstashLiveJobId: null,
        qstashSettleJobId: null,
        _count: { entries: 3, rankings: 0, settlements: 0 },
      });
    getContestLifecycleSnapshotMock
      .mockResolvedValueOnce({
        id: "c1",
        status: ContestStatus.OPEN,
        configPublishedAt: new Date("2026-03-18T08:00:00.000Z"),
        openAt: new Date("2026-03-18T08:00:00.000Z"),
        liveAt: new Date("2026-03-18T09:05:00.000Z"),
        lockAt: new Date("2026-03-18T09:00:00.000Z"),
        endsAt: new Date("2026-03-18T10:00:00.000Z"),
        _count: { entries: 3, rankings: 0, settlements: 0 },
      })
      .mockResolvedValueOnce({
        id: "c1",
        status: ContestStatus.LIVE,
        configPublishedAt: new Date("2026-03-18T08:00:00.000Z"),
        openAt: new Date("2026-03-18T08:00:00.000Z"),
        liveAt: new Date("2026-03-18T09:05:00.000Z"),
        lockAt: new Date("2026-03-18T09:00:00.000Z"),
        endsAt: new Date("2026-03-18T10:00:00.000Z"),
        _count: { entries: 3, rankings: 0, settlements: 0 },
      });

    const result = await forceContestLifecycleNow("c1", new Date("2026-03-18T09:30:00.000Z"));

    expect(result.statusBefore).toBe(ContestStatus.OPEN);
    expect(result.statusAfter).toBe(ContestStatus.LIVE);
    expect(result.transitionAttempted).toBe("OPEN -> LIVE");
    expect(result.startSnapshotAttempted).toBe(true);
    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
  });

  it("surfaces START snapshot failure clearly in force lifecycle result", async () => {
    reconcileContestLifecycleByTimeMock.mockRejectedValue(new Error("START snapshot capture failed: CoinGecko timeout"));

    const result = await forceContestLifecycleNow("c1", new Date("2026-03-18T09:30:00.000Z"));

    expect(result.statusBefore).toBe(ContestStatus.OPEN);
    expect(result.statusAfter).toBe(ContestStatus.OPEN);
    expect(result.transitionAttempted).toBe("OPEN -> LIVE");
    expect(result.startSnapshotAttempted).toBe(true);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/START snapshot capture failed/i);
  });

  afterEach(() => {
    (process.env as any).NODE_ENV = originalNodeEnv;
    process.env.QSTASH_TOKEN = originalQStashToken;
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    process.env.ENABLE_CONTEST_LIFECYCLE_SCHEDULER = originalSchedulerFlag;
  });
});
