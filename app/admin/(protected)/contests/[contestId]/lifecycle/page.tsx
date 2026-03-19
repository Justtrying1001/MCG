"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { getAllowedContestTransitions, lifecycleValidationState } from "@/lib/admin/contest-workbench";

import { ContestWorkbenchShell, useContestWorkbenchMeta } from "../_components/ContestWorkbenchShell";

type ContestStatus = "DRAFT" | "OPEN" | "LOCKED" | "LIVE" | "SETTLED" | "CANCELED";

function newIdempotencyKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const PHASES: ContestStatus[] = ["DRAFT", "OPEN", "LOCKED", "LIVE", "SETTLED", "CANCELED"];

type LifecycleDebugPayload = {
  contestId: string;
  currentStatus: ContestStatus;
  expectedTargetStatus: ContestStatus | null;
  canTransitionToLive: boolean;
  reasonIfBlocked: string | null;
  openPhaseEndAt: string | null;
  hasStartSnapshot: boolean;
  hasEndSnapshot: boolean;
  hasEntries: boolean;
  qstashOpenJobId: string | null;
  qstashLiveJobId: string | null;
  qstashSettleJobId: string | null;
  publishedWithoutLifecycleJobs: boolean;
  schedulerEnabled: boolean;
  qstashConfigured: boolean;
  lastKnownLifecycleDriver: string;
  whatShouldHaveHappened: string;
  whatActuallyHappened: string;
  nextActionRecommended: string;
  humanSummary: string;
};

