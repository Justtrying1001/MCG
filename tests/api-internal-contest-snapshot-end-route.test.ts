import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireInternalAdminAccessMock,
  requireAdminRoleMock,
  safeLogAdminActionMock,
  finalizeContestFromEndSnapshotTriggerMock,
} = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  requireAdminRoleMock: vi.fn(),
  safeLogAdminActionMock: vi.fn(),
  finalizeContestFromEndSnapshotTriggerMock: vi.fn(),
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));
vi.mock("@/lib/admin-ops", () => ({
  ADMIN_ROLES: { ADMIN_OPS: "ADMIN_OPS", ADMIN_SUPERVISOR: "ADMIN_SUPERVISOR" },
  requireAdminRole: requireAdminRoleMock,
  safeLogAdminAction: safeLogAdminActionMock,
}));
vi.mock("@/lib/domain/contests/finalization-runtime", () => ({
  finalizeContestFromEndSnapshotTrigger: finalizeContestFromEndSnapshotTriggerMock,
}));

import { POST } from "@/app/api/internal/contest-runs/[contestId]/snapshots/end/route";

describe("/api/internal/contest-runs/:contestId/snapshots/end", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, actor: { id: "admin:ops" } });
    requireAdminRoleMock.mockReturnValue({ ok: true, actor: { id: "admin:ops" } });
    safeLogAdminActionMock.mockResolvedValue(undefined);
    finalizeContestFromEndSnapshotTriggerMock.mockResolvedValue({
      contestId: "c1",
      stepsExecuted: ["END_SNAPSHOT", "SCORING", "RANKING", "SETTLEMENT"],
      stepsSkipped: [],
      counts: {
        entries: 1,
        rosterLocks: 1,
        endSnapshots: 1,
        tokenScores: 1,
        breakdownRows: 1,
        scores: 1,
        rankings: 1,
        settlements: 1,
      },
    });
  });

  it("triggers full finalization pipeline", async () => {
    const response = await POST(new Request("http://localhost", { method: "POST" }) as any, { params: { contestId: "c1" } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(finalizeContestFromEndSnapshotTriggerMock).toHaveBeenCalledWith("c1");
    expect(body.ok).toBe(true);
    expect(body.stepsExecuted).toContain("SETTLEMENT");
  });
});
