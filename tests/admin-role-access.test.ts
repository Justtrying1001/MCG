import { describe, expect, it } from "vitest";

import { ADMIN_ROLES, requireAdminRole } from "@/lib/admin-ops";

describe("admin role checks", () => {
  it("allows supervisor for finance-protected rewards routes", () => {
    const check = requireAdminRole({
      ok: true,
      mode: "session",
      actor: {
        type: "admin_user",
        id: "admin:carlitoonchain",
        label: "carlitoonchain",
        username: "carlitoonchain",
        authMode: "session",
        role: ADMIN_ROLES.ADMIN_SUPERVISOR,
      },
    }, [ADMIN_ROLES.ADMIN_FINANCE_OPS, ADMIN_ROLES.ADMIN_SUPERVISOR]);

    expect(check.ok).toBe(true);
  });

  it("rejects non-finance non-supervisor role for finance-protected rewards routes", () => {
    const check = requireAdminRole({
      ok: true,
      mode: "session",
      actor: {
        type: "admin_user",
        id: "admin:alice",
        label: "alice",
        username: "alice",
        authMode: "session",
        role: ADMIN_ROLES.ADMIN_OPS,
      },
    }, [ADMIN_ROLES.ADMIN_FINANCE_OPS, ADMIN_ROLES.ADMIN_SUPERVISOR]);

    expect(check.ok).toBe(false);
    if (check.ok) return;
    expect(check.status).toBe(403);
    expect(check.error).toBe("Insufficient admin role");
  });
});
