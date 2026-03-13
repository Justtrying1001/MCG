import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireInternalAdminAccessMock, updateQuestLifecycleMvpMock } = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  updateQuestLifecycleMvpMock: vi.fn(),
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));
vi.mock("@/lib/domain/quests/runtime", () => ({
  QuestRuntimeError: class QuestRuntimeError extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  },
  updateQuestLifecycleMvp: updateQuestLifecycleMvpMock,
}));

import { PATCH } from "@/app/api/internal/quests/[questId]/lifecycle/route";

describe("/api/internal/quests/[questId]/lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates lifecycle for authorized admin", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, mode: "session" });
    updateQuestLifecycleMvpMock.mockResolvedValue({ id: "q1", isActive: false, config: { lifecycleStatus: "ARCHIVED" } });

    const response = await PATCH(new Request("http://localhost/api/internal/quests/q1/lifecycle", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "ARCHIVE" }),
    }) as any, { params: { questId: "q1" } });

    expect(response.status).toBe(200);
    expect(updateQuestLifecycleMvpMock).toHaveBeenCalledWith("q1", "ARCHIVE");
  });

  it("rejects invalid action", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, mode: "session" });

    const response = await PATCH(new Request("http://localhost/api/internal/quests/q1/lifecycle", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "NOPE" }),
    }) as any, { params: { questId: "q1" } });

    expect(response.status).toBe(400);
  });
});
