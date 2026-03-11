import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, submitSocialQuestMvpMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  submitSocialQuestMvpMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionUser: getSessionUserMock }));
vi.mock("@/lib/domain/quests/runtime", () => ({
  QuestRuntimeError: class QuestRuntimeError extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  },
  submitSocialQuestMvp: submitSocialQuestMvpMock,
}));

import { POST } from "@/app/api/quests/[questId]/submit/route";

describe("POST /api/quests/[questId]/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await POST(new Request("http://localhost/api/quests/q1/submit", { method: "POST" }), { params: { questId: "q1" } });

    expect(response.status).toBe(401);
  });

  it("submits quest proof for authenticated user", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1" });
    submitSocialQuestMvpMock.mockResolvedValue({ id: "s1", status: "SUBMITTED" });

    const response = await POST(
      new Request("http://localhost/api/quests/q1/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofUrl: "https://x.com/u1", note: "done" }),
      }),
      { params: { questId: "q1" } }
    );

    const body = await response.json();

    expect(response.status).toBe(201);
    expect(submitSocialQuestMvpMock).toHaveBeenCalledWith({
      questId: "q1",
      userId: "u1",
      proofUrl: "https://x.com/u1",
      note: "done",
    });
    expect(body.submission.id).toBe("s1");
  });
});
