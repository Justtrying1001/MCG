"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SiteShell } from "@/components/layout/SiteShell";
import { useSession } from "@/components/useSession";
import type { MvpCardView } from "@/types/cards";

// State A — landing
import { HomeHeroLanding } from "@/components/home/HomeHeroLanding";
import { HowItWorks } from "@/components/home/HowItWorks";
import { StatsBar } from "@/components/home/StatsBar";
import { DocsLearnSection } from "@/components/home/DocsLearnSection";

type ContestListItem = {
  id: string;
  code: string;
  title: string;
  status: "DRAFT" | "OPEN" | "LOCKED" | "LIVE" | "SETTLED" | "CANCELED";
  lockAt: string | null;
  seasonName?: string | null;
  rewardPreview?: {
    label: string;
    amount: number | null;
  } | null;
  userEntry?: {
    id: string;
    status: string;
  } | null;
  _count: { entries: number };
};

type HomeRecentPull = {
  id: string;
  openedAt: string;
  playerName: string;
  card: MvpCardView;
};

function formatRelativeTime(isoDate: string) {
  const parsed = new Date(isoDate).getTime();
  if (!Number.isFinite(parsed)) return "just now";

  const diffSeconds = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
  if (diffSeconds < 15) return "just now";
  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return `${Math.floor(diffHours / 24)}d ago`;
}

function getContestCtaLabel(status: ContestListItem["status"]) {
  if (status === "OPEN") return "Enter now";
  if (status === "LOCKED") return "View locked lineup";
  if (status === "LIVE") return "Watch battle";
  return "Open arena";
}

