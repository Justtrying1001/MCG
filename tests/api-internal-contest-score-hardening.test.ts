import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireInternalAdminAccessMock, getAdminArtifactMock, claimIdempotencyKeyMock, recordContestScoresMvpMock } = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  getAdminArtifactMock: vi.fn(),
  claimIdempotencyKeyMock: vi.fn(),
  recordContestScoresMvpMock: vi.fn(),
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));
vi.mock("@/lib/admin-ops", () => ({
  getAdminArtifact: getAdminArtifactMock,
  claimIdempotencyKey: claimIdempotencyKeyMock,
  requireAdminRole: () => ({ ok: true, actor: { id: "admin:a", label: "alice", role: "ADMIN_OPS" } }),
  safeLogAdminAction: vi.fn(),
  ADMIN_ROLES: { ADMIN_OPS: "ADMIN_OPS", ADMIN_SUPERVISOR: "ADMIN_SUPERVISOR" },
}));
vi.mock("@/lib/domain/contests/runtime", () => ({
  ContestRuntimeError: class ContestRuntimeError extends Error { status = 400; },
  recordContestScoresMvp: recordContestScoresMvpMock,
}));

import { POST } from "@/app/api/internal/contests/[contestId]/score/route";

describe("contest score execute hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, actor: { id: "admin:a", label: "alice", role: "ADMIN_OPS" } });
  });

  it("blocks execute when importId is missing", async () => {
    const response = await POST(new Request("http://localhost", { method: "POST", headers: { "Idempotency-Key": "k1" }, body: JSON.stringify({}) }) as any, { params: { contestId: "c1" } });
    expect(response.status).toBe(400);
  });

  it("rejects idempotency replay", async () => {
    getAdminArtifactMock.mockResolvedValue({ targetId: "c1", createdBy: "admin:a", payload: { rows: [{ userId: "u1", score: 7 }] } });
    claimIdempotencyKeyMock.mockResolvedValue({ claimed: false });

    const response = await POST(new Request("http://localhost", { method: "POST", headers: { "Idempotency-Key": "k1" }, body: JSON.stringify({ importId: "imp1" }) }) as any, { params: { contestId: "c1" } });
    expect(response.status).toBe(409);
    expect(recordContestScoresMvpMock).not.toHaveBeenCalled();
  });
});
