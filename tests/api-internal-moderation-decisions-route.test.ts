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

import { GET } from "@/app/api/internal/moderation/decisions/route";

describe("/api/internal/moderation/decisions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns decision history rows", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, actor: { id: "admin:a" } });
    requireAdminRoleMock.mockReturnValue({ ok: true, actor: { id: "admin:a" } });
    prismaMock.questSubmission.findMany.mockResolvedValue([
      {
        id: "s1",
        status: "REJECTED",
        note: "PROOF_NOT_VALID | proof mismatch",
        reviewedByAdmin: "alice",
        reviewedAt: new Date("2026-03-10T10:00:00.000Z"),
        quest: { id: "q1", code: "SPRING:FOLLOW", title: "Follow" },
        user: { id: "u1", xUsername: "bob", displayName: "Bob" },
      },
    ]);

    const response = await GET({ nextUrl: new URL("http://localhost/api/internal/moderation/decisions?campaign=SPRING") } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items[0].decisionCode).toBe("PROOF_NOT_VALID");
    expect(body.items[0].reviewer).toBe("alice");
  });
});
