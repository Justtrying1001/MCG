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

import { GET } from "@/app/api/internal/quests/[questId]/route";

describe("GET /api/internal/quests/[questId]", () => {
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
});
