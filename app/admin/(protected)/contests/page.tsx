"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";

type ContestStatus = "DRAFT" | "OPEN" | "LOCKED" | "LIVE" | "SETTLED" | "CANCELED";

type AdminContest = {
  id: string;
  code: string;
  title: string;
  status: ContestStatus;
  configPublishedAt: string | null;
  startsAt: string | null;
  lockAt: string | null;
  endsAt: string | null;
  _count: { entries: number; rankings: number; settlements: number; scores: number };
};

export default function AdminContestsCatalogPage() {
  const [contests, setContests] = useState<AdminContest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContestStatus | "ALL">("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const response = await fetch("/api/internal/contests", { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Cannot load contests");
      setLoading(false);
      return;
    }
    const payload = (await response.json()) as { contests: AdminContest[] };
    setContests(payload.contests ?? []);
    setError("");
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contests.filter((contest) => {
      if (statusFilter !== "ALL" && contest.status !== statusFilter) return false;
      if (!q) return true;
      return contest.code.toLowerCase().includes(q) || contest.title.toLowerCase().includes(q);
    });
  }, [contests, query, statusFilter]);

  const runAction = async (contestId: string, action: "publish" | "unpublish" | "archive" | "delete") => {
    setBusyId(contestId);
    const response = await (action === "publish"
      ? fetch(`/api/internal/contest-configs/${contestId}/publish`, { method: "POST" })
      : action === "delete"
        ? fetch(`/api/internal/contests/${contestId}`, { method: "DELETE" })
        : fetch(`/api/internal/contests/${contestId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: action === "archive" ? "ARCHIVE" : "UNPUBLISH" }),
          }));

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? `Cannot ${action} contest`);
    } else {
      setError("");
      await load();
    }
    setBusyId(null);
  };

  return (
    <div className="admin-page">
      <section className="admin-page-header">
        <div>
          <h1 className="admin-title">Contests</h1>
          <p className="admin-subtitle">Full lifecycle control: create, edit, publish, archive, and operate contests in one workspace.</p>
        </div>
        <div className="admin-actions-row">
          <Link href="/admin/contests/create" className="btn" style={{ background: "var(--red)", color: "#fff" }} title="Start here">Create New Contest</Link>
          <Button variant="ghost" onClick={() => void load()}>Refresh</Button>
        </div>
      </section>

      <section className="admin-toolbar">
        <input className="input" placeholder="Search by code / title" value={query} onChange={(event) => setQuery(event.target.value)} style={{ maxWidth: 260 }} />
        <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ContestStatus | "ALL")}>
          <option value="ALL">All statuses</option>
          {(["DRAFT", "OPEN", "LOCKED", "LIVE", "SETTLED", "CANCELED"] as ContestStatus[]).map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <span className="admin-badge neutral">{rows.length} contest(s)</span>
      </section>

      {loading ? <section className="admin-panel"><p className="contest-inline-note">Loading…</p></section> : null}
      {error ? <section className="admin-panel"><p className="contest-error">{error}</p></section> : null}

      {!loading ? (
        <section className="admin-table">
          <div className="admin-table-head" style={{ gridTemplateColumns: "1.3fr 2.5fr 1fr 1.6fr 0.8fr 0.8fr 2fr" }}>
            <span>Code</span><span>Contest</span><span>Status</span><span>Timing</span><span>Entries</span><span>Published</span><span>Actions</span>
          </div>
          {rows.map((contest) => {
            const published = Boolean(contest.configPublishedAt);
            const canPublish = contest.status === "DRAFT" && !published;
            const canUnpublish = published && contest._count.entries === 0 && contest.status !== "SETTLED";
            const canDelete = contest.status === "DRAFT" && contest._count.entries === 0;
            return (
              <div key={contest.id} className="admin-table-row" style={{ gridTemplateColumns: "1.3fr 2.5fr 1fr 1.6fr 0.8fr 0.8fr 2fr" }}>
                <span className="contest-code">{contest.code}</span>
                <div>
                  <p style={{ fontWeight: 700 }}>{contest.title}</p>
                  <p className="contest-inline-note">{contest._count.rankings} rankings · {contest._count.settlements} settlements</p>
                </div>
                <span className={`admin-badge ${tone(contest.status)}`}>{contest.status}</span>
                <span className="contest-inline-note">{fmt(contest.startsAt)} → {fmt(contest.lockAt)} → {fmt(contest.endsAt)}</span>
                <span>{contest._count.entries}</span>
                <span>{published ? "Yes" : "No"}</span>
                <div className="admin-actions-row">
                  <Link href={`/admin/contests/${contest.id}`} className="admin-badge neutral">Open</Link>
                  <Link href={`/admin/contests/create?contestId=${contest.id}`} className="admin-badge neutral">Edit</Link>
                  {canPublish ? <Button onClick={() => void runAction(contest.id, "publish")} disabled={busyId === contest.id}>Publish</Button> : null}
                  {canUnpublish ? <Button variant="ghost" onClick={() => void runAction(contest.id, "unpublish")} disabled={busyId === contest.id}>Unpublish</Button> : null}
                  {contest.status !== "CANCELED" ? <Button variant="ghost" onClick={() => void runAction(contest.id, "archive")} disabled={busyId === contest.id}>Archive</Button> : null}
                  {canDelete ? <Button variant="ghost" onClick={() => void runAction(contest.id, "delete")} disabled={busyId === contest.id}>Delete</Button> : null}
                </div>
              </div>
            );
          })}
          {rows.length === 0 ? <div className="admin-table-row"><p className="contest-inline-note">No contests found.</p></div> : null}
        </section>
      ) : null}
    </div>
  );
}

function tone(status: ContestStatus) {
  if (status === "OPEN" || status === "LIVE") return "success";
  if (status === "DRAFT" || status === "LOCKED") return "warn";
  if (status === "CANCELED") return "danger";
  return "neutral";
}

function fmt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}
