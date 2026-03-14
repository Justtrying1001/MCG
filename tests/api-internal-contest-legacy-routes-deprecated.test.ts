import { describe, expect, it, vi } from "vitest";

const { requireInternalAdminAccessMock } = vi.hoisted(() => ({
  requireInternalAdminAccessMock: vi.fn(),
}));

vi.mock("@/lib/internal-auth", () => ({ requireInternalAdminAccess: requireInternalAdminAccessMock }));

import { POST as scorePost } from "@/app/api/internal/contests/[contestId]/score/route";
import { POST as settlePost } from "@/app/api/internal/contests/[contestId]/settle/route";

describe("legacy contest routes deprecation", () => {
  it("returns 410 for legacy scoring route", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, actor: { id: "admin" } });
    const response = await scorePost(new Request("http://localhost", { method: "POST" }) as any, { params: { contestId: "c1" } });
    const payload = await response.json();

    expect(response.status).toBe(410);
    expect(payload.error).toMatch(/deprecated/i);
  });

  it("returns 410 for legacy settlement route", async () => {
    requireInternalAdminAccessMock.mockReturnValue({ ok: true, actor: { id: "admin" } });
    const response = await settlePost(new Request("http://localhost", { method: "POST" }) as any, { params: { contestId: "c1" } });
    const payload = await response.json();

    expect(response.status).toBe(410);
    expect(payload.error).toMatch(/deprecated/i);
  });
});
