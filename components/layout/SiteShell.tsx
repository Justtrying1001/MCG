"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/components/useSession";
import { useState } from "react";

/* ── SVG Icons ── */
const HomeIcon = () => (
  <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
  </svg>
);
const PackIcon = () => (
  <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
    <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
  </svg>
);
const CollectionIcon = () => (
  <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
  </svg>
);
const ContestIcon = () => (
  <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 3.323V3a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
);
const RewardsIcon = () => (
  <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
  </svg>
);
const ProfileIcon = () => (
  <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);

const navItems = [
  { href: "/",           label: "Home",       Icon: HomeIcon },
  { href: "/packs",      label: "Packs",      Icon: PackIcon },
  { href: "/collection", label: "Collection", Icon: CollectionIcon },
  { href: "/contests",   label: "Contests",   Icon: ContestIcon },
  { href: "/rewards",    label: "Rewards",    Icon: RewardsIcon },
  { href: "/compte",     label: "Profile",    Icon: ProfileIcon },
];

/* ── Mobile icon map ── */
const mobileIcons: Record<string, string> = {
  "/": "⬡", "/packs": "◈", "/collection": "▦",
  "/contests": "🏆", "/rewards": "✦", "/compte": "◎",
};

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { me, loading, refresh, setMe, startGuest, clearGuest } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);
  const loginWithX = () => { window.location.href = "/api/auth/x/start"; };
  const startAsGuest = () => { startGuest(); closeMenu(); };

  const logout = async () => {
    if (me?.mode === "guest") { clearGuest(); closeMenu(); return; }
    await fetch("/api/auth/logout", { method: "POST" });
    clearGuest(); setMe(null); closeMenu();
    await refresh();
  };

  return (
    <>
      <div className="noise-layer" />

      {/* ── Top Navigation ── */}
      <nav className="topnav">
        <Link href="/" className="nav-logo" onClick={closeMenu}>
          <div className="nav-logo-badge">MCG</div>
          <div>
            <span className="nav-logo-name">Meme Card Game</span>
            <span className="nav-logo-tagline">Collect · Compete · Dominate</span>
          </div>
        </Link>

        <div className="nav-links">
          {navItems.map(({ href, label, Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={`nav-link${active ? " active" : ""}`}>
                <Icon />
                {label}
              </Link>
            );
          })}
        </div>

        <div className="nav-auth">
          {loading ? (
            <span style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>Loading…</span>
          ) : me ? (
            <>
              <div className="player-pill">
                <span
                  style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: "var(--red)", display: "grid", placeItems: "center",
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900,
                    fontSize: "0.68rem", color: "var(--text)", flexShrink: 0,
                  }}
                >
                  {me.user.displayName.slice(0, 1).toUpperCase()}
                </span>
                <span style={{ fontWeight: 700, fontSize: "0.84rem" }}>{me.user.displayName}</span>
                <span className="xp-badge">{me.user.points} XP</span>
              </div>
              <Button variant="ghost" className="btn-sm" onClick={logout}>
                {me.mode === "guest" ? "Exit Guest" : "Logout"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="btn-sm" onClick={loginWithX}>
                Connect with X
              </Button>
              <Button className="btn-sm" onClick={startAsGuest}>
                Play as Guest
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

      {/* ── Mobile Drawer ── */}
      {menuOpen && (
        <div
          className="mobile-nav-overlay"
          onClick={closeMenu}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="mobile-nav-drawer" onClick={(e) => e.stopPropagation()}>
            <nav className="mobile-nav-links">
              {navItems.map(({ href, label }) => {
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`mobile-nav-link${active ? " active" : ""}`}
                    onClick={closeMenu}
                  >
                    <span className="mobile-nav-icon">{mobileIcons[href]}</span>
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="mobile-nav-auth">
              {loading ? (
                <span style={{ fontSize: "0.85rem", color: "var(--text-3)" }}>Loading…</span>
              ) : me ? (
                <div className="mobile-auth-logged">
                  <div className="player-pill mobile-player-pill">
                    <span
                      style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: "var(--red)", display: "grid", placeItems: "center",
                        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900,
                        fontSize: "0.68rem", color: "var(--text)", flexShrink: 0,
                      }}
                    >
                      {me.user.displayName.slice(0, 1).toUpperCase()}
                    </span>
                    <span>{me.user.displayName}</span>
                    <span className="xp-badge">{me.user.points} XP</span>
                  </div>
                  <Button variant="ghost" onClick={logout} style={{ width: "100%" }}>
                    {me.mode === "guest" ? "Exit Guest" : "Logout"}
                  </Button>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "0.6rem" }}>
                  <Button variant="ghost" onClick={loginWithX}>Connect with X</Button>
                  <Button onClick={startAsGuest}>Play as Guest</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Page Body ── */}
      <div className="app-root">
        <main className="page-content">{children}</main>

        <footer className="site-footer">
          <div className="footer-brand">
            <div style={{
              width: 22, height: 22, borderRadius: 4, display: "grid", placeItems: "center",
              background: "var(--red)", fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "0.52rem", fontWeight: 900, letterSpacing: "0.06em", color: "var(--text)",
            }}>
              MCG
            </div>
            Meme Card Game
          </div>
          <span>
            © 2025 MCG · Premium Collectible TCG ·{" "}
            <Link href="/admin" className="contest-inline-note">Internal admin</Link>
          </span>
        </footer>
      </div>
    </>
  );
}
