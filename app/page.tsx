"use client";

import { useEffect, useMemo, useState } from "react";
import type { MvpCardView } from "@/types/cards";
import { SiteShell } from "@/components/layout/SiteShell";
import { useSession } from "@/components/useSession";

// State A — landing
import { HomeHeroLanding } from "@/components/home/HomeHeroLanding";
import { HowItWorks } from "@/components/home/HowItWorks";
import { StatsBar } from "@/components/home/StatsBar";
import { DocsLearnSection } from "@/components/home/DocsLearnSection";

// State B — dashboard
import { PlayerDashboardHeader } from "@/components/home/PlayerDashboardHeader";
import { ActiveContestsRail } from "@/components/home/ActiveContestsRail";
import { RecentPullsRail } from "@/components/home/RecentPullsRail";
import { CollectionProgressBlock } from "@/components/home/CollectionProgressBlock";
import { LobbyTicker } from "@/components/home/LobbyTicker";

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

  const tickerItems = useMemo(() => {
    if (!userInfo) return [];

    const nextContest = contests[0];
    const latestPull = recentPulls[0];
    const rows = [
      typeof userInfo.level === "number" ? `Trainer level ${userInfo.level} ready for the lobby` : "",
      typeof userInfo.seasonRank === "number" ? `Season rank #${userInfo.seasonRank} on the board` : "",
      typeof userInfo.completionPct === "number" ? `Memedex at ${userInfo.completionPct}% completion` : "",
      nextContest ? `${nextContest.title} ${nextContest.status === "OPEN" ? "open for entries" : `currently ${nextContest.status.toLowerCase()}`}` : "",
      latestPull ? `${latestPull.playerName} just revealed ${latestPull.card.displayName}` : "",
      `${contests.length} active contest${contests.length === 1 ? "" : "s"} loaded`,
    ];

    return rows.filter(Boolean);
  }, [contests, recentPulls, userInfo]);

  return (
    <SiteShell>
      {isAuth && userInfo ? (
        <div className="home-dashboard-layout">
          <LobbyTicker items={tickerItems} />

          <PlayerDashboardHeader
            displayName={userInfo.displayName}
            points={userInfo.points}
            level={userInfo.level}
            activeEntries={userInfo.activeEntries}
            completionPct={userInfo.completionPct}
            ownedTemplates={userInfo.ownedTemplates}
            missingTemplates={userInfo.missingTemplates}
            seasonRank={userInfo.seasonRank}
          />

          <div className={`home-dashboard-main-grid${hasCollectionSummary ? "" : " home-dashboard-main-grid--single"}`}>
            <div className="home-dashboard-main-column home-dashboard-main-column--hero">
              <ActiveContestsRail contests={contests} />
            </div>

            {hasCollectionSummary ? (
              <aside className="home-dashboard-side-column home-dashboard-side-column--console">
                <CollectionProgressBlock
                  completionPct={userInfo.completionPct}
                  ownedCount={userInfo.ownedTemplates ?? 0}
                  missingCount={userInfo.missingTemplates ?? 0}
                />
              </aside>
            ) : null}
          </div>

          <div className="home-dashboard-secondary-grid">
            <RecentPullsRail pulls={recentPulls} />
            <DocsLearnSection compact />
          </div>
        </div>
      ) : (
        <>
          <HomeHeroLanding />
          <StatsBar />
          <HowItWorks />
          <DocsLearnSection />
        </>
      )}
    </SiteShell>
  );
}
