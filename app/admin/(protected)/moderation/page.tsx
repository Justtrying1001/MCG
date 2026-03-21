"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  AdminDataTable,
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminStatStrip,
  AdminStatusBadge,
  AdminTableHead,
  AdminTableRow,
  AdminToolbar,
} from "@/components/admin/AdminUi";

type QueueItem = {
  id: string;
  status: "SUBMITTED" | "APPROVED" | "REJECTED";
  ageHours: number;
  slaLevel: "OK" | "AT_RISK" | "BREACH";
  evidenceCompleteness: "HAS_URL" | "NOTE_ONLY" | "EMPTY";
  createdAt: string;
  quest: { id: string; code: string; title: string; rewardPoints: number };
  user: { id: string; handle: string | null; displayName: string | null };
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
    <div className="admin-page admin-v2-page">
      <AdminPageHeader
        title="Moderation"
        subtitle="Review queue prioritised by SLA risk and evidence quality for fast, consistent decisions."
        actions={
          <div className="admin-v2-action-row">
            <Link href="/admin/moderation/history" className="admin-v2-link-chip">Decision history</Link>
            <Link href="/admin/quests/submissions" className="admin-v2-link-chip">Legacy submissions</Link>
          </div>
        }
      />

      <AdminToolbar>
        <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
          <option value="SUBMITTED">SUBMITTED</option><option value="APPROVED">APPROVED</option><option value="REJECTED">REJECTED</option><option value="ALL">ALL</option>
        </select>
        <select className="input" value={slaFilter} onChange={(event) => setSlaFilter(event.target.value as typeof slaFilter)}>
          <option value="ALL">All SLA levels</option><option value="OK">OK</option><option value="AT_RISK">AT_RISK</option><option value="BREACH">BREACH</option>
        </select>
        <AdminStatusBadge tone="neutral" label={`${filtered.length} rows`} />
      </AdminToolbar>

      <AdminStatStrip items={[
        { label: "Breach", value: String(filtered.filter((item) => item.slaLevel === "BREACH").length), tone: "danger" },
        { label: "At risk", value: String(filtered.filter((item) => item.slaLevel === "AT_RISK").length), tone: "warn" },
        { label: "Missing evidence", value: String(filtered.filter((item) => item.evidenceCompleteness === "EMPTY").length), tone: "warn" },
      ]} />

      {loading ? <AdminPanel><AdminEmptyState title="Loading queue…" /></AdminPanel> : null}
      {error ? <AdminPanel><AdminEmptyState title="Queue unavailable" description={error} /></AdminPanel> : null}

      {!loading && !error ? (
        <AdminPanel>
          <AdminDataTable columns="1.3fr 1.4fr .8fr .8fr .8fr 1.2fr">
            <AdminTableHead>
              <span>Quest</span><span>User</span><span>Status</span><span>SLA</span><span>Evidence</span><span>Actions</span>
            </AdminTableHead>
            {filtered.map((item) => (
              <AdminTableRow key={item.id}>
                <div>
                  <p className="contest-code">{item.quest.code}</p>
                  <p className="contest-inline-note">{item.quest.title}</p>
                </div>
                <div>
                  <strong>{item.user.displayName || "Unknown"}</strong>
                  <p className="contest-inline-note">@{item.user.handle || "—"} · {item.ageHours}h</p>
                </div>
                <AdminStatusBadge tone={item.status === "SUBMITTED" ? "warn" : item.status === "APPROVED" ? "success" : "danger"} label={item.status} />
                <AdminStatusBadge tone={item.slaLevel === "BREACH" ? "danger" : item.slaLevel === "AT_RISK" ? "warn" : "success"} label={item.slaLevel} />
                <span className="contest-inline-note">{item.evidenceCompleteness}</span>
                <div className="admin-v2-action-row">
                  <Link href={`/admin/moderation/${item.id}`} className="admin-v2-link-chip">Review</Link>
                  <Link href={`/admin/quests/${item.quest.id}`} className="admin-v2-link-chip">Quest</Link>
                </div>
              </AdminTableRow>
            ))}
            {filtered.length === 0 ? <AdminTableRow><span>No submissions for current filters.</span></AdminTableRow> : null}
          </AdminDataTable>
        </AdminPanel>
      ) : null}
    </div>
  );
}
