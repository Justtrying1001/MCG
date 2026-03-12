"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CampaignRow = {
  code: string;
  name: string;
  startAt: string | null;
  endAt: string | null;
  status: "ACTIVE" | "INACTIVE";
  activeQuests: number;
  questCount: number;
};

export default function CampaignsCatalogPage() {
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/internal/campaigns/catalog", { cache: "no-store" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Cannot load campaigns catalog");
        setLoading(false);
        return;
      }

      const payload = (await response.json()) as { campaigns: CampaignRow[] };
      setRows(payload.campaigns ?? []);
      setLoading(false);
    };

    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "ALL" && row.status !== statusFilter) return false;
      if (!q) return true;
      return row.code.toLowerCase().includes(q) || row.name.toLowerCase().includes(q);
    });
  }, [query, rows, statusFilter]);

  return (
    <div className="admin-page">
      <section className="admin-page-header">
        <div>
          <h1 className="admin-title">Campaign Catalog</h1>
          <p className="admin-subtitle">Compact campaign surface with quest volume and fast routing to moderation and quest library.</p>
        </div>
      </section>

      <section className="admin-toolbar">
        <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search campaign code/name" style={{ maxWidth: "260px" }} />
        <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | "ACTIVE" | "INACTIVE")}>
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <Link href="/admin/quests" className="admin-badge neutral">Quest library</Link>
        <span className="admin-badge neutral">{filtered.length} campaigns</span>
      </section>

      {loading ? <section className="admin-panel"><p className="contest-inline-note">Loading campaign catalog…</p></section> : null}
      {error ? <section className="admin-panel"><p className="contest-error">{error}</p></section> : null}

      {!loading && !error ? (
        <section className="admin-table">
          <div className="admin-table-head" style={{ gridTemplateColumns: "1fr 1.4fr 0.8fr 0.8fr 0.8fr 1.6fr" }}>
            <span>Code</span><span>Name</span><span>Status</span><span>Quests</span><span>Active</span><span>Actions</span>
          </div>
          {filtered.map((row) => (
            <div key={row.code} className="admin-table-row" style={{ gridTemplateColumns: "1fr 1.4fr 0.8fr 0.8fr 0.8fr 1.6fr" }}>
              <span className="contest-code">{row.code}</span>
              <div>
                <p style={{ fontWeight: 700 }}>{row.name}</p>
                <p className="contest-inline-note">{formatDate(row.startAt)} → {formatDate(row.endAt)}</p>
              </div>
              <span className={`admin-badge ${row.status === "ACTIVE" ? "success" : "neutral"}`}>{row.status}</span>
              <span>{row.questCount}</span>
              <span>{row.activeQuests}</span>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                <Link href={`/admin/quests?campaign=${encodeURIComponent(row.code)}`} className="admin-badge neutral">Quests</Link>
                <Link href={`/admin/moderation?campaign=${encodeURIComponent(row.code)}`} className="admin-badge neutral">Queue</Link>
                <Link href={`/admin/moderation/history?campaign=${encodeURIComponent(row.code)}`} className="admin-badge neutral">History</Link>
              </div>
            </div>
          ))}
          {filtered.length === 0 ? <div className="admin-table-row"><p className="contest-inline-note">No campaigns matching filters.</p></div> : null}
        </section>
      ) : null}
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}
