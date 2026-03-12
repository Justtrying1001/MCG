"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ContestStatus = "DRAFT" | "OPEN" | "LOCKED" | "LIVE" | "SETTLED" | "CANCELED";

type OverviewPayload = {
  contest: {
    id: string;
    code: string;
    title: string;
    status: ContestStatus;
    startsAt: string | null;
    lockAt: string | null;
    endsAt: string | null;
    _count: {
      entries: number;
      scores: number;
      rankings: number;
      settlements: number;
    };
  };
  progress: {
    entries: number;
    scoringReady: boolean;
    rankingGenerated: boolean;
    settlementDone: boolean;
  };
  allowedTransitions: ContestStatus[];
  blockers: string[];
};

export default function ContestOverviewPage({ params }: { params: { contestId: string } }) {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const response = await fetch(`/api/internal/contest-runs/${params.contestId}/overview`, { cache: "no-store" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Cannot load contest overview");
        setLoading(false);
        return;
      }

      const payload = (await response.json()) as OverviewPayload;
      setData(payload);
      setLoading(false);
    };

    void load();
  }, [params.contestId]);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="contest-section">
        <Link href="/admin/contests" className="contest-inline-note">← Back to contest catalog</Link>
      </section>

      {loading ? <section className="contest-section"><p className="contest-inline-note">Loading overview…</p></section> : null}
      {error ? <section className="contest-section"><p className="contest-error">{error}</p></section> : null}

      {data ? (
        <>
          <section className="contest-section">
            <div className="contest-card-top">
              <p className="contest-code">{data.contest.code}</p>
              <span className={`contest-status status-${data.contest.status.toLowerCase()}`}>{data.contest.status}</span>
            </div>
            <h1 className="page-title">{data.contest.title}</h1>
            <div className="contest-meta-grid">
              <Meta label="Entries" value={String(data.contest._count.entries)} />
              <Meta label="Scores" value={String(data.contest._count.scores)} />
              <Meta label="Rankings" value={String(data.contest._count.rankings)} />
              <Meta label="Settlements" value={String(data.contest._count.settlements)} />
              <Meta label="Starts" value={formatDate(data.contest.startsAt)} />
              <Meta label="Lock" value={formatDate(data.contest.lockAt)} />
              <Meta label="Ends" value={formatDate(data.contest.endsAt)} />
            </div>
          </section>

          <section className="contest-section">
            <h2 className="contest-section-title">Operational progress</h2>
            <div className="contest-meta-grid">
              <Meta label="Entries collected" value={String(data.progress.entries)} />
              <Meta label="Scoring readiness" value={data.progress.scoringReady ? "READY" : "BLOCKED"} />
              <Meta label="Ranking generated" value={data.progress.rankingGenerated ? "YES" : "NO"} />
              <Meta label="Settlement status" value={data.progress.settlementDone ? "DONE" : "PENDING"} />
            </div>
          </section>

          <section className="contest-section" style={{ display: "grid", gap: "0.5rem" }}>
            <h2 className="contest-section-title">Blocking issues / warnings</h2>
            {data.blockers.length > 0 ? data.blockers.map((item) => <p key={item} className="contest-error">{item}</p>) : <p className="contest-inline-note">No blockers currently detected.</p>}
            <p className="contest-inline-note">Allowed next transitions: {data.allowedTransitions.length > 0 ? data.allowedTransitions.join(", ") : "none"}</p>
          </section>

          <section className="contest-section" style={{ display: "grid", gap: "0.4rem" }}>
            <h2 className="contest-section-title">Milestones</h2>
            <p className="contest-inline-note">Start: {formatDate(data.contest.startsAt)}</p>
            <p className="contest-inline-note">Lock: {formatDate(data.contest.lockAt)}</p>
            <p className="contest-inline-note">End: {formatDate(data.contest.endsAt)}</p>
          </section>

          <section className="contest-section" style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
            <Link href={`/admin/contests/${params.contestId}/lifecycle`} className="contest-inline-note">Lifecycle control panel</Link>
            <Link href={`/admin/contests/${params.contestId}/scoring`} className="contest-inline-note">Scoring workbench</Link>
            <Link href={`/admin/contests/${params.contestId}/settlement`} className="contest-inline-note">Settlement workbench</Link>
            <Link href={`/admin/contests/${params.contestId}/audit`} className="contest-inline-note">Contest audit timeline</Link>
            <Link href={`/admin/contests/legacy/${params.contestId}`} className="contest-inline-note">Open legacy detail (temporary)</Link>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="contest-meta-label">{label}</p>
      <p className="contest-meta-value">{value}</p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}
