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
    label: "Run Operations",
    items: [
      { href: "/admin", label: "Dashboard", hint: "Priority queues & incidents", critical: true },
      { href: "/admin/contests", label: "Contests", hint: "Run lifecycle, scoring, settlement", critical: true },
      { href: "/admin/moderation", label: "Moderation", hint: "Review queue & decisions", critical: true },
      { href: "/admin/rewards", label: "Rewards", hint: "Compensations & grants", critical: true },
    ],
  },
  {
    id: "build",
    label: "Setup & Catalog",
    items: [
      { href: "/admin/campaigns", label: "Campaigns", hint: "Campaign and quest catalog" },
      { href: "/admin/quests", label: "Quest Library", hint: "Quest definitions and builder" },
      { href: "/admin/users", label: "Users", hint: "User context lookup" },
    ],
  },
  {
    id: "governance",
    label: "Audit & Governance",
    items: [
      { href: "/admin/activity-log", label: "Activity Log", hint: "Trace actions and failures" },
      { href: "/admin/analytics", label: "Analytics", hint: "Baseline operational metrics" },
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
