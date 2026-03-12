import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireInternalAdminAccessMock, prismaMock } = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  prismaMock: {
    contest: { groupBy: vi.fn() },
    questSubmission: { count: vi.fn() },
    rewardLedgerEntry: { count: vi.fn() },
    adminActionLog: { count: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET } from "@/app/api/internal/admin/dashboard-summary/route";

describe("/api/internal/admin/dashboard-summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when auth missing", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: false, status: 403, error: "Forbidden" });
    const response = await GET(new Request("http://localhost/api/internal/admin/dashboard-summary") as any);
    expect(response.status).toBe(403);
  });

  it("returns summary payload", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, actor: { id: "admin:a" } });
    prismaMock.contest.groupBy.mockResolvedValue([{ status: "LIVE", _count: { status: 2 } }]);
    prismaMock.questSubmission.count.mockResolvedValue(3);
    prismaMock.rewardLedgerEntry.count.mockResolvedValue(5);
    prismaMock.adminActionLog.count.mockResolvedValue(1);
    prismaMock.adminActionLog.findMany.mockResolvedValue([
      {
        id: "a1",
        actionType: "CONTEST_SETTLEMENT_EXECUTE",
        module: "CONTESTS",
        status: "FAILED",
        actorLabel: "alice",
        targetType: "CONTEST",
        targetId: "c1",
        errorCode: "ERR",
        createdAt: new Date("2026-03-01T10:00:00.000Z"),
      },
    ]);

    const response = await GET(new Request("http://localhost/api/internal/admin/dashboard-summary") as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary.contestsByStatus.LIVE).toBe(2);
    expect(body.summary.pendingModerationCount).toBe(3);
    expect(body.recentCriticalEvents).toHaveLength(1);
  });
});
