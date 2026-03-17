"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ContestCard } from "@/components/contests/ContestCard";
import { ContestHeader } from "@/components/contests/ContestHeader";
import { ContestTabs, type ContestTabKey } from "@/components/contests/ContestTabs";
import type { ContestListItem } from "@/components/contests/types";
import { SiteShell } from "@/components/layout/SiteShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSession } from "@/components/useSession";

type ContestPayload = { contests?: ContestListItem[] };

function belongsToTab(contest: ContestListItem, tab: ContestTabKey) {
  if (tab === "OPEN") return contest.status === "OPEN";
  if (tab === "LIVE") return contest.status === "LOCKED" || contest.status === "LIVE";
  return contest.status === "SETTLED";
}

function getEmptyByTab(tab: ContestTabKey) {
  if (tab === "OPEN") {
    return {
      title: "No contests open right now",
      description: "Fresh tournament lobbies are preparing in the background.",
    };
  }
  if (tab === "LIVE") {
    return {
      title: "No contests live right now",
      description: "New tournaments are coming soon.",
    };
  }
  return {
    title: "No finished contests yet",
    description: "Results and completed brackets will appear here.",
  };
}

export default function ContestsPage() {
  const { me, loading, refresh } = useSession();
  const [contests, setContests] = useState<ContestListItem[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<ContestTabKey>("OPEN");
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [retryCount, setRetryCount] = useState(0);

  const loadContests = useCallback(async (options?: { showLoader?: boolean }) => {
    const showLoader = options?.showLoader ?? false;
    if (showLoader) setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/contests", { cache: "no-store" });

      if (res.status === 401) {
        const hasSession = await refresh();
        if (!hasSession) {
          setError("Your session expired. Please reconnect to load contests.");
          setContests([]);
          if (showLoader) setIsLoading(false);
          return;
        }
      }

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "We couldn't load contests right now. Please retry in a moment.");
        setContests([]);
        if (showLoader) setIsLoading(false);
        return;
      }

      const payload = (await res.json().catch(() => null)) as ContestPayload | null;
      const rows = Array.isArray(payload?.contests) ? payload!.contests : [];
      setContests(rows);
    } catch {
      setError("Network issue while loading contests. Please check your connection and retry.");
      setContests([]);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!me) {
      setContests([]);
      setError("");
      setIsLoading(false);
      return;
    }
    void loadContests({ showLoader: contests.length === 0 });
  }, [contests.length, loading, me, retryCount, loadContests]);

  const computed = useMemo(() => {
    const open = contests.filter((contest) => contest.status === "OPEN").length;
    const live = contests.filter((contest) => contest.status === "LOCKED" || contest.status === "LIVE").length;
    const finished = contests.filter((contest) => contest.status === "SETTLED").length;
    const activePlayers = contests
      .filter((contest) => contest.status === "OPEN" || contest.status === "LOCKED" || contest.status === "LIVE")
      .reduce((sum, contest) => sum + contest._count.entries, 0);
    return {
      counts: {
        OPEN: open,
        LIVE: live,
        FINISHED: finished,
      } as Record<ContestTabKey, number>,
      headerStats: [
        { label: "Live contests", value: String(live), tone: "live" as const },
        { label: "Players active", value: String(activePlayers), tone: "active" as const },
        { label: "Total contests", value: String(contests.length), tone: "reward" as const },
      ],
    };
  }, [contests]);

  const visible = useMemo(() => {
    const filtered = contests.filter((contest) => belongsToTab(contest, tab));
    return filtered.sort((a, b) => {
      const aDate = new Date(a.lockAt ?? a.endsAt ?? a.liveAt ?? 0).getTime();
      const bDate = new Date(b.lockAt ?? b.endsAt ?? b.liveAt ?? 0).getTime();
      return aDate - bDate;
    });
  }, [contests, tab]);

  const emptyByTab = getEmptyByTab(tab);

  return (
    <SiteShell>
      <div className="contest-arena-layout">
        <ContestHeader stats={computed.headerStats} />

        <ContestTabs active={tab} onChange={setTab} counts={computed.counts} />

        {isLoading ? (
          <section className="contest-arena-grid" aria-label="Loading contests">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="contest-arena-skeleton-card" />
            ))}
          </section>
        ) : error ? (
          <section className="contest-hub-error-state" role="alert">
            <EmptyState title="Unable to load contests" description={error} />
            <button type="button" className="mcg-btn" onClick={() => { setIsLoading(true); setRetryCount((current) => current + 1); }}>
              Retry
            </button>
          </section>
        ) : contests.length === 0 || visible.length === 0 ? (
          <div className="contest-arena-empty-wrap">
            <EmptyState title={emptyByTab.title} description={emptyByTab.description} />
          </div>
        ) : (
          <section key={tab} className="contest-arena-grid contest-arena-grid-enter" aria-live="polite">
            {visible.map((contest) => (
              <ContestCard key={contest.id} contest={contest} nowTs={nowTs} />
            ))}
          </section>
        )}
      </div>
    </SiteShell>
  );
}
