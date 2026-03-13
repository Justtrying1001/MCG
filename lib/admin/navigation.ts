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
    label: "Main",
    items: [
      { href: "/admin", label: "Dashboard", hint: "Simple operational overview" },
      { href: "/admin/contests", label: "Contests", hint: "Create, run and settle contests" },
      { href: "/admin/quests", label: "Quests", hint: "Social quests management" },
      { href: "/admin/milestones", label: "Milestones", hint: "Milestones management" },
      { href: "/admin/users", label: "Users", hint: "User activity and context" },
    ],
  },
];

export function isNavItemActive(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(href));
}
