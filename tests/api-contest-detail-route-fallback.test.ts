import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, getContestDetailMvpMock, prismaMock, ContestRuntimeErrorMock } = vi.hoisted(() => {
  class ContestRuntimeErrorMock extends Error {
    status: number;

    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  }

  return {
    getSessionUserMock: vi.fn(),
    getContestDetailMvpMock: vi.fn(),
    prismaMock: {
      contest: { findUnique: vi.fn() },
    },
    ContestRuntimeErrorMock,
  };
});

vi.mock("@/lib/auth", () => ({ getSessionUser: getSessionUserMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/domain/contests/runtime", () => ({
  ContestRuntimeError: ContestRuntimeErrorMock,
  getContestDetailMvp: getContestDetailMvpMock,
}));

import { GET } from "@/app/api/contests/[contestId]/route";

describe("contest detail route fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue(null);
  });

  it("returns fallback contest payload when lifecycle runtime fails but contest is public", async () => {
    getContestDetailMvpMock.mockRejectedValue(new ContestRuntimeErrorMock("[SETTLEMENT] Distribution rules overlap ambiguously", 409));
    prismaMock.contest.findUnique.mockResolvedValue({
      id: "c1",
      title: "Contest 1",
      code: "C1",
      status: "LIVE",
      liveAt: null,
      lockAt: null,
      endsAt: null,
      openAt: null,
      configPublishedAt: new Date(),
      rules: [],
      leagueTierRequired: null,
      season: { id: "s1", name: "Season 1" },
      _count: { entries: 3 },
    });

    const response = await GET(new Request("http://localhost") as any, { params: { contestId: "c1" } });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.contest.id).toBe("c1");
    expect(payload.warning).toContain("fallback mode");
  });
});
