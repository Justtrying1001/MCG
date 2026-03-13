"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type LifecycleStatus = "ACTIVE" | "ARCHIVED" | "DELETED";

type QuestRow = {
  id: string;
  code: string;
  title: string;
  type: string;
  validationMode: string;
  rewardPoints: number;
  isActive: boolean;
  lifecycleStatus?: LifecycleStatus;
  analytics?: { completedCount?: number; progressCount?: number; totalPointsDistributed?: number };
};

export default function QuestLibraryPage() {
  const [rows, setRows] = useState<QuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<QuestRow | null>(null);

  const load = async () => {
    const response = await fetch("/api/internal/quests/library", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { quests: QuestRow[] };
      setRows((payload.quests ?? []).filter((q) => q.type !== "CONTEST_COUNT_MILESTONE"));
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (!showDeleted && (row.lifecycleStatus ?? "ACTIVE") === "DELETED") return false;
      if (!q) return true;
      return row.code.toLowerCase().includes(q) || row.title.toLowerCase().includes(q);
    });
  }, [rows, query, showDeleted]);

  const applyLifecycle = async (questId: string, action: "DISABLE" | "ENABLE" | "ARCHIVE" | "DELETE_SOFT") => {
    if (action === "DELETE_SOFT") {
      const confirmed = window.confirm("Delete this quest? It will be soft deleted.");
      if (!confirmed) return;
    }
    setBusyId(questId);
    const response = await fetch(`/api/internal/quests/${questId}/lifecycle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) setMessage(payload?.error ?? "Lifecycle update failed");
    else setMessage("Quest updated.");
    setBusyId(null);
    await load();
  };

  return (
    <div className="admin-page">
      <section className="admin-page-header">
        <div>
          <h1 className="admin-title">Quests</h1>
          <p className="admin-subtitle">Stylized social quest cards. Click a card for stats and management actions.</p>
          {message ? <p className="contest-inline-note">{message}</p> : null}
        </div>
        <div className="admin-actions-row">
          <Link href="/admin/quests/builder?objectiveType=FOLLOW_X" className="btn" style={{ background: "var(--red)", color: "#fff" }}>Create Quest</Link>
          <Link href="/admin/milestones" className="btn btn-ghost">Milestones</Link>
        </div>
      </section>

      <section className="admin-toolbar">
        <input className="input" placeholder="Search quests" value={query} onChange={(event) => setQuery(event.target.value)} style={{ maxWidth: 320 }} />
        <label className="contest-inline-note" style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <input type="checkbox" checked={showDeleted} onChange={(event) => setShowDeleted(event.target.checked)} /> show deleted
        </label>
        <span className="admin-badge neutral">{filtered.length} quests</span>
      </section>

      {loading ? <section className="admin-panel"><p className="contest-inline-note">Loading quests…</p></section> : null}

      <section className="admin-card-grid">
        {filtered.map((row) => (
          <button key={row.id} type="button" className="admin-focus-card" onClick={() => setSelected(row)}>
            <span className="milestone-chip-icon" style={{ background: "rgba(59,130,246,0.18)", color: "#93c5fd" }}>✦</span>
            <span className="milestone-chip-name">{row.title}</span>
          </button>
        ))}
        {!loading && filtered.length === 0 ? <section className="admin-panel"><p className="contest-inline-note">No quests found.</p></section> : null}
      </section>

      {selected ? (
        <div className="contest-modal-overlay" role="presentation" onClick={() => setSelected(null)}>
          <div className="contest-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="contest-modal-head">
              <div>
                <h4>{selected.title}</h4>
                <p className="contest-inline-note">{selected.code}</p>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div style={{ display: "grid", gap: "0.35rem" }}>
              <p className="contest-inline-note">Lifecycle: {selected.lifecycleStatus ?? "ACTIVE"}</p>
              <p className="contest-inline-note">Validation: {selected.validationMode}</p>
              <p className="contest-inline-note">Reward: {selected.rewardPoints} pts</p>
              <p className="contest-inline-note">Completed users: {selected.analytics?.completedCount ?? 0}</p>
              <p className="contest-inline-note">Progress rows: {selected.analytics?.progressCount ?? 0}</p>
              <p className="contest-inline-note">Distributed points: {selected.analytics?.totalPointsDistributed ?? 0}</p>
              <div className="admin-actions-row">
                <Link href={`/admin/quests/builder?questId=${selected.id}`} className="admin-badge neutral">Edit</Link>
                <button className="admin-badge neutral" disabled={busyId === selected.id} onClick={() => void applyLifecycle(selected.id, selected.isActive ? "DISABLE" : "ENABLE")}>{selected.isActive ? "Disable" : "Enable"}</button>
                <button className="admin-badge neutral" disabled={busyId === selected.id} onClick={() => void applyLifecycle(selected.id, "ARCHIVE")}>Archive</button>
                <button className="admin-badge neutral" disabled={busyId === selected.id} onClick={() => void applyLifecycle(selected.id, "DELETE_SOFT")}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
