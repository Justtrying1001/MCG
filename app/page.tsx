"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SiteShell } from "@/components/layout/SiteShell";
import { useSession } from "@/components/useSession";
import { formatMemedexFinish } from "@/components/collection/memedexFinish";
import type { MvpCardView } from "@/types/cards";
import officialPackImage from "../pack.png";

// State A — landing
import { HomeHeroLanding } from "@/components/home/HomeHeroLanding";
import { HowItWorks } from "@/components/home/HowItWorks";
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
  rules?: Array<{
    id: string;
    config?: {
      coverImageUrl?: string | null;
    } | null;
  }>;
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
  if (status === "OPEN") return "Enter battle";
  if (status === "LOCKED") return "View locked lineup";
  if (status === "LIVE") return "Watch battle";
  return "Open arena";
}

function getBattleStatusLabel(status: ContestListItem["status"]) {
  if (status === "OPEN") return "Open now";
  if (status === "LIVE") return "Live now";
  if (status === "LOCKED") return "Lineups locked";
  return "Ready";
}

function formatLockTime(isoDate: string | null) {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
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
      packsOpened: me.user.packsOpened,
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

  const activeBattleContests = contests.slice(0, 3);
  const battleContest = activeBattleContests[0] ?? null;
  const featuredPull = recentPulls[0] ?? null;
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
  const memedexRarityRows = ["Common", "Uncommon", "Rare", "Epic", "Legendary"].map((label) => ({
    label,
    count: me?.coexistence?.v2?.collectionProjection?.byRarity?.find((item) => item.rarityCode === label)?.count ?? 0,
  }));
  const memedexFinishRows = (me?.coexistence?.v2?.collectionProjection?.byEdition ?? [])
    .map((item) => ({
      label: formatMemedexFinish(item.editionCode),
      count: item.count,
    }))
    .filter((item, index, rows) =>
      ["Base", "Reverse", "Holo", "Full Art"].includes(item.label) &&
      rows.findIndex((row) => row.label === item.label) === index
    )
    .sort((a, b) => ["Base", "Reverse", "Holo", "Full Art"].indexOf(a.label) - ["Base", "Reverse", "Holo", "Full Art"].indexOf(b.label))
    .slice(0, 4);

  return (
    <SiteShell>
      {isAuth && userInfo ? (
        <div className="home-lobby-shell">
          <section className="home-lobby-player-strip" aria-label="Player overview">
            <div className="home-lobby-player-main">
              <div className="home-lobby-avatar" aria-hidden="true">{playerInitial}</div>
              <div className="home-lobby-player-copy">
                <div className="home-lobby-name-row">
                  <div>
                    <p className="home-lobby-eyebrow">Main lobby</p>
                    <h1>{userInfo.displayName}</h1>
                  </div>
                  <div className="home-lobby-level-cluster">
                    <span className="home-lobby-level-pill">Lvl {userInfo.level ?? "—"}</span>
                    {typeof userInfo.seasonRank === "number" ? (
                      <span className="home-lobby-rank-pill">Rank #{userInfo.seasonRank}</span>
                    ) : null}
                  </div>
                </div>
                <div className="home-lobby-progress-block">
                  <div className="home-lobby-progress-head">
                    <span>XP progress</span>
                    <strong>
                      {typeof userInfo.xp === "number" ? `${userInfo.xp.toLocaleString()} XP` : "Syncing"}
                    </strong>
                  </div>
                  <ProgressBar value={progressValue} max={progressMax} label="XP progress" />
                  <div className="home-lobby-progress-caption-row">
                    <span className="home-lobby-progress-caption">
                      {typeof userInfo.levelXpCeil === "number"
                        ? `${Math.max(0, userInfo.levelXpCeil - (userInfo.xp ?? 0)).toLocaleString()} XP to next level`
                        : "Progress updates as you play"}
                    </span>
                    <span className="home-lobby-points-inline">{userInfo.points.toLocaleString()} pts</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="home-lobby-account-meters" aria-label="Account status">
              <div className="home-lobby-meter home-lobby-meter--points">
                <span>Points balance</span>
                <strong>{userInfo.points.toLocaleString()}</strong>
                <small>Ready for entries and packs</small>
              </div>
              <div className="home-lobby-meter home-lobby-meter--collection">
                <span>Collection</span>
                <strong>
                  {collectionTotal > 0
                    ? `${collectionCount.toLocaleString()}/${collectionTotal.toLocaleString()}`
                    : collectionCount.toLocaleString()}
                </strong>
                <small>
                  {typeof userInfo.completionPct === "number"
                    ? `${userInfo.completionPct}% complete`
                    : "Completion syncing"}
                </small>
              </div>
            </div>
          </section>

          <section className="home-lobby-main-grid" aria-label="Main actions">
            <div className="home-lobby-card home-lobby-card--battle">
              <div className="home-lobby-card-head">
                <span className="home-lobby-card-kicker">Primary mode</span>
                <span className="home-lobby-status-badge">{battleContest ? getBattleStatusLabel(battleContest.status) : "Ready"}</span>
              </div>
              <div className="home-lobby-card-hero home-lobby-card-hero--battle">
                <div className="home-lobby-card-body">
                  <h2>Battle Arena</h2>
                  <p>
                    {battleContest
                      ? "Track the live rotation and jump straight into the battles that matter now."
                      : "Jump into the live battle rotation and keep your lineup moving."}
                  </p>
                </div>
              </div>
              <div className="home-lobby-battle-status-row">
                <div className="home-lobby-battle-status-chip">
                  <span>Season</span>
                  <strong>{battleContest?.seasonName ?? "Active rotation"}</strong>
                </div>
                <div className="home-lobby-battle-status-chip">
                  <span>Status</span>
                  <strong>{battleContest ? getBattleStatusLabel(battleContest.status) : "No live battle"}</strong>
                </div>
              </div>
              <div className="home-lobby-battle-list" aria-label="Active and open battles">
                {activeBattleContests.length > 0 ? activeBattleContests.map((contest, index) => {
                  const contestCoverImage = contest.rules?.[0]?.config?.coverImageUrl?.trim() || "/Contest.png";
                  const contestLockLabel = formatLockTime(contest.lockAt);
                  return (
                    <article key={contest.id} className="home-lobby-battle-row">
                      <div className="home-lobby-battle-row-visual">
                        <Image
                          src={contestCoverImage}
                          alt={`${contest.title} cover`}
                          fill
                          className="home-lobby-battle-visual-image"
                          sizes="(max-width: 900px) 100vw, 220px"
                        />
                        <span className="home-lobby-battle-spotlight-label">{index === 0 ? "Featured battle" : "Open battle"}</span>
                      </div>
                      <div className="home-lobby-battle-row-copy">
                        <div className="home-lobby-battle-row-head">
                          <strong>{contest.title}</strong>
                          <span className="home-lobby-battle-row-status">{getBattleStatusLabel(contest.status)}</span>
                        </div>
                        <div className="home-lobby-battle-facts" aria-label={`${contest.title} details`}>
                          <div className="home-lobby-battle-fact">
                            <span>Entries</span>
                            <strong>{contest._count.entries.toLocaleString()} entered</strong>
                          </div>
                          <div className="home-lobby-battle-fact">
                            <span>{contest.rewardPreview?.label ? "Reward" : "Lock"}</span>
                            <strong>{contest.rewardPreview?.label ?? contestLockLabel ?? "TBA"}</strong>
                          </div>
                        </div>
                        <div className="home-lobby-battle-row-footer">
                          <span className="home-lobby-battle-row-meta">{contest.userEntry ? "You are entered" : contest.status === "LIVE" ? "Live now" : "Open slot available"}</span>
                          <Link href={`/contests/${contest.id}`} className="home-lobby-card-cta home-lobby-card-cta--inline">{getContestCtaLabel(contest.status)} →</Link>
                        </div>
                      </div>
                    </article>
                  );
                }) : (
                  <div className="home-lobby-battle-empty" role="status">No battle right now. Come back later.</div>
                )}
              </div>
            </div>

            <div className="home-lobby-side-actions">
              <Link href="/collection" className="home-lobby-card home-lobby-card--secondary home-lobby-card--memedex">
                <div className="home-lobby-card-head">
                  <span className="home-lobby-card-kicker">Collection</span>
                  <span className="home-lobby-mini-pill">Memedex</span>
                </div>
                <div className="home-lobby-card-hero home-lobby-card-hero--split">
                  <div className="home-lobby-card-body">
                    <h2>Memedex</h2>
                    <p>Your quick collector snapshot for progress, gaps, and what still needs chasing.</p>
                  </div>
                  <div className="home-lobby-collector-badge" aria-hidden="true">◎</div>
                </div>
                <div className="home-lobby-memedex-preview" aria-label="Memedex preview">
                  <div className="home-lobby-memedex-primary-row" aria-label="Memedex primary stats">
                    <div className="home-lobby-memedex-pill">
                      <span>Completion</span>
                      <strong>{typeof userInfo.completionPct === "number" ? `${userInfo.completionPct}%` : "—"}</strong>
                    </div>
                    <div className="home-lobby-memedex-pill">
                      <span>Owned</span>
                      <strong>
                        {collectionTotal > 0
                          ? `${collectionCount.toLocaleString()}/${collectionTotal.toLocaleString()}`
                          : collectionCount.toLocaleString()}
                      </strong>
                    </div>
                    <div className="home-lobby-memedex-pill">
                      <span>Missing</span>
                      <strong>{(userInfo.missingTemplates ?? 0).toLocaleString()}</strong>
                    </div>
                  </div>
                  <div className="home-lobby-memedex-compact-breakdown" aria-label="Memedex rarity breakdown">
                    <span className="home-lobby-memedex-compact-label">Rarity</span>
                    <div className="home-lobby-memedex-chip-row">
                      {memedexRarityRows.map((item) => (
                        <span key={item.label} className="home-lobby-memedex-chip">
                          <strong>{item.label.slice(0, 1)}</strong>
                          <span>{item.count.toLocaleString()}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="home-lobby-memedex-compact-breakdown" aria-label="Memedex finish breakdown">
                    <span className="home-lobby-memedex-compact-label">Finish</span>
                    <div className="home-lobby-memedex-chip-row home-lobby-memedex-chip-row--finish">
                      {memedexFinishRows.map((item) => (
                        <span key={item.label} className="home-lobby-memedex-chip home-lobby-memedex-chip--finish">
                          <strong>{item.label}</strong>
                          <span>{item.count.toLocaleString()}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="home-lobby-card-cta">Open Memedex →</div>
              </Link>

              <Link href="/packs" className="home-lobby-card home-lobby-card--secondary home-lobby-card--shop">
                <div className="home-lobby-card-head">
                  <span className="home-lobby-card-kicker">Packs</span>
                  <span className="home-lobby-mini-pill">Booster Shop</span>
                </div>
                <div className="home-lobby-card-hero home-lobby-card-hero--split">
                  <div className="home-lobby-card-body">
                    <h2>Booster Shop</h2>
                    <p>Spend points on fresh packs and head straight into your next opening run.</p>
                  </div>
                  <div className="home-lobby-shop-burst" aria-hidden="true">✦</div>
                </div>
                <div className="home-lobby-shop-preview" aria-label="Booster Shop preview">
                  <div className="home-lobby-pack-stage">
                    <Image src={officialPackImage} alt="MCG booster pack" className="home-lobby-pack-art" width={180} height={252} priority />
                  </div>
                  <div className="home-lobby-shop-copy">
                    <div className="home-lobby-stat-row home-lobby-stat-row--dense">
                      <div>
                        <span>Points ready</span>
                        <strong>{userInfo.points.toLocaleString()} pts</strong>
                      </div>
                      <div>
                        <span>Packs opened</span>
                        <strong>{userInfo.packsOpened.toLocaleString()}</strong>
                      </div>
                    </div>
                    <div className="home-lobby-inline-note">
                      <span>Shop signal</span>
                      <strong>
                        {featuredPull
                          ? `${featuredPull.card.displayName} · ${formatRelativeTime(featuredPull.openedAt)}`
                          : "Fresh pulls will appear here"}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="home-lobby-card-cta">Enter shop →</div>
              </Link>
            </div>
          </section>

        </div>
      ) : (
        <div className="stitch-screen stitch-landing-screen landing-page-flow">
          <div className="landing-page-section landing-page-section--hero">
            <HomeHeroLanding />
          </div>
          <div className="landing-page-section landing-page-section--how">
            <HowItWorks />
          </div>
          <div className="landing-page-section landing-page-section--smart">
            <DocsLearnSection />
          </div>
        </div>
      )}
    </SiteShell>
  );
}
