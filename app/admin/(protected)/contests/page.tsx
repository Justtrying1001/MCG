"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { buildContestSurfaceLinks, filterContestCatalogRows } from "@/lib/admin/catalog";

type ContestStatus = "DRAFT" | "OPEN" | "LOCKED" | "LIVE" | "SETTLED" | "CANCELED";

type AdminContest = {
  id: string;
  code: string;
  title: string;
  status: ContestStatus;
  startsAt: string | null;
  lockAt: string | null;
  endsAt: string | null;
  _count: {
    entries: number;
    rankings: number;
    settlements: number;
  };
};

export default function AdminContestsCatalogPage() {
  const [contests, setContests] = useState<AdminContest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContestStatus | "ALL">("ALL");
  const [query, setQuery] = useState("");

  const loadContests = async () => {
    setLoading(true);
    setError("");

    const response = await fetch("/api/internal/contests", { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Cannot load contests");
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as { contests: AdminContest[] };
    setContests(payload.contests ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void loadContests();
  }, []);

  const filtered = useMemo(() => {
    return filterContestCatalogRows(contests, statusFilter, query);
  }, [contests, statusFilter, query]);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="contest-section">
        <h1 className="page-title">Contest Catalog</h1>
        <p className="page-subtitle">Operational entrypoint for contest lifecycle. Use legacy detail pages for execute flows until Phase 3 workbenches are live.</p>
      </section>

      <section className="contest-section" style={{ display: "grid", gap: "0.75rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <input
            className="input"
            placeholder="Filter by code/title"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{ maxWidth: "300px" }}
          />
          <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ContestStatus | "ALL")}> 
            <option value="ALL">All statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="OPEN">OPEN</option>
            <option value="LOCKED">LOCKED</option>
            <option value="LIVE">LIVE</option>
            <option value="SETTLED">SETTLED</option>
            <option value="CANCELED">CANCELED</option>
          </select>
          <Button type="button" variant="ghost" onClick={() => void loadContests()}>Refresh</Button>
          <Link href="/admin/contests/legacy" className="contest-inline-note">Open legacy contest create panel</Link>
        </div>
        <p className="contest-inline-note">Showing {filtered.length} contests</p>
      </section>

      {loading ? <section className="contest-section"><p className="contest-inline-note">Loading contests…</p></section> : null}
      {error ? <section className="contest-section"><p className="contest-error">{error}</p></section> : null}

      {!loading && !error ? (
        <section className="contest-section" style={{ display: "grid", gap: "0.6rem" }}>
          {filtered.map((contest) => (
            <div key={contest.id} className="contest-card">
              <div className="contest-card-top">
                <p className="contest-code">{contest.code}</p>
                <span className={`contest-status status-${contest.status.toLowerCase()}`}>{contest.status}</span>
              </div>
              <h3 className="contest-title">{contest.title}</h3>
              <div className="contest-meta-grid">
                <ContestMeta label="Entries" value={String(contest._count.entries)} />
                <ContestMeta label="Rankings" value={String(contest._count.rankings)} />
                <ContestMeta label="Settled" value={contest._count.settlements > 0 ? "Yes" : "No"} />
                <ContestMeta label="Starts" value={formatDate(contest.startsAt)} />
                <ContestMeta label="Lock" value={formatDate(contest.lockAt)} />
                <ContestMeta label="Ends" value={formatDate(contest.endsAt)} />
              </div>
              <div style={{ marginTop: "0.6rem", display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
                <Link href={buildContestSurfaceLinks(contest.id).overview} className="contest-inline-note">Overview</Link>
                <Link href={buildContestSurfaceLinks(contest.id).lifecycle} className="contest-inline-note">Lifecycle</Link>
                <Link href={buildContestSurfaceLinks(contest.id).scoring} className="contest-inline-note">Scoring flow</Link>
                <Link href={buildContestSurfaceLinks(contest.id).settlement} className="contest-inline-note">Settlement flow</Link>
                <Link href={buildContestSurfaceLinks(contest.id).audit} className="contest-inline-note">Audit trail</Link>
                <Link href={buildContestSurfaceLinks(contest.id).legacy} className="contest-inline-note">Legacy detail</Link>
              </div>
            </div>
          ))}
          {filtered.length === 0 ? <p className="contest-inline-note">No contests matching current filters.</p> : null}
        </section>
      ) : null}
    </div>
  );
}

function ContestMeta({ label, value }: { label: string; value: string }) {
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
