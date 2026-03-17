import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("admin users page browser UX", () => {
  it("loads users list without requiring a typed search", () => {
    const source = readFileSync("app/admin/(protected)/users/page.tsx", "utf8");
    expect(source).toContain("/api/internal/admin/users");
    expect(source).toContain('const params = new URLSearchParams({ limit: "60" })');
    expect(source).toContain("if (query.trim())");
  });

  it("keeps master/detail behavior with user selection loading context", () => {
    const source = readFileSync("app/admin/(protected)/users/page.tsx", "utf8");
    expect(source).toContain("void loadContext(rows[0].id)");
    expect(source).toContain("setSelectedUserId(userId)");
    expect(source).toContain("/api/internal/users/${userId}/admin-context");
  });

  it("renders clear empty states", () => {
    const source = readFileSync("app/admin/(protected)/users/page.tsx", "utf8");
    expect(source).toContain("No users found for this filter.");
    expect(source).toContain("No user selected.");
  });

  it("keeps admin guard at protected layout level", () => {
    const source = readFileSync("app/admin/(protected)/layout.tsx", "utf8");
    expect(source).toContain("getAdminSessionFromCookies");
    expect(source).toContain("redirect(\"/admin/login\")");
  });
});
