"use client";

import { useEffect, useMemo, useState } from "react";

import { ContestTile } from "@/components/contests/ContestTile";
import type { ContestListItem } from "@/components/contests/types";
import { SiteShell } from "@/components/layout/SiteShell";
import { useSession } from "@/components/useSession";

type ContestTab = "open" | "live" | "settled";

export default function ContestsPage() {
  const { me, loading } = useSession();
  const [contests, setContests] = useState<ContestListItem[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<ContestTab>("open");
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!me || me.mode === "guest") {
      setIsLoading(false);
      return;
    }

    void (async () => {
      setIsLoading(true);
      setError("");
      const res = await fetch("/api/contests", { cache: "no-store" });
      if (!res.ok) {
        const text = await res.text();
        setError(text || "Cannot load contests");
        setIsLoading(false);
        return;
      }

      const payload = (await res.json()) as { contests: ContestListItem[] };
      setContests(payload.contests ?? []);
      setIsLoading(false);
    })();
  }, [loading, me]);

  const grouped = useMemo(() => {
    return {
      open: contests.filter((c) => c.status === "OPEN" || c.status === "DRAFT"),
      live: contests.filter((c) => c.status === "LOCKED" || c.status === "LIVE"),
      settled: contests.filter((c) => c.status === "SETTLED" || c.status === "CANCELED"),
    };
  }, [contests]);

  const displayed = grouped[tab];
  const guestBlocked = !loading && me?.mode === "guest";

  return (
    <SiteShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Contests Arena</h1>
          <p className="page-subtitle">Choose your tournament, lock your lineup, and climb the leaderboard.</p>
        </div>
      </div>

      <section className="contest-dashboard">
        <div className="contest-info-panel">
          <p className="contest-inline-note">🧭 Deadlines: lineup lock at contest lock time · live scoring during LIVE status.</p>
          <p className="contest-inline-note">🎁 Rewards: season points + exclusive cards based on your final rank.</p>
        </div>

        <div className="contest-tabs" role="tablist" aria-label="Contest categories">
          <button type="button" className={`contest-tab${tab === "open" ? " active" : ""}`} onClick={() => setTab("open")} role="tab" aria-selected={tab === "open"}>Active & Upcoming</button>
          <button type="button" className={`contest-tab${tab === "live" ? " active" : ""}`} onClick={() => setTab("live")} role="tab" aria-selected={tab === "live"}>Live</button>
          <button type="button" className={`contest-tab${tab === "settled" ? " active" : ""}`} onClick={() => setTab("settled")} role="tab" aria-selected={tab === "settled"}>Completed</button>
        </div>

        {guestBlocked ? <GuestNotice /> : null}

        {isLoading ? (
          <div className="empty-state"><p className="empty-state-title">Loading contests…</p></div>
        ) : error ? (
          <div className="empty-state"><p className="empty-state-title">{error}</p></div>
        ) : contests.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">No contests are currently published.</p>
            <p className="empty-state-desc">Check back soon for the next lock window.</p>
          </div>
        ) : (
          <section className="contest-section">
            <h2 className="contest-section-title">{tab === "open" ? "Build your lineup" : tab === "live" ? "Current round" : "History"}</h2>
            <div className="contest-list contest-scroller">
              {displayed.length ? displayed.map((contest) => <ContestTile contest={contest} nowTs={nowTs} key={contest.id} />) : <p className="contest-inline-note">No contests available in this section.</p>}
            </div>
          </section>
        )}
      </section>
    </SiteShell>
  );
}

function GuestNotice() {
  return (
    <div className="contest-guest-notice">
      Contest participation requires an authenticated account with owned card instances. Guest mode can preview contests but cannot enter.
    </div>
  );
}
