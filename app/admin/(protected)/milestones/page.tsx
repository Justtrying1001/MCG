"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type LifecycleStatus = "ACTIVE" | "ARCHIVED" | "DELETED";

type MilestoneRow = {
  id: string;
  code: string;
  title: string;
  type: string;
  validationMode: string;
  rewardPoints: number;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
  lifecycleStatus?: LifecycleStatus;
  analytics?: {
    completedCount?: number;
    progressCount?: number;
    totalPointsDistributed?: number;
  };
};

export default function MilestoneLibraryPage() {
  const [rows, setRows] = useState<MilestoneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    const response = await fetch("/api/internal/quests/library", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { quests: MilestoneRow[] };
      const onlyMilestones = (payload.quests ?? []).filter((q) => q.type === "CONTEST_COUNT_MILESTONE");
      setRows(onlyMilestones);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const applyLifecycle = async (questId: string, action: "DISABLE" | "ENABLE" | "ARCHIVE" | "RESTORE" | "DELETE_SOFT") => {
    if (action === "DELETE_SOFT") {
      const confirmed = window.confirm("Soft-delete this milestone? It will disappear from user-facing pages and default admin list.");
      if (!confirmed) return;
    }

    setBusyId(questId);
    setMessage("");
    const response = await fetch(`/api/internal/quests/${questId}/lifecycle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setMessage(payload?.error ?? "Lifecycle update failed");
      setBusyId(null);
      return;
    }
    await load();
    setBusyId(null);
    setMessage(action === "DELETE_SOFT" ? "Milestone deleted (soft delete)." : "Milestone lifecycle updated.");
  };


  const seedCoreMilestones = async () => {
    setSeeding(true);
    setMessage("");
    const response = await fetch("/api/internal/quests/milestones/seed", { method: "POST" });
    const payload = (await response.json().catch(() => null)) as { error?: string; createdCount?: number; existingCount?: number } | null;
    if (!response.ok) {
      setMessage(payload?.error ?? "Cannot seed milestones");
      setSeeding(false);
      return;
    }
    setMessage(`Core milestones synced. Created: ${payload?.createdCount ?? 0} · Existing: ${payload?.existingCount ?? 0}`);
    await load();
    setSeeding(false);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (!showDeleted && (row.lifecycleStatus ?? "ACTIVE") === "DELETED") return false;
      if (!q) return true;
      return row.code.toLowerCase().includes(q) || row.title.toLowerCase().includes(q);
    });
  }, [rows, query, showDeleted]);

  return (
    <div className="admin-page quest-admin-page">
      <section className="admin-panel quest-library-hero">
        <div>
          <h1 className="admin-title">Milestone Library</h1>
          <p className="admin-subtitle">Manage progression milestones, thresholds, rewards and lifecycle with dedicated admin controls.</p>
          {message ? <p className="contest-inline-note">{message}</p> : null}
          {rows.length === 0 ? <p className="contest-inline-note">No milestones found in DB. Use “Seed Core Milestones” to load the baseline 15 milestones.</p> : null}
        </div>
        <div className="quest-library-hero-actions">
          <Link href="/admin/quests/builder?objectiveType=MILESTONE" className="btn btn-primary quest-primary-action">Create Milestone</Link>
          <button type="button" className="btn btn-ghost" onClick={() => void seedCoreMilestones()} disabled={seeding}>{seeding ? "Seeding…" : "Seed Core Milestones"}</button>
          <Link href="/admin/quests" className="btn btn-ghost">Go to quests</Link>
        </div>
      </section>

      <section className="admin-toolbar quest-library-toolbar">
        <input className="input" placeholder="Search by code or title" value={query} onChange={(event) => setQuery(event.target.value)} style={{ maxWidth: "320px" }} />
        <label className="contest-inline-note" style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <input type="checkbox" checked={showDeleted} onChange={(event) => setShowDeleted(event.target.checked)} />
          show deleted
        </label>
        <span className="admin-badge neutral">{filtered.length} milestones</span>
      </section>

      <section className="admin-table quest-library-table">
        <div className="admin-table-head" style={{ gridTemplateColumns: "1fr 1.5fr 0.9fr 0.9fr 0.9fr 2fr" }}>
          <span>Code</span><span>Milestone</span><span>Validation</span><span>Reward</span><span>Stats</span><span>Actions</span>
        </div>
        {loading ? <div className="admin-table-row"><p className="contest-inline-note">Loading milestone library…</p></div> : null}
        {!loading && filtered.map((row) => {
          const lifecycle = row.lifecycleStatus ?? "ACTIVE";
          return (
            <div key={row.id} className="admin-table-row" style={{ gridTemplateColumns: "1fr 1.5fr 0.9fr 0.9fr 0.9fr 2fr" }}>
              <span className="contest-code">{row.code}</span>
              <div>
                <p style={{ fontWeight: 700 }}>{row.title}</p>
                <p className="contest-inline-note">{formatDate(row.startAt)} → {formatDate(row.endAt)}</p>
                <p className="contest-inline-note">Lifecycle: {lifecycle}</p>
              </div>
              <span className="admin-badge neutral">{row.validationMode}</span>
              <span>{row.rewardPoints} pts</span>
              <p className="contest-inline-note">
                done {row.analytics?.completedCount ?? 0} · in progress {Math.max(0, (row.analytics?.progressCount ?? 0) - (row.analytics?.completedCount ?? 0))}
              </p>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                <Link href={`/admin/quests/${row.id}`} className="admin-badge neutral">Detail</Link>
                <Link href={`/admin/quests/builder?questId=${row.id}`} className="admin-badge neutral">Edit</Link>
                <button className="admin-badge neutral" disabled={busyId === row.id} onClick={() => void applyLifecycle(row.id, row.isActive ? "DISABLE" : "ENABLE")}>{row.isActive ? "Disable" : "Enable"}</button>
                <button className="admin-badge neutral" disabled={busyId === row.id || lifecycle === "ARCHIVED"} onClick={() => void applyLifecycle(row.id, "ARCHIVE")}>Archive</button>
                <button className="admin-badge neutral" disabled={busyId === row.id || lifecycle === "DELETED"} onClick={() => void applyLifecycle(row.id, "DELETE_SOFT")}>Delete</button>
              </div>
            </div>
          );
        })}
        {!loading && filtered.length === 0 ? <div className="admin-table-row"><p className="contest-inline-note">No milestones matching current filters.</p></div> : null}
      </section>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}