export default function HomePage() {
  const { me, loading } = useSession();
  const [contests, setContests] = useState<ContestListItem[]>([]);
  const [recentPulls, setRecentPulls] = useState<HomeRecentPull[]>([]);

  const isAuth = !loading && me?.mode === "user";

  useEffect(() => {
    if (!isAuth) {
      setContests([]);
      setRecentPulls([]);
      return;
    }

    fetch("/api/contests", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        const rows = (payload?.contests ?? []) as ContestListItem[];
        setContests(
          rows
            .filter((c) => ["OPEN", "LIVE", "LOCKED"].includes(c.status))
            .slice(0, 5),
        );
      })
      .catch(() => setContests([]));

    fetch("/api/pulls/recent?limit=12", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        const rows = (payload?.pulls ?? []) as HomeRecentPull[];
        setRecentPulls(rows);
      })
      .catch(() => setRecentPulls([]));
  }, [isAuth]);

  const userInfo = useMemo(() => {
    if (me?.mode !== "user") return null;

    const collectionProjection = me.coexistence?.v2?.collectionProjection;
    const accountProgression = me.coexistence?.v2?.accountProgression;
    const competitiveProgression = me.coexistence?.v2?.competitiveProgression;

    return {
      displayName: me.user.displayName,
      points: me.user.points,
      level: accountProgression?.level ?? null,
      xp: accountProgression?.xp ?? null,
      levelXpFloor: accountProgression?.levelXpFloor ?? null,
      levelXpCeil: accountProgression?.levelXpCeil ?? null,
      progressPct: accountProgression?.progressPct ?? null,
      completionPct: collectionProjection?.completionPct ?? null,
      ownedTemplates: collectionProjection?.ownedTemplateCount ?? null,
      missingTemplates: collectionProjection?.missingTemplateCount ?? null,
      activeEntries: competitiveProgression?.activeEntries ?? null,
      seasonRank: competitiveProgression?.seasonRank ?? null,
    };
  }, [me]);

  const battleContest = contests[0] ?? null;
  const collectionCount = userInfo?.ownedTemplates ?? 0;
  const collectionTotal =
    typeof userInfo?.ownedTemplates === "number" &&
    typeof userInfo?.missingTemplates === "number"
      ? userInfo.ownedTemplates + userInfo.missingTemplates
      : 0;
  const progressValue =
    typeof userInfo?.progressPct === "number"
      ? Math.round(userInfo.progressPct)
      : typeof userInfo?.levelXpFloor === "number" && typeof userInfo?.xp === "number"
        ? Math.max(0, userInfo.xp - userInfo.levelXpFloor)
        : 0;
  const progressMax =
    typeof userInfo?.levelXpCeil === "number" && typeof userInfo?.levelXpFloor === "number"
      ? Math.max(1, userInfo.levelXpCeil - userInfo.levelXpFloor)
      : 100;
  const playerInitial = userInfo?.displayName.slice(0, 1).toUpperCase() ?? "P";

  return (
    <SiteShell>
      {isAuth && userInfo ? (
        <div className="home-lobby-shell">
          <section className="home-lobby-player-strip mcg-surface raised" aria-label="Player overview">
            <div className="home-lobby-player-main">
              <div className="home-lobby-avatar" aria-hidden="true">{playerInitial}</div>
              <div className="home-lobby-player-copy">
                <p className="home-lobby-eyebrow">Player lobby</p>
                <div className="home-lobby-name-row">
                  <h1>{userInfo.displayName}</h1>
                  {typeof userInfo.seasonRank === "number" ? (
                    <span className="home-lobby-rank-pill">Rank #{userInfo.seasonRank}</span>
                  ) : null}
                </div>
                <div className="home-lobby-level-row">
                  <span className="home-lobby-level-pill">Level {userInfo.level ?? "—"}</span>
                  <div className="home-lobby-progress-block">
                    <ProgressBar value={progressValue} max={progressMax} label="XP progress" />
                    <span className="home-lobby-progress-caption">
                      {typeof userInfo.xp === "number" ? `${userInfo.xp.toLocaleString()} XP total` : "XP syncing"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="home-lobby-points-card" aria-label="Points balance">
              <span>Points</span>
              <strong>{userInfo.points.toLocaleString()}</strong>
            </div>
          </section>

          <section className="home-lobby-actions" aria-label="Main actions">
            <Link href={battleContest ? `/contests/${battleContest.id}` : "/contests"} className="home-lobby-card home-lobby-card--battle">
              <div className="home-lobby-card-head">
                <span className="home-lobby-card-kicker">Primary mode</span>
                {battleContest ? <span className="home-lobby-status-badge">{battleContest.status}</span> : null}
              </div>
              <div className="home-lobby-card-body">
                <h2>Battle Arena</h2>
                <p>
                  {battleContest
                    ? battleContest.title
                    : "Jump straight into active contests and the current arena rotation."}
                </p>
              </div>
              <div className="home-lobby-card-meta">
                <span>{contests.length} active battle{contests.length === 1 ? "" : "s"}</span>
                <span>
                  {typeof userInfo.activeEntries === "number"
                    ? `${userInfo.activeEntries} live entr${userInfo.activeEntries === 1 ? "y" : "ies"}`
                    : "Arena ready"}
                </span>
              </div>
              <div className="home-lobby-card-cta">{battleContest ? getContestCtaLabel(battleContest.status) : "Open arena"} →</div>
            </Link>

            <div className="home-lobby-side-actions">
              <Link href="/collection" className="home-lobby-card home-lobby-card--secondary">
                <div className="home-lobby-card-head">
                  <span className="home-lobby-card-kicker">Collection</span>
                </div>
                <div className="home-lobby-card-body">
                  <h2>Memedex</h2>
                  <p>Track completion and push your collection forward.</p>
                </div>
                <div className="home-lobby-stat-row">
                  <div>
                    <span>Progress</span>
                    <strong>{typeof userInfo.completionPct === "number" ? `${userInfo.completionPct}%` : "—"}</strong>
                  </div>
                  <div>
                    <span>Owned</span>
                    <strong>
                      {collectionTotal > 0
                        ? `${collectionCount.toLocaleString()}/${collectionTotal.toLocaleString()}`
                        : collectionCount.toLocaleString()}
                    </strong>
                  </div>
                </div>
                <div className="home-lobby-card-cta">Open Memedex →</div>
              </Link>

              <Link href="/packs" className="home-lobby-card home-lobby-card--secondary home-lobby-card--shop">
                <div className="home-lobby-card-head">
                  <span className="home-lobby-card-kicker">Packs</span>
                </div>
                <div className="home-lobby-card-body">
                  <h2>Booster Shop</h2>
                  <p>Grab packs and keep the collection engine moving.</p>
                </div>
                <div className="home-lobby-stat-row">
                  <div>
                    <span>Live feed</span>
                    <strong>{recentPulls.length.toLocaleString()} pulls</strong>
                  </div>
                  <div>
                    <span>Balance</span>
                    <strong>{userInfo.points.toLocaleString()} pts</strong>
                  </div>
                </div>
                <div className="home-lobby-card-cta">Enter shop →</div>
              </Link>
            </div>
          </section>

          <section className="home-lobby-broadcast mcg-surface raised" aria-label="Lobby broadcast">
            <div className="home-lobby-section-head">
              <div>
                <p className="home-lobby-eyebrow">Broadcast</p>
                <h2>Live pull feed</h2>
              </div>
              <Link href="/packs" className="mcg-btn ghost">Open packs</Link>
            </div>

            {recentPulls.length > 0 ? (
              <div className="home-lobby-feed-grid">
                {recentPulls.slice(0, 4).map((pull) => (
                  <article key={pull.id} className="home-lobby-feed-item">
                    <div className="home-lobby-feed-icon" aria-hidden="true">✦</div>
                    <div className="home-lobby-feed-copy">
                      <strong>{pull.card.displayName}</strong>
                      <span>
                        {pull.playerName} · {pull.card.rarity}
                      </span>
                    </div>
                    <time className="home-lobby-feed-time">{formatRelativeTime(pull.openedAt)}</time>
                  </article>
                ))}
              </div>
            ) : (
              <div className="home-lobby-feed-empty">
                <strong>No live pulls yet</strong>
                <span>The next pack reveal will land here.</span>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="stitch-screen stitch-landing-screen">
          <HomeHeroLanding />
          <div className="landing-support-stage">
            <StatsBar />
            <div className="landing-play-grid">
              <HowItWorks />
              <DocsLearnSection />
            </div>
          </div>
        </div>
      )}
    </SiteShell>
  );
}
