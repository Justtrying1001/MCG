import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireInternalAdminAccessMock, prismaMock } = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  prismaMock: {
    questDefinition: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET } from "@/app/api/internal/campaigns/catalog/route";

describe("/api/internal/campaigns/catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthorized requests", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: false, status: 401, error: "Unauthorized" });
    const response = await GET(new Request("http://localhost/api/internal/campaigns/catalog") as any);
    expect(response.status).toBe(401);
  });

  it("returns grouped campaign rows", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, actor: { id: "admin:a" } });
    prismaMock.questDefinition.findMany.mockResolvedValue([
      { id: "q1", code: "SPRING:FOLLOW", title: "Follow", isActive: true, startAt: new Date("2026-03-01"), endAt: new Date("2026-03-07") },
      { id: "q2", code: "SPRING:LIKE", title: "Like", isActive: false, startAt: new Date("2026-03-02"), endAt: new Date("2026-03-08") },
    ]);

    const response = await GET(new Request("http://localhost/api/internal/campaigns/catalog") as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.campaigns).toHaveLength(1);
    expect(body.campaigns[0].code).toBe("SPRING");
    expect(body.campaigns[0].questCount).toBe(2);
  });
});
