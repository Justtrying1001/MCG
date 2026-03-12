"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { ADMIN_NAV_GROUPS, isNavItemActive } from "@/lib/admin/navigation";

export function AdminShell({ children, username }: { children: ReactNode; username: string }) {
  const pathname = usePathname();

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-brand">
          <span className="admin-brand-badge">MCG</span>
          <div>
            <p className="admin-brand-title">Admin Control Center</p>
            <p className="admin-brand-subtitle">Operate · Configure · Audit</p>
          </div>
        </div>

        <div className="admin-identity">
          <span className="admin-chip">Signed in as <strong>{username}</strong></span>
          <AdminLogoutButton />
        </div>
      </header>

      <div className="admin-layout-grid">
        <aside className="admin-sidebar">
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.id} className="admin-nav-group">
              <p className="admin-sidebar-label" style={{ color: group.deprecated ? "#fca5a5" : undefined }}>
                {group.label}
              </p>
              <nav className="admin-nav-list">
                {group.items.map((item) => {
                  const active = isNavItemActive(pathname, item.href);
                  return (
                    <Link key={item.href} href={item.href} className={`admin-nav-item ${active ? "is-active" : ""} ${group.deprecated ? "is-legacy" : ""}`}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.35rem", alignItems: "center" }}>
                        <span className="admin-nav-label">{item.label}</span>
                        {item.critical ? <span className="admin-badge warn">critical</span> : null}
                        {group.deprecated ? <span className="admin-badge danger">legacy</span> : null}
                      </div>
                      <span className="admin-nav-hint">{item.hint}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </aside>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
