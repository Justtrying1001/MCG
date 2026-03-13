export type AdminNavItem = {
  href: string;
  label: string;
  hint: string;
  critical?: boolean;
};

export type AdminNavGroup = {
  id: "operations" | "build" | "governance" | "support" | "legacy";
  label: string;
  items: AdminNavItem[];
  deprecated?: boolean;
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "operations",
    label: "Core",
    items: [
      { href: "/admin", label: "Dashboard", hint: "Operational overview", critical: true },
      { href: "/admin/contests", label: "Contests", hint: "Lifecycle, scoring, settlement", critical: true },
      { href: "/admin/moderation", label: "Moderation", hint: "Review queue and decisions", critical: true },
      { href: "/admin/rewards", label: "Rewards", hint: "Compensations and grants", critical: true },
    ],
  },
  {
    id: "build",
    label: "Build",
    items: [
      { href: "/admin/quests", label: "Quests", hint: "Social quest definitions" },
      { href: "/admin/milestones", label: "Milestones", hint: "Milestone definitions and rewards" },
      { href: "/admin/users", label: "Users", hint: "User context and activity" },
    ],
  },
  {
    id: "governance",
    label: "Audit",
    items: [
      { href: "/admin/activity-log", label: "Activity Log", hint: "Trace operations and failures" },
    ],
  },
  {
    id: "legacy",
    label: "Legacy (Deprecated)",
    deprecated: true,
    items: [
      { href: "/admin/contests/legacy", label: "Legacy contests", hint: "Old create/run screens" },
      { href: "/admin/quests/legacy", label: "Legacy quests", hint: "Old quest management" },
    ],
  },
];

export function isNavItemActive(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(href));
}
