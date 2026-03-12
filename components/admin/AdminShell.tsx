"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", hint: "Ops cockpit" },
  { href: "/admin/contests", label: "Contests", hint: "Lifecycle & runs" },
  { href: "/admin/campaigns", label: "Campaigns & Quests", hint: "Catalog + builder" },
  { href: "/admin/moderation", label: "Moderation", hint: "Queue & review" },
  { href: "/admin/rewards", label: "Rewards", hint: "Compensation ops" },
  { href: "/admin/users", label: "Users", hint: "Context lookup" },
  { href: "/admin/analytics", label: "Analytics", hint: "Operational metrics" },
  { href: "/admin/activity-log", label: "Activity Log", hint: "Audit timeline" },
] as const;

export function AdminShell({ children, username }: { children: ReactNode; username: string }) {
  const pathname = usePathname();

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-brand">
          <span className="admin-brand-badge">MCG</span>
          <div>
            <p className="admin-brand-title">Admin Control Center</p>
            <p className="admin-brand-subtitle">Operations workbench</p>
          </div>
        </div>

        <div className="admin-identity">
          <span className="admin-chip">Signed in as <strong>{username}</strong></span>
          <AdminLogoutButton />
        </div>
      </header>

      <div className="admin-layout-grid">
        <aside className="admin-sidebar">
          <p className="admin-sidebar-label">Modules</p>
          <nav className="admin-nav-list">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} className={`admin-nav-item ${active ? "is-active" : ""}`}>
                  <span className="admin-nav-label">{item.label}</span>
                  <span className="admin-nav-hint">{item.hint}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
