export type AdminNavItem = {
  href: string;
  label: string;
  hint: string;
  critical?: boolean;
};

export type AdminNavGroup = {
  id: "overview" | "operations" | "governance" | "insights";
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", hint: "Health, workload, and quick actions" },
      { href: "/admin/activity-log", label: "Activity log", hint: "Who did what and when" },
      { href: "/admin/analytics", label: "Analytics", hint: "Operational trends" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      { href: "/admin/contests", label: "Contest library", hint: "Create, edit and publish contests" },
      { href: "/admin/contests/operations", label: "Contest operations", hint: "Lifecycle, scoring, settlement diagnostics" },
      { href: "/admin/moderation", label: "Moderation", hint: "Queue review and decisions", critical: true },
      { href: "/admin/rewards", label: "Rewards", hint: "Manual compensation and grants", critical: true },
      { href: "/admin/supply", label: "Supply", hint: "Sale/reward pack distribution and remaining" },
      { href: "/admin/quests", label: "Quests", hint: "Quest catalog and builder" },
      { href: "/admin/milestones", label: "Milestones", hint: "Milestone progression management" },
    ],
  },
  {
    id: "governance",
    label: "Users",
    items: [
      { href: "/admin/users", label: "User context", hint: "Search and user-level diagnostics" },
      { href: "/admin/campaigns", label: "Campaigns", hint: "Catalog and dependencies" },
    ],
  },
];

export function isNavItemActive(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(href));
}
