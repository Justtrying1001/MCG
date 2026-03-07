"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { PASSWORD_MIN_LENGTH, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "@/lib/auth-validation";
import { useSession } from "@/components/useSession";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/packs", label: "Packs" },
  { href: "/collection", label: "Collection" },
  { href: "/combats", label: "PvE" },
  { href: "/compte", label: "Account" },
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
    <div className="site-bg">
      <div className="noise-layer" />
      <header className="site-header">
        <div className="logo-wrap">
          <div className="logo-badge">MCG</div>
          <div>
            <h1>Meme Card Game</h1>
            <p>Collect. Evolve. Dominate the memeverse.</p>
          </div>
        </div>

        <nav className="main-nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="account-chip">
          {loading ? (
            <span>Loading session...</span>
          ) : me ? (
            <>
              <span className="player-badge">{me.user.username} · {me.user.points} XP</span>
              <Button variant="ghost" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={`Username ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH}`}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`Password min ${PASSWORD_MIN_LENGTH}`}
              />
              <Button variant="ghost" onClick={() => void doAuth("/api/auth/login")}>
                Login
              </Button>
              <Button onClick={() => void doAuth("/api/auth/register")}>Create account</Button>
            </>
          )}
        </div>
      </header>

      <main className="page-shell">{children}</main>

      <footer className="site-footer">
        <span>© MCG · Neon Memeverse Protocol</span>
        <span>Packs · Collection · PvE · Shop (coming soon)</span>
      </footer>
    </div>
  );
}
