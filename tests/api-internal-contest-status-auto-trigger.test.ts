import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContestStatus } from "@prisma/client";

const {
  requireInternalAdminAccessMock,
  requireAdminRoleMock,
  claimIdempotencyKeyMock,
  getAdminArtifactMock,
  safeLogAdminActionMock,
  executeContestTransitionMock,
} = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  requireAdminRoleMock: vi.fn(),
  claimIdempotencyKeyMock: vi.fn(),
  getAdminArtifactMock: vi.fn(),
  safeLogAdminActionMock: vi.fn(),
  executeContestTransitionMock: vi.fn(),
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
}));
vi.mock("@/lib/domain/contests/contest-lifecycle-runtime", () => ({
  executeContestTransition: executeContestTransitionMock,
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
    executeContestTransitionMock.mockResolvedValue({
      contest: { id: "c1", status: ContestStatus.LIVE },
      previousStatus: ContestStatus.LOCKED,
      executed: true,
      automation: { startSnapshotTriggered: true, finalizationTriggered: false },
    });
  });

  it("delegates LIVE transition to centralized lifecycle runtime", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Idempotency-Key": "k1", "Content-Type": "application/json" },
      body: JSON.stringify({ status: ContestStatus.LIVE, validationToken: "val_1" }),
    }) as any;

    const response = await POST(req, { params: { contestId: "c1" } });

    expect(response.status).toBe(200);
    expect(executeContestTransitionMock).toHaveBeenCalledWith("c1", ContestStatus.LIVE, "manual");
  });

  it("delegates SETTLED transition to centralized lifecycle runtime", async () => {
    getAdminArtifactMock.mockResolvedValue({
      id: "val_2",
      artifactType: "contest_transition_validation",
      targetId: "c1",
      createdBy: "admin:ops",
      payload: { currentPhase: ContestStatus.LIVE, targetPhase: ContestStatus.SETTLED },
    });
    executeContestTransitionMock.mockResolvedValue({
      contest: { id: "c1", status: ContestStatus.SETTLED },
      previousStatus: ContestStatus.LIVE,
      executed: true,
      automation: { startSnapshotTriggered: false, finalizationTriggered: true },
    });

    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Idempotency-Key": "k2", "Content-Type": "application/json" },
      body: JSON.stringify({ status: ContestStatus.SETTLED, validationToken: "val_2" }),
    }) as any;

    const response = await POST(req, { params: { contestId: "c1" } });

    expect(response.status).toBe(200);
    expect(executeContestTransitionMock).toHaveBeenCalledWith("c1", ContestStatus.SETTLED, "manual");
  });

  it("returns success for lifecycle no-op executions", async () => {
    executeContestTransitionMock.mockResolvedValue({
      contest: { id: "c1", status: ContestStatus.LIVE },
      previousStatus: ContestStatus.LIVE,
      executed: false,
      automation: { startSnapshotTriggered: false, finalizationTriggered: false },
    });

    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Idempotency-Key": "k3", "Content-Type": "application/json" },
      body: JSON.stringify({ status: ContestStatus.LIVE, validationToken: "val_1" }),
    }) as any;

    const response = await POST(req, { params: { contestId: "c1" } });

    expect(response.status).toBe(200);
    expect(executeContestTransitionMock).toHaveBeenCalledTimes(1);
  });

  it("does not report a status update when centralized execution fails", async () => {
    getAdminArtifactMock.mockResolvedValue({
      id: "val_2",
      artifactType: "contest_transition_validation",
      targetId: "c1",
      createdBy: "admin:ops",
      payload: { currentPhase: ContestStatus.LIVE, targetPhase: ContestStatus.SETTLED },
    });
    executeContestTransitionMock.mockRejectedValue(new Error("broken transition"));

    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Idempotency-Key": "k4", "Content-Type": "application/json" },
      body: JSON.stringify({ status: ContestStatus.SETTLED, validationToken: "val_2" }),
    }) as any;

    const response = await POST(req, { params: { contestId: "c1" } });

    expect(response.status).toBe(500);
  });
});
