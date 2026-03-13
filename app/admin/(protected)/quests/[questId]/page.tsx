"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type QuestDetailPayload = {
  quest: {
    id: string;
    code: string;
    type: string;
    title: string;
    description: string | null;
    rewardPoints: number;
    validationMode: string;
    oneTime: boolean;
    isActive: boolean;
    startAt: string | null;
    endAt: string | null;
    config: Record<string, unknown> | null;
  };
  analytics: {
    progressCount: number;
    completedCount: number;
    pendingSubmissionCount: number;
    approvedSubmissionCount: number;
    rejectedSubmissionCount: number;
    totalPointsDistributed: number;
  };
  latestSubmissions: Array<{
    id: string;
    status: string;
    proofUrl: string | null;
    note: string | null;
    reviewedByAdmin: string | null;
    reviewedAt: string | null;
    createdAt: string;
    user: { id: string; xUsername: string; displayName: string };
  }>;
  latestLedgerCredits: Array<{
    id: string;
    userId: string;
    amount: number;
    createdAt: string;
    user: { id: string; xUsername: string; displayName: string };
  }>;
};

export default function QuestDetailPerformancePage({ params }: { params: { questId: string } }) {
  const [data, setData] = useState<QuestDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      const response = await fetch(`/api/internal/quests/${params.questId}`, { cache: "no-store" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Cannot load quest detail");
        setLoading(false);
        return;
      }
      const payload = (await response.json()) as QuestDetailPayload;
      setData(payload);
      setLoading(false);
    };

    void load();
  }, [params.questId]);

  const configSummary = useMemo(() => {
    const config = data?.quest.config ?? {};
    return {
      threshold: typeof config.threshold === "number" ? config.threshold : null,
      targetValue: typeof config.targetValue === "number" ? config.targetValue : null,
      milestoneType: typeof config.milestoneType === "string" ? config.milestoneType : null,
      targetUrl: typeof config.targetUrl === "string" ? config.targetUrl : null,
      instructions: typeof config.instructions === "string" ? config.instructions : null,
      socialAction: typeof config.socialAction === "string" ? config.socialAction : null,
      proofRequired: typeof config.proofRequired === "boolean" ? config.proofRequired : null,
      ctaLabel: typeof config.ctaLabel === "string" ? config.ctaLabel : null,
      lifecycleStatus: typeof config.lifecycleStatus === "string" ? config.lifecycleStatus : "ACTIVE",
    };
  }, [data]);


  const updateLifecycle = async (action: "DISABLE" | "ENABLE" | "ARCHIVE" | "RESTORE" | "DELETE_SOFT") => {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/internal/quests/${params.questId}/lifecycle`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setMessage(payload?.error ?? "Cannot update lifecycle");
      setBusy(false);
      return;
    }
    setMessage("Lifecycle updated.");
    setBusy(false);
    const refresh = await fetch(`/api/internal/quests/${params.questId}`, { cache: "no-store" });
    if (refresh.ok) setData(await refresh.json());
  };

  return (
    <div className="admin-page">
      <section className="admin-panel">
        <Link href="/admin/quests" className="contest-inline-note">← Back to quest library</Link>
      </section>

      {loading ? <section className="admin-panel"><p className="contest-inline-note">Loading quest detail…</p></section> : null}
      {error ? <section className="admin-panel"><p className="contest-error">{error}</p></section> : null}
      {message ? <section className="admin-panel"><p className="contest-inline-note">{message}</p></section> : null}

      {data ? (
        <>
          <section className="admin-panel">
            <div className="contest-card-top">
              <p className="contest-code">{data.quest.code}</p>
              <span className={`contest-status status-${data.quest.isActive ? "live" : "canceled"}`}>{data.quest.isActive ? "ACTIVE" : "INACTIVE"}</span>
            </div>
            <h1 className="admin-title">{data.quest.title}</h1>
            <p className="contest-inline-note">Objective: {data.quest.type} · Validation: {data.quest.validationMode} · Reward: {data.quest.rewardPoints} pts</p>
            <p className="contest-inline-note">Window: {formatDate(data.quest.startAt)} → {formatDate(data.quest.endAt)}</p>
            <p className="contest-inline-note">Lifecycle: {configSummary.lifecycleStatus}</p>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
              <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => void updateLifecycle(data.quest.isActive ? "DISABLE" : "ENABLE")}>{data.quest.isActive ? "Disable" : "Enable"}</button>
              <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => void updateLifecycle("ARCHIVE")}>Archive</button>
              <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => void updateLifecycle("DELETE_SOFT")}>Delete</button>
            </div>
          </section>

          <section className="admin-panel">
            <p className="admin-section-title">Quest config summary</p>
            <p className="contest-inline-note">Milestone type: {configSummary.milestoneType ?? "—"}</p>
            <p className="contest-inline-note">Target value: {configSummary.targetValue ?? configSummary.threshold ?? "—"}</p>
            <p className="contest-inline-note">Social action: {configSummary.socialAction ?? "—"}</p>
            <p className="contest-inline-note">Target URL: {configSummary.targetUrl ?? "—"}</p>
            <p className="contest-inline-note">Instructions: {configSummary.instructions ?? "—"}</p>
            <p className="contest-inline-note">CTA label: {configSummary.ctaLabel ?? "—"}</p>
            <p className="contest-inline-note">Proof required: {configSummary.proofRequired === null ? "—" : configSummary.proofRequired ? "Yes" : "No"}</p>
          </section>

          <section className="admin-panel">
            <p className="admin-section-title">Performance funnel</p>
            <div className="contest-meta-grid">
              <Metric label="Progress records" value={String(data.analytics.progressCount)} />
              <Metric label="Completed" value={String(data.analytics.completedCount)} />
              <Metric label="Pending submissions" value={String(data.analytics.pendingSubmissionCount)} />
              <Metric label="Approved submissions" value={String(data.analytics.approvedSubmissionCount)} />
              <Metric label="Rejected submissions" value={String(data.analytics.rejectedSubmissionCount)} />
              <Metric label="Points distributed" value={String(data.analytics.totalPointsDistributed)} />
            </div>
            <div style={{ marginTop: "0.5rem" }}>
              <Link href={`/admin/moderation?questId=${data.quest.id}`} className="contest-inline-note">Open moderation queue for this quest</Link>
            </div>
          </section>

          <section className="admin-panel">
            <p className="admin-section-title">Latest submissions</p>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {data.latestSubmissions.map((row) => (
                <div key={row.id} className="contest-card">
                  <p className="contest-inline-note">{row.user.displayName} (@{row.user.xUsername}) · {row.status}</p>
                  <p className="contest-inline-note">Evidence: {row.proofUrl || row.note || "—"}</p>
                  <p className="contest-inline-note">Created: {new Date(row.createdAt).toLocaleString()}</p>
                  <Link href={`/admin/moderation/${row.id}`} className="contest-inline-note">Open review detail</Link>
                </div>
              ))}
              {data.latestSubmissions.length === 0 ? <p className="contest-inline-note">No submissions yet.</p> : null}
            </div>
          </section>

          <section className="admin-panel">
            <p className="admin-section-title">Reward distribution snapshot</p>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {data.latestLedgerCredits.map((row) => (
                <div key={row.id} className="contest-card">
                  <p className="contest-inline-note">{row.user.displayName} (@{row.user.xUsername}) · +{row.amount}</p>
                  <p className="contest-inline-note">{new Date(row.createdAt).toLocaleString()}</p>
                </div>
              ))}
              {data.latestLedgerCredits.length === 0 ? <p className="contest-inline-note">No reward credits yet.</p> : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="contest-meta-label">{label}</p>
      <p className="contest-meta-value">{value}</p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}
