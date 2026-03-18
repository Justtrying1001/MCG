import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContestStatus } from "@prisma/client";

const {
  requireInternalAdminAccessMock,
  getContestLifecycleDebugInfoMock,
  forceContestLifecycleNowMock,
} = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  getContestLifecycleDebugInfoMock: vi.fn(),
  forceContestLifecycleNowMock: vi.fn(),
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));
vi.mock("@/lib/domain/contests/lifecycle-debug", () => ({
  getContestLifecycleDebugInfo: getContestLifecycleDebugInfoMock,
  forceContestLifecycleNow: forceContestLifecycleNowMock,
}));

import { GET } from "@/app/api/internal/contests/[contestId]/lifecycle-debug/route";
import { POST } from "@/app/api/internal/contests/[contestId]/force-lifecycle/route";

describe("contest lifecycle debug routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, actor: { id: "admin:ops" } });
  });

  it("returns a readable lifecycle diagnostic payload", async () => {
    getContestLifecycleDebugInfoMock.mockResolvedValue({
      contestId: "c1",
      currentStatus: ContestStatus.OPEN,
      now: "2026-03-18T09:30:00.000Z",
      openAt: "2026-03-18T08:00:00.000Z",
      lockAt: "2026-03-18T09:00:00.000Z",
      liveAt: "2026-03-18T09:05:00.000Z",
      endsAt: "2026-03-18T10:00:00.000Z",
      openPhaseEndAt: "2026-03-18T09:00:00.000Z",
      expectedTargetStatus: ContestStatus.LIVE,
      canTransitionToLive: false,
      reasonIfBlocked: "Contest is due but no lifecycle driver is active.",
      hasStartSnapshot: false,
      hasEndSnapshot: false,
      hasEntries: true,
      qstashOpenJobId: null,
      qstashLiveJobId: null,
      qstashSettleJobId: null,
      publishedWithoutLifecycleJobs: true,
      schedulerEnabled: false,
      qstashConfigured: false,
      lastKnownLifecycleDriver: "NONE",
      whatShouldHaveHappened: "Contest should have moved to LIVE.",
      whatActuallyHappened: "Contest is still OPEN.",
      nextActionRecommended: "Force lifecycle now.",
      humanSummary: "Contest c1 is OPEN and blocked.",
      schedulerDiagnosis: "No automatic lifecycle driver is active.",
      blockers: ["No automatic lifecycle driver is active."],
    });

    const response = await GET(new Request("http://localhost") as any, { params: { contestId: "c1" } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.debug.contestId).toBe("c1");
    expect(json.debug.whatActuallyHappened).toMatch(/still OPEN/i);
  });

  it("returns detailed force lifecycle execution result", async () => {
    forceContestLifecycleNowMock.mockResolvedValue({
      contestId: "c1",
      now: "2026-03-18T09:30:00.000Z",
      statusBefore: ContestStatus.OPEN,
      statusAfter: ContestStatus.LIVE,
      transitionAttempted: "OPEN -> LIVE",
      startSnapshotAttempted: true,
      success: true,
      error: null,
      attempts: [{
        from: ContestStatus.OPEN,
        target: ContestStatus.LIVE,
        reason: "OPEN_PHASE_ENDED",
        outcome: "executed",
        startSnapshotAttempted: true,
        finalizationAttempted: false,
        error: null,
      }],
      reconcileResult: { contestId: "c1", initialStatus: ContestStatus.OPEN, finalStatus: ContestStatus.LIVE, now: new Date("2026-03-18T09:30:00.000Z"), steps: [], attempts: [] },
      before: { currentStatus: ContestStatus.OPEN },
      after: { currentStatus: ContestStatus.LIVE },
    });

    const response = await POST(new Request("http://localhost", { method: "POST" }) as any, { params: { contestId: "c1" } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.statusBefore).toBe(ContestStatus.OPEN);
    expect(json.statusAfter).toBe(ContestStatus.LIVE);
    expect(json.transitionAttempted).toBe("OPEN -> LIVE");
  });
});
