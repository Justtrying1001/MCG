import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireInternalAdminAccessMock, requireAdminRoleMock, prismaMock } = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  requireAdminRoleMock: vi.fn(),
  prismaMock: {
    questSubmission: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));
vi.mock("@/lib/admin-ops", () => ({
  ADMIN_ROLES: { ADMIN_MODERATOR: "ADMIN_MODERATOR", ADMIN_SUPERVISOR: "ADMIN_SUPERVISOR" },
  requireAdminRole: requireAdminRoleMock,
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET } from "@/app/api/internal/moderation/queue/route";

describe("/api/internal/moderation/queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when role is missing", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: false, status: 403, error: "Forbidden" });
    requireAdminRoleMock.mockReturnValue({ ok: false, status: 403, error: "Forbidden" });

    const response = await GET({ nextUrl: new URL("http://localhost/api/internal/moderation/queue") } as any);
    expect(response.status).toBe(403);
  });

  it("returns queue rows and supports filters", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, actor: { id: "admin:a" } });
    requireAdminRoleMock.mockReturnValue({ ok: true, actor: { id: "admin:a" } });
    prismaMock.questSubmission.findMany.mockResolvedValue([
      {
        id: "s1",
        status: "SUBMITTED",
        proofUrl: "https://proof",
        note: null,
        createdAt: new Date(Date.now() - 3 * 3600 * 1000),
        quest: { id: "q1", code: "SPRING:FOLLOW", title: "Follow", rewardPoints: 100 },
        user: { id: "u1", xUsername: "alice", displayName: "Alice" },
      },
    ]);

    const response = await GET({ nextUrl: new URL("http://localhost/api/internal/moderation/queue?status=SUBMITTED&campaign=SPRING") } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.questSubmission.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: "SUBMITTED" }),
    }));
    expect(body.items[0].slaLevel).toBe("OK");
    expect(body.items[0].evidenceCompleteness).toBe("HAS_URL");
  });
});
