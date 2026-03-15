"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContestHubHeader } from "@/components/contests/ContestHubHeader";
import { ContestPremiumCard } from "@/components/contests/ContestPremiumCard";
import { ContestStatusSegmented, type ContestHubTab } from "@/components/contests/ContestStatusSegmented";
import type { ContestListItem } from "@/components/contests/types";
import { useSession } from "@/components/useSession";

type ContestPayload = { contests?: ContestListItem[] };

function belongsToTab(contest: ContestListItem, tab: ContestHubTab) {
  if (tab === "OPEN") return contest.status === "OPEN";
  if (tab === "IN_PROGRESS") return contest.status === "LOCKED" || contest.status === "LIVE";
  return contest.status === "SETTLED";
}

function getEmptyByTab(tab: ContestHubTab) {
  if (tab === "OPEN") {
    return {
      title: "No open contests right now",
      description: "Check back soon — new competitions are prepared regularly.",
    };
  }
  if (tab === "IN_PROGRESS") {
    return {
      title: "No contests in this lifecycle",
      description: "Adjust filters or check another status tab.",
    };
  }
  return {
    title: "No finished contests yet",
    description: "Completed contests and results history will be listed here.",
  };
}

export default function ContestsPage() {
  const { me, loading, refresh } = useSession();
  const [contests, setContests] = useState<ContestListItem[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<ContestHubTab>("OPEN");
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [retryCount, setRetryCount] = useState(0);

  const guestBlocked = !loading && me?.mode === "guest";

  const loadContests = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/contests", { cache: "no-store" });

      if (res.status === 401) {
        const hasSession = await refresh();
        if (!hasSession) {
          setError("Your session expired. Please reconnect to load contests.");
          setContests([]);
          setIsLoading(false);
          return;
        }
      }

      if (!res.ok) {
        setError("We couldn't load contests right now. Please retry in a moment.");
        setContests([]);
        setIsLoading(false);
        return;
      }

      const payload = (await res.json().catch(() => null)) as ContestPayload | null;
      const rows = Array.isArray(payload.contests) ? payload.contests : [];
      setContests(rows);
    } catch {
      setError("Network issue while loading contests. Please check your connection and retry.");
      setContests([]);
    } finally {
      setIsLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!me || me.mode === "guest") {
      setContests([]);
      setError("");
      setIsLoading(false);
      return;
    }
    void loadContests();
  }, [loading, me, retryCount, loadContests]);

  const counts = useMemo(() => {
    const open = contests.filter((contest) => contest.status === "OPEN").length;
    const inProgress = contests.filter((contest) => contest.status === "LOCKED" || contest.status === "LIVE").length;
    const finished = contests.filter((contest) => contest.status === "SETTLED").length;

    return {
      open,
      inProgress,
      finished,
      total: contests.length,
      segmented: {
        OPEN: open,
        IN_PROGRESS: inProgress,
        FINISHED: finished,
      } as Record<ContestHubTab, number>,
    };
  }, [contests]);

  const visible = useMemo(() => {
    const filtered = contests.filter((contest) => belongsToTab(contest, tab));
    return filtered.sort((a, b) => {
      const aDate = new Date(a.lockAt ?? a.endsAt ?? a.startsAt ?? 0).getTime();
      const bDate = new Date(b.lockAt ?? b.endsAt ?? b.startsAt ?? 0).getTime();
      return aDate - bDate;
    });
  }, [contests, tab]);

  const emptyByTab = getEmptyByTab(tab);

  return (
    <SiteShell>
      <div className="contest-hub-layout-v4">
        <ContestHubHeader
          counts={{
            open: counts.open,
            inProgress: counts.inProgress,
            finished: counts.finished,
            total: counts.total,
          }}
        />

        {guestBlocked ? (
          <EmptyState title="Contests require an authenticated account" description="Guest mode can preview pages but cannot submit entries." />
        ) : (
          <>
            <ContestStatusSegmented active={tab} onChange={setTab} counts={counts.segmented} />

            {isLoading ? (
              <section className="contest-premium-grid" aria-label="Loading contests">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="contest-premium-skeleton-card" />
                ))}
              </section>
            ) : error ? (
              <section className="contest-hub-error-state" role="alert">
                <EmptyState title="Unable to load contests" description={error} />
                <button type="button" className="mcg-btn" onClick={() => setRetryCount((current) => current + 1)}>
                  Retry
                </button>
              </section>
            ) : contests.length === 0 ? (
              <EmptyState title="No contests available" description="Check back soon for new tournaments." />
            ) : visible.length === 0 ? (
              <EmptyState title={emptyByTab.title} description={emptyByTab.description} />
            ) : (
              <section className="contest-premium-grid" aria-live="polite">
                {visible.map((contest) => (
                  <ContestPremiumCard key={contest.id} contest={contest} nowTs={nowTs} />
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </SiteShell>
  );
}
