"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useEffect } from "react";

type LifecycleStatus = "ACTIVE" | "ARCHIVED" | "DELETED";

type MilestoneRow = {
  id: string;
  type?: string;
  code: string;
  title: string;
  validationMode: string;
  rewardPoints: number;
  isActive: boolean;
  lifecycleStatus?: LifecycleStatus;
  analytics?: { completedCount?: number; progressCount?: number; totalPointsDistributed?: number };
  config?: Record<string, unknown> | null;
};

const MATERIALS = [
  { label: "Iron", color: "#8f98a5", glow: "rgba(143,152,165,0.35)" },
  { label: "Bronze", color: "#cd7f32", glow: "rgba(205,127,50,0.35)" },
  { label: "Silver", color: "#c0c0c0", glow: "rgba(192,192,192,0.38)" },
  { label: "Gold", color: "#f7c948", glow: "rgba(247,201,72,0.42)" },
  { label: "Emerald", color: "#2ecc71", glow: "rgba(46,204,113,0.42)" },
  { label: "Diamond", color: "#60a5fa", glow: "rgba(96,165,250,0.45)" },
] as const;

const METRIC_ICONS: Record<string, string> = {
  PACK_OPEN_COUNT: "📦",
  TOTAL_CARDS_COLLECTED: "🃏",
  UNIQUE_CARDS_COLLECTED: "🧩",
  CONTESTS_JOINED: "🏟️",
  CONTESTS_WON: "🏆",
  CONTESTS_TOP3: "🥉",
  RARE_PLUS_CARDS_OWNED: "💠",
  EPIC_PLUS_CARDS_OWNED: "✨",
  LEGENDARY_CARDS_OWNED: "👑",
  REWARDS_CLAIMED: "🎁",
  REWARD_POINTS_EARNED: "⚡",
};

export default function MilestoneLibraryPage() {
  const [rows, setRows] = useState<MilestoneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<MilestoneRow | null>(null);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    const response = await fetch("/api/internal/quests/library", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { quests: MilestoneRow[] };
      setRows((payload.quests ?? []).filter((q) => q.type === "CONTEST_COUNT_MILESTONE"));
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const tierById = useMemo(() => {
    const groups = new Map<string, Array<{ id: string; target: number }>>();
    for (const row of rows) {
      const metric = String((row.config as Record<string, unknown> | null)?.milestoneType ?? (row.config as Record<string, unknown> | null)?.metricKey ?? "GENERIC");
      const target = Number((row.config as Record<string, unknown> | null)?.targetValue ?? (row.config as Record<string, unknown> | null)?.threshold ?? 0);
      const list = groups.get(metric) ?? [];
      list.push({ id: row.id, target: Number.isFinite(target) ? target : 0 });
      groups.set(metric, list);
    }

    const map = new Map<string, (typeof MATERIALS)[number]>();
    for (const [, list] of groups) {
      list.sort((a, b) => a.target - b.target);
      list.forEach((entry, idx) => map.set(entry.id, MATERIALS[Math.min(idx, MATERIALS.length - 1)]));
    }
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (!showDeleted && (row.lifecycleStatus ?? "ACTIVE") === "DELETED") return false;
      if (!q) return true;
      return row.title.toLowerCase().includes(q) || row.code.toLowerCase().includes(q);
    });
  }, [rows, query, showDeleted]);

  const applyLifecycle = async (questId: string, action: "DISABLE" | "ENABLE" | "ARCHIVE" | "DELETE_SOFT") => {
    if (action === "DELETE_SOFT") {
      const confirmed = window.confirm("Delete this milestone? It will be soft deleted.");
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
    else setMessage("Milestone updated.");
    setBusyId(null);
    await load();
  };

  const seedCoreMilestones = async () => {
    setSeeding(true);
    const response = await fetch("/api/internal/quests/milestones/seed", { method: "POST" });
    const payload = (await response.json().catch(() => null)) as { createdCount?: number; existingCount?: number; error?: string } | null;
    if (!response.ok) setMessage(payload?.error ?? "Cannot seed milestones");
    else setMessage(`Core milestones synced. Created: ${payload?.createdCount ?? 0} · Existing: ${payload?.existingCount ?? 0}`);
    setSeeding(false);
    await load();
  };

  return (
    <div className="admin-page">
      <section className="admin-page-header">
        <div>
          <h1 className="admin-title">Milestones</h1>
          <p className="admin-subtitle">Icon-first milestone library. Click a milestone to open details and actions.</p>
          {message ? <p className="contest-inline-note">{message}</p> : null}
        </div>
        <div className="admin-actions-row">
          <button type="button" className="btn btn-ghost" onClick={() => void seedCoreMilestones()} disabled={seeding}>{seeding ? "Seeding…" : "Seed Core Milestones"}</button>
          <Link href="/admin/quests/builder?objectiveType=MILESTONE" className="btn" style={{ background: "var(--red)", color: "#fff" }}>Create Milestone</Link>
        </div>
      </section>

      <section className="admin-toolbar">
        <input className="input" placeholder="Search milestones" value={query} onChange={(event) => setQuery(event.target.value)} style={{ maxWidth: 300 }} />
        <label className="contest-inline-note" style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <input type="checkbox" checked={showDeleted} onChange={(event) => setShowDeleted(event.target.checked)} /> show deleted
        </label>
        <span className="admin-badge neutral">{filtered.length} milestones</span>
      </section>

      {loading ? <section className="admin-panel"><p className="contest-inline-note">Loading milestones…</p></section> : null}

      <section className="admin-card-grid">
        {filtered.map((row) => {
          const metric = String((row.config as Record<string, unknown> | null)?.milestoneType ?? (row.config as Record<string, unknown> | null)?.metricKey ?? "GENERIC");
          const icon = METRIC_ICONS[metric] ?? "🏅";
          const tier = tierById.get(row.id) ?? MATERIALS[0];
          return (
            <button
              key={row.id}
              type="button"
              className="admin-focus-card"
              onClick={() => setSelected(row)}
              style={{ borderColor: tier.color, boxShadow: `0 0 0 1px ${tier.color}33, 0 14px 28px -22px ${tier.glow}` }}
            >
              <span className="milestone-chip-icon" style={{ background: `${tier.color}22`, color: tier.color }}>{icon}</span>
              <span className="milestone-chip-name">{row.title}</span>
            </button>
          );
        })}
        {!loading && filtered.length === 0 ? <section className="admin-panel"><p className="contest-inline-note">No milestones found. Seed core milestones to initialize baseline levels.</p></section> : null}
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
