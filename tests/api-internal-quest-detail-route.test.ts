import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireInternalAdminAccessMock,
  getInternalQuestDetailMvpMock,
  updateQuestDefinitionMvpMock,
} = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  getInternalQuestDetailMvpMock: vi.fn(),
  updateQuestDefinitionMvpMock: vi.fn(),
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
  getInternalQuestDetailMvp: getInternalQuestDetailMvpMock,
  updateQuestDefinitionMvp: updateQuestDefinitionMvpMock,
}));

import { GET, PATCH } from "@/app/api/internal/quests/[questId]/route";

describe("/api/internal/quests/[questId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns detailed quest payload with analytics", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, mode: "session" });
    getInternalQuestDetailMvpMock.mockResolvedValue({
      quest: { id: "q1", code: "contest_2" },
      analytics: { totalPointsDistributed: 1500 },
      latestSubmissions: [],
      recentlyCompletedUsers: [],
      latestLedgerCredits: [],
    });

    const response = await GET(new Request("http://localhost/api/internal/quests/q1") as any, { params: { questId: "q1" } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getInternalQuestDetailMvpMock).toHaveBeenCalledWith("q1");
    expect(body.analytics.totalPointsDistributed).toBe(1500);
  });

  it("updates quest payload via PATCH", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, mode: "session" });
    updateQuestDefinitionMvpMock.mockResolvedValue({
      id: "q1",
      code: "contest_2",
      config: { targetUrl: "https://x.com/memecardgame/status/123", ctaLabel: "View Tweet" },
    });

    const response = await PATCH(new Request("http://localhost/api/internal/quests/q1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "contest_2" }),
    }) as any, { params: { questId: "q1" } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(updateQuestDefinitionMvpMock).toHaveBeenCalledWith("q1", { code: "contest_2" });
    expect(body.quest.config.ctaLabel).toBe("View Tweet");
  });

  it("updates milestone quest payload via PATCH", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, mode: "session" });
    updateQuestDefinitionMvpMock.mockResolvedValue({
      id: "q-m1",
      code: "Q_MILESTONE_PACK_3",
      config: { milestoneType: "PACK_OPEN_COUNT", targetValue: 3, threshold: 3 },
    });

    const response = await PATCH(new Request("http://localhost/api/internal/quests/q-m1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "Q_MILESTONE_PACK_3" }),
    }) as any, { params: { questId: "q-m1" } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.quest.config.targetValue).toBe(3);
    expect(body.quest.config.milestoneType).toBe("PACK_OPEN_COUNT");
  });
});
