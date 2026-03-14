"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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

type ContestListItem = {
  id: string;
  code: string;
  title: string;
  status: "DRAFT" | "OPEN" | "LOCKED" | "LIVE" | "SETTLED" | "CANCELED";
  lockAt: string | null;
  _count: { entries: number };
};

export default function HomePage() {
  const { me, loading } = useSession();
  const [contests, setContests] = useState<ContestListItem[]>([]);

  const isAuth = !loading && me?.mode === "user";

  useEffect(() => {
    if (!isAuth) {
      setContests([]);
      return;
    }

    fetch("/api/contests", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        const rows = (payload?.contests ?? []) as ContestListItem[];
        setContests(rows.filter((c) => ["OPEN", "LIVE", "LOCKED"].includes(c.status)).slice(0, 5));
      })
      .catch(() => setContests([]));
  }, [isAuth]);

  const userInfo = useMemo(() => {
    if (me?.mode !== "user") return null;
    return {
      displayName: me.user.displayName,
      points: me.user.points,
    };
  }, [me]);

  return (
    <SiteShell>
      <Suspense fallback={null}>
        <AuthErrorNotice />
      </Suspense>

      {isAuth && userInfo ? (
        /* ── State B: Connected player dashboard ── */
        <>
          <PlayerDashboardHeader
            displayName={userInfo.displayName}
            points={userInfo.points}
          />
          <RecentPullsRail />
          <ActiveContestsRail contests={contests} />
          <GenesisPreviewStrip />
          <DocsLearnSection />
        </>
      ) : (
        /* ── State A: Landing / conversion ── */
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
