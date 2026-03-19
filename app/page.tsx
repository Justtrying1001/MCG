"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MvpCardView } from "@/types/cards";
import { SiteShell } from "@/components/layout/SiteShell";
import { useSession } from "@/components/useSession";

import { HomeHeroLanding } from "@/components/home/HomeHeroLanding";
import { HowItWorks } from "@/components/home/HowItWorks";
import { StatsBar } from "@/components/home/StatsBar";
import { DocsLearnSection } from "@/components/home/DocsLearnSection";

import { PlayerDashboardHeader } from "@/components/home/PlayerDashboardHeader";
import { ActiveContestsRail } from "@/components/home/ActiveContestsRail";
import { RecentPullsRail } from "@/components/home/RecentPullsRail";
import { CollectionProgressBlock } from "@/components/home/CollectionProgressBlock";

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
        setContests(rows.filter((c) => ["OPEN", "LIVE", "LOCKED"].includes(c.status)).slice(0, 5));
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
      completionPct: collectionProjection?.completionPct ?? null,
      ownedTemplates: collectionProjection?.ownedTemplateCount ?? null,
      missingTemplates: collectionProjection?.missingTemplateCount ?? null,
      activeEntries: competitiveProgression?.activeEntries ?? null,
      seasonRank: competitiveProgression?.seasonRank ?? null,
    };
  }, [me]);

  const hasCollectionSummary = useMemo(() => {
    if (!userInfo) return false;
    return typeof userInfo.ownedTemplates === "number" || typeof userInfo.missingTemplates === "number";
  }, [userInfo]);

  return isAuth && userInfo ? (
    <SiteShell mode="app">
      <div className="home-dashboard-layout">
        <PlayerDashboardHeader
          displayName={userInfo.displayName}
          points={userInfo.points}
          level={userInfo.level}
          activeEntries={userInfo.activeEntries}
          seasonRank={userInfo.seasonRank}
        />

        <div className="home-dashboard-entry-grid" aria-label="Game entry points">
          <Link href="/packs" className="home-dashboard-entry-card home-dashboard-entry-card--hero">
            <span className="home-dashboard-entry-chip">Featured action</span>
            <span className="home-dashboard-entry-icon" aria-hidden="true">✦</span>
            <strong>Open packs</strong>
            <p>Reveal fresh cards, grow your playable inventory, and fuel every other system in the app.</p>
            <span className="home-dashboard-entry-cta">Enter the ritual →</span>
          </Link>
          <Link href="/contests" className="home-dashboard-entry-card home-dashboard-entry-card--contest">
            <span className="home-dashboard-entry-chip">Competitive</span>
            <span className="home-dashboard-entry-icon" aria-hidden="true">⚔</span>
            <strong>Enter contests</strong>
            <p>Scout open windows, lock lineups, and chase rank across active lobbies.</p>
            <span className="home-dashboard-entry-cta">Browse arenas →</span>
          </Link>
          <Link href="/collection" className="home-dashboard-entry-card home-dashboard-entry-card--collection">
            <span className="home-dashboard-entry-chip">Inventory</span>
            <span className="home-dashboard-entry-icon" aria-hidden="true">◌</span>
            <strong>View collection</strong>
            <p>Track completion, revisit standout pulls, and monitor card depth.</p>
          </Link>
          <Link href="/rewards" className="home-dashboard-entry-card home-dashboard-entry-card--rewards">
            <span className="home-dashboard-entry-chip">Progression</span>
            <span className="home-dashboard-entry-icon" aria-hidden="true">★</span>
            <strong>Claim rewards</strong>
            <p>Check milestones, quest progress, and unlockable reward tracks.</p>
          </Link>
        </div>

        <div className={`home-dashboard-main-grid${hasCollectionSummary ? "" : " home-dashboard-main-grid--single"}`}>
          <div className="home-dashboard-main-column">
            <ActiveContestsRail contests={contests} />
          </div>

          {hasCollectionSummary ? (
            <aside className="home-dashboard-side-column">
              <CollectionProgressBlock
                completionPct={userInfo.completionPct}
                ownedCount={userInfo.ownedTemplates ?? 0}
                missingCount={userInfo.missingTemplates ?? 0}
              />
            </aside>
          ) : null}
        </div>

        <RecentPullsRail pulls={recentPulls} />

        <DocsLearnSection compact />
      </div>
    </SiteShell>
  ) : (
    <SiteShell mode="landing">
      <div className="landing-page-stack">
        <HomeHeroLanding />
        <StatsBar />
        <HowItWorks />
        <DocsLearnSection />
      </div>
    </SiteShell>
  );
}
