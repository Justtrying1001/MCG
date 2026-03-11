"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";

type GrantRow = {
  id: string;
  userId: string;
  user: { id: string; displayName: string | null; xUsername: string | null };
  amount: number;
  reasonRef: string | null;
  metadata: { reasonLabel?: string; reasonCode?: string | null; grantedByAdmin?: string } | null;
  idempotencyKey: string | null;
  createdAt: string;
};

type RewardPackGrantRow = {
  id: string;
  userId: string;
  user: { id: string; displayName: string | null; xUsername: string | null };
  packDefinition: { id: string; code: string; displayName: string; source: string };
  openingEventId: string | null;
  openedAt: string | null;
  createdAt: string;
};

type SearchUser = {
  id: string;
  xUserId: string;
  xUsername: string;
  displayName: string;
  points: number;
  createdAt: string;
};

type CompensationValidation = {
  blocking: boolean;
  issues: Array<{ code: string; severity: "ERROR" | "WARN"; field: string | null; message: string; operatorHint: string }>;
  validationToken: string;
  impactSummary: { pointsDelta: number };
};

export default function AdminRewardsPage() {
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("500");
  const [reasonLabel, setReasonLabel] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<GrantRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  const [rewardPackRows, setRewardPackRows] = useState<RewardPackGrantRow[]>([]);
  const [rewardPackLoadingRows, setRewardPackLoadingRows] = useState(false);
  const [rewardMode, setRewardMode] = useState<"GRANT_ONLY" | "GRANT_AND_OPEN">("GRANT_AND_OPEN");
  const [rewardPackMessage, setRewardPackMessage] = useState("");
  const [rewardPackSubmitting, setRewardPackSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);

  const loadRows = async () => {
    setLoadingRows(true);
    const response = await fetch("/api/internal/rewards/manual-grant", { cache: "no-store" });
    if (!response.ok) {
      setLoadingRows(false);
      return;
    }

    const payload = (await response.json()) as { grants: GrantRow[] };
    setRows(payload.grants ?? []);
    setLoadingRows(false);
  };

  const loadRewardPackRows = async () => {
    setRewardPackLoadingRows(true);
    const response = await fetch("/api/internal/rewards/pack-grant", { cache: "no-store" });
    if (!response.ok) {
      setRewardPackLoadingRows(false);
      return;
    }

    const payload = (await response.json()) as { grants: RewardPackGrantRow[] };
    setRewardPackRows(payload.grants ?? []);
    setRewardPackLoadingRows(false);
  };

  const searchUsers = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const response = await fetch(`/api/internal/users/search?q=${encodeURIComponent(searchTerm.trim())}&limit=8`, { cache: "no-store" });
    if (!response.ok) {
      setSearching(false);
      return;
    }

    const payload = (await response.json()) as { users: SearchUser[] };
    setSearchResults(payload.users ?? []);
    setSearching(false);
  };

  useEffect(() => {
    void loadRows();
    void loadRewardPackRows();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void searchUsers();
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const submit = async () => {
    setMessage("");

    const parsedAmount = Number(amount);
    if (!userId.trim() || !Number.isInteger(parsedAmount) || parsedAmount <= 0 || !reasonLabel.trim() || !reasonCode.trim()) {
      setMessage("Provide userId, positive integer amount, reason label, and reason code.");
      return;
    }

    setSubmitting(true);

    const validateResponse = await fetch("/api/internal/compensations/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userId.trim(),
        amount: parsedAmount,
        reasonLabel: reasonLabel.trim(),
        reasonCode: reasonCode.trim(),
      }),
    });

    const validation = (await validateResponse.json().catch(() => null)) as CompensationValidation | { error?: string } | null;

    if (!validateResponse.ok || !validation || !("validationToken" in validation)) {
      setMessage((validation as { error?: string } | null)?.error ?? "Compensation validation failed");
      setSubmitting(false);
      return;
    }

    if (validation.blocking) {
      setMessage(`Validation blocked: ${(validation.issues ?? []).map((issue) => issue.message).join("; ")}`);
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
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        validationToken: validation.validationToken,
      }),
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

  const submitRewardPack = async () => {
    setRewardPackMessage("");
    if (!userId.trim()) {
      setRewardPackMessage("Provide userId before granting reward pack.");
      return;
    }

    setRewardPackSubmitting(true);
    const response = await fetch("/api/internal/rewards/pack-grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userId.trim(),
        deliveryMode: rewardMode,
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      rewardGrantId?: string;
      openingEventId?: string | null;
      pulledCardsMvp?: Array<{ templateId: string }>;
    } | null;

    if (!response.ok) {
      setRewardPackMessage(payload?.error ?? "Reward pack grant failed");
      setRewardPackSubmitting(false);
      return;
    }

    if (rewardMode === "GRANT_AND_OPEN") {
      setRewardPackMessage(
        `Reward pack opened. grant=${payload?.rewardGrantId ?? "?"} event=${payload?.openingEventId ?? "?"} cards=${payload?.pulledCardsMvp?.length ?? 0}`
      );
    } else {
      setRewardPackMessage(`Reward pack granted (not opened). grant=${payload?.rewardGrantId ?? "?"}`);
    }

    setRewardPackSubmitting(false);
    await loadRewardPackRows();
  };

  return (
    <SiteShell>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Manual Reward Grants</h1>
          <p className="page-subtitle">Admin-only points grants with validation, preview, and ledger traceability.</p>
        </div>
        <AdminLogoutButton />
      </div>

      <section className="contest-section" style={{ marginBottom: "1rem" }}>
        <Link href="/admin" className="contest-inline-note">← Back to admin home</Link>
      </section>

      <section className="contest-section" style={{ display: "grid", gap: "0.7rem", marginBottom: "1rem" }}>
        <h2 className="contest-section-title">Select user</h2>
        <input className="input" placeholder="Search by id / @username / display name" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
        {searching ? <p className="contest-inline-note">Searching users…</p> : null}
        {searchResults.length > 0 ? (
          <div style={{ display: "grid", gap: "0.4rem" }}>
            {searchResults.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                className="contest-ranking-row"
                onClick={() => {
                  setUserId(candidate.id);
                  setSearchTerm(candidate.xUsername ? `@${candidate.xUsername}` : candidate.id);
                }}
                style={{ textAlign: "left", gridTemplateColumns: "1fr auto" }}
              >
                <span>{candidate.displayName} (@{candidate.xUsername})</span>
                <span>{candidate.points} pts</span>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="contest-section" style={{ display: "grid", gap: "0.7rem", marginBottom: "1rem" }}>
        <h2 className="contest-section-title">Create manual compensation</h2>
        <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <input className="input" placeholder="userId" value={userId} onChange={(event) => setUserId(event.target.value)} />
          <input className="input" type="number" min={1} placeholder="amount" value={amount} onChange={(event) => setAmount(event.target.value)} />
          <input className="input" placeholder="reason label" value={reasonLabel} onChange={(event) => setReasonLabel(event.target.value)} />
          <input className="input" placeholder="reason code (required)" value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} />
        </div>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <Button onClick={() => void submit()} disabled={submitting}>{submitting ? "Applying…" : "Validate + Preview + Apply"}</Button>
          {message ? <span className="contest-inline-note">{message}</span> : null}
        </div>
      </section>

      <section className="contest-section" style={{ marginBottom: "1rem" }}>
        <h2 className="contest-section-title">Recent reward pack grants</h2>
        {rewardPackLoadingRows ? <p className="contest-inline-note">Loading reward pack grants…</p> : null}
        {!rewardPackLoadingRows ? (
          <div style={{ display: "grid", gap: "0.6rem" }}>
            {rewardPackRows.map((row) => (
              <div key={row.id} className="contest-card">
                <div className="contest-card-top">
                  <p className="contest-code">PACK_REWARD</p>
                  <span className="contest-status status-open">{row.packDefinition.code}</span>
                </div>
                <p className="contest-inline-note">User: {row.userId} ({row.user.displayName || "—"} @{row.user.xUsername || "—"})</p>
                <p className="contest-inline-note">Delivery: {row.openingEventId ? "GRANT_AND_OPEN" : "GRANT_ONLY"}</p>
                <p className="contest-inline-note">Opening event: {row.openingEventId || "—"}</p>
                <p className="contest-inline-note">Created: {new Date(row.createdAt).toLocaleString()}</p>
              </div>
            ))}
            {rewardPackRows.length === 0 ? <p className="contest-inline-note">No reward pack grants yet.</p> : null}
          </div>
        ) : null}
      </section>

      <section className="contest-section">
        <h2 className="contest-section-title">Recent manual points grants</h2>
        {loadingRows ? <p className="contest-inline-note">Loading grants…</p> : null}
        {!loadingRows ? (
          <div style={{ display: "grid", gap: "0.6rem" }}>
            {rows.map((row) => (
              <div key={row.id} className="contest-card">
                <div className="contest-card-top">
                  <p className="contest-code">ADMIN_GRANT</p>
                  <span className="contest-status status-open">+{row.amount}</span>
                </div>
                <p className="contest-inline-note">User: {row.userId} ({row.user.displayName || "—"} @{row.user.xUsername || "—"})</p>
                <p className="contest-inline-note">Reason: {row.metadata?.reasonLabel || row.reasonRef || "—"}</p>
                <p className="contest-inline-note">Reason code: {row.metadata?.reasonCode || "—"}</p>
                <p className="contest-inline-note">Created: {new Date(row.createdAt).toLocaleString()}</p>
              </div>
            ))}
            {rows.length === 0 ? <p className="contest-inline-note">No manual points grants yet.</p> : null}
          </div>
        ) : null}
      </section>
    </SiteShell>
  );
}
