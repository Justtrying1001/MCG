"use client";

import { useMemo, useState } from "react";

import { AdminEmptyState, AdminPanel, AdminStatusBadge } from "@/components/admin/AdminUi";

type ResetResponse = {
  ok: boolean;
  error?: string;
  deletedUsers?: number;
  deletedInvites?: number;
  resetRewardPackSupplyRows?: number;
};

const RESET_KEYWORD = "RESET USERS";

export function ResetUsersPanel({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ResetResponse | null>(null);

  const canConfirm = useMemo(() => confirmInput.trim() === RESET_KEYWORD, [confirmInput]);

  const runReset = async () => {
    setPending(true);
    setResult(null);
    try {
      const response = await fetch("/api/internal/admin/reset-users", { method: "POST" });
      const payload = (await response.json()) as ResetResponse;
      setResult(payload);
      if (response.ok && payload.ok) {
        setConfirmInput("");
        setOpen(false);
      }
    } catch (error) {
      setResult({ ok: false, error: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setPending(false);
    }
  };

  if (!enabled) {
    return (
      <AdminPanel>
        <p className="admin-v2-section-title">Danger zone</p>
        <AdminEmptyState
          title="Reset user data is restricted to ADMIN_SUPERVISOR"
          description="Ask a supervisor account to execute this irreversible maintenance action."
        />
      </AdminPanel>
    );
  }

  return (
    <AdminPanel>
      <p className="admin-v2-section-title">Danger zone</p>
      <p className="contest-inline-note">This action permanently deletes all user-related data.</p>
      <button type="button" className="button warn" disabled={pending} onClick={() => setOpen(true)}>
        Reset user data
      </button>

      {open ? (
        <div className="contest-modal-overlay" role="presentation" onClick={() => !pending && setOpen(false)}>
          <div className="contest-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3>Confirm user data reset</h3>
            <p className="contest-inline-note">This action permanently deletes all user-related data.</p>
            <p className="contest-inline-note">Type <strong>{RESET_KEYWORD}</strong> to enable confirmation.</p>
            <input
              className="input"
              placeholder={RESET_KEYWORD}
              value={confirmInput}
              onChange={(event) => setConfirmInput(event.target.value)}
              disabled={pending}
            />
            <div className="admin-v2-inline-actions">
              <button type="button" className="button ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</button>
              <button type="button" className="button warn" onClick={() => void runReset()} disabled={!canConfirm || pending}>Confirm reset</button>
            </div>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="admin-v2-callout" style={{ marginTop: 12 }}>
          {result.ok ? (
            <>
              <AdminStatusBadge tone="success" label="SUCCESS" />
              <p>
                Deleted users: <strong>{result.deletedUsers ?? 0}</strong> · deleted invites: <strong>{result.deletedInvites ?? 0}</strong> ·
                reset reward pack rows: <strong>{result.resetRewardPackSupplyRows ?? 0}</strong>
              </p>
            </>
          ) : (
            <>
              <AdminStatusBadge tone="danger" label="ERROR" />
              <p>{result.error ?? "Reset failed"}</p>
            </>
          )}
        </div>
      ) : null}
    </AdminPanel>
  );
}
