import { describe, expect, it } from "vitest";

import { ADMIN_NAV_GROUPS, isNavItemActive } from "@/lib/admin/navigation";

describe("admin navigation", () => {
  it("organizes admin navigation into operational groups", () => {
    expect(ADMIN_NAV_GROUPS.map((group) => group.id)).toEqual(["overview", "operations", "governance"]);

    const operations = ADMIN_NAV_GROUPS.find((group) => group.id === "operations");
    expect(operations?.items.map((item) => item.href)).toEqual([
      "/admin/contests",
      "/admin/supply",
      "/admin/moderation",
      "/admin/rewards",
      "/admin/quests",
      "/admin/milestones",
    ]);
  });

  it("keeps critical workflows marked in nav", () => {
    const critical = ADMIN_NAV_GROUPS.flatMap((group) => group.items).filter((item) => item.critical).map((item) => item.href);
    expect(critical).toEqual(["/admin/moderation", "/admin/rewards", "/admin/maintenance/reset-users"]);
  });

  it("computes active routes consistently", () => {
    expect(isNavItemActive("/admin", "/admin")).toBe(true);
    expect(isNavItemActive("/admin/contests/create", "/admin/contests")).toBe(true);
    expect(isNavItemActive("/admin/rewards", "/admin/contests")).toBe(false);
  });
});
