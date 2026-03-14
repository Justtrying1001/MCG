import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContestStatus } from "@prisma/client";

const {
  requireInternalAdminAccessMock,
  requireAdminRoleMock,
  claimIdempotencyKeyMock,
  getAdminArtifactMock,
  safeLogAdminActionMock,
  getContestDetailMvpMock,
  updateContestStatusMvpMock,
  captureStartSnapshotMock,
  captureEndSnapshotMock,
  computeContestScoresFromSnapshotsMock,
  executeAutoSettlementForContestMock,
} = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  requireAdminRoleMock: vi.fn(),
  claimIdempotencyKeyMock: vi.fn(),
  getAdminArtifactMock: vi.fn(),
  safeLogAdminActionMock: vi.fn(),
  getContestDetailMvpMock: vi.fn(),
  updateContestStatusMvpMock: vi.fn(),
  captureStartSnapshotMock: vi.fn(),
  captureEndSnapshotMock: vi.fn(),
  computeContestScoresFromSnapshotsMock: vi.fn(),
  executeAutoSettlementForContestMock: vi.fn(),
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));
vi.mock("@/lib/admin-ops", () => ({
  ADMIN_ROLES: { ADMIN_OPS: "ADMIN_OPS", ADMIN_SUPERVISOR: "ADMIN_SUPERVISOR" },
  claimIdempotencyKey: claimIdempotencyKeyMock,
  getAdminArtifact: getAdminArtifactMock,
  requireAdminRole: requireAdminRoleMock,
  safeLogAdminAction: safeLogAdminActionMock,
}));
vi.mock("@/lib/domain/contests/runtime", () => ({
  ContestRuntimeError: class ContestRuntimeError extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  },
  getContestDetailMvp: getContestDetailMvpMock,
  updateContestStatusMvp: updateContestStatusMvpMock,
}));
vi.mock("@/lib/domain/contests/snapshot-runtime", () => ({
  captureStartSnapshot: captureStartSnapshotMock,
  captureEndSnapshot: captureEndSnapshotMock,
}));
vi.mock("@/lib/domain/contests/scoring-engine-runtime", () => ({
  computeContestScoresFromSnapshots: computeContestScoresFromSnapshotsMock,
}));
vi.mock("@/lib/domain/contests/settlement-plan-runtime", () => ({
  executeAutoSettlementForContest: executeAutoSettlementForContestMock,
}));

import { POST } from "@/app/api/internal/contests/[contestId]/status/route";

describe("contest status route automation", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    requireInternalAdminAccessMock.mockReturnValue({ ok: true, actor: { id: "admin:ops" } });
    requireAdminRoleMock.mockReturnValue({ ok: true, actor: { id: "admin:ops" } });
    claimIdempotencyKeyMock.mockResolvedValue({ claimed: true });
    getAdminArtifactMock.mockResolvedValue({
      id: "val_1",
      artifactType: "contest_transition_validation",
      targetId: "c1",
      createdBy: "admin:ops",
      payload: { currentPhase: ContestStatus.LOCKED, targetPhase: ContestStatus.LIVE },
    });
    safeLogAdminActionMock.mockResolvedValue(undefined);
    getContestDetailMvpMock.mockResolvedValue({ contest: { id: "c1", status: ContestStatus.LOCKED }, userEntry: null });
    updateContestStatusMvpMock.mockResolvedValue({ id: "c1", status: ContestStatus.LIVE });
    captureStartSnapshotMock.mockResolvedValue({});
    captureEndSnapshotMock.mockResolvedValue({});
    computeContestScoresFromSnapshotsMock.mockResolvedValue({});
    executeAutoSettlementForContestMock.mockResolvedValue({ executed: true });
  });

  it("auto-triggers START snapshot when transitioning to LIVE", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Idempotency-Key": "k1", "Content-Type": "application/json" },
      body: JSON.stringify({ status: ContestStatus.LIVE, validationToken: "val_1" }),
    }) as any;

    const response = await POST(req, { params: { contestId: "c1" } });

    expect(response.status).toBe(200);
    expect(captureStartSnapshotMock).toHaveBeenCalledWith("c1");
    expect(captureEndSnapshotMock).not.toHaveBeenCalled();
    expect(computeContestScoresFromSnapshotsMock).not.toHaveBeenCalled();
    expect(updateContestStatusMvpMock).toHaveBeenCalledWith("c1", ContestStatus.LIVE);
  });

  it("auto-triggers END snapshot + scoring when transitioning to SETTLED", async () => {
    getAdminArtifactMock.mockResolvedValue({
      id: "val_2",
      artifactType: "contest_transition_validation",
      targetId: "c1",
      createdBy: "admin:ops",
      payload: { currentPhase: ContestStatus.LIVE, targetPhase: ContestStatus.SETTLED },
    });
    getContestDetailMvpMock.mockResolvedValue({ contest: { id: "c1", status: ContestStatus.LIVE }, userEntry: null });
    updateContestStatusMvpMock.mockResolvedValue({ id: "c1", status: ContestStatus.SETTLED });

    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Idempotency-Key": "k2", "Content-Type": "application/json" },
      body: JSON.stringify({ status: ContestStatus.SETTLED, validationToken: "val_2" }),
    }) as any;

    const response = await POST(req, { params: { contestId: "c1" } });

    expect(response.status).toBe(200);
    expect(captureStartSnapshotMock).not.toHaveBeenCalled();
    expect(captureEndSnapshotMock).toHaveBeenCalledWith("c1");
    expect(computeContestScoresFromSnapshotsMock).toHaveBeenCalledWith("c1");
    expect(executeAutoSettlementForContestMock).toHaveBeenCalledWith("c1");
    expect(updateContestStatusMvpMock).toHaveBeenCalledWith("c1", ContestStatus.SETTLED);
  });

  it("does not auto-trigger if contest is already in requested status", async () => {
    getContestDetailMvpMock.mockResolvedValue({ contest: { id: "c1", status: ContestStatus.LIVE }, userEntry: null });

    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Idempotency-Key": "k3", "Content-Type": "application/json" },
      body: JSON.stringify({ status: ContestStatus.LIVE, validationToken: "val_1" }),
    }) as any;

    const response = await POST(req, { params: { contestId: "c1" } });

    expect(response.status).toBe(200);
    expect(captureStartSnapshotMock).not.toHaveBeenCalled();
    expect(captureEndSnapshotMock).not.toHaveBeenCalled();
    expect(computeContestScoresFromSnapshotsMock).not.toHaveBeenCalled();
  });

  it("does not update status when end automation fails", async () => {
    getAdminArtifactMock.mockResolvedValue({
      id: "val_2",
      artifactType: "contest_transition_validation",
      targetId: "c1",
      createdBy: "admin:ops",
      payload: { currentPhase: ContestStatus.LIVE, targetPhase: ContestStatus.SETTLED },
    });
    getContestDetailMvpMock.mockResolvedValue({ contest: { id: "c1", status: ContestStatus.LIVE }, userEntry: null });
    captureEndSnapshotMock.mockRejectedValue(new Error("coingecko unavailable"));

    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Idempotency-Key": "k4", "Content-Type": "application/json" },
      body: JSON.stringify({ status: ContestStatus.SETTLED, validationToken: "val_2" }),
    }) as any;

    const response = await POST(req, { params: { contestId: "c1" } });

    expect(response.status).toBe(500);
    expect(updateContestStatusMvpMock).not.toHaveBeenCalled();
  });
});
