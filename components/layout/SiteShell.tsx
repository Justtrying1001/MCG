"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { PASSWORD_MIN_LENGTH, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "@/lib/auth-validation";
import { useSession } from "@/components/useSession";
import { useState } from "react";

const navItems = [
  { href: "/",          label: "Home",       icon: "⬡" },
  { href: "/packs",     label: "Packs",      icon: "◈" },
  { href: "/collection",label: "Collection", icon: "▦" },
  { href: "/combats",   label: "Battle",     icon: "⚔" },
  { href: "/compte",    label: "Profile",    icon: "◎" },
];

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { me, loading, refresh, setMe } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const doAuth = async (path: "/api/auth/register" | "/api/auth/login") => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const txt = await res.text();
      alert(txt || "Authentication failed");
      return;
    }

    setPassword("");
    await refresh();
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
  };

  return (
    <>
      <div className="noise-layer" />

      {/* ── Top navigation ── */}
      <nav className="topnav">
        <Link href="/" className="nav-logo">
          <div className="nav-logo-badge">MCG</div>
          <div>
            <span className="nav-logo-name">Meme Card Game</span>
            <span className="nav-logo-tagline">Collect · Battle · Dominate</span>
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
                <span>{me.user.username}</span>
                <span className="xp-badge">{me.user.points} XP</span>
              </div>
              <Button variant="ghost" className="btn-sm" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <input
                className="nav-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={`Username ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH}`}
              />
              <input
                className="nav-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`Password (min ${PASSWORD_MIN_LENGTH})`}
              />
              <Button variant="ghost" className="btn-sm" onClick={() => void doAuth("/api/auth/login")}>
                Login
              </Button>
              <Button className="btn-sm" onClick={() => void doAuth("/api/auth/register")}>
                Sign up
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* ── App body ── */}
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
          <span>© 2025 MCG · Premium Collectible TCG</span>
        </footer>
      </div>
    </>
  );
}