export default function ContestLifecyclePage({ params }: { params: { contestId: string } }) {
  const [currentPhase, setCurrentPhase] = useState<ContestStatus | null>(null);
  const [targetPhase, setTargetPhase] = useState<ContestStatus>("OPEN");
  const [issues, setIssues] = useState<Array<{ severity: string; message: string }>>([]);
  const [validationToken, setValidationToken] = useState("");
  const [message, setMessage] = useState("");
  const [debug, setDebug] = useState<LifecycleDebugPayload | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [forceBusy, setForceBusy] = useState(false);
  const [canExecute, setCanExecute] = useState(false);
  const contestId = params.contestId;
  const meta = useContestWorkbenchMeta(contestId);

  const loadDebug = useCallback(async () => {
    setDebugLoading(true);
    try {
      const response = await fetch(`/api/internal/contests/${contestId}/lifecycle-debug`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { debug?: LifecycleDebugPayload } | null;
      setDebug(payload?.debug ?? null);
    } finally {
      setDebugLoading(false);
    }
  }, [contestId]);

  useEffect(() => {
    void fetch(`/api/internal/contests/${contestId}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const phase = payload?.contest?.status as ContestStatus | undefined;
        if (phase) {
          setCurrentPhase(phase);
          const allowed = getAllowedContestTransitions(phase);
          setTargetPhase(allowed[0] ?? phase);
        }
      });
    void loadDebug();
  }, [contestId, loadDebug]);

  const validateTransition = async () => {
    setMessage("");
    setIssues([]);
    setValidationToken("");

    const response = await fetch(`/api/internal/contest-runs/${contestId}/transitions/validate`, {
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

    const response = await fetch(`/api/internal/contests/${contestId}/status`, {
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
    await loadDebug();
  };

  const forceLifecycleNow = async () => {
    setForceBusy(true);
    setMessage("");

    const response = await fetch(`/api/internal/contests/${contestId}/force-lifecycle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      statusAfter?: ContestStatus;
      statusBefore?: ContestStatus;
      transitionAttempted?: string | null;
    } | null;

    if (!response.ok || !payload) {
      setMessage(payload?.error ?? "Force lifecycle failed");
      setForceBusy(false);
      await loadDebug();
      return;
    }

    if (payload.statusAfter) {
      setCurrentPhase(payload.statusAfter);
    }
    setMessage(`Force lifecycle executed: ${payload.transitionAttempted ?? "no transition"} (${payload.statusBefore ?? "?"} -> ${payload.statusAfter ?? "?"}).`);
    setForceBusy(false);
    await loadDebug();
  };

  const allowedTransitions = currentPhase ? getAllowedContestTransitions(currentPhase) : [];

  return (
    <ContestWorkbenchShell
      contestId={contestId}
      section="Lifecycle"
      description="Validate and execute lifecycle transitions with clear operational safeguards."
      meta={meta}
      actions={<Button variant="ghost" onClick={() => void validateTransition()}>Validate</Button>}
    >
      <section className="admin-v2-panel">
        <h2 className="contest-admin-section-title">Phase timeline</h2>
        <div className="contest-workbench-timeline">
          {PHASES.map((phase) => (
            <div key={phase} className={`contest-workbench-phase-pill ${currentPhase === phase ? "is-current" : ""} ${allowedTransitions.includes(phase) ? "is-allowed" : ""}`}>
              <span>{phase}</span>
              {currentPhase === phase ? <strong>Current</strong> : allowedTransitions.includes(phase) ? <small>Allowed</small> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="admin-v2-panel">
        <div className="contest-workbench-actions-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 className="contest-admin-section-title">Runtime lifecycle diagnostic</h2>
            <p className="contest-admin-muted">Readable from admin without SQL. Use force-lifecycle to reconcile this contest immediately.</p>
          </div>
          <div className="contest-workbench-actions-row">
            <Button variant="ghost" onClick={() => void loadDebug()} disabled={debugLoading}>Refresh diagnostic</Button>
            <Button onClick={() => void forceLifecycleNow()} disabled={forceBusy}>{forceBusy ? "Forcing…" : "Force lifecycle now"}</Button>
          </div>
        </div>
        {debug ? (
          <div className="contest-admin-blocker-list" style={{ marginTop: 16 }}>
            <div className="contest-workbench-note-block">
              <p className="contest-admin-muted"><strong>Summary.</strong> {debug.humanSummary}</p>
              <p className="contest-admin-muted"><strong>Should have happened.</strong> {debug.whatShouldHaveHappened}</p>
              <p className="contest-admin-muted"><strong>Actually happened.</strong> {debug.whatActuallyHappened}</p>
              <p className="contest-admin-muted"><strong>Next action.</strong> {debug.nextActionRecommended}</p>
            </div>
            <div className="contest-workbench-note-block">
              <p className="contest-admin-muted">Driver: <strong>{debug.lastKnownLifecycleDriver}</strong></p>
              <p className="contest-admin-muted">Expected target: <strong>{debug.expectedTargetStatus ?? "none"}</strong></p>
              <p className="contest-admin-muted">OPEN phase end used by code: <strong>{debug.openPhaseEndAt ?? "null"}</strong></p>
              <p className="contest-admin-muted">Can transition to LIVE: <strong>{debug.canTransitionToLive ? "yes" : "no"}</strong></p>
              <p className="contest-admin-muted">Blocked reason: <strong>{debug.reasonIfBlocked ?? "none"}</strong></p>
              <p className="contest-admin-muted">Snapshots: <strong>START={String(debug.hasStartSnapshot)}</strong> / <strong>END={String(debug.hasEndSnapshot)}</strong></p>
              <p className="contest-admin-muted">Jobs: <strong>open={debug.qstashOpenJobId ?? "none"}</strong> / <strong>live={debug.qstashLiveJobId ?? "none"}</strong> / <strong>settle={debug.qstashSettleJobId ?? "none"}</strong></p>
              <p className="contest-admin-muted">Published without lifecycle jobs: <strong>{debug.publishedWithoutLifecycleJobs ? "yes" : "no"}</strong></p>
              <p className="contest-admin-muted">Runtime config: <strong>schedulerEnabled={String(debug.schedulerEnabled)}</strong> / <strong>qstashConfigured={String(debug.qstashConfigured)}</strong></p>
            </div>
          </div>
        ) : (
          <p className="contest-admin-subtle" style={{ marginTop: 12 }}>{debugLoading ? "Loading diagnostic…" : "No diagnostic loaded yet."}</p>
        )}
      </section>

      <section className="admin-v2-panel contest-workbench-two-col">
        <div>
          <h2 className="contest-admin-section-title">Transition action</h2>
          <p className="contest-admin-muted">Current phase: <strong>{currentPhase ?? "loading…"}</strong></p>
          <p className="contest-admin-muted">Allowed transitions: {allowedTransitions.join(", ") || "none"}</p>
          <div className="contest-workbench-form-row">
            <label className="contest-admin-subtle" htmlFor="targetPhase">Target phase</label>
            <select id="targetPhase" className="input" value={targetPhase} onChange={(event) => setTargetPhase(event.target.value as ContestStatus)}>
              {allowedTransitions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="contest-workbench-actions-row">
            <Button onClick={() => void validateTransition()}>Validate transition</Button>
            <Button onClick={() => void executeTransition()} disabled={!validationToken || !canExecute}>Execute transition</Button>
          </div>
          {message ? <p className="contest-admin-muted">{message}</p> : null}
        </div>

        <div>
          <h2 className="contest-admin-section-title">Automation & checks</h2>
          <div className="contest-workbench-note-block">
            <p className="contest-admin-muted"><strong>LIVE</strong> transition auto-captures START snapshot.</p>
            <p className="contest-admin-muted"><strong>SETTLED</strong> transition auto-captures END snapshot and runs native scoring compute.</p>
          </div>
          {issues.length > 0 ? (
            <div className="contest-admin-blocker-list">
              {issues.map((issue, index) => (
                <div key={`${issue.message}-${index}`} className={issue.severity === "ERROR" ? "contest-admin-blocker-item" : "contest-workbench-warning-item"}>
                  <span aria-hidden>{issue.severity === "ERROR" ? "⚠" : "•"}</span>
                  <p>{issue.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="contest-admin-subtle">No validation issues detected yet.</p>
          )}
        </div>
      </section>
    </ContestWorkbenchShell>
  );
}
