"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/components/useSession";
import { useState } from "react";

const navItems = [
  { href: "/",          label: "Home",       icon: "⬡" },
  { href: "/packs",     label: "Packs",      icon: "◈" },
  { href: "/collection",label: "Collection", icon: "▦" },
  { href: "/contests",  label: "Contests",   icon: "🏆" },
  { href: "/rewards",   label: "Rewards",    icon: "✦" },
  { href: "/compte",    label: "Profile",    icon: "◎" },
];

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { me, loading, refresh, setMe, startGuest, clearGuest } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const loginWithX = () => {
    window.location.href = "/api/auth/x/start";
  };

  const startAsGuest = () => {
    startGuest();
    closeMenu();
  };

  const logout = async () => {
    if (me?.mode === "guest") {
      clearGuest();
      closeMenu();
      return;
    }

    await fetch("/api/auth/logout", { method: "POST" });
    clearGuest();
    setMe(null);
    closeMenu();
    await refresh();
  };

  return (
    <>
      <div className="noise-layer" />

      <nav className="topnav">
        <Link href="/" className="nav-logo" onClick={closeMenu}>
          <div className="nav-logo-badge">MCG</div>
          <div>
            <span className="nav-logo-name">Meme Card Game</span>
            <span className="nav-logo-tagline">Collect · Compete · Dominate</span>
          </div>
        </Link>

        <div className="nav-links">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link${pathname === item.href ? " active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="nav-auth">
          {loading ? (
            <span style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>Loading…</span>
          ) : me ? (
            <>
              <div className="player-pill">
                <span>{me.user.displayName}</span>
                <span className="xp-badge">{me.user.points} XP</span>
              </div>
              <Button variant="ghost" className="btn-sm" onClick={logout}>
                {me.mode === "guest" ? "Exit Guest" : "Logout"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="btn-sm" onClick={loginWithX}>
                Continue with X
              </Button>
              <Button className="btn-sm" onClick={startAsGuest}>
                Continue as Guest
              </Button>
            </>
          )}
        </div>

        <button
          className="mobile-menu-btn"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <span className={`hamburger${menuOpen ? " open" : ""}`} />
        </button>
      </nav>

      {menuOpen && (
        <div className="mobile-nav-overlay" onClick={closeMenu} role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="mobile-nav-drawer" onClick={(e) => e.stopPropagation()}>
            <nav className="mobile-nav-links">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mobile-nav-link${pathname === item.href ? " active" : ""}`}
                  onClick={closeMenu}
                >
                  <span className="mobile-nav-icon">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mobile-nav-auth">
              {loading ? (
                <span style={{ fontSize: "0.85rem", color: "var(--text-3)" }}>Loading…</span>
              ) : me ? (
                <div className="mobile-auth-logged">
                  <div className="player-pill mobile-player-pill">
                    <span>{me.user.displayName}</span>
                    <span className="xp-badge">{me.user.points} XP</span>
                  </div>
                  <Button variant="ghost" onClick={logout} style={{ width: "100%" }}>
                    {me.mode === "guest" ? "Exit Guest" : "Logout"}
                  </Button>
                </div>
              ) : (
                <div className="mobile-auth-buttons" style={{ display: "grid", gap: "0.6rem" }}>
                  <Button variant="ghost" onClick={loginWithX}>Continue with X</Button>
                  <Button onClick={startAsGuest}>Continue as Guest</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="app-root">
        <main className="page-content">{children}</main>

        <footer className="site-footer">
          <div className="footer-brand">
            <div style={{
              width: 22, height: 22, borderRadius: 4, display: "grid", placeItems: "center",
              background: "var(--red)",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "0.52rem", fontWeight: 900, letterSpacing: "0.06em", color: "var(--text)"
            }}>
              MCG
            </div>
            Meme Card Game
          </div>
          <span>© 2025 MCG · Premium Collectible TCG · <Link href="/admin" className="contest-inline-note">Internal admin</Link></span>
        </footer>
      </div>
    </>
  );
}
