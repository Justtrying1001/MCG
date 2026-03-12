"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type QueueItem = {
  id: string;
  status: "SUBMITTED" | "APPROVED" | "REJECTED";
  ageHours: number;
  slaLevel: "OK" | "AT_RISK" | "BREACH";
  evidenceCompleteness: "HAS_URL" | "NOTE_ONLY" | "EMPTY";
  createdAt: string;
  quest: { id: string; code: string; title: string; rewardPoints: number };
  user: { id: string; xUsername: string | null; displayName: string | null };
};

export default function ModerationQueuePage() {
  const searchParams = useSearchParams();
  const questId = searchParams.get("questId") ?? "";
  const campaign = searchParams.get("campaign") ?? "";

  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"SUBMITTED" | "APPROVED" | "REJECTED" | "ALL">("SUBMITTED");
  const [slaFilter, setSlaFilter] = useState<"ALL" | "OK" | "AT_RISK" | "BREACH">("ALL");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams({ status: statusFilter });
      if (questId) params.set("questId", questId);
      if (campaign) params.set("campaign", campaign);
      const response = await fetch(`/api/internal/moderation/queue?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Cannot load moderation queue");
        setLoading(false);
        return;
      }

      const payload = (await response.json()) as { items: QueueItem[] };
      setItems(payload.items ?? []);
      setError("");
      setLoading(false);
    };

    void load();
  }, [campaign, questId, statusFilter]);

  const filtered = useMemo(() => {
    if (slaFilter === "ALL") return items;
    return items.filter((item) => item.slaLevel === slaFilter);
  }, [items, slaFilter]);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="contest-section">
        <h1 className="page-title">Moderation Queue</h1>
        <p className="page-subtitle">Queue-first moderation with SLA health, evidence completeness, and direct review links.</p>
        {questId ? <p className="contest-inline-note">Quest filter: {questId}</p> : null}
        {campaign ? <p className="contest-inline-note">Campaign filter: {campaign}</p> : null}
      </section>

      <section className="contest-section" style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center" }}>
        <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
          <option value="SUBMITTED">SUBMITTED</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="ALL">ALL</option>
        </select>
        <select className="input" value={slaFilter} onChange={(event) => setSlaFilter(event.target.value as typeof slaFilter)}>
          <option value="ALL">All SLA levels</option>
          <option value="OK">OK</option>
          <option value="AT_RISK">AT_RISK</option>
          <option value="BREACH">BREACH</option>
        </select>
        <Link href="/admin/moderation/history" className="contest-inline-note">Open decision history</Link>
        <Link href="/admin/quests/submissions" className="contest-inline-note">Legacy moderation fallback</Link>
      </section>

      <section className="contest-section">
        <div className="contest-meta-grid">
          <Stat label="Items" value={String(filtered.length)} />
          <Stat label="SLA BREACH" value={String(filtered.filter((item) => item.slaLevel === "BREACH").length)} />
          <Stat label="At risk" value={String(filtered.filter((item) => item.slaLevel === "AT_RISK").length)} />
          <Stat label="Missing evidence" value={String(filtered.filter((item) => item.evidenceCompleteness === "EMPTY").length)} />
        </div>
      </section>

      {loading ? <section className="contest-section"><p className="contest-inline-note">Loading queue…</p></section> : null}
      {error ? <section className="contest-section"><p className="contest-error">{error}</p></section> : null}

      {!loading && !error ? (
        <section className="contest-section" style={{ display: "grid", gap: "0.5rem" }}>
          {filtered.map((item) => (
            <div key={item.id} className="contest-card">
              <div className="contest-card-top">
                <p className="contest-code">{item.quest.code}</p>
                <span className={`contest-status status-${item.status.toLowerCase()}`}>{item.status}</span>
              </div>
              <h3 className="contest-title">{item.quest.title}</h3>
              <p className="contest-inline-note">User: {item.user.displayName || "Unknown"} @{item.user.xUsername || "—"}</p>
              <p className="contest-inline-note">Age: {item.ageHours}h · SLA: {item.slaLevel} · Evidence: {item.evidenceCompleteness}</p>
              <p className="contest-inline-note">Submitted: {new Date(item.createdAt).toLocaleString()}</p>
              <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", marginTop: "0.45rem" }}>
                <Link href={`/admin/moderation/${item.id}`} className="contest-inline-note">Open review detail</Link>
                <Link href={`/admin/quests/${item.quest.id}`} className="contest-inline-note">Open quest detail</Link>
              </div>
            </div>
          ))}
          {filtered.length === 0 ? <p className="contest-inline-note">No submissions for current filters.</p> : null}
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="contest-meta-label">{label}</p>
      <p className="contest-meta-value">{value}</p>
    </div>
  );
}
