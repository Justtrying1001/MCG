"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { useSession } from "@/components/useSession";

type ContestListItem = {
  id: string;
  code: string;
  title: string;
  status: "DRAFT" | "OPEN" | "LOCKED" | "LIVE" | "SETTLED" | "CANCELED";
  startsAt: string | null;
  lockAt: string | null;
  endsAt: string | null;
  rules: Array<{ id: string; cardSetId: string | null; maxRosterSize: number | null }>;
  _count: { entries: number };
};

type Tab = "active" | "settled";

function statusClass(s: ContestListItem["status"]) {
  switch (s) {
    case "LIVE":   return "contest-status status-live";
    case "OPEN":   return "contest-status status-open";
    case "LOCKED": return "contest-status status-locked";
    default: return "contest-status status-settled";
  }
}
function cardClass(s: ContestListItem["status"]) {
  switch (s) {
    case "LIVE":   return "contest-card-v2 ccv2-live";
    case "OPEN":   return "contest-card-v2 ccv2-open";
    case "LOCKED": return "contest-card-v2 ccv2-locked";
    default: return "contest-card-v2 ccv2-settled";
  }
}

function formatDate(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ContestsPage() {
  const { me, loading } = useSession();
  const [contests, setContests] = useState<ContestListItem[]>([]);
  const [error,    setError]    = useState("");
  const [isLoading,setIsLoading]= useState(true);
  const [tab,      setTab]      = useState<Tab>("active");

  useEffect(() => {
    if (loading) return;
    if (!me || me.mode === "guest") { setIsLoading(false); return; }

    void (async () => {
      setIsLoading(true); setError("");
      const res = await fetch("/api/contests", { cache: "no-store" });
      if (!res.ok) {
        setError((await res.text()) || "Cannot load contests");
        setIsLoading(false); return;
      }
      const p = (await res.json()) as { contests: ContestListItem[] };
      setContests(p.contests ?? []);
      setIsLoading(false);
    })();
  }, [loading]);

  const grouped = useMemo(() => ({
    active:  contests.filter((c) => ["OPEN","LOCKED","LIVE"].includes(c.status)),
    settled: contests.filter((c) => c.status === "SETTLED"),
  }), [contests]);

  const guestBlocked  = !loading && me?.mode === "guest";
  const visible       = tab === "active" ? grouped.active : grouped.settled;
  const featuredLive  = grouped.active.find((c) => c.status === "LIVE") ?? null;

  return (
    <SiteShell>
      <div className="hub-page">

        {/* ── Page Header ── */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Contests</h1>
            <p className="page-subtitle">
              Build your lineup, lock it in, and track results on the leaderboard.
            </p>
          </div>
        </div>

        {/* ── Guest Notice ── */}
        {guestBlocked && (
          <div className="warning-banner">
            Contests require an authenticated account with owned card instances.
            Guest mode can open packs and preview your collection, but cannot enter competitions.
          </div>
        )}

        {/* ── Tab Navigation ── */}
        {!guestBlocked && (
          <div className="hub-tabs">
            <button
              type="button"
              className={`hub-tab${tab === "active" ? " active" : ""}`}
              onClick={() => setTab("active")}
            >
              Active & Upcoming
              {grouped.active.length > 0 && (
                <span className="hub-tab-badge">{grouped.active.length}</span>
              )}
            </button>
            <button
              type="button"
              className={`hub-tab${tab === "settled" ? " active" : ""}`}
              onClick={() => setTab("settled")}
            >
              Results
              {grouped.settled.length > 0 && (
                <span className="hub-tab-badge">{grouped.settled.length}</span>
              )}
            </button>
          </div>
        )}

        {/* ── Featured Live Banner ── */}
        {!guestBlocked && featuredLive && tab === "active" && (
          <Link href={`/contests/${featuredLive.id}`} className="contest-featured-banner">
            <div>
              <div className="cfb-eyebrow">
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--emerald)", display: "inline-block", animation: "pulse-dot 1.6s ease-in-out infinite" }} />
                Live now
              </div>
              <div className="cfb-title">{featuredLive.title}</div>
              <div className="cfb-stats">
                <div className="cfb-stat">
                  <div className="cfb-stat-value">{featuredLive._count.entries}</div>
                  <div className="cfb-stat-label">Entries</div>
                </div>
                <div className="cfb-stat">
                  <div className="cfb-stat-value">{featuredLive.rules[0]?.maxRosterSize ?? 5}</div>
                  <div className="cfb-stat-label">Roster</div>
                </div>
                <div className="cfb-stat">
                  <div className="cfb-stat-value">{formatDate(featuredLive.endsAt)}</div>
                  <div className="cfb-stat-label">Ends</div>
                </div>
              </div>
            </div>
            <div className="cfb-actions">
              <span className="btn btn-primary">View Contest →</span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}>
                {featuredLive.code}
              </span>
            </div>
          </Link>
        )}

        {/* ── Content ── */}
        {isLoading ? (
          <div className="empty-state">
            <p className="empty-state-title">Loading contests…</p>
          </div>
        ) : error ? (
          <div className="contest-error">{error}</div>
        ) : !me || me.mode === "guest" ? null : visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏆</div>
            <p className="empty-state-title">
              {tab === "active" ? "No active contests right now" : "No settled contests yet"}
            </p>
            <p className="empty-state-desc">
              {tab === "active"
                ? "Check back soon for the next lock window."
                : "Results will appear here after contests close."}
            </p>
          </div>
        ) : (
          <div className="contest-grid-v2">
            {visible.map((contest) => {
              const rule = contest.rules[0];
              return (
                <Link
                  key={contest.id}
                  href={`/contests/${contest.id}`}
                  className={cardClass(contest.status)}
                >
                  <div className="ccv2-top-bar" />

                  <div className="ccv2-head">
                    <div className="ccv2-title">{contest.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {contest.status === "LIVE" && (
                        <div style={{
                          width: 7, height: 7, borderRadius: "50%",
                          background: "var(--emerald)",
                          boxShadow: "0 0 6px rgba(31,122,92,0.8)",
                          animation: "pulse-dot 1.6s ease-in-out infinite",
                          flexShrink: 0,
                        }} />
                      )}
                      <span className={statusClass(contest.status)}>{contest.status}</span>
                    </div>
                  </div>

                  <div className="ccv2-body">
                    <div>
                      <div className="ccv2-stat-label">Entries</div>
                      <div className="ccv2-stat-value">{contest._count.entries}</div>
                    </div>
                    <div>
                      <div className="ccv2-stat-label">Roster</div>
                      <div className="ccv2-stat-value">{rule?.maxRosterSize ?? 5} cards</div>
                    </div>
                    <div>
                      <div className="ccv2-stat-label">Lock at</div>
                      <div className="ccv2-stat-value">{formatDate(contest.lockAt)}</div>
                    </div>
                  </div>

                  <div className="ccv2-footer">
                    <span style={{ fontSize: "0.74rem", color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {contest.code}
                    </span>
                    {(contest.status === "OPEN" || contest.status === "LIVE") ? (
                      <span className="ccv2-enter-btn">Enter →</span>
                    ) : (
                      <span style={{ fontSize: "0.78rem", color: "var(--text-3)" }}>View →</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

      </div>
    </SiteShell>
  );
}
