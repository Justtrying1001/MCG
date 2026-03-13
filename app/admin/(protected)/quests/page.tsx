"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type LifecycleStatus = "ACTIVE" | "ARCHIVED" | "DELETED";

type QuestRow = {
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
};

export default function QuestLibraryPage() {
  const searchParams = useSearchParams();
  const campaignFilter = searchParams.get("campaign") ?? "";

  const [rows, setRows] = useState<QuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = async () => {
    const response = await fetch("/api/internal/quests/library", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { quests: QuestRow[] };
      setRows(payload.quests ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const applyLifecycle = async (questId: string, action: "DISABLE" | "ENABLE" | "ARCHIVE" | "RESTORE" | "DELETE_SOFT") => {
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
    setMessage("Quest lifecycle updated.");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (campaignFilter && !row.code.toLowerCase().startsWith(campaignFilter.toLowerCase())) return false;
      if (typeFilter !== "ALL" && row.type !== typeFilter) return false;
      if (!q) return true;
      return row.code.toLowerCase().includes(q) || row.title.toLowerCase().includes(q);
    });
  }, [campaignFilter, rows, query, typeFilter]);

  const types = [...new Set(rows.map((row) => row.type))];

  return (
    <div className="admin-page quest-admin-page">
      <section className="admin-panel quest-library-hero">
        <div>
          <h1 className="admin-title">Quest Library</h1>
          <p className="admin-subtitle">Manage social and milestone quests with clean validation, moderation-ready settings and user-facing previews.</p>
          {campaignFilter ? <p className="contest-inline-note">Campaign filter: {campaignFilter}</p> : null}
          {message ? <p className="contest-inline-note">{message}</p> : null}
        </div>
        <div className="quest-library-hero-actions">
          <Link href="/admin/quests/builder" className="btn btn-primary quest-primary-action">Create Quest</Link>
          <Link href="/admin/quests/legacy" className="btn btn-ghost">Legacy fallback</Link>
        </div>
      </section>

      <section className="admin-toolbar quest-library-toolbar">
        <input className="input" placeholder="Search by code or title" value={query} onChange={(event) => setQuery(event.target.value)} style={{ maxWidth: "320px" }} />
        <select className="input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="ALL">All objective types</option>
          {types.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <span className="admin-badge neutral">{filtered.length} quests</span>
      </section>

      <section className="admin-table quest-library-table">
        <div className="admin-table-head" style={{ gridTemplateColumns: "1fr 1.6fr 1fr 0.9fr 0.9fr 2fr" }}>
          <span>Code</span><span>Quest</span><span>Objective</span><span>Validation</span><span>Reward</span><span>Actions</span>
        </div>
        {loading ? <div className="admin-table-row"><p className="contest-inline-note">Loading quest library…</p></div> : null}
        {!loading && filtered.map((row) => {
          const lifecycle = row.lifecycleStatus ?? "ACTIVE";
          return (
            <div key={row.id} className="admin-table-row" style={{ gridTemplateColumns: "1fr 1.6fr 1fr 0.9fr 0.9fr 2fr" }}>
              <span className="contest-code">{row.code}</span>
              <div>
                <p style={{ fontWeight: 700 }}>{row.title}</p>
                <p className="contest-inline-note">{formatDate(row.startAt)} → {formatDate(row.endAt)}</p>
                <p className="contest-inline-note">Lifecycle: {lifecycle}</p>
              </div>
              <span className="admin-badge neutral">{row.type === "CONTEST_COUNT_MILESTONE" ? "MILESTONE" : "SOCIAL"}</span>
              <span className="admin-badge neutral">{row.validationMode}</span>
              <span>{row.rewardPoints} pts</span>
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
        {!loading && filtered.length === 0 ? <div className="admin-table-row"><p className="contest-inline-note">No quests matching current filters.</p></div> : null}
      </section>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}
