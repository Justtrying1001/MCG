import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireInternalAdminAccessMock, prismaMock } = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  prismaMock: {
    contest: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET } from "@/app/api/internal/contest-runs/[contestId]/overview/route";

describe("/api/internal/contest-runs/:contestId/overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when unauthorized", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: false, status: 403, error: "Forbidden" });
    const response = await GET(new Request("http://localhost") as any, { params: { contestId: "c1" } });
    expect(response.status).toBe(403);
  });

  it("returns contest progress and allowed transitions", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, actor: { id: "admin:a" } });
    prismaMock.contest.findUnique.mockResolvedValue({
      id: "c1",
      code: "W1",
      title: "Week 1",
      status: "LIVE",
      startsAt: null,
      lockAt: null,
      endsAt: null,
      _count: { entries: 10, scores: 10, rankings: 10, settlements: 0 },
    });

    const response = await GET(new Request("http://localhost") as any, { params: { contestId: "c1" } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.progress.scoringReady).toBe(true);
    expect(body.allowedTransitions).toEqual(["SETTLED", "CANCELED"]);
  });
});
