"use client";

import { useEffect, useMemo, useState } from "react";

import { ContestFiltersBar } from "@/components/contests/ContestFiltersBar";
import { ContestHistoryCard } from "@/components/contests/ContestHistoryCard";
import { ContestTile } from "@/components/contests/ContestTile";
import { loadContestCache, saveContestCache } from "@/components/contests/contestUtils";
import type { ContestListItem } from "@/components/contests/types";
import { SiteShell } from "@/components/layout/SiteShell";
import { useSession } from "@/components/useSession";

type ContestTab = "upcoming" | "open" | "locked" | "live" | "settled";

export default function ContestsPage() {
  const { me, loading } = useSession();
  const [contests, setContests] = useState<ContestListItem[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<ContestTab>("open");
  const [query, setQuery] = useState("");
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (loading) return;

    void (async () => {
      setIsLoading(true);
      setError("");
      const res = await fetch("/api/contests", { cache: "no-store" });
      if (!res.ok) {
        const cached = loadContestCache();
        if (cached.length) {
          setContests(cached);
          setError("Showing cached contests. Connect with X to load live updates.");
        } else {
          const text = await res.text();
          setError(text || "Cannot load contests");
        }
        setIsLoading(false);
        return;
      }

      const payload = (await res.json()) as { contests: ContestListItem[] };
      const nextContests = payload.contests ?? [];
      setContests(nextContests);
      saveContestCache(nextContests);
      setIsLoading(false);
    })();
  }, [loading]);

  const grouped = useMemo(() => {
    return {
      upcoming: contests.filter((c) => c.status === "DRAFT"),
      open: contests.filter((c) => c.status === "OPEN"),
      locked: contests.filter((c) => c.status === "LOCKED"),
      live: contests.filter((c) => c.status === "LIVE"),
      settled: contests.filter((c) => c.status === "SETTLED" || c.status === "CANCELED"),
    };
  }, [contests]);

  const displayed = useMemo(() => {
    return grouped[tab].filter((contest) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return contest.title.toLowerCase().includes(q) || contest.code.toLowerCase().includes(q);
    });
  }, [grouped, query, tab]);

  const featured = contests.find((contest) => contest.status === "OPEN") ?? contests[0] ?? null;
  const isGuest = !loading && me?.mode === "guest";

  return (
    <SiteShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Contest Hub</h1>
          <p className="page-subtitle">Discover competitions, build lineups, track live rounds, and review your results.</p>
        </div>
      </div>

      <section className="contest-dashboard premium-contest-dashboard">
        <div className="contest-hero-strip">
          <div className="contest-info-panel spotlight">
            <p className="contest-inline-note">🏆 Compete for prestige rewards and leaderboard ranking.</p>
            <p className="contest-inline-note">⚡ Lock pressure: lineup validation matters most right before lock.</p>
            {isGuest ? <p className="contest-inline-note">Guest mode: build and explore freely. Connect with X to submit entries.</p> : null}
          </div>
          <div className="contest-kpi-row">
            <div className="contest-kpi"><p>Open</p><strong>{grouped.open.length}</strong></div>
            <div className="contest-kpi"><p>Live</p><strong>{grouped.live.length}</strong></div>
            <div className="contest-kpi"><p>Settled</p><strong>{grouped.settled.length}</strong></div>
          </div>
        </div>

        {featured ? (
          <section className="contest-section">
            <h2 className="contest-section-title">Featured contest</h2>
            <div className="contest-list featured-list">
              <ContestTile contest={featured} nowTs={nowTs} />
            </div>
          </section>
        ) : null}

        <ContestFiltersBar tab={tab} setTab={setTab} query={query} setQuery={setQuery} />

        {isLoading ? (
          <div className="empty-state"><p className="empty-state-title">Loading contests…</p></div>
        ) : contests.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">No contests are currently published.</p>
            <p className="empty-state-desc">Check back soon for the next lock window.</p>
          </div>
        ) : (
          <section className="contest-section">
            <h2 className="contest-section-title">{tab === "upcoming" ? "Upcoming" : tab === "open" ? "Open for entry" : tab === "locked" ? "Locked" : tab === "live" ? "Live" : "Settled / Results"}</h2>
            {error ? <p className="contest-inline-note">{error}</p> : null}
            <div className="contest-list contest-scroller">
              {displayed.length ? displayed.map((contest) => <ContestTile contest={contest} nowTs={nowTs} key={contest.id} />) : <p className="contest-inline-note">No contests available in this filter.</p>}
            </div>
          </section>
        )}

        {grouped.settled.length ? (
          <section className="contest-section">
            <h2 className="contest-section-title">Recent results history</h2>
            <div className="contest-list">
              {grouped.settled.slice(0, 3).map((contest) => <ContestHistoryCard key={contest.id} contest={contest} />)}
            </div>
          </section>
        ) : null}
      </section>
    </SiteShell>
  );
}
