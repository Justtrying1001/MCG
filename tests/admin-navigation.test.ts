import { describe, expect, it } from "vitest";

import { ADMIN_NAV_GROUPS, isNavItemActive } from "@/lib/admin/navigation";

describe("admin navigation", () => {
  it("keeps only essential admin entries in the main group", () => {
    const operations = ADMIN_NAV_GROUPS.find((group) => group.id === "operations");
    expect(operations).toBeTruthy();
    expect(operations?.items.map((item) => item.href)).toEqual([
      "/admin",
      "/admin/contests",
      "/admin/quests",
      "/admin/milestones",
      "/admin/users",
    ]);
  });

  it("does not expose deprecated groups in compact navigation", () => {
    const legacy = ADMIN_NAV_GROUPS.find((group) => group.id === "legacy");
    expect(legacy).toBeUndefined();
  });

  it("computes active routes consistently", () => {
    expect(isNavItemActive("/admin", "/admin")).toBe(true);
    expect(isNavItemActive("/admin/contests/create", "/admin/contests")).toBe(true);
    expect(isNavItemActive("/admin/rewards", "/admin/contests")).toBe(false);
  });
});
