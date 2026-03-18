"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";

import { ContestWorkbenchShell, useContestWorkbenchMeta } from "../_components/ContestWorkbenchShell";

function newIdempotencyKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type PreviewRow = {
  id: string;
  rank: number;
  userId: string;
  displayName: string | null;
  sourceRuleId: string | null;
  sourceRuleType: string | null;
  sourceBundleId: string | null;
  rewardComponents: Array<{ type: "POINTS" | "XP" | "PACK"; amount?: number; quantity?: number; packDefinitionId?: string }>;
  pointsTotal: number;
  xpTotal: number;
  packsTotal: number;
};

export default function ContestSettlementWorkbenchPage({ params }: { params: { contestId: string } }) {
  const [planId, setPlanId] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<{
    status: string;
    rankingSnapshotSize: number;
    totals: { usersCount: number; pointsCreditTotal: number; xpCreditTotal: number; packsGrantTotal: number; rewardActionsCount: number };
    rows: PreviewRow[];
  } | null>(null);
  const meta = useContestWorkbenchMeta(params.contestId);

  const generatePlan = async () => {
    setMessage("");
    setPreview(null);

    const response = await fetch(`/api/internal/contest-runs/${params.contestId}/settlement-plan/generate`, { method: "POST" });
    const payload = (await response.json().catch(() => null)) as { error?: string; planId?: string; totals?: unknown } | null;
    if (!response.ok || !payload?.planId) {
      setMessage(payload?.error ?? "Cannot generate settlement plan");
      return;
    }

    setPlanId(payload.planId);
    setMessage(`Settlement plan generated: ${payload.planId}`);
    await loadPreview(payload.planId);
  };

  const loadPreview = async (forcedPlanId?: string) => {
    const nextPlanId = forcedPlanId ?? planId;
    if (!nextPlanId) {
      setMessage("Generate a plan first.");
      return;
    }

    const response = await fetch(`/api/internal/contest-runs/${params.contestId}/settlement-plan/${nextPlanId}/preview`, { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as { error?: string; preview?: { status: string; rankingSnapshotSize: number; totals: { usersCount: number; pointsCreditTotal: number; xpCreditTotal: number; packsGrantTotal: number; rewardActionsCount: number }; rows: PreviewRow[] } } | null;
    if (!response.ok || !payload?.preview) {
      setMessage(payload?.error ?? "Cannot preview settlement plan");
      return;
    }

    setPlanId(nextPlanId);
    setPreview(payload.preview);
    setMessage(`Preview loaded for plan ${nextPlanId}.`);
  };

  const executePlan = async () => {
    if (!planId) {
      setMessage("Generate a plan first.");
      return;
    }

    const totals = preview?.totals;
    if (!window.confirm(`Execute settlement plan ${planId}? users=${totals?.usersCount ?? "?"}, points=${totals?.pointsCreditTotal ?? "?"}, xp=${totals?.xpCreditTotal ?? "?"}, packs=${totals?.packsGrantTotal ?? "?"}`)) {
      return;
    }

    const response = await fetch(`/api/internal/contest-runs/${params.contestId}/settlement-plan/${planId}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": newIdempotencyKey("contest-settlement-plan"),
      },
      body: JSON.stringify({}),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; settlementId?: string; rewardCount?: number; executed?: boolean } | null;
    if (!response.ok) {
      setMessage(payload?.error ?? "Settlement plan execute failed");
      return;
    }

    setMessage(`Settlement plan executed. settlementId=${payload?.settlementId ?? "n/a"}, rewards=${payload?.rewardCount ?? "?"}, executed=${String(payload?.executed)}`);
    await loadPreview(planId);
  };

  return (
    <ContestWorkbenchShell
      contestId={params.contestId}
      section="Settlement"
      description="Generate, review, and execute policy-driven reward settlement safely."
      meta={meta}
      actions={<Button onClick={() => void generatePlan()}>Generate plan</Button>}
    >
      <section className="admin-v2-panel contest-workbench-two-col">
        <div>
          <h2 className="contest-admin-section-title">Settlement actions</h2>
          <div className="contest-workbench-actions-row">
            <Button onClick={() => void generatePlan()}>Generate plan from ranking + policy</Button>
            <Button variant="ghost" onClick={() => void loadPreview()}>Reload preview</Button>
            <Button onClick={() => void executePlan()} disabled={!planId}>Execute plan</Button>
          </div>
          {planId ? <p className="contest-admin-subtle">Plan id: {planId}</p> : null}
          {message ? <p className="contest-admin-muted">{message}</p> : null}
        </div>

        <div>
          <h2 className="contest-admin-section-title">Operational notes</h2>
          <div className="contest-workbench-note-block">
            <p className="contest-admin-muted">This flow computes rewards from final ranking and published reward policy.</p>
            <p className="contest-admin-subtle">Legacy manual settlement only applies to old contests without policy config.</p>
          </div>
        </div>
      </section>

      <section className="admin-v2-panel">
        <h2 className="contest-admin-section-title">Plan summary</h2>
        {preview ? (
          <div className="contest-admin-summary-grid">
            <div className="contest-admin-meta-item"><p className="contest-admin-meta-label">Plan status</p><p className="contest-admin-meta-value">{preview.status}</p></div>
            <div className="contest-admin-meta-item"><p className="contest-admin-meta-label">Ranking size</p><p className="contest-admin-meta-value">{preview.rankingSnapshotSize}</p></div>
            <div className="contest-admin-meta-item"><p className="contest-admin-meta-label">Users rewarded</p><p className="contest-admin-meta-value">{preview.totals.usersCount}</p></div>
            <div className="contest-admin-meta-item"><p className="contest-admin-meta-label">Reward actions</p><p className="contest-admin-meta-value">{preview.totals.rewardActionsCount}</p></div>
            <div className="contest-admin-meta-item"><p className="contest-admin-meta-label">Points total</p><p className="contest-admin-meta-value">{preview.totals.pointsCreditTotal}</p></div>
            <div className="contest-admin-meta-item"><p className="contest-admin-meta-label">XP total</p><p className="contest-admin-meta-value">{preview.totals.xpCreditTotal}</p></div>
            <div className="contest-admin-meta-item"><p className="contest-admin-meta-label">Packs total</p><p className="contest-admin-meta-value">{preview.totals.packsGrantTotal}</p></div>
          </div>
        ) : <p className="contest-admin-subtle">Generate and load a plan to inspect settlement summary.</p>}
      </section>

      <section className="admin-v2-panel">
        <h2 className="contest-admin-section-title">Settlement preview rows</h2>
        {preview ? (
          <div className="contest-workbench-rows-stack">
            {preview.rows.slice(0, 50).map((row) => (
              <div key={row.id} className="contest-admin-breakdown-card">
                <p className="contest-admin-muted">#{row.rank} · {row.displayName ?? row.userId} ({row.userId})</p>
                <p className="contest-admin-subtle">Rule={row.sourceRuleType ?? "n/a"} ({row.sourceRuleId ?? "n/a"}) · Bundle={row.sourceBundleId ?? "n/a"}</p>
                <p className="contest-admin-subtle">Rewards: {row.rewardComponents.map((component) => {
                  if (component.type === "POINTS") return `POINTS:${component.amount ?? 0}`;
                  if (component.type === "XP") return `XP:${component.amount ?? 0}`;
                  return `PACK:${component.packDefinitionId ?? "?"}x${component.quantity ?? 0}`;
                }).join(" | ")}</p>
              </div>
            ))}
            {preview.rows.length > 50 ? <p className="contest-admin-subtle">Showing 50 / {preview.rows.length} rows.</p> : null}
          </div>
        ) : <p className="contest-admin-subtle">No preview generated yet.</p>}
      </section>
    </ContestWorkbenchShell>
  );
}
