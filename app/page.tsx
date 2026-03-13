"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { AuthErrorNotice } from "@/components/auth/AuthErrorNotice";
import { useSession } from "@/components/useSession";

type ContestListItem = {
  id: string;
  code: string;
  title: string;
  status: "DRAFT" | "OPEN" | "LOCKED" | "LIVE" | "SETTLED" | "CANCELED";
  startsAt: string | null;
  lockAt: string | null;
  endsAt: string | null;
  _count: { entries: number };
};

function contestCardClass(s: ContestListItem["status"]) {
  if (s === "LIVE")   return "contest-strip-card c-live";
  if (s === "OPEN")   return "contest-strip-card c-open";
  if (s === "LOCKED") return "contest-strip-card c-locked";
  return "contest-strip-card c-settled";
}
function statusLabel(s: ContestListItem["status"]) {
  return { LIVE: "Live", OPEN: "Open", LOCKED: "Locked", SETTLED: "Settled", DRAFT: "Draft", CANCELED: "Canceled" }[s] ?? s;
}
function statusCls(s: ContestListItem["status"]) {
  if (s === "LIVE" || s === "OPEN") return "contest-status status-open";
  if (s === "LOCKED") return "contest-status status-locked";
  return "contest-status status-settled";
}

/* Static ticker entries to simulate live activity */
const TICKER_ITEMS = [
  { rarity: "legendary", label: "Genesis Pepe · Legendary pulled" },
  { rarity: "epic",      label: "Bull Matrix · Epic revealed" },
  { rarity: "rare",      label: "Signal Drop · Rare opened" },
  { rarity: "legendary", label: "Moon Cat · Legendary drop" },
  { rarity: "uncommon",  label: "Pack #1847 opened" },
  { rarity: "rare",      label: "Diamond Ape · Rare pulled" },
  { rarity: "epic",      label: "Turbo Doge · Epic hit" },
  { rarity: "legendary", label: "Satoshi Chad · Legendary" },
  { rarity: "uncommon",  label: "Pack #2031 opened" },
  { rarity: "rare",      label: "Rocket Frog · Rare revealed" },
];

