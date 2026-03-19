"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ContestTile } from "@/components/contests/ContestTile";
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedContests, setHasLoadedContests] = useState(false);
  const [hasConfirmedSession, setHasConfirmedSession] = useState(false);
  const [tab, setTab] = useState<ContestTabKey>("OPEN");
  const [retryCount, setRetryCount] = useState(0);
  const hasRequestedContestsRef = useRef(false);

  const loadContests = useCallback(async (options?: { showLoader?: boolean }) => {
    const showLoader = options?.showLoader ?? false;
    if (showLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError("");

    try {
      const res = await fetch("/api/contests", { cache: "no-store" });

      if (res.status === 401) {
        const hasSession = await refresh();
        if (!hasSession) {
          setError("Your session expired. Please reconnect to load contests.");
          return;
        }
      }

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "We couldn't load contests right now. Please retry in a moment.");
        return;
      }

      const payload = (await res.json().catch(() => null)) as ContestPayload | null;
      const rows = Array.isArray(payload?.contests) ? payload!.contests : [];
      setContests(rows);
      setHasLoadedContests(true);
    } catch {
      setError("Network issue while loading contests. Please check your connection and retry.");
    } finally {
      if (showLoader) {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }, [refresh]);


  useEffect(() => {
    if (loading) return;

    setHasConfirmedSession(true);

    if (!me) {
      hasRequestedContestsRef.current = false;
      if (!hasLoadedContests) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
      return;
    }

    if (retryCount === 0 && hasRequestedContestsRef.current) {
      return;
    }

    hasRequestedContestsRef.current = true;
    void loadContests({ showLoader: !hasLoadedContests });
  }, [hasLoadedContests, loading, me, retryCount, loadContests]);

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
  const showInitialSkeleton = !hasConfirmedSession || (isLoading && !hasLoadedContests && contests.length === 0);
  const showBlockingError = Boolean(error) && !hasLoadedContests && contests.length === 0;

  return (
    <SiteShell>
      <div className="contest-arena-layout">
        <ContestHeader stats={computed.headerStats} />

        <ContestTabs active={tab} onChange={setTab} counts={computed.counts} />

        {error && !showBlockingError ? (
          <section className="contest-hub-error-state" role="status" aria-live="polite" style={{ marginBottom: "1rem" }}>
            <EmptyState title="Contest list may be out of date" description={error} />
            <button type="button" className="mcg-btn" onClick={() => { setRetryCount((current) => current + 1); }}>
              Retry
            </button>
          </section>
        ) : null}

        {isRefreshing && contests.length > 0 ? (
          <div aria-live="polite" style={{ marginBottom: "1rem", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
            Refreshing contests…
          </div>
        ) : null}

        {showInitialSkeleton ? (
          <section className="contest-arena-grid" aria-label="Loading contests">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="contest-arena-skeleton-card" />
            ))}
          </section>
        ) : showBlockingError ? (
          <section className="contest-hub-error-state" role="alert">
            <EmptyState title="Unable to load contests" description={error} />
            <button type="button" className="mcg-btn" onClick={() => { setRetryCount((current) => current + 1); }}>
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
              <ContestTile key={contest.id} contest={contest} />
            ))}
          </section>
        )}
      </div>
    </SiteShell>
  );
}
