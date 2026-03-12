"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";

type CandidateUser = { id: string; xUsername: string | null; displayName: string | null; points: number };
type GrantRow = {
  id: string;
  userId: string;
  amount: number;
  reasonRef: string | null;
  metadata: { reasonLabel?: string; reasonCode?: string } | null;
  createdAt: string;
  user: { displayName: string | null; xUsername: string | null };
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
    const response = await fetch("/api/rewards/ledger?reasonType=ADMIN_GRANT&limit=30", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { entries: GrantRow[] };
      setRows(payload.entries ?? []);
    }
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
    if (!reasonCode.trim()) {
      setMessage("reasonCode is required");
      return;
    }

    setSubmitting(true);
    setMessage("");

    const validateResponse = await fetch("/api/internal/compensations/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userId.trim(),
        reasonType: "ADMIN_GRANT",
        reasonRef: reasonLabel.trim() || `manual:${Date.now()}`,
        rewardComponents: [{ type: "POINTS", amount: parsedAmount }],
        metadata: { reasonLabel: reasonLabel.trim() || null, reasonCode: reasonCode.trim() },
      }),
    });

    const validation = (await validateResponse.json().catch(() => null)) as { validationToken?: string; error?: string } | null;
    if (!validateResponse.ok || !validation?.validationToken) {
      setMessage(validation?.error ?? "Compensation validation failed");
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

    const idempotencyKey = `comp-ui:${userId.trim()}:${Date.now()}`;
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
    <div className="admin-page">
      <section className="admin-page-header">
        <div>
          <h1 className="admin-title">Rewards & Compensation</h1>
          <p className="admin-subtitle">Financial-ops style compensation flow with validate → preview → execute and auditable receipts.</p>
        </div>
        <Link href="/admin/activity-log" className="admin-badge neutral">Audit log</Link>
      </section>

      <section className="admin-split">
        <div className="admin-panel">
          <p className="admin-section-title">1. Select user</p>
          <input className="input" placeholder="Search by id / @username / display name" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
          {searching ? <p className="contest-inline-note">Searching users…</p> : null}
          {searchResults.length > 0 ? (
            <div style={{ display: "grid", gap: "0.35rem" }}>
              {searchResults.map((candidate) => (
                <button key={candidate.id} type="button" className="admin-panel" style={{ textAlign: "left", padding: "0.45rem" }} onClick={() => { setUserId(candidate.id); setSearchTerm(candidate.xUsername ? `@${candidate.xUsername}` : candidate.id); }}>
                  <p style={{ fontWeight: 700 }}>{candidate.displayName || candidate.id}</p>
                  <p className="contest-inline-note">@{candidate.xUsername || "—"} · {candidate.points} pts</p>
                </button>
              ))}
            </div>
          ) : null}

          <p className="admin-section-title" style={{ marginTop: "0.2rem" }}>2. Compensation payload</p>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <input className="input" placeholder="userId" value={userId} onChange={(event) => setUserId(event.target.value)} />
            <input className="input" type="number" min={1} placeholder="amount" value={amount} onChange={(event) => setAmount(event.target.value)} />
            <input className="input" placeholder="reason label" value={reasonLabel} onChange={(event) => setReasonLabel(event.target.value)} />
            <input className="input" placeholder="reason code (required)" value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} />
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <Button onClick={() => void submit()} disabled={submitting}>{submitting ? "Applying…" : "Validate + Preview + Apply"}</Button>
            {message ? <span className="contest-inline-note">{message}</span> : null}
          </div>
        </div>

        <div className="admin-panel">
          <p className="admin-section-title">Recent manual grants</p>
          {loadingRows ? <p className="contest-inline-note">Loading grants…</p> : null}
          {!loadingRows ? (
            <div style={{ display: "grid", gap: "0.45rem" }}>
              {rows.map((row) => (
                <div key={row.id} className="admin-panel" style={{ padding: "0.5rem", gap: "0.3rem", background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p className="contest-code">ADMIN_GRANT</p>
                    <span className="admin-badge success">+{row.amount}</span>
                  </div>
                  <p className="contest-inline-note">{row.user.displayName || "—"} @{row.user.xUsername || "—"}</p>
                  <p className="contest-inline-note">{row.metadata?.reasonLabel || row.reasonRef || "—"} · {row.metadata?.reasonCode || "—"}</p>
                  <p className="contest-inline-note">{new Date(row.createdAt).toLocaleString()}</p>
                </div>
              ))}
              {rows.length === 0 ? <p className="contest-inline-note">No manual grants yet.</p> : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
