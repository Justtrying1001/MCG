"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

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
};

export default function QuestLibraryPage() {
  const searchParams = useSearchParams();
  const campaignFilter = searchParams.get("campaign") ?? "";

  const [rows, setRows] = useState<QuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/internal/quests/library", { cache: "no-store" });
      if (response.ok) {
        const payload = (await response.json()) as { quests: QuestRow[] };
        setRows(payload.quests ?? []);
      }
      setLoading(false);
    };
    void load();
  }, []);

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
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="contest-section">
        <h1 className="page-title">Quest Library</h1>
        <p className="page-subtitle">Readable quest catalog by objective type, validation policy and reward summary.</p>
        {campaignFilter ? <p className="contest-inline-note">Campaign filter: {campaignFilter}</p> : null}
      </section>

      <section className="contest-section" style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
        <input className="input" placeholder="Search code/title" value={query} onChange={(event) => setQuery(event.target.value)} style={{ maxWidth: "280px" }} />
        <select className="input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="ALL">All objective types</option>
          {types.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <Link href="/admin/quests/builder" className="contest-inline-note">Create quest (guided builder)</Link>
        <Link href="/admin/quests/legacy" className="contest-inline-note">Open legacy quest admin</Link>
      </section>

      <section className="contest-section" style={{ display: "grid", gap: "0.5rem" }}>
        {loading ? <p className="contest-inline-note">Loading quest library…</p> : null}
        {!loading && filtered.map((row) => (
          <div key={row.id} className="contest-card">
            <div className="contest-card-top">
              <p className="contest-code">{row.code}</p>
              <span className={`contest-status status-${row.isActive ? "live" : "canceled"}`}>{row.isActive ? "ACTIVE" : "INACTIVE"}</span>
            </div>
            <h3 className="contest-title">{row.title}</h3>
            <p className="contest-inline-note">Objective: {row.type} · Validation: {row.validationMode} · Reward: {row.rewardPoints} pts</p>
            <p className="contest-inline-note">Period: {formatDate(row.startAt)} → {formatDate(row.endAt)}</p>
            <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
              <Link href={`/admin/quests/${row.id}`} className="contest-inline-note">Performance view</Link>
              <Link href={`/admin/quests/builder?questId=${row.id}`} className="contest-inline-note">Edit in builder</Link>
              <Link href={`/admin/moderation?questId=${row.id}`} className="contest-inline-note">Open moderation queue</Link>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 ? <p className="contest-inline-note">No quests matching current filters.</p> : null}
      </section>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}
