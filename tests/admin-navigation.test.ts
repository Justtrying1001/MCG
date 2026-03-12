import { describe, expect, it } from "vitest";

import { ADMIN_NAV_GROUPS, isNavItemActive } from "@/lib/admin/navigation";

describe("admin navigation", () => {
  it("keeps critical operations grouped and present", () => {
    const operations = ADMIN_NAV_GROUPS.find((group) => group.id === "operations");
    expect(operations).toBeTruthy();
    expect(operations?.items.map((item) => item.href)).toEqual([
      "/admin",
      "/admin/contests",
      "/admin/moderation",
      "/admin/rewards",
    ]);
  });

  it("marks legacy group as deprecated", () => {
    const legacy = ADMIN_NAV_GROUPS.find((group) => group.id === "legacy");
    expect(legacy?.deprecated).toBe(true);
    expect(legacy?.items.every((item) => item.href.includes("legacy"))).toBe(true);
  });

  it("computes active routes consistently", () => {
    expect(isNavItemActive("/admin", "/admin")).toBe(true);
    expect(isNavItemActive("/admin/contests/create", "/admin/contests")).toBe(true);
    expect(isNavItemActive("/admin/rewards", "/admin/contests")).toBe(false);
  });
});
