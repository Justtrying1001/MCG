"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  AdminDataTable,
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
  AdminTableHead,
  AdminTableRow,
  AdminToolbar,
} from "@/components/admin/AdminUi";

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
      const confirmed = window.confirm("Delete this contest? This action is permanent.");
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
    }
    setBusyId(null);
  };

  return (
    <div className="admin-page admin-v2-page">
      <AdminPageHeader
        title="Contests"
        subtitle="Manage full lifecycle from draft to settlement with clear status visibility."
        actions={
          <div className="admin-v2-action-row">
            <Link href="/admin/contests/create" className="admin-v2-link-chip">Create contest</Link>
            <Button variant="ghost" onClick={() => void load()}>Refresh</Button>
          </div>
        }
      />

      <AdminToolbar>
        <input className="input" placeholder="Search code / title" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ContestStatus | "ALL")}>
          <option value="ALL">All statuses</option>
          {(["DRAFT", "OPEN", "LOCKED", "LIVE", "SETTLED", "CANCELED"] as ContestStatus[]).map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <AdminStatusBadge tone="neutral" label={`${rows.length} contests`} />
      </AdminToolbar>

      {loading ? <AdminPanel><AdminEmptyState title="Loading contests…" /></AdminPanel> : null}
      {message ? <AdminPanel><p className="contest-inline-note">{message}</p></AdminPanel> : null}
      {error ? <AdminPanel><p className="contest-error">{error}</p></AdminPanel> : null}

      {!loading ? (
        <AdminPanel>
          <AdminDataTable columns="1.2fr .7fr 1fr .7fr .7fr 1fr">
            <AdminTableHead>
              <span>Contest</span><span>Status</span><span>Schedule</span><span>Entries</span><span>Scores</span><span>Actions</span>
            </AdminTableHead>
            {rows.map((contest) => (
              <AdminTableRow key={contest.id}>
                <div>
                  <strong>{contest.title}</strong>
                  <p className="contest-inline-note">{contest.code}</p>
                </div>
                <AdminStatusBadge tone={statusTone(contest.status)} label={contest.status} />
                <span className="contest-inline-note">{fmt(contest.startsAt)} → {fmt(contest.lockAt)}</span>
                <span>{contest._count.entries}</span>
                <span>{contest._count.scores}</span>
                <div className="admin-v2-action-row">
                  <Link href={`/admin/contests/${contest.id}`} className="admin-v2-link-chip">Open</Link>
                  <Link href={`/admin/contests/create?contestId=${contest.id}`} className="admin-v2-link-chip">Edit</Link>
                  {contest.status === "DRAFT" && !contest.configPublishedAt ? <button className="admin-v2-link-chip" disabled={busyId === contest.id} onClick={() => void runAction(contest.id, "publish")}>Publish</button> : null}
                  {contest.configPublishedAt && contest._count.entries === 0 && contest.status !== "SETTLED" ? <button className="admin-v2-link-chip" disabled={busyId === contest.id} onClick={() => void runAction(contest.id, "unpublish")}>Unpublish</button> : null}
                  {contest.status !== "CANCELED" ? <button className="admin-v2-link-chip" disabled={busyId === contest.id} onClick={() => void runAction(contest.id, "archive")}>Archive</button> : null}
                </div>
              </AdminTableRow>
            ))}
            {rows.length === 0 ? <AdminTableRow><span>No contests found.</span></AdminTableRow> : null}
          </AdminDataTable>
        </AdminPanel>
      ) : null}
    </div>
  );
}

function fmt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function statusTone(status: ContestStatus): "neutral" | "success" | "warn" | "danger" {
  if (status === "LIVE") return "success";
  if (status === "OPEN" || status === "LOCKED") return "warn";
  if (status === "CANCELED") return "danger";
  return "neutral";
}
