import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireInternalAdminAccessMock, autoScoreContestWithCoinGeckoMvpMock } = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  autoScoreContestWithCoinGeckoMvpMock: vi.fn(),
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));
vi.mock("@/lib/domain/contests/runtime", () => ({
  ContestRuntimeError: class ContestRuntimeError extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  },
  autoScoreContestWithCoinGeckoMvp: autoScoreContestWithCoinGeckoMvpMock,
}));

import { POST } from "@/app/api/internal/contests/[contestId]/score/auto/route";

describe("/api/internal/contests/:contestId/score/auto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when unauthorized", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: false, status: 403, error: "Forbidden" });

    const response = await POST(new Request("http://localhost/api/internal/contests/c1/score/auto", { method: "POST" }) as any, {
      params: { contestId: "c1" },
    });

    expect(response.status).toBe(403);
  });

  it("runs auto scoring", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, mode: "session" });
    autoScoreContestWithCoinGeckoMvpMock.mockResolvedValue({ contestId: "c1", rankingsCount: 10, entriesScored: 10 });

    const response = await POST(
      new Request("http://localhost/api/internal/contests/c1/score/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      }) as any,
      { params: { contestId: "c1" } }
    );

    expect(response.status).toBe(200);
    expect(autoScoreContestWithCoinGeckoMvpMock).toHaveBeenCalledWith({ contestId: "c1", force: true });
  });
});
