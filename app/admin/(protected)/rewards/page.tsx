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

type SearchUser = {
  id: string;
  xUserId: string;
  xUsername: string;
  displayName: string;
  points: number;
  createdAt: string;
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
    if (!userId.trim() || !Number.isInteger(parsedAmount) || parsedAmount <= 0 || !reasonLabel.trim()) {
      setMessage("Provide userId, positive integer amount, and reason label.");
      return;
    }

    const idempotencyKey = `manual-ui:${userId.trim()}:${Date.now()}`;

    setSubmitting(true);
    const response = await fetch("/api/internal/rewards/manual-grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userId.trim(),
        amount: parsedAmount,
        reasonLabel: reasonLabel.trim(),
        reasonCode: reasonCode.trim() || null,
        idempotencyKey,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; applied?: boolean; user?: { points: number } } | null;

    if (!response.ok) {
      setMessage(payload?.error ?? "Manual grant failed");
      setSubmitting(false);
      return;
    }

    setMessage(payload?.applied === false
      ? "Grant already applied (idempotency replay)."
      : `Manual grant applied. User new balance: ${payload?.user?.points ?? "?"}`);

    setReasonLabel("");
    setReasonCode("");
    setSubmitting(false);
    await loadRows();
  };

  return (
    <SiteShell>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Manual Reward Grants</h1>
          <p className="page-subtitle">Admin-only points grants with ledger traceability.</p>
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
        <h2 className="contest-section-title">Create manual grant</h2>
        <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <input className="input" placeholder="userId" value={userId} onChange={(event) => setUserId(event.target.value)} />
          <input className="input" type="number" min={1} placeholder="amount" value={amount} onChange={(event) => setAmount(event.target.value)} />
          <input className="input" placeholder="reason label" value={reasonLabel} onChange={(event) => setReasonLabel(event.target.value)} />
          <input className="input" placeholder="reason code (optional)" value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} />
        </div>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <Button onClick={() => void submit()} disabled={submitting}>{submitting ? "Applying…" : "Apply grant"}</Button>
          {message ? <span className="contest-inline-note">{message}</span> : null}
        </div>
      </section>

      <section className="contest-section">
        <h2 className="contest-section-title">Recent manual grants</h2>
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
            {rows.length === 0 ? <p className="contest-inline-note">No manual grants yet.</p> : null}
          </div>
        ) : null}
      </section>
    </SiteShell>
  );
}
