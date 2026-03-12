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

  const filtered = useMemo(() => (slaFilter === "ALL" ? items : items.filter((item) => item.slaLevel === slaFilter)), [items, slaFilter]);

  return (
    <div className="admin-page">
      <section className="admin-page-header">
        <div>
          <h1 className="admin-title">Moderation Queue</h1>
          <p className="admin-subtitle">Work queue with SLA and evidence quality signals to speed consistent reviewer decisions.</p>
          {questId ? <p className="contest-inline-note">Quest filter: {questId}</p> : null}
          {campaign ? <p className="contest-inline-note">Campaign filter: {campaign}</p> : null}
        </div>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <Link href="/admin/moderation/history" className="admin-badge neutral">Decision history</Link>
          <Link href="/admin/quests/submissions" className="admin-badge neutral">Legacy fallback</Link>
        </div>
      </section>

      <section className="admin-toolbar">
        <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
          <option value="SUBMITTED">SUBMITTED</option><option value="APPROVED">APPROVED</option><option value="REJECTED">REJECTED</option><option value="ALL">ALL</option>
        </select>
        <select className="input" value={slaFilter} onChange={(event) => setSlaFilter(event.target.value as typeof slaFilter)}>
          <option value="ALL">All SLA levels</option><option value="OK">OK</option><option value="AT_RISK">AT_RISK</option><option value="BREACH">BREACH</option>
        </select>
        <span className="admin-badge neutral">{filtered.length} rows</span>
      </section>

      <section className="admin-kpi-grid">
        <Kpi label="Breach" value={String(filtered.filter((item) => item.slaLevel === "BREACH").length)} tone="danger" />
        <Kpi label="At risk" value={String(filtered.filter((item) => item.slaLevel === "AT_RISK").length)} tone="warn" />
        <Kpi label="Missing evidence" value={String(filtered.filter((item) => item.evidenceCompleteness === "EMPTY").length)} tone="warn" />
      </section>

      {loading ? <section className="admin-panel"><p className="contest-inline-note">Loading queue…</p></section> : null}
      {error ? <section className="admin-panel"><p className="contest-error">{error}</p></section> : null}

      {!loading && !error ? (
        <section className="admin-table">
          <div className="admin-table-head" style={{ gridTemplateColumns: "0.9fr 1.6fr 1fr 0.8fr 0.9fr 1.6fr" }}>
            <span>Quest</span><span>User</span><span>Status</span><span>SLA</span><span>Evidence</span><span>Actions</span>
          </div>
          {filtered.map((item) => (
            <div key={item.id} className="admin-table-row" style={{ gridTemplateColumns: "0.9fr 1.6fr 1fr 0.8fr 0.9fr 1.6fr" }}>
              <div>
                <p className="contest-code">{item.quest.code}</p>
                <p className="contest-inline-note">{item.quest.title}</p>
              </div>
              <div>
                <p style={{ fontWeight: 700 }}>{item.user.displayName || "Unknown"}</p>
                <p className="contest-inline-note">@{item.user.xUsername || "—"} · {item.ageHours}h</p>
              </div>
              <span className={`admin-badge ${item.status === "SUBMITTED" ? "warn" : item.status === "APPROVED" ? "success" : "danger"}`}>{item.status}</span>
              <span className={`admin-badge ${item.slaLevel === "BREACH" ? "danger" : item.slaLevel === "AT_RISK" ? "warn" : "success"}`}>{item.slaLevel}</span>
              <span className="contest-inline-note" style={{ color: "#d1d5db" }}>{item.evidenceCompleteness}</span>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                <Link href={`/admin/moderation/${item.id}`} className="admin-badge neutral">Review</Link>
                <Link href={`/admin/quests/${item.quest.id}`} className="admin-badge neutral">Quest</Link>
              </div>
            </div>
          ))}
          {filtered.length === 0 ? <div className="admin-table-row"><p className="contest-inline-note">No submissions for current filters.</p></div> : null}
        </section>
      ) : null}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: "success" | "warn" | "danger" }) {
  return <div className="admin-kpi"><p className="admin-kpi-label">{label}</p><p className="admin-kpi-value">{value}</p><span className={`admin-badge ${tone}`}>{tone.toUpperCase()}</span></div>;
}
