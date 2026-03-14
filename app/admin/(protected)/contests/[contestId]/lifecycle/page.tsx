"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { getAllowedContestTransitions, lifecycleValidationState } from "@/lib/admin/contest-workbench";

type ContestStatus = "DRAFT" | "OPEN" | "LOCKED" | "LIVE" | "SETTLED" | "CANCELED";

function newIdempotencyKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ContestLifecyclePage({ params }: { params: { contestId: string } }) {
  const [currentPhase, setCurrentPhase] = useState<ContestStatus | null>(null);
  const [targetPhase, setTargetPhase] = useState<ContestStatus>("OPEN");
  const [issues, setIssues] = useState<Array<{ severity: string; message: string }>>([]);
  const [validationToken, setValidationToken] = useState("");
  const [message, setMessage] = useState("");
  const [canExecute, setCanExecute] = useState(false);

  useEffect(() => {
    void fetch(`/api/internal/contests/${params.contestId}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const phase = payload?.contest?.status as ContestStatus | undefined;
        if (phase) {
          setCurrentPhase(phase);
          const allowed = getAllowedContestTransitions(phase);
          setTargetPhase(allowed[0] ?? phase);
        }
      });
  }, [params.contestId]);

  const validateTransition = async () => {
    setMessage("");
    setIssues([]);
    setValidationToken("");

    const response = await fetch(`/api/internal/contest-runs/${params.contestId}/transitions/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetPhase, reasonCode: "LIFECYCLE_CONTROL" }),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      issues?: Array<{ severity: string; message: string }>;
      validationToken?: string;
      blocking?: boolean;
    } | null;

    if (!response.ok || !payload) {
      setMessage(payload?.error ?? "Transition validation failed");
      return;
    }

    const computed = lifecycleValidationState({ blocking: payload.blocking, issues: payload.issues });
    setCanExecute(computed.canExecute);
    setIssues(payload.issues ?? []);
    setValidationToken(payload.validationToken ?? "");
    setMessage(payload.blocking ? "Transition blocked by validation." : "Validation passed. You can execute transition.");
  };

  const executeTransition = async () => {
    setMessage("");
    if (!validationToken) {
      setMessage("Validate first to get a token.");
      return;
    }

    if (!window.confirm(`Confirm phase transition ${currentPhase ?? "?"} -> ${targetPhase}?`)) {
      return;
    }

    const response = await fetch(`/api/internal/contests/${params.contestId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": newIdempotencyKey("contest-lifecycle") },
      body: JSON.stringify({ status: targetPhase, reasonCode: "LIFECYCLE_CONTROL", validationToken }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; contest?: { status: ContestStatus } } | null;
    if (!response.ok || !payload) {
      setMessage(payload?.error ?? "Transition execute failed");
      return;
    }

    setCurrentPhase(payload.contest?.status ?? targetPhase);
    setMessage(`Phase updated to ${payload.contest?.status ?? targetPhase}`);
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="contest-section">
        <Link href={`/admin/contests/${params.contestId}`} className="contest-inline-note">← Back to contest overview</Link>
      </section>

      <section className="contest-section" style={{ display: "grid", gap: "0.7rem" }}>
        <h1 className="page-title">Lifecycle Control Panel</h1>
        <p className="contest-inline-note">Current phase: <strong>{currentPhase ?? "loading…"}</strong></p>
        <p className="contest-inline-note">Allowed next transitions: {currentPhase ? (getAllowedContestTransitions(currentPhase).join(", ") || "none") : "—"}</p>
        <p className="contest-inline-note">Automation: transition to <strong>LIVE</strong> auto-captures START snapshot. Transition to <strong>SETTLED</strong> auto-captures END snapshot and auto-runs native scoring compute (ranking rebuild included).</p>

        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
          <label className="contest-inline-note">Target phase</label>
          <select className="input" value={targetPhase} onChange={(event) => setTargetPhase(event.target.value as ContestStatus)}>
            {(currentPhase ? getAllowedContestTransitions(currentPhase) : []).map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <Button onClick={() => void validateTransition()}>Validate transition</Button>
          <Button onClick={() => void executeTransition()} disabled={!validationToken || !canExecute}>Execute transition</Button>
        </div>

        {message ? <p className="contest-inline-note">{message}</p> : null}
        {issues.map((issue, index) => (
          <p key={`${issue.message}-${index}`} className={issue.severity === "ERROR" ? "contest-error" : "contest-inline-note"}>{issue.message}</p>
        ))}
      </section>
    </div>
  );
}
