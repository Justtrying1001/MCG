"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { usePrivyLogin } from "@/components/auth/usePrivyLogin";
import { useSession } from "@/components/useSession";
import { Footer } from "@/components/layout/Footer";

type SiteShellMode = "app" | "landing";

const navItems = [
  { href: "/", label: "Home", icon: "◈" },
  { href: "/packs", label: "Packs", icon: "✦" },
  { href: "/collection", label: "Collection", icon: "◌" },
  { href: "/contests", label: "Contests", icon: "⚔" },
  { href: "/rewards", label: "Rewards", icon: "★" },
  { href: "/compte", label: "Profile", icon: "◎" },
];

export function SiteShell({ children, mode = "app" }: { children: ReactNode; mode?: SiteShellMode }) {
  const pathname = usePathname();
  const { me, loading } = useSession();
  const { isSyncingSession, loginWithPrivy, logoutFromApp } = usePrivyLogin();
  const [openMobile, setOpenMobile] = useState(false);
  const isLanding = mode === "landing";

  return (
    <div className={`mcg-app-shell ${isLanding ? "is-landing" : "is-app"}`}>
      <div className="mcg-app-shell-bg" aria-hidden="true" />
      {!isLanding ? <aside className="mcg-sidebar-glow" aria-hidden="true" /> : null}

      <header className={`mcg-topnav ${isLanding ? "mcg-topnav--landing" : "mcg-topnav--app"}`}>
        <div className="mcg-container mcg-topnav-inner">
          <Link href="/" className="mcg-brand" onClick={() => setOpenMobile(false)}>
            <span className="mcg-brand-mark">MCG</span>
            <span>
              <strong className="mcg-brand-name">Meme Card Game</strong>
              <span className="mcg-brand-sub">Collect • Compete • Repeat</span>
            </span>
          </Link>

          {isLanding ? (
            <nav className="mcg-nav-links mcg-nav-links--landing" aria-label="Landing navigation">
              <Link href="/collection" className="mcg-nav-link">Collection</Link>
              <Link href="/packs" className="mcg-nav-link">Packs</Link>
              <Link href="/contests" className="mcg-nav-link">Contests</Link>
              <a href="https://mcg-2.gitbook.io/mcg/" target="_blank" rel="noopener noreferrer" className="mcg-nav-link">
                Docs ↗
              </a>
            </nav>
          ) : null}

          <div className="mcg-auth">
            {loading || isSyncingSession ? (
              <span className="mcg-eyebrow">Loading…</span>
            ) : me ? (
              <>
                {!isLanding ? (
                  <span className="mcg-user-pill">
                    <span className="mcg-user-pill-orb" aria-hidden="true" />
                    <span>
                      <strong>{me.user.displayName}</strong>
                      <span>{me.user.points.toLocaleString()} pts</span>
                    </span>
                  </span>
                ) : null}
                <Button variant="ghost" className="btn-sm" onClick={() => void logoutFromApp()}>
                  Logout
                </Button>
              </>
            ) : (
              <Button variant={isLanding ? "primary" : "ghost"} className="btn-sm" onClick={() => loginWithPrivy()}>
                Connect with X
              </Button>
            )}

            {!isLanding ? (
              <Button variant="ghost" className="btn-sm mcg-mobile-menu-btn" onClick={() => setOpenMobile((v) => !v)}>
                Menu
              </Button>
            ) : null}
          </div>
        </div>

        {!isLanding && openMobile ? (
          <div className="mcg-mobile-drawer mcg-container" role="dialog" aria-modal="true" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`mcg-nav-link${pathname === item.href || pathname.startsWith(item.href + "/") ? " active" : ""}`}
                onClick={() => setOpenMobile(false)}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </header>

      {isLanding ? null : (
        <aside className="mcg-app-sidebar" aria-label="Primary navigation">
          <div className="mcg-app-sidebar-inner">
            <div className="mcg-app-sidebar-profile">
              <div className="mcg-app-sidebar-avatar" aria-hidden="true">◎</div>
              <div>
                <p className="mcg-eyebrow">Player hub</p>
                <strong>{me?.user.displayName ?? "Guest Mode"}</strong>
                <span>{me ? `${me.user.points.toLocaleString()} pts` : "Connect to sync progress"}</span>
              </div>
            </div>

            <nav className="mcg-app-sidebar-nav">
              {navItems.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} className={`mcg-side-link${active ? " active" : ""}`}>
                    <span className="mcg-side-link-icon" aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mcg-app-sidebar-card">
              <p className="mcg-eyebrow">Relic status</p>
              <strong>Genesis season is live</strong>
              <span>Open packs, track active contests, and keep building your collection.</span>
            </div>
          </div>
        </aside>
      )}

      <main className="mcg-main">
        <div className={`mcg-container mcg-page-flow${isLanding ? " mcg-page-flow--landing" : ""}`}>{children}</div>
      </main>

      <Footer />
    </div>
  );
}
