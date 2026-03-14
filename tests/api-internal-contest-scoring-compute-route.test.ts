import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireInternalAdminAccessMock,
  requireAdminRoleMock,
  claimIdempotencyKeyMock,
  safeLogAdminActionMock,
  computeContestScoresFromSnapshotsMock,
} = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  requireAdminRoleMock: vi.fn(),
  claimIdempotencyKeyMock: vi.fn(),
  safeLogAdminActionMock: vi.fn(),
  computeContestScoresFromSnapshotsMock: vi.fn(),
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));
vi.mock("@/lib/admin-ops", () => ({
  ADMIN_ROLES: { ADMIN_OPS: "ADMIN_OPS", ADMIN_SUPERVISOR: "ADMIN_SUPERVISOR" },
  requireAdminRole: requireAdminRoleMock,
  claimIdempotencyKey: claimIdempotencyKeyMock,
  safeLogAdminAction: safeLogAdminActionMock,
}));
vi.mock("@/lib/domain/contests/scoring-engine-runtime", () => ({ computeContestScoresFromSnapshots: computeContestScoresFromSnapshotsMock }));
vi.mock("@/lib/domain/contests/runtime", () => ({
  ContestRuntimeError: class ContestRuntimeError extends Error { status = 400; },
}));

import { POST } from "@/app/api/internal/contest-runs/[contestId]/scoring/compute/route";

describe("contest scoring compute route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, actor: { id: "admin:a" } });
    requireAdminRoleMock.mockReturnValue({ ok: true, actor: { id: "admin:a" } });
    claimIdempotencyKeyMock.mockResolvedValue({ claimed: true });
    safeLogAdminActionMock.mockResolvedValue(undefined);
  });

  it("requires idempotency key", async () => {
    const response = await POST(new Request("http://localhost", { method: "POST" }) as any, { params: { contestId: "c1" } });
    expect(response.status).toBe(400);
  });

  it("rejects idempotency replay", async () => {
    claimIdempotencyKeyMock.mockResolvedValue({ claimed: false });

    const response = await POST(new Request("http://localhost", { method: "POST", headers: { "Idempotency-Key": "k1" } }) as any, { params: { contestId: "c1" } });
    expect(response.status).toBe(409);
    expect(computeContestScoresFromSnapshotsMock).not.toHaveBeenCalled();
  });

  it("executes compute when idempotency claim succeeds", async () => {
    computeContestScoresFromSnapshotsMock.mockResolvedValue({
      contestId: "c1",
      tokenScoresCount: 10,
      entryBreakdownsCount: 20,
      userScoresCount: 3,
      rankingsCount: 3,
    });

    const response = await POST(new Request("http://localhost", { method: "POST", headers: { "Idempotency-Key": "k1" } }) as any, { params: { contestId: "c1" } });
    expect(response.status).toBe(200);
    expect(computeContestScoresFromSnapshotsMock).toHaveBeenCalledWith("c1");
  });


  it("allows re-run with a different idempotency key", async () => {
    computeContestScoresFromSnapshotsMock.mockResolvedValue({
      contestId: "c1",
      tokenScoresCount: 10,
      entryBreakdownsCount: 20,
      userScoresCount: 3,
      rankingsCount: 3,
    });

    claimIdempotencyKeyMock
      .mockResolvedValueOnce({ claimed: true })
      .mockResolvedValueOnce({ claimed: true });

    const first = await POST(new Request("http://localhost", { method: "POST", headers: { "Idempotency-Key": "k1" } }) as any, { params: { contestId: "c1" } });
    const second = await POST(new Request("http://localhost", { method: "POST", headers: { "Idempotency-Key": "k2" } }) as any, { params: { contestId: "c1" } });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(computeContestScoresFromSnapshotsMock).toHaveBeenCalledTimes(2);
  });
});
