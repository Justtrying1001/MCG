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
  questIds: string[];
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
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="contest-section">
        <h1 className="page-title">Campaign Catalog</h1>
        <p className="page-subtitle">Campaign entrypoint grouped from quests with activity status, active window and moderation shortcuts.</p>
      </section>

      <section className="contest-section" style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center" }}>
        <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search campaign code/name" style={{ maxWidth: "260px" }} />
        <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | "ACTIVE" | "INACTIVE")}>
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <Link href="/admin/quests" className="contest-inline-note">Open quest library</Link>
      </section>

      {loading ? <section className="contest-section"><p className="contest-inline-note">Loading campaign catalog…</p></section> : null}
      {error ? <section className="contest-section"><p className="contest-error">{error}</p></section> : null}

      {!loading && !error ? (
        <section className="contest-section" style={{ display: "grid", gap: "0.5rem" }}>
          {filtered.map((row) => (
            <div key={row.code} className="contest-card">
              <div className="contest-card-top">
                <p className="contest-code">{row.code}</p>
                <span className={`contest-status status-${row.status === "ACTIVE" ? "live" : "canceled"}`}>{row.status}</span>
              </div>
              <h3 className="contest-title">{row.name}</h3>
              <p className="contest-inline-note">Period: {formatDate(row.startAt)} → {formatDate(row.endAt)}</p>
              <p className="contest-inline-note">Quests: {row.questCount} total · {row.activeQuests} active</p>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.45rem" }}>
                <Link href={`/admin/quests?campaign=${encodeURIComponent(row.code)}`} className="contest-inline-note">Open linked quests</Link>
                <Link href={`/admin/moderation?campaign=${encodeURIComponent(row.code)}`} className="contest-inline-note">Open moderation queue</Link>
                <Link href={`/admin/moderation/history?campaign=${encodeURIComponent(row.code)}`} className="contest-inline-note">Decision history</Link>
              </div>
            </div>
          ))}
          {filtered.length === 0 ? <p className="contest-inline-note">No campaigns matching current filters.</p> : null}
        </section>
      ) : null}
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}