export default function HomePage() {
  const { me, loading } = useSession();
  const [contests, setContests] = useState<ContestListItem[]>([]);

  const isAuth = !loading && me?.mode === "user";

  useEffect(() => {
    if (!isAuth) return;
    fetch("/api/contests", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((p) => { if (p?.contests) setContests(p.contests.filter((c: ContestListItem) => ["OPEN","LIVE","LOCKED"].includes(c.status)).slice(0, 3)); })
      .catch(() => {});
  }, [isAuth]);

  const v2      = me?.mode === "user" ? me.coexistence?.v2 : undefined;
  const account = v2?.accountProgression;

  /* Double ticker items so the loop is seamless */
  const tickerItems = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <SiteShell>
      <Suspense fallback={null}>
        <AuthErrorNotice />
      </Suspense>

      <div className="hub-page">

        {/* ═══ HERO ═══ */}
        <section className="hero-wrap" style={{ position: "relative", overflow: "hidden" }}>
          <div className="hero-aurora" />
          <div className="hero-bg-glow" />
          <div className="hero-grid-lines" />

          <div className="hero-body">
            <p className="eyebrow">Premium Dark-Modern TCG</p>
            <h1 className="hero-title">
              Own the rarest.<br />
              <span className="accent">Chase the drop.</span><br />
              Dominate.
            </h1>
            <p className="hero-desc">
              MCG is a premium collectible card game where every pull carries weight.
              Open sealed boosters, build high-synergy rosters, and compete
              for the rarest cards in the set.
            </p>

            <div className="cta-row">
              <Link href="/packs"      className="btn btn-primary btn-lg" style={{ boxShadow: "0 8px 32px rgba(214,58,50,0.40)" }}>
                Open a Pack
              </Link>
              <Link href="/collection" className="btn btn-ghost btn-lg">
                My Collection
              </Link>
            </div>

            <div className="hero-pills">
              <span className="hero-pill">5-tier rarity system</span>
              <span className="hero-pill">Sealed pack ritual</span>
              <span className="hero-pill">Competitive contests</span>
              <span className="hero-pill">Quest rewards</span>
            </div>
          </div>

          <div className="hero-cards-wrap">
            <div className="hero-card hero-card-1">
              <span className="hero-card-name">Genesis Pepe</span>
              <span className="hero-card-rarity" style={{ color: "var(--rarity-legendary)" }}>Legendary · S01</span>
              <div className="hero-card-art">🐸</div>
            </div>
            <div className="hero-card hero-card-2">
              <span className="hero-card-name">Bull Matrix</span>
              <span className="hero-card-rarity" style={{ color: "var(--rarity-epic)" }}>Epic · S01</span>
              <div className="hero-card-art">🐂</div>
            </div>
            <div className="hero-card hero-card-3">
              <span className="hero-card-name">Signal Drop</span>
              <span className="hero-card-rarity" style={{ color: "var(--rarity-rare)" }}>Rare · S01</span>
              <div className="hero-card-art">◈</div>
            </div>
          </div>
        </section>

        {/* ═══ LIVE TICKER ═══ */}
        <div className="ticker-wrap">
          <div className="ticker-inner" aria-hidden="true">
            {tickerItems.map((item, i) => (
              <span key={i} className="ticker-item">
                <span className={`ticker-item-dot rarity-${item.rarity}`} />
                {item.label}
                <span style={{ color: "var(--border-hi)", margin: "0 0.5rem" }}>·</span>
              </span>
            ))}
          </div>
        </div>

        {/* ═══ PLAYER PROGRESS (authenticated) ═══ */}
        {isAuth && me && (
          <div className="player-progress-strip fade-in-up">
            <div className="pps-avatar">{me.user.displayName.slice(0, 1).toUpperCase()}</div>
            <div className="pps-info">
              <div className="pps-name">Welcome back, {me.user.displayName}</div>
              <div className="pps-level">
                {account ? `Level ${account.level} · ${account.xp} XP total` : "Progression loading…"}
              </div>
              {account && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginTop: "0.12rem" }}>
                  <div style={{
                    flex: 1, maxWidth: 220, height: 5, borderRadius: 999,
                    background: "rgba(255,255,255,0.06)", overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 999,
                      background: "linear-gradient(90deg, var(--gold), rgba(200,155,60,0.65))",
                      boxShadow: "0 0 6px rgba(200,155,60,0.35)",
                      width: `${Math.round(((account.xp - account.levelXpFloor) / Math.max(account.levelXpCeil - account.levelXpFloor, 1)) * 100)}%`,
                      transition: "width 600ms cubic-bezier(0.22,1,0.36,1)",
                    }} />
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-3)", whiteSpace: "nowrap" }}>
                    {account.levelXpCeil - account.xp} XP to Lv {account.level + 1}
                  </span>
                </div>
              )}
            </div>
            <div className="pps-right">
              <div className="pps-points-value">{me.user.points.toLocaleString()}</div>
              <div className="pps-points-label">Points</div>
            </div>
          </div>
        )}

        {/* ═══ ACTIVE CONTESTS (authenticated) ═══ */}
        {isAuth && (
          <section className="hub-section">
            <div className="hub-section-head">
              <div>
                <div className="hub-section-label">Live competition</div>
                <div style={{
                  fontSize: "1.15rem", fontWeight: 800,
                  letterSpacing: "-0.02em", marginTop: "0.2rem",
                }}>
                  Active Contests
                </div>
              </div>
              <Link href="/contests" className="hub-see-all">View all →</Link>
            </div>

            {contests.length > 0 ? (
              <div className="contest-strip">
                {contests.map((contest) => (
                  <Link
                    key={contest.id}
                    href={`/contests/${contest.id}`}
                    className={contestCardClass(contest.status)}
                  >
                    <div className="c-top-bar" />
                    <div className="c-strip-top">
                      {contest.status === "LIVE" && <div className="c-live-dot" />}
                      <span className={statusCls(contest.status)} style={{ marginLeft: "auto" }}>
                        {statusLabel(contest.status)}
                      </span>
                    </div>
                    <div className="c-strip-name">{contest.title}</div>
                    <div className="c-strip-meta">
                      <span className="c-meta-chip">
                        <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                        {contest._count.entries} entries
                      </span>
                      {contest.lockAt && (
                        <span className="c-meta-chip">
                          Locks {new Date(contest.lockAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                    {/* Entry count visual bar — max visual at 50 entries */}
                    <div className="c-entry-bar">
                      <div className="c-entry-fill" style={{ width: `${Math.min((contest._count.entries / 50) * 100, 100)}%` }} />
                    </div>
                    <div className="c-strip-footer">
                      <span style={{ fontSize: "0.72rem", color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}>
                        {contest.code}
                      </span>
                      <span className="c-strip-cta">Enter →</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state-premium">
                <div className="esp-icon">🏆</div>
                <p className="esp-title">No active contests right now</p>
                <p className="esp-desc">Check back soon for the next competition window.</p>
              </div>
            )}
          </section>
        )}

        {/* ═══ QUICK ACTIONS ═══ */}
        <section className="hub-section">
          <div className="hub-section-head">
            <div className="hub-section-label">Get started</div>
          </div>

          <div className="quick-action-grid">
            <Link href="/packs" className="quick-action-tile qa-red">
              <div className="qa-icon">
                <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                  <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="qa-title">Open Packs</div>
              <div className="qa-desc">Crack the seal. Five cards revealed one by one — every pull is permanent.</div>
              <span className="qa-arrow">→</span>
            </Link>

            <Link href="/collection" className="quick-action-tile qa-gold">
              <div className="qa-icon">
                <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
              </div>
              <div className="qa-title">My Collection</div>
              <div className="qa-desc">Browse your binder. Filter by rarity, edition, faction — click to zoom any card.</div>
              <span className="qa-arrow">→</span>
            </Link>

            <Link href="/contests" className="quick-action-tile qa-green">
              <div className="qa-icon">
                <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 3.323V3a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="qa-title">Competitions</div>
              <div className="qa-desc">Lock your lineup, track the leaderboard live, claim rewards after settlement.</div>
              <span className="qa-arrow">→</span>
            </Link>

            <Link href="/rewards" className="quick-action-tile qa-blue">
              <div className="qa-icon">
                <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="qa-title">Quests & Rewards</div>
              <div className="qa-desc">Complete social missions and collection milestones to earn points and special drops.</div>
              <span className="qa-arrow">→</span>
            </Link>
          </div>
        </section>

        {/* ═══ PACK TEASER BANNER ═══ */}
        <section className="pack-teaser-banner">
          <div className="pack-teaser-body">
            <div className="pack-teaser-label">Genesis Booster · Season 01</div>
            <h2 className="pack-teaser-title">
              5 cards.<br />
              One sealed ritual.
            </h2>
            <p className="pack-teaser-desc">
              Slot-weighted distribution with dynamic odds.
              3 standard slots · 1 premium edition slot · 1 hit slot.
              Every pack is a legitimate chance at Legendary.
            </p>
            <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap", marginTop: "0.2rem" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "0.35rem",
                padding: "0.25rem 0.65rem", borderRadius: 999,
                background: "rgba(216,166,62,0.10)", border: "1px solid rgba(216,166,62,0.22)",
                fontSize: "0.74rem", fontWeight: 700, color: "var(--rarity-legendary)",
              }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
                Legendary drop possible
              </span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "0.35rem",
                padding: "0.25rem 0.65rem", borderRadius: 999,
                background: "rgba(110,76,207,0.10)", border: "1px solid rgba(110,76,207,0.22)",
                fontSize: "0.74rem", fontWeight: 700, color: "var(--rarity-epic)",
              }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
                1 guaranteed hit slot
              </span>
            </div>
            <div className="pack-teaser-actions" style={{ marginTop: "0.8rem" }}>
              <Link href="/packs" className="btn btn-primary" style={{ boxShadow: "0 6px 24px rgba(214,58,50,0.32)" }}>
                Open a Pack
              </Link>
              <Link href="/collection" className="btn btn-ghost">Browse Collection</Link>
            </div>
          </div>

          <div className="pack-teaser-visual">
            <div className="pack-mock-card">
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 900, fontSize: "1.5rem", letterSpacing: "0.3em",
                textTransform: "uppercase", color: "var(--text)",
                textAlign: "center", position: "relative", zIndex: 1,
              }}>
                MCG
              </div>
              <div style={{
                fontSize: "0.48rem", letterSpacing: "0.2em", textTransform: "uppercase",
                color: "rgba(233,242,255,0.65)", textAlign: "center", position: "relative", zIndex: 1,
              }}>
                Genesis Booster
              </div>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                border: "1px solid rgba(200,155,60,0.28)",
                background: "radial-gradient(circle, rgba(200,155,60,0.14), transparent 72%)",
                position: "relative", zIndex: 1,
              }} />
              <div style={{
                fontSize: "0.42rem", letterSpacing: "0.14em", textTransform: "uppercase",
                color: "rgba(233,242,255,0.45)", textAlign: "center", position: "relative", zIndex: 1,
              }}>
                Contains 5 cards
              </div>
            </div>
          </div>
        </section>

        {/* ═══ FEATURE PANELS ═══ */}
        <div className="feature-grid">
          <article className="feature-panel">
            <div className="feature-panel-icon" style={{ background: "rgba(214,58,50,0.10)", color: "var(--red)" }}>◈</div>
            <h3>Crack the seal</h3>
            <p>
              Sealed booster ritual — five face-down cards, revealed one by one.
              Every flip is a moment. Every pull stays in your collection forever.
            </p>
          </article>
          <article className="feature-panel">
            <div className="feature-panel-icon" style={{ background: "rgba(200,155,60,0.10)", color: "var(--gold)" }}>▦</div>
            <h3>Build your binder</h3>
            <p>
              Six rarity tiers. Foil variants. Full-art chases.
              Every card is an object worth possessing — not just a stat block.
            </p>
          </article>
          <article className="feature-panel">
            <div className="feature-panel-icon" style={{ background: "rgba(31,122,92,0.10)", color: "var(--emerald)" }}>🏆</div>
            <h3>Enter contests</h3>
            <p>
              Build your lineup from owned cards, enter active contests,
              and climb settled leaderboards with measurable progression.
            </p>
          </article>
        </div>

      </div>
    </SiteShell>
  );
}
