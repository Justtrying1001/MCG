"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";

type ContextPayload = {
  submission: {
    id: string;
    status: "SUBMITTED" | "APPROVED" | "REJECTED";
    proofUrl: string | null;
    note: string | null;
    reviewedByAdmin: string | null;
    reviewedAt: string | null;
    createdAt: string;
    user: { id: string; displayName: string | null; xUsername: string | null };
    quest: { id: string; code: string; title: string; validationMode: string; rewardPoints: number };
  };
  context: {
    userRecentSubmissions: Array<{ id: string; status: string; createdAt: string }>;
    approvalImpactPreview: { pointsDelta: number; ledgerEntryWouldBeCreated: boolean };
  };
};

const REJECT_REASONS = ["PROOF_NOT_VALID", "OUT_OF_SCOPE", "DUPLICATE_SUBMISSION", "MISSING_REQUIREMENTS"];

export default function ModerationSubmissionDetailPage() {
  const params = useParams<{ submissionId: string }>();
  const router = useRouter();

  const [data, setData] = useState<ContextPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [decisionCode, setDecisionCode] = useState(REJECT_REASONS[0]);
  const [actionMessage, setActionMessage] = useState("");

  const load = async () => {
    setLoading(true);
    const response = await fetch(`/api/internal/moderation/submissions/${params.submissionId}/context`, { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Cannot load moderation context");
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as ContextPayload;
    setData(payload);
    setError("");
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [params.submissionId]);

  const decide = async (decision: "APPROVE" | "REJECT") => {
    if (decision === "REJECT") {
      const confirmed = window.confirm(`Reject this submission with reason ${decisionCode}?`);
      if (!confirmed) return;
    } else {
      const confirmed = window.confirm("Approve this submission and grant rewards if applicable?");
      if (!confirmed) return;
    }

    const response = await fetch(`/api/internal/moderation/submissions/${params.submissionId}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        note,
        ...(decision === "REJECT" ? { decisionCode } : {}),
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setActionMessage(payload?.error ?? "Decision failed");
      return;
    }

    setActionMessage(decision === "APPROVE" ? "Submission approved." : `Submission rejected (${decisionCode}).`);
    await load();
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="contest-section">
        <Link href="/admin/moderation" className="contest-inline-note">← Back to moderation queue</Link>
      </section>

      {loading ? <section className="contest-section"><p className="contest-inline-note">Loading submission context…</p></section> : null}
      {error ? <section className="contest-section"><p className="contest-error">{error}</p></section> : null}

      {data ? (
        <>
          <section className="contest-section">
            <div className="contest-card-top">
              <p className="contest-code">{data.submission.quest.code}</p>
              <span className={`contest-status status-${data.submission.status.toLowerCase()}`}>{data.submission.status}</span>
            </div>
            <h1 className="page-title">Submission review</h1>
            <p className="contest-inline-note">User: {data.submission.user.displayName || "Unknown"} @{data.submission.user.xUsername || "—"}</p>
            <p className="contest-inline-note">Quest: {data.submission.quest.title} · Reward: {data.submission.quest.rewardPoints} pts</p>
            <p className="contest-inline-note">Submitted: {new Date(data.submission.createdAt).toLocaleString()}</p>
            <p className="contest-inline-note">Evidence: {data.submission.proofUrl ? <a href={data.submission.proofUrl} target="_blank" rel="noreferrer">{data.submission.proofUrl}</a> : data.submission.note || "—"}</p>
          </section>

          <section className="contest-section">
            <h2 className="contest-section-title">Projected reward impact</h2>
            <p className="contest-inline-note">Points delta on APPROVE: +{data.context.approvalImpactPreview.pointsDelta}</p>
            <p className="contest-inline-note">Ledger write: {data.context.approvalImpactPreview.ledgerEntryWouldBeCreated ? "Yes" : "No"}</p>
          </section>

          <section className="contest-section">
            <h2 className="contest-section-title">Previous submissions by user</h2>
            <div style={{ display: "grid", gap: "0.4rem" }}>
              {data.context.userRecentSubmissions.map((row) => (
                <div key={row.id} className="contest-card" style={{ padding: "0.6rem" }}>
                  <p className="contest-inline-note">{row.id} · {row.status} · {new Date(row.createdAt).toLocaleString()}</p>
                </div>
              ))}
              {data.context.userRecentSubmissions.length === 0 ? <p className="contest-inline-note">No prior submissions.</p> : null}
            </div>
          </section>

          <section className="contest-section" style={{ display: "grid", gap: "0.6rem" }}>
            <h2 className="contest-section-title">Decision</h2>
            <textarea className="input" rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Reviewer note (optional)" />
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
              <select className="input" value={decisionCode} onChange={(event) => setDecisionCode(event.target.value)} style={{ maxWidth: "280px" }}>
                {REJECT_REASONS.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <Button onClick={() => void decide("APPROVE")} disabled={data.submission.status !== "SUBMITTED"}>Approve</Button>
              <Button variant="ghost" onClick={() => void decide("REJECT")} disabled={data.submission.status !== "SUBMITTED"}>Reject</Button>
              <Button variant="ghost" onClick={() => router.push(`/admin/moderation/history?userId=${data.submission.user.id}&questId=${data.submission.quest.id}`)}>Open decision history</Button>
            </div>
            {actionMessage ? <p className="contest-inline-note">{actionMessage}</p> : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
