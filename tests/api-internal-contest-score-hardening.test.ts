import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireInternalAdminAccessMock } = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));

import { POST } from "@/app/api/internal/contests/[contestId]/score/route";

describe("contest score execute hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated internal caller", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: false, status: 401, error: "Unauthorized" });
    const response = await POST(new Request("http://localhost", { method: "POST" }) as any, { params: { contestId: "c1" } });
    expect(response.status).toBe(401);
  });

  it("returns 410 because legacy manual score path is deprecated", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, actor: { id: "admin:a" } });
    const response = await POST(new Request("http://localhost", { method: "POST" }) as any, { params: { contestId: "c1" } });
    const payload = await response.json();

    expect(response.status).toBe(410);
    expect(payload.error).toMatch(/deprecated/i);
  });
});
