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
    delete process.env.ROOT_ADMIN_X_USERNAME;
    delete process.env.OWNER_X_USERNAME;
  });

  it("returns nominative admin session actor with default role", () => {
    getAdminSessionFromRequestMock.mockReturnValue({ username: "alice" });
    delete process.env.ADMIN_DEFAULT_ROLE;
    delete process.env.ROOT_ADMIN_X_USERNAME;
    delete process.env.OWNER_X_USERNAME;

    const result = requireInternalAdminAccess({} as any);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.actor.id).toBe("admin:alice");
    expect(result.actor.role).toBe("ADMIN_SUPERVISOR");
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

  it("supports explicit session role override via env", () => {
    getAdminSessionFromRequestMock.mockReturnValue({ username: "alice" });
    process.env.ADMIN_DEFAULT_ROLE = "ADMIN_OPS";

    const result = requireInternalAdminAccess({} as any);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.actor.role).toBe("ADMIN_OPS");
  });

  it("elevates configured root admin username to supervisor", () => {
    getAdminSessionFromRequestMock.mockReturnValue({ username: "carlitoonchain" });
    process.env.ADMIN_DEFAULT_ROLE = "ADMIN_OPS";
    process.env.ROOT_ADMIN_X_USERNAME = "carlitoonchain";

    const result = requireInternalAdminAccess({} as any);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.actor.role).toBe("ADMIN_SUPERVISOR");
  });

  it("rejects cross-site mutation requests for admin sessions", () => {
    getAdminSessionFromRequestMock.mockReturnValue({ username: "alice" });

    const req = new Request("http://localhost/api/internal/admin/reset-users", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });

    const result = requireInternalAdminAccess(req as any);
    expect(result).toEqual({ ok: false, status: 403, error: "Cross-site admin request blocked" });
  });

  it("allows same-origin mutation requests for admin sessions", () => {
    getAdminSessionFromRequestMock.mockReturnValue({ username: "alice" });

    const req = new Request("http://localhost/api/internal/admin/reset-users", {
      method: "POST",
      headers: { origin: "http://localhost" },
    });

    const result = requireInternalAdminAccess(req as any);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe("session");
  });

});
