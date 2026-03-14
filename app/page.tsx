"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { AuthErrorNotice } from "@/components/auth/AuthErrorNotice";
import { useSession } from "@/components/useSession";
import { HeroDrop } from "@/components/home/HeroDrop";
import { RecentPullsRail } from "@/components/home/RecentPullsRail";
import { ActiveContestsRail } from "@/components/home/ActiveContestsRail";
import { CollectionProgressBlock } from "@/components/home/CollectionProgressBlock";
import { RewardsMiniPanel } from "@/components/home/RewardsMiniPanel";

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

  const collectionSummary = useMemo(() => {
    if (me?.mode !== "user") {
      return {
        completionPct: null as number | null,
        ownedCount: me?.mvpCollection?.length ?? 0,
        missingCount: 0,
      };
    }

    const v2 = me.coexistence?.v2;
    const progress = v2?.collectionProgression;
    return {
      completionPct: progress?.completionPct ?? null,
      ownedCount: progress?.ownedTemplateCount ?? 0,
      missingCount: progress?.missingTemplateCount ?? 0,
    };
  }, [me]);

  return (
    <SiteShell>
      <Suspense fallback={null}>
        <AuthErrorNotice />
      </Suspense>

      <HeroDrop />
      <RecentPullsRail />
      <ActiveContestsRail contests={contests} />

      <div className="mcg-home-grid-2">
        <CollectionProgressBlock
          completionPct={collectionSummary.completionPct}
          ownedCount={collectionSummary.ownedCount}
          missingCount={collectionSummary.missingCount}
        />
        <RewardsMiniPanel />
      </div>
    </SiteShell>
  );
}
