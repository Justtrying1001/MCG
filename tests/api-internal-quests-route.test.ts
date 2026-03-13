import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireInternalAdminAccessMock,
  listInternalQuestsMvpMock,
  createQuestDefinitionMvpMock,
} = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  listInternalQuestsMvpMock: vi.fn(),
  createQuestDefinitionMvpMock: vi.fn(),
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));
vi.mock("@/lib/domain/quests/runtime", () => ({
  QuestRuntimeError: class QuestRuntimeError extends Error {
    status = 400;
  },
  listInternalQuestsMvp: listInternalQuestsMvpMock,
  createQuestDefinitionMvp: createQuestDefinitionMvpMock,
}));

import { GET, POST } from "@/app/api/internal/quests/route";

describe("/api/internal/quests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns quests with analytics for authorized admins", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, mode: "session" });
    listInternalQuestsMvpMock.mockResolvedValue([
      {
        id: "q1",
        code: "contest_2",
        analytics: {
          progressCount: 3,
          completedCount: 2,
          pendingSubmissionCount: 1,
          approvedSubmissionCount: 4,
          rejectedSubmissionCount: 1,
          totalPointsDistributed: 1500,
        },
      },
    ]);

    const response = await GET(new Request("http://localhost/api/internal/quests") as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.quests[0].analytics.totalPointsDistributed).toBe(1500);
  });

  it("creates quest payload for authorized admin", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, mode: "session" });
    createQuestDefinitionMvpMock.mockResolvedValue({
      id: "q-new",
      code: "Q_SOCIAL",
      config: { targetUrl: "https://x.com/memecardgame", ctaLabel: "Open on X" },
    });

    const response = await POST(new Request("http://localhost/api/internal/quests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "Q_SOCIAL" }),
    }) as any);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.quest.id).toBe("q-new");
    expect(createQuestDefinitionMvpMock).toHaveBeenCalled();
  });

  it("creates milestone quest payload for authorized admin", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, mode: "session" });
    createQuestDefinitionMvpMock.mockResolvedValue({
      id: "q-m1",
      code: "Q_MILESTONE_PACK_3",
      type: "CONTEST_COUNT_MILESTONE",
      config: { milestoneType: "PACK_OPEN_COUNT", targetValue: 3, threshold: 3 },
    });

    const response = await POST(new Request("http://localhost/api/internal/quests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "Q_MILESTONE_PACK_3" }),
    }) as any);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.quest.config.milestoneType).toBe("PACK_OPEN_COUNT");
  });
});
