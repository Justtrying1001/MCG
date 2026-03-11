"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";

type SubmissionStatus = "SUBMITTED" | "APPROVED" | "REJECTED";

type SubmissionRow = {
  id: string;
  status: SubmissionStatus;
  proofUrl: string | null;
  note: string | null;
  reviewedByAdmin: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: { id: string; xUsername: string; displayName: string };
  quest: { id: string; code: string; type: string; title: string; rewardPoints: number };
};

const FILTERS: Array<"ALL" | SubmissionStatus> = ["ALL", "SUBMITTED", "APPROVED", "REJECTED"];
const REJECT_REASON_OPTIONS = ["PROOF_NOT_VALID", "OUT_OF_SCOPE", "DUPLICATE_SUBMISSION", "MISSING_REQUIREMENTS"];

export default function AdminQuestSubmissionsPage() {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | SubmissionStatus>("SUBMITTED");
  const [actionMessage, setActionMessage] = useState("");
  const [rejectReasonCode, setRejectReasonCode] = useState("PROOF_NOT_VALID");

  const loadRows = async () => {
    setLoading(true);
    setError("");

    const query = statusFilter === "ALL" ? "" : `?status=${statusFilter}`;
    const response = await fetch(`/api/internal/quests/submissions${query}`, { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Cannot load submissions");
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as { submissions: SubmissionRow[] };
    setRows(payload.submissions ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void loadRows();
  }, [statusFilter]);

  const review = async (submissionId: string, action: "APPROVE" | "REJECT") => {
    setActionMessage("");

    const response = await fetch(`/api/internal/quests/submissions/${submissionId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        ...(action === "REJECT" ? { decisionCode: rejectReasonCode } : {}),
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setActionMessage(payload?.error ?? "Review action failed");
      return;
    }

    setActionMessage(`Submission ${action === "APPROVE" ? "approved" : `rejected (${rejectReasonCode})`}.`);
    await loadRows();
  };

  return (
    <SiteShell>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Quest Submissions</h1>
          <p className="page-subtitle">Review user social quest proof submissions.</p>
        </div>
        <AdminLogoutButton />
      </div>

      <section className="contest-section" style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/admin/quests" className="contest-inline-note">← Back to quest definitions</Link>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <span className="contest-inline-note">Filter:</span>
          <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | SubmissionStatus)}>
            {FILTERS.map((filter) => <option key={filter} value={filter}>{filter}</option>)}
          </select>
        </div>
      </section>

      <section className="contest-section" style={{ marginBottom: "1rem", display: "grid", gap: "0.4rem", maxWidth: 420 }}>
        <span className="contest-inline-note">Reject reason code</span>
        <select className="input" value={rejectReasonCode} onChange={(event) => setRejectReasonCode(event.target.value)}>
          {REJECT_REASON_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </section>

      {actionMessage ? <p className="contest-inline-note">{actionMessage}</p> : null}
      {loading ? <p className="contest-inline-note">Loading submissions…</p> : null}
      {error ? <p className="contest-error">{error}</p> : null}

      {!loading ? (
        <section className="contest-section">
          <div style={{ display: "grid", gap: "0.7rem" }}>
            {rows.map((row) => (
              <div key={row.id} className="contest-card">
                <div className="contest-card-top">
                  <p className="contest-code">{row.quest.code}</p>
                  <span className={`contest-status status-${row.status.toLowerCase()}`}>{row.status}</span>
                </div>
                <h3 className="contest-title">{row.quest.title}</h3>
                <p className="contest-inline-note">User: {row.user.displayName} (@{row.user.xUsername})</p>
                <p className="contest-inline-note">Type: {row.quest.type} · Reward: {row.quest.rewardPoints} pts</p>
                <p className="contest-inline-note">Created: {new Date(row.createdAt).toLocaleString()}</p>
                <p className="contest-inline-note">Proof: {row.proofUrl ? <a href={row.proofUrl} target="_blank" rel="noreferrer">{row.proofUrl}</a> : "—"}</p>
                <p className="contest-inline-note">Note: {row.note || "—"}</p>
                {row.reviewedAt ? <p className="contest-inline-note">Reviewed: {new Date(row.reviewedAt).toLocaleString()} ({row.reviewedByAdmin || "admin"})</p> : null}

                {row.status === "SUBMITTED" ? (
                  <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.6rem" }}>
                    <Button onClick={() => void review(row.id, "APPROVE")}>Approve</Button>
                    <Button variant="ghost" onClick={() => void review(row.id, "REJECT")}>Reject ({rejectReasonCode})</Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </SiteShell>
  );
}
