import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  listQuestSubmissionsMvpMock,
  reviewQuestSubmissionMvpMock,
  requireInternalAdminAccessMock,
} = vi.hoisted(() => ({
  listQuestSubmissionsMvpMock: vi.fn(),
  reviewQuestSubmissionMvpMock: vi.fn(),
  requireInternalAdminAccessMock: vi.fn(),
}));

vi.mock("@/lib/domain/quests/runtime", () => ({
  QuestRuntimeError: class QuestRuntimeError extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  },
  listQuestSubmissionsMvp: listQuestSubmissionsMvpMock,
  reviewQuestSubmissionMvp: reviewQuestSubmissionMvpMock,
}));
vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));

import { GET } from "@/app/api/internal/quests/submissions/route";
import { POST } from "@/app/api/internal/quests/submissions/[submissionId]/review/route";

describe("internal quest submissions routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists submissions for authorized admin", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, mode: "session", actor: { id: "admin:mod", label: "mod", type: "admin_user", username: "mod", authMode: "session", role: "ADMIN_MODERATOR" } });
    listQuestSubmissionsMvpMock.mockResolvedValue([{ id: "s1", status: "SUBMITTED" }]);

    const response = await GET({ nextUrl: new URL("http://localhost/api/internal/quests/submissions?status=SUBMITTED") } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(listQuestSubmissionsMvpMock).toHaveBeenCalledWith({ status: "SUBMITTED" });
    expect(body.submissions).toHaveLength(1);
  });

  it("reviews submission for authorized admin", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, mode: "key", actor: { id: "service-key:mod", label: "service-key:mod", type: "service_key", username: null, authMode: "key", role: "ADMIN_MODERATOR" } });
    reviewQuestSubmissionMvpMock.mockResolvedValue({ alreadyReviewed: false, submission: { id: "s1", status: "APPROVED" } });

    const response = await POST(
      new Request("http://localhost/api/internal/quests/submissions/s1/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE" }),
      }) as any,
      { params: { submissionId: "s1" } }
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(reviewQuestSubmissionMvpMock).toHaveBeenCalledWith({
      submissionId: "s1",
      action: "APPROVE",
      reviewedByAdmin: "service-key:mod",
      note: undefined,
    });
    expect(body.submission.status).toBe("APPROVED");
  });
  it("requires decisionCode when rejecting", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, mode: "session", actor: { id: "admin:mod", label: "mod", type: "admin_user", username: "mod", authMode: "session", role: "ADMIN_MODERATOR" } });

    const response = await POST(
      new Request("http://localhost/api/internal/quests/submissions/s1/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT" }),
      }) as any,
      { params: { submissionId: "s1" } }
    );

    expect(response.status).toBe(400);
    expect(reviewQuestSubmissionMvpMock).not.toHaveBeenCalled();
  });

});
