"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type DecisionItem = {
  id: string;
  status: "APPROVED" | "REJECTED";
  decisionCode: string | null;
  note: string | null;
  reviewer: string | null;
  reviewedAt: string | null;
  quest: { id: string; code: string; title: string };
  user: { id: string; handle: string | null; displayName: string | null };
};

export default function ModerationHistoryPage() {
  const searchParams = useSearchParams();

  const [items, setItems] = useState<DecisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<"ALL" | "APPROVED" | "REJECTED">("ALL");

  const questId = searchParams.get("questId") ?? "";
  const userId = searchParams.get("userId") ?? "";
  const campaign = searchParams.get("campaign") ?? "";

  useEffect(() => {
    const params = new URLSearchParams();
    if (questId) params.set("questId", questId);
    if (userId) params.set("userId", userId);
    if (campaign) params.set("campaign", campaign);

    const load = async () => {
      const response = await fetch(`/api/internal/moderation/decisions?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Cannot load moderation history");
        setLoading(false);
        return;
      }

      const payload = (await response.json()) as { items: DecisionItem[] };
      setItems(payload.items ?? []);
      setError("");
      setLoading(false);
    };

    void load();
  }, [campaign, questId, userId]);

  const filtered = useMemo(() => {
    if (decisionFilter === "ALL") return items;
    return items.filter((item) => item.status === decisionFilter);
  }, [decisionFilter, items]);

  return (
    <div className="admin-page">
      <section className="admin-panel">
        <h1 className="admin-title">Moderation Decision History</h1>
        <p className="admin-subtitle">Auditable history by reviewer, reason code, note and linked quest/user context.</p>
        {campaign ? <p className="contest-inline-note">Campaign filter: {campaign}</p> : null}
      </section>

      <section className="admin-panel" style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
        <select className="input" value={decisionFilter} onChange={(event) => setDecisionFilter(event.target.value as typeof decisionFilter)}>
          <option value="ALL">All decisions</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
        <Link href="/admin/moderation" className="contest-inline-note">Back to moderation queue</Link>
      </section>

      {loading ? <section className="admin-panel"><p className="contest-inline-note">Loading history…</p></section> : null}
      {error ? <section className="admin-panel"><p className="contest-error">{error}</p></section> : null}

      {!loading && !error ? (
        <section className="admin-panel" style={{ display: "grid", gap: "0.5rem" }}>
          {filtered.map((item) => (
            <div key={item.id} className="contest-card">
              <div className="contest-card-top">
                <p className="contest-code">{item.quest.code}</p>
                <span className={`contest-status status-${item.status === "APPROVED" ? "approved" : "rejected"}`}>{item.status}</span>
              </div>
              <h3 className="contest-title">{item.quest.title}</h3>
              <p className="contest-inline-note">User: {item.user.displayName || "Unknown"} @{item.user.handle || "—"}</p>
              <p className="contest-inline-note">Reviewer: {item.reviewer || "admin"} · Decision code: {item.decisionCode || "—"}</p>
              <p className="contest-inline-note">Note: {item.note || "—"}</p>
              <p className="contest-inline-note">Reviewed at: {item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : "—"}</p>
              <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
                <Link href={`/admin/moderation/${item.id}`} className="contest-inline-note">Open submission detail</Link>
                <Link href={`/admin/quests/${item.quest.id}`} className="contest-inline-note">Open quest detail</Link>
              </div>
            </div>
          ))}
          {filtered.length === 0 ? <p className="contest-inline-note">No decision rows found.</p> : null}
        </section>
      ) : null}
    </div>
  );
}
