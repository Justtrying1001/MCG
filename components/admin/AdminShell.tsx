"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { AdminStatusBadge } from "@/components/admin/AdminUi";
import { ADMIN_NAV_GROUPS, isNavItemActive } from "@/lib/admin/navigation";

export function AdminShell({ children, username }: { children: ReactNode; username: string }) {
  const pathname = usePathname();

  return (
    <div className="admin-v2-shell">
      <header className="admin-v2-topbar">
        <div className="admin-v2-brand">
          <span className="admin-v2-brand-badge">MCG</span>
          <div>
            <p className="admin-v2-brand-title">Operator Console</p>
            <p className="admin-v2-brand-subtitle">Operate · Review · Execute safely</p>
          </div>
        </div>

        <div className="admin-v2-identity">
          <span className="admin-v2-chip">Signed in as <strong>{username}</strong></span>
          <AdminLogoutButton />
        </div>
      </header>

      <div className="admin-v2-layout">
        <aside className="admin-v2-sidebar">
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.id} className="admin-v2-nav-group">
              <p className="admin-v2-nav-group-label">{group.label}</p>
              <nav className="admin-v2-nav-list">
                {group.items.map((item) => {
                  const active = isNavItemActive(pathname, item.href);
                  return (
                    <Link key={item.href} href={item.href} className={`admin-v2-nav-item ${active ? "is-active" : ""}`}>
                      <div className="admin-v2-nav-row">
                        <span className="admin-v2-nav-label">{item.label}</span>
                        {item.critical ? <AdminStatusBadge tone="warn" label="critical" /> : null}
                      </div>
                      <span className="admin-v2-nav-hint">{item.hint}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </aside>

        <main className="admin-v2-content">{children}</main>
      </div>
    </div>
  );
}
