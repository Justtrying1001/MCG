import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireInternalAdminAccessMock, requireAdminRoleMock, reviewQuestSubmissionMvpMock } = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  requireAdminRoleMock: vi.fn(),
  reviewQuestSubmissionMvpMock: vi.fn(),
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));
vi.mock("@/lib/admin-ops", () => ({
  ADMIN_ROLES: { ADMIN_MODERATOR: "ADMIN_MODERATOR", ADMIN_SUPERVISOR: "ADMIN_SUPERVISOR" },
  requireAdminRole: requireAdminRoleMock,
}));
vi.mock("@/lib/domain/quests/runtime", () => ({
  reviewQuestSubmissionMvp: reviewQuestSubmissionMvpMock,
  QuestRuntimeError: class QuestRuntimeError extends Error { status = 400; },
}));

import { POST } from "@/app/api/internal/moderation/submissions/[submissionId]/decide/route";

describe("/api/internal/moderation/submissions/:id/decide", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, actor: { id: "admin:a" } });
    requireAdminRoleMock.mockReturnValue({ ok: true, actor: { label: "alice" } });
  });

  it("requires decisionCode for reject", async () => {
    const request = new Request("http://localhost/api/internal/moderation/submissions/s1/decide", {
      method: "POST",
      body: JSON.stringify({ decision: "REJECT" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request as any, { params: { submissionId: "s1" } });
    expect(response.status).toBe(400);
  });

  it("passes decision code and note to runtime", async () => {
    reviewQuestSubmissionMvpMock.mockResolvedValue({ id: "s1", status: "REJECTED" });
    const request = new Request("http://localhost/api/internal/moderation/submissions/s1/decide", {
      method: "POST",
      body: JSON.stringify({ decision: "REJECT", decisionCode: "PROOF_NOT_VALID", note: "bad proof" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request as any, { params: { submissionId: "s1" } });
    expect(response.status).toBe(200);
    expect(reviewQuestSubmissionMvpMock).toHaveBeenCalledWith(expect.objectContaining({
      submissionId: "s1",
      action: "REJECT",
      note: "PROOF_NOT_VALID | bad proof",
    }));
  });
});
