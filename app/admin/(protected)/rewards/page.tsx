"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import {
  buildCompensationValidatePayload,
  isCompensationValidationBlocked,
  listBlockingCompensationIssues,
} from "@/lib/admin/rewards-workbench";
import {
  AdminDataTable,
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
  AdminTableHead,
  AdminTableRow,
} from "@/components/admin/AdminUi";

type CandidateUser = { id: string; xUsername: string | null; displayName: string | null; points: number };
type GrantRow = {
  id: string;
  userId: string;
  amount: number;
  reasonRef: string | null;
  metadata: { reasonLabel?: string; reasonCode?: string } | null;
  createdAt: string;
  user: { displayName: string | null; xUsername: string | null } | null;
};

export default function AdminRewardsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<CandidateUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("100");
  const [reasonLabel, setReasonLabel] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState<GrantRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [rowsError, setRowsError] = useState("");

  useEffect(() => {
    const run = async () => {
      if (!searchTerm.trim()) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      const response = await fetch(`/api/internal/users/search?q=${encodeURIComponent(searchTerm.trim())}&limit=8`, { cache: "no-store" });
      if (response.ok) {
        const payload = (await response.json()) as { users: CandidateUser[] };
        setSearchResults(payload.users ?? []);
      }
      setSearching(false);
    };

    const timer = setTimeout(() => void run(), 200);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadRows = async () => {
    setLoadingRows(true);
    setRowsError("");

    const response = await fetch("/api/internal/rewards/manual-grant", { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setRowsError(payload?.error ?? "Cannot load recent manual grants");
      setRows([]);
      setLoadingRows(false);
      return;
    }

    const payload = (await response.json()) as { grants: GrantRow[] };
    setRows(payload.grants ?? []);
    setLoadingRows(false);
  };

  useEffect(() => {
    void loadRows();
  }, []);

  const submit = async () => {
    const parsedAmount = Number(amount);
    if (!userId.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setMessage("Enter valid user + amount");
      return;
    }
    if (!reasonLabel.trim()) {
      setMessage("Reason label is required");
      return;
    }
    if (!reasonCode.trim()) {
      setMessage("Reason code is required");
      return;
    }

    setSubmitting(true);
    setMessage("");

    const validateResponse = await fetch("/api/internal/compensations/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildCompensationValidatePayload({ userId, amount: parsedAmount, reasonLabel, reasonCode })),
    });

    const validation = (await validateResponse.json().catch(() => null)) as { validationToken?: string; error?: string; blocking?: boolean; issues?: Array<{ severity?: string; message?: string }> } | null;
    if (!validateResponse.ok || !validation?.validationToken) {
      setMessage(validation?.error ?? "Compensation validation failed");
      setSubmitting(false);
      return;
    }

    if (isCompensationValidationBlocked(validation)) {
      const blockingMessages = listBlockingCompensationIssues(validation);
      setMessage(`Compensation blocked: ${blockingMessages.join("; ") || "Fix blocking issues"}`);
      setSubmitting(false);
      return;
    }

    const previewResponse = await fetch(`/api/internal/compensations/preview/${validation.validationToken}`, { cache: "no-store" });
    const preview = (await previewResponse.json().catch(() => null)) as { preview?: { user?: { displayName?: string; pointsBefore?: number; pointsAfter?: number }; rewardComponents?: Array<{ amount?: number }> } } | { error?: string } | null;
    if (!previewResponse.ok || !preview || !("preview" in preview)) {
      setMessage((preview as { error?: string } | null)?.error ?? "Compensation preview failed");
      setSubmitting(false);
      return;
    }

    const confirmation = window.confirm(
      `Confirm compensation for ${preview.preview?.user?.displayName ?? userId}: +${preview.preview?.rewardComponents?.[0]?.amount ?? parsedAmount} points (before ${preview.preview?.user?.pointsBefore ?? "?"}, after ${preview.preview?.user?.pointsAfter ?? "?"})`
    );
    if (!confirmation) {
      setSubmitting(false);
      return;
    }

    const idempotencyKey = `manual-grant-${validation.validationToken}`;
    const executeResponse = await fetch("/api/internal/compensations/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ validationToken: validation.validationToken }),
    });

    const executePayload = (await executeResponse.json().catch(() => null)) as { receipt?: { summary?: { pointsDelta?: number } }; error?: string } | null;
    if (!executeResponse.ok) {
      setMessage(executePayload?.error ?? "Compensation execution failed");
      setSubmitting(false);
      return;
    }

    setMessage(`Compensation applied (+${executePayload?.receipt?.summary?.pointsDelta ?? parsedAmount} points).`);
    setReasonLabel("");
    setReasonCode("");
    setSubmitting(false);
    await loadRows();
  };

  return (
    <div className="admin-page admin-v2-page">
      <AdminPageHeader
        title="Rewards operations"
        subtitle="Secure manual compensation flow: validate, preview impact, then execute."
        actions={
          <div className="admin-v2-action-row">
            <Link href="/admin/users" className="admin-v2-link-chip">User context</Link>
            <Link href="/admin/activity-log" className="admin-v2-link-chip">Audit log</Link>
          </div>
        }
      />

      <section className="admin-v2-callout danger">
        <strong>High-risk action</strong>
        <p className="contest-inline-note">Manual grants update user economy immediately. Verify reason label/code and preview before applying.</p>
      </section>

      <div className="admin-v2-split">
        <AdminPanel>
          <p className="admin-v2-section-title">1) Select recipient</p>
          <input className="input" placeholder="Search by id / @username / display name" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
          {searching ? <p className="contest-inline-note">Searching users…</p> : null}
          {searchResults.length > 0 ? (
            <div className="admin-v2-list-stack">
              {searchResults.map((candidate) => (
                <button key={candidate.id} type="button" className="admin-v2-list-row action" onClick={() => { setUserId(candidate.id); setSearchTerm(candidate.xUsername ? `@${candidate.xUsername}` : candidate.id); }}>
                  <span>
                    <strong>{candidate.displayName || candidate.id}</strong>
                    <small className="contest-inline-note">@{candidate.xUsername || "—"} · {candidate.points} pts</small>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <p className="admin-v2-section-title">2) Compensation payload</p>
          <div className="admin-v2-form-grid">
            <input className="input" placeholder="userId" value={userId} onChange={(event) => setUserId(event.target.value)} />
            <input className="input" type="number" min={1} placeholder="amount" value={amount} onChange={(event) => setAmount(event.target.value)} />
            <input className="input" placeholder="reason label" value={reasonLabel} onChange={(event) => setReasonLabel(event.target.value)} />
            <input className="input" placeholder="reason code" value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} />
          </div>

          <div className="admin-v2-action-row">
            <Button onClick={() => void submit()} disabled={submitting}>{submitting ? "Applying…" : "Validate + Preview + Apply"}</Button>
            {message ? <span className="contest-inline-note">{message}</span> : null}
          </div>
        </AdminPanel>

        <AdminPanel>
          <div className="admin-v2-action-row between">
            <p className="admin-v2-section-title">Recent manual grants</p>
            <Button variant="ghost" type="button" onClick={() => void loadRows()}>Refresh</Button>
          </div>
          {loadingRows ? <AdminEmptyState title="Loading grants…" /> : null}
          {rowsError ? <p className="contest-error">{rowsError}</p> : null}
          {!loadingRows ? (
            <AdminDataTable columns=".9fr .8fr 1.4fr .8fr">
              <AdminTableHead><span>Type</span><span>Amount</span><span>User / Reason</span><span>Time</span></AdminTableHead>
              {rows.map((row) => (
                <AdminTableRow key={row.id}>
                  <span className="contest-code">ADMIN_GRANT</span>
                  <AdminStatusBadge tone="success" label={`+${row.amount}`} />
                  <span className="contest-inline-note">{row.user?.displayName || "—"} @{row.user?.xUsername || "—"} · {row.metadata?.reasonCode || "—"}</span>
                  <span className="contest-inline-note">{new Date(row.createdAt).toLocaleString()}</span>
                </AdminTableRow>
              ))}
              {rows.length === 0 ? <AdminTableRow><span>No manual grants yet.</span></AdminTableRow> : null}
            </AdminDataTable>
          ) : null}
        </AdminPanel>
      </div>
    </div>
  );
}
