import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminSessionFromRequestMock } = vi.hoisted(() => ({
  getAdminSessionFromRequestMock: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ getAdminSessionFromRequest: getAdminSessionFromRequestMock }));

import { requireInternalAdminAccess } from "@/lib/internal-auth";

describe("internal-auth actor normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.INTERNAL_ADMIN_KEY;
    delete process.env.INTERNAL_ADMIN_KEY_ID;
    delete process.env.INTERNAL_ADMIN_KEY_ROLE;
    delete process.env.ADMIN_DEFAULT_ROLE;
  });

  it("returns nominative admin session actor with default role", () => {
    getAdminSessionFromRequestMock.mockReturnValue({ username: "alice" });
    process.env.ADMIN_DEFAULT_ROLE = "ADMIN_OPS";

    const result = requireInternalAdminAccess({} as any);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.actor.id).toBe("admin:alice");
    expect(result.actor.role).toBe("ADMIN_OPS");
    expect(result.actor.authMode).toBe("session");
  });

  it("uses stable service-key identity from server config", () => {
    getAdminSessionFromRequestMock.mockReturnValue(null);
    process.env.INTERNAL_ADMIN_KEY = "secret";
    process.env.INTERNAL_ADMIN_KEY_ID = "svc-main";
    process.env.INTERNAL_ADMIN_KEY_ROLE = "ADMIN_SUPERVISOR";

    const req = new Request("http://localhost", { headers: { "x-internal-admin-key": "secret", "x-internal-admin-key-id": "spoofed" } });
    const result = requireInternalAdminAccess(req as any);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.actor.id).toBe("service-key:svc-main");
    expect(result.actor.label).toBe("service-key:svc-main");
    expect(result.actor.role).toBe("ADMIN_SUPERVISOR");
  });
});
