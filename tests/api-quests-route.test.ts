import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, listUserQuestsMvpMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  listUserQuestsMvpMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionUser: getSessionUserMock }));
vi.mock("@/lib/domain/quests/runtime", () => ({
  listUserQuestsMvp: listUserQuestsMvpMock,
}));

import { GET } from "@/app/api/quests/route";

describe("GET /api/quests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns quest payload for authenticated user", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1" });
    listUserQuestsMvpMock.mockResolvedValue({
      quests: [{ id: "q1", code: "contest_2", status: "IN_PROGRESS", progressValue: 1, targetValue: 2 }],
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(listUserQuestsMvpMock).toHaveBeenCalledWith("u1");
    expect(body.quests[0].id).toBe("q1");
  });
});
