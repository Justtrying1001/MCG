"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { SiteShell } from "@/components/layout/SiteShell";

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
    config: unknown;
    createdAt: string;
    updatedAt: string;
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
  recentlyCompletedUsers: Array<{
    userId: string;
    completedAt: string;
    progressValue: number;
    user: { id: string; xUsername: string; displayName: string };
  }>;
  latestLedgerCredits: Array<{
    id: string;
    userId: string;
    amount: number;
    idempotencyKey: string | null;
    createdAt: string;
    metadata: unknown;
    user: { id: string; xUsername: string; displayName: string };
  }>;
};

export default function AdminQuestDetailPage({ params }: { params: { questId: string } }) {
  const [data, setData] = useState<QuestDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
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

  return (
    <SiteShell>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Quest Detail</h1>
          <p className="page-subtitle">Operational view for quest status, analytics, submissions, and credits.</p>
        </div>
        <AdminLogoutButton />
      </div>

      <section className="contest-section" style={{ marginBottom: "1rem" }}>
        <Link href="/admin/quests" className="contest-inline-note">← Back to quests</Link>
      </section>

      {loading ? <p className="contest-inline-note">Loading quest detail…</p> : null}
      {error ? <p className="contest-error">{error}</p> : null}

      {data ? (
        <div style={{ display: "grid", gap: "1rem" }}>
          <section className="contest-section">
            <h2 className="contest-section-title">Quest identity</h2>
            <p className="contest-inline-note">ID: {data.quest.id}</p>
            <p className="contest-inline-note">Code: {data.quest.code}</p>
            <p className="contest-inline-note">Type: {data.quest.type}</p>
            <p className="contest-inline-note">Title: {data.quest.title}</p>
            <p className="contest-inline-note">Description: {data.quest.description || "—"}</p>
            <p className="contest-inline-note">Reward: {data.quest.rewardPoints} points</p>
            <p className="contest-inline-note">Active: {data.quest.isActive ? "Yes" : "No"} · One-time: {data.quest.oneTime ? "Yes" : "No"}</p>
            <p className="contest-inline-note">Validation: {data.quest.validationMode}</p>
            <p className="contest-inline-note">Start: {data.quest.startAt ? new Date(data.quest.startAt).toLocaleString() : "—"}</p>
            <p className="contest-inline-note">End: {data.quest.endAt ? new Date(data.quest.endAt).toLocaleString() : "—"}</p>
            <pre className="contest-inline-note" style={{ whiteSpace: "pre-wrap" }}>Config: {JSON.stringify(data.quest.config ?? {}, null, 2)}</pre>
          </section>

          <section className="contest-section">
            <h2 className="contest-section-title">Analytics</h2>
            <p className="contest-inline-note">Progress records: {data.analytics.progressCount}</p>
            <p className="contest-inline-note">Completed users: {data.analytics.completedCount}</p>
            <p className="contest-inline-note">Submissions pending/approved/rejected: {data.analytics.pendingSubmissionCount}/{data.analytics.approvedSubmissionCount}/{data.analytics.rejectedSubmissionCount}</p>
            <p className="contest-inline-note">Total points distributed: {data.analytics.totalPointsDistributed}</p>
          </section>

          <section className="contest-section">
            <h2 className="contest-section-title">Latest submissions</h2>
            {data.latestSubmissions.length === 0 ? <p className="contest-inline-note">No submissions yet.</p> : null}
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {data.latestSubmissions.map((row) => (
                <div key={row.id} className="contest-card">
                  <p className="contest-inline-note">{row.user.displayName} (@{row.user.xUsername}) · {row.status}</p>
                  <p className="contest-inline-note">Proof: {row.proofUrl || "—"}</p>
                  <p className="contest-inline-note">Note: {row.note || "—"}</p>
                  <p className="contest-inline-note">Created: {new Date(row.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="contest-section">
            <h2 className="contest-section-title">Recently completed users</h2>
            {data.recentlyCompletedUsers.length === 0 ? <p className="contest-inline-note">No completions yet.</p> : null}
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {data.recentlyCompletedUsers.map((row) => (
                <div key={`${row.userId}:${row.completedAt}`} className="contest-card">
                  <p className="contest-inline-note">{row.user.displayName} (@{row.user.xUsername})</p>
                  <p className="contest-inline-note">Progress value: {row.progressValue}</p>
                  <p className="contest-inline-note">Completed: {new Date(row.completedAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="contest-section">
            <h2 className="contest-section-title">Latest ledger credits</h2>
            {data.latestLedgerCredits.length === 0 ? <p className="contest-inline-note">No reward credits yet.</p> : null}
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {data.latestLedgerCredits.map((row) => (
                <div key={row.id} className="contest-card">
                  <p className="contest-inline-note">{row.user.displayName} (@{row.user.xUsername}) · +{row.amount}</p>
                  <p className="contest-inline-note">Idempotency: {row.idempotencyKey || "—"}</p>
                  <p className="contest-inline-note">Created: {new Date(row.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </SiteShell>
  );
}
