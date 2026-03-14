"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/components/useSession";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/packs", label: "Packs" },
  { href: "/collection", label: "Collection" },
  { href: "/contests", label: "Contests" },
  { href: "/rewards", label: "Rewards" },
  { href: "/compte", label: "Profile" },
];

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { me, loading, refresh, setMe, startGuest, clearGuest } = useSession();
  const [openMobile, setOpenMobile] = useState(false);

  const loginWithX = () => { window.location.href = "/api/auth/x/start"; };

  const logout = async () => {
    if (me?.mode === "guest") {
      clearGuest();
      return;
    }
    await fetch("/api/auth/logout", { method: "POST" });
    clearGuest();
    setMe(null);
    await refresh();
  };

  return (
    <div className="mcg-app">
      <header className="mcg-topnav">
        <div className="mcg-container mcg-topnav-inner">
          <Link href="/" className="mcg-brand" onClick={() => setOpenMobile(false)}>
            <span className="mcg-brand-mark">MCG</span>
            <span>
              <strong className="mcg-brand-name">Meme Card Game</strong>
              <span className="mcg-brand-sub">Collect • Compete • Repeat</span>
            </span>
          </Link>

          <nav className="mcg-nav-links" aria-label="Main navigation">
            {navItems.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className={`mcg-nav-link${active ? " active" : ""}`}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mcg-auth">
            {loading ? (
              <span className="mcg-eyebrow">Loading…</span>
            ) : me ? (
              <>
                <span className="mcg-user-pill">
                  <strong>{me.user.displayName}</strong>
                  <span>{me.user.points} pts</span>
                </span>
                <Button variant="ghost" className="btn-sm" onClick={() => void logout()}>
                  {me.mode === "guest" ? "Exit guest" : "Logout"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" className="btn-sm" onClick={loginWithX}>Connect with X</Button>
                <Button className="btn-sm" onClick={startGuest}>Guest</Button>
              </>
            )}

            <Button variant="ghost" className="btn-sm mcg-mobile-menu-btn" onClick={() => setOpenMobile((v) => !v)}>
              Menu
            </Button>
          </div>
        </div>

        {openMobile ? (
          <div className="mcg-mobile-drawer mcg-container" role="dialog" aria-modal="true" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`mcg-nav-link${pathname === item.href || pathname.startsWith(item.href + "/") ? " active" : ""}`}
                onClick={() => setOpenMobile(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ) : null}
      </header>

      <main className="mcg-main">
        <div className="mcg-container mcg-page-flow">{children}</div>
      </main>

      <footer className="mcg-footer">
        <div className="mcg-container mcg-footer-inner">
          <span>© 2026 MCG · Cards first collectible experience</span>
          <Link href="/admin" className="mcg-nav-link">Internal admin</Link>
        </div>
      </footer>
    </div>
  );
}
