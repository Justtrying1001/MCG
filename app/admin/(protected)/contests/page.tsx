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

  const filtered = useMemo(() => filterContestCatalogRows(contests, statusFilter, query), [contests, statusFilter, query]);

  return (
    <div className="admin-page">
      <section className="admin-page-header">
        <div>
          <h1 className="admin-title">Contest Operations</h1>
          <p className="admin-subtitle">Canonical flow: create draft → validate/publish → run lifecycle/scoring/settlement from contest overview.</p>
        </div>
        <div className="admin-actions-row">
          <Link href="/admin/contests/create" className="admin-badge success">New contest setup</Link>
          <Button type="button" variant="ghost" onClick={() => void loadContests()}>Refresh catalog</Button>
        </div>
      </section>

      <section className="admin-callout warn">
        <p style={{ fontWeight: 700, fontSize: "0.8rem" }}>Legacy flow is deprecated</p>
        <p className="contest-inline-note">Use legacy contests only for historical/manual operations. New contests must use structured setup.</p>
        <Link href="/admin/contests/legacy" className="contest-inline-note">Open legacy contests (restricted fallback)</Link>
      </section>

      <section className="admin-toolbar">
        <input className="input" placeholder="Search code / title" value={query} onChange={(event) => setQuery(event.target.value)} style={{ maxWidth: "250px" }} />
        <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ContestStatus | "ALL")}> 
          <option value="ALL">All statuses</option>
          <option value="DRAFT">DRAFT</option>
          <option value="OPEN">OPEN</option>
          <option value="LOCKED">LOCKED</option>
          <option value="LIVE">LIVE</option>
          <option value="SETTLED">SETTLED</option>
          <option value="CANCELED">CANCELED</option>
        </select>
        <span className="admin-badge neutral">{filtered.length} rows</span>
      </section>

      {loading ? <section className="admin-panel"><p className="contest-inline-note">Loading contests…</p></section> : null}
      {error ? <section className="admin-panel"><p className="contest-error">{error}</p></section> : null}

      {!loading && !error ? (
        <section className="admin-table">
          <div className="admin-table-head">
            <span>Code</span>
            <span>Contest</span>
            <span>Status</span>
            <span>Entries</span>
            <span>Rankings</span>
            <span>Settled</span>
            <span>Actions</span>
          </div>
          {filtered.map((contest) => {
            const links = buildContestSurfaceLinks(contest.id);
            return (
              <div key={contest.id} className="admin-table-row">
                <span className="contest-code">{contest.code}</span>
                <div>
                  <p style={{ fontWeight: 700 }}>{contest.title}</p>
                  <p className="contest-inline-note">{formatDate(contest.startsAt)} → {formatDate(contest.endsAt)} · lock {formatDate(contest.lockAt)}</p>
                </div>
                <span className={`admin-badge ${statusTone(contest.status)}`}>{contest.status}</span>
                <span>{contest._count.entries}</span>
                <span>{contest._count.rankings}</span>
                <span>{contest._count.settlements > 0 ? "Yes" : "No"}</span>
                <div className="admin-actions-row">
                  <Link href={links.overview} className="admin-badge neutral">Overview</Link>
                  <Link href={links.scoring} className="admin-badge neutral">Scoring</Link>
                  <Link href={links.settlement} className="admin-badge neutral">Settlement</Link>
                  <Link href={links.audit} className="admin-badge neutral">Audit</Link>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 ? <div className="admin-table-row"><p className="contest-inline-note">No contests matching filters.</p></div> : null}
        </section>
      ) : null}
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function statusTone(status: ContestStatus): "success" | "warn" | "danger" | "neutral" {
  if (status === "LIVE" || status === "OPEN") return "success";
  if (status === "LOCKED" || status === "DRAFT") return "warn";
  if (status === "CANCELED") return "danger";
  return "neutral";
}
