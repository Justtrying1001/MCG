"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import type { MvpCardView } from "@/types/cards";
import { SiteShell } from "@/components/layout/SiteShell";
import { AuthErrorNotice } from "@/components/auth/AuthErrorNotice";
import { useSession } from "@/components/useSession";

// State A — landing
import { HomeHeroLanding } from "@/components/home/HomeHeroLanding";
import { HowItWorks } from "@/components/home/HowItWorks";
import { GenesisPreviewStrip } from "@/components/home/GenesisPreviewStrip";
import { StatsBar } from "@/components/home/StatsBar";
import { DocsLearnSection } from "@/components/home/DocsLearnSection";

// State B — dashboard
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
      packsOpened: me.user.packsOpened,
      level: accountProgression?.level ?? null,
      cardsOwned: collectionProjection?.totalOwnedInstances ?? null,
      completionPct: collectionProjection?.completionPct ?? null,
      ownedTemplates: collectionProjection?.ownedTemplateCount ?? 0,
      missingTemplates: collectionProjection?.missingTemplateCount ?? 0,
      contestsEntered: competitiveProgression?.contestsEntered ?? null,
      activeEntries: competitiveProgression?.activeEntries ?? null,
      seasonRank: competitiveProgression?.seasonRank ?? null,
    };
  }, [me]);

  return (
    <SiteShell>
      <Suspense fallback={null}>
        <AuthErrorNotice />
      </Suspense>

      {isAuth && userInfo ? (
        <>
          <div className="home-dashboard-layout">
            <PlayerDashboardHeader
              displayName={userInfo.displayName}
              points={userInfo.points}
              level={userInfo.level}
              packsOpened={userInfo.packsOpened}
              cardsOwned={userInfo.cardsOwned}
              collectionCompletionPct={userInfo.completionPct}
              contestsEntered={userInfo.contestsEntered}
              activeEntries={userInfo.activeEntries}
              seasonRank={userInfo.seasonRank}
            />

            <div className="home-dashboard-main-grid">
              <div className="home-dashboard-main-column">
                <ActiveContestsRail contests={contests} />
              </div>

              <div className="home-dashboard-side-column">
                <CollectionProgressBlock
                  completionPct={userInfo.completionPct}
                  ownedCount={userInfo.ownedTemplates}
                  missingCount={userInfo.missingTemplates}
                />
                <DocsLearnSection />
              </div>
            </div>

            <RecentPullsRail pulls={recentPulls} />
            <GenesisPreviewStrip />
          </div>
        </>
      ) : (
        <>
          <HomeHeroLanding />
          <StatsBar />
          <HowItWorks />
          <GenesisPreviewStrip />
          <DocsLearnSection />
        </>
      )}
    </SiteShell>
  );
}
