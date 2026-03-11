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
  QuestRuntimeError: class QuestRuntimeError extends Error { status = 400; },
  listInternalQuestsMvp: listInternalQuestsMvpMock,
  createQuestDefinitionMvp: createQuestDefinitionMvpMock,
}));

import { GET } from "@/app/api/internal/quests/route";

describe("GET /api/internal/quests", () => {
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
});
