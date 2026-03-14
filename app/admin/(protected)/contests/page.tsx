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
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<AdminContest | null>(null);

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
    if (action === "delete") {
      const confirmed = window.confirm("Delete this contest? This action is permanent. CANCELED contests will be fully purged with linked operations.");
      if (!confirmed) return;
    }
    setBusyId(contestId);
    setMessage("");

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
      setMessage(action === "delete" ? "Contest deleted." : `Contest ${action} successful.`);
      await load();
      const updated = contests.find((c) => c.id === contestId);
      if (updated) setSelected(updated);
    }
    setBusyId(null);
  };

  return (
    <div className="admin-page">
      <section className="admin-page-header">
        <div>
          <h1 className="admin-title">Contests</h1>
          <p className="contest-inline-note">Start here</p>
          <p className="admin-subtitle">Pilotage complet: créer, éditer, publier, archiver et opérer le lifecycle depuis un seul module lisible.</p>
        </div>
        <div className="admin-actions-row">
          <Link href="/admin/contests/create" className="btn" style={{ background: "var(--red)", color: "#fff" }}>Create New Contest</Link>
          <Button variant="ghost" onClick={() => void load()}>Refresh</Button>
        </div>
      </section>

      <section className="admin-toolbar">
        <input className="input" placeholder="Search code / title" value={query} onChange={(event) => setQuery(event.target.value)} style={{ maxWidth: 260 }} />
        <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ContestStatus | "ALL")}>
          <option value="ALL">All statuses</option>
          {(["DRAFT", "OPEN", "LOCKED", "LIVE", "SETTLED", "CANCELED"] as ContestStatus[]).map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <span className="admin-badge neutral">{rows.length} contests</span>
      </section>

      {loading ? <section className="admin-panel"><p className="contest-inline-note">Loading…</p></section> : null}
      {message ? <section className="admin-panel"><p className="contest-inline-note">{message}</p></section> : null}
      {error ? <section className="admin-panel"><p className="contest-error">{error}</p></section> : null}

      <section className="admin-card-grid">
        {rows.map((contest) => (
          <button key={contest.id} type="button" className="admin-focus-card" onClick={() => setSelected(contest)}>
            <span className="milestone-chip-icon" style={{ background: "rgba(245,158,11,0.18)", color: "#fbbf24" }}>🏟️</span>
            <span className="milestone-chip-name">{contest.title}</span>
          </button>
        ))}
        {!loading && rows.length === 0 ? <section className="admin-panel"><p className="contest-inline-note">No contests found.</p></section> : null}
      </section>

      {selected ? (
        <div className="contest-modal-overlay" role="presentation" onClick={() => setSelected(null)}>
          <div className="contest-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="contest-modal-head">
              <div>
                <h4>{selected.title}</h4>
                <p className="contest-inline-note">{selected.code} · {selected.status}</p>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div style={{ display: "grid", gap: "0.35rem" }}>
              <p className="contest-inline-note">Entries: {selected._count.entries}</p>
              <p className="contest-inline-note">Scores: {selected._count.scores}</p>
              <p className="contest-inline-note">Rankings: {selected._count.rankings}</p>
              <p className="contest-inline-note">Settlements: {selected._count.settlements}</p>
              <p className="contest-inline-note">Timing: {fmt(selected.startsAt)} → {fmt(selected.lockAt)} → {fmt(selected.endsAt)}</p>

              <div className="admin-actions-row">
                <Link href={`/admin/contests/${selected.id}`} className="admin-badge neutral">Open</Link>
                <Link href={`/admin/contests/create?contestId=${selected.id}`} className="admin-badge neutral">Edit</Link>
                {selected.status === "DRAFT" && !selected.configPublishedAt ? <button className="admin-badge neutral" disabled={busyId === selected.id} onClick={() => void runAction(selected.id, "publish")}>Publish</button> : null}
                {selected.configPublishedAt && selected._count.entries === 0 && selected.status !== "SETTLED" ? <button className="admin-badge neutral" disabled={busyId === selected.id} onClick={() => void runAction(selected.id, "unpublish")}>Unpublish</button> : null}
                {selected.status !== "CANCELED" ? <button className="admin-badge neutral" disabled={busyId === selected.id} onClick={() => void runAction(selected.id, "archive")}>Archive</button> : null}
                {((selected.status === "CANCELED") || (selected._count.entries === 0 && selected._count.scores === 0 && selected._count.rankings === 0 && selected._count.settlements === 0)) ? <button className="admin-badge neutral" disabled={busyId === selected.id} onClick={() => void runAction(selected.id, "delete")}>Delete</button> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function fmt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}
