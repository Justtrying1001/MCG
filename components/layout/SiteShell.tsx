"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { usePrivyLogin } from "@/components/auth/usePrivyLogin";
import { useSession } from "@/components/useSession";
import { Footer } from "@/components/layout/Footer";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/packs", label: "Packs" },
  { href: "/collection", label: "Memedex" },
  { href: "/contests", label: "Battles" },
  { href: "/rewards", label: "Quests" },
  { href: "/compte", label: "Profile" },
];

const HANDLE_ONBOARDING_PATH = "/onboarding/profile";

function AppBackground() {
  return (
    <div className="mcg-app-background" aria-hidden="true">
      <div className="mcg-app-background__gradient" />
      <div className="mcg-app-background__blob mcg-app-background__blob--violet" />
      <div className="mcg-app-background__blob mcg-app-background__blob--cyan" />
      <div className="mcg-app-background__blob mcg-app-background__blob--sun" />
      <div className="mcg-app-background__noise" />
    </div>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { me, loading } = useSession();
  const {
    isStartingLogin,
    isSyncingSession,
    loginWithPrivy,
    logoutFromApp,
    ready,
  } = usePrivyLogin();
  const [openMobile, setOpenMobile] = useState(false);
  const showGlobalBackground = !pathname.startsWith("/admin");

  useEffect(() => {
    if (!me) return;
    if (me.onboarding.needsHandle && pathname !== HANDLE_ONBOARDING_PATH) {
      router.replace(HANDLE_ONBOARDING_PATH);
      return;
    }
    if (!me.onboarding.needsHandle && pathname === HANDLE_ONBOARDING_PATH) {
      router.replace("/compte");
    }
  }, [me, pathname, router]);

  return (
    <div className={`mcg-app${showGlobalBackground ? " mcg-app--user" : ""}`}>
      {showGlobalBackground ? <AppBackground /> : null}

      <header className="mcg-topnav">
        <div className="mcg-container mcg-topnav-inner">
          <Link
            href="/"
            className="mcg-brand"
            onClick={() => setOpenMobile(false)}
          >
            <span className="mcg-brand-mark">MCG</span>
            <span>
              <strong className="mcg-brand-name">Meme Card Game</strong>
              <span className="mcg-brand-sub">Collect • Compete • Repeat</span>
            </span>
          </Link>

          <nav className="mcg-nav-links" aria-label="Main navigation">
            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mcg-nav-link${active ? " active" : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mcg-auth">
            {loading || isSyncingSession ? (
              <span className="mcg-eyebrow">Loading…</span>
            ) : me ? (
              <>
                <span className="mcg-user-pill">
                  <strong>{me.user.displayName}</strong>
                  <span>{me.user.points} pts</span>
                </span>
                <Button
                  variant="ghost"
                  className="btn-sm"
                  onClick={() => void logoutFromApp()}
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                className="btn-sm"
                disabled={!ready || isStartingLogin}
                onClick={() => void loginWithPrivy()}
              >
                Connect wallet / X
              </Button>
            )}

            <Button
              variant="gold"
              className="btn-sm mcg-mobile-menu-btn"
              onClick={() => setOpenMobile((v) => !v)}
            >
              {openMobile ? "Close" : "Menu"}
            </Button>
          </div>
        </div>

        {openMobile ? (
          <div
            className="mcg-mobile-drawer mcg-container"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
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

      <Footer />
    </div>
  );
}
