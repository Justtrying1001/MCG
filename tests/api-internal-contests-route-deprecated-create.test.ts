import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireInternalAdminAccessMock,
  prismaMock,
} = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
  prismaMock: {
    contest: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { POST } from "@/app/api/internal/contests/route";

describe("/api/internal/contests POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 410 to block the legacy direct-create flow", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, actor: { id: "admin" } });

    const response = await POST(new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "LEGACY",
        title: "Legacy flow",
        status: "OPEN",
      }),
    }) as any);
    const payload = await response.json();

    expect(response.status).toBe(410);
    expect(payload.error).toMatch(/contest-configs/i);
    expect(prismaMock.contest.findMany).not.toHaveBeenCalled();
  });
});
