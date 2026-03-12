"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/contests", label: "Contests" },
  { href: "/admin/campaigns", label: "Campaigns & Quests" },
  { href: "/admin/moderation", label: "Moderation" },
  { href: "/admin/rewards", label: "Rewards & Compensation" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/activity-log", label: "Activity Log" },
] as const;

export function AdminShell({ children, username }: { children: ReactNode; username: string }) {
  const pathname = usePathname();

  return (
    <div style={{ minHeight: "100vh", background: "#0b1020", color: "#e5e7eb" }}>
      <header style={{ borderBottom: "1px solid #243042", padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700 }}>MCG Admin</p>
          <p style={{ margin: 0, opacity: 0.8, fontSize: "0.9rem" }}>Operations back-office</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.9rem", opacity: 0.9 }}>Signed in as <strong>{username}</strong></span>
          <AdminLogoutButton />
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "calc(100vh - 70px)" }}>
        <aside style={{ borderRight: "1px solid #243042", padding: "1rem", display: "grid", gap: "0.35rem", alignContent: "start" }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  textDecoration: "none",
                  color: active ? "#111827" : "#d1d5db",
                  background: active ? "#a7f3d0" : "transparent",
                  border: active ? "1px solid #6ee7b7" : "1px solid transparent",
                  borderRadius: "0.5rem",
                  padding: "0.55rem 0.65rem",
                  fontSize: "0.92rem",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </aside>

        <main style={{ padding: "1rem" }}>{children}</main>
      </div>
    </div>
  );
}
