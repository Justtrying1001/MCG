"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/Button";

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

  const generatePlan = async () => {
    setMessage("");
    setPreview(null);

    const response = await fetch(`/api/internal/contest-runs/${params.contestId}/settlement-plan/generate`, { method: "POST" });
    const payload = (await response.json().catch(() => null)) as { error?: string; planId?: string; totals?: any } | null;
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
    const payload = (await response.json().catch(() => null)) as { error?: string; preview?: any } | null;
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
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="contest-section">
        <Link href={`/admin/contests/${params.contestId}`} className="contest-inline-note">← Back to contest overview</Link>
      </section>

      <section className="contest-section" style={{ display: "grid", gap: "0.7rem" }}>
        <h1 className="page-title">Settlement Workbench (Policy-driven)</h1>
        <p className="contest-inline-note">Primary path for Phase 2: generate settlement plan from final ranking + published reward policy, preview, then execute.</p>

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <Button onClick={() => void generatePlan()}>Generate plan from ranking + policy</Button>
          <Button variant="ghost" onClick={() => void loadPreview()}>Reload preview</Button>
          <Button onClick={() => void executePlan()} disabled={!planId}>Execute plan</Button>
          {planId ? <span className="admin-badge neutral">planId={planId}</span> : null}
        </div>

        {message ? <p className="contest-inline-note">{message}</p> : null}

        {preview ? (
          <>
            <p className="contest-inline-note">Plan status: <strong>{preview.status}</strong> · ranking size: {preview.rankingSnapshotSize}</p>
            <p className="contest-inline-note">Totals → users={preview.totals.usersCount}, points={preview.totals.pointsCreditTotal}, xp={preview.totals.xpCreditTotal}, packs={preview.totals.packsGrantTotal}, actions={preview.totals.rewardActionsCount}</p>

            <div style={{ display: "grid", gap: "0.5rem" }}>
              {preview.rows.slice(0, 50).map((row) => (
                <div key={row.id} className="contest-card" style={{ padding: "0.6rem" }}>
                  <p className="contest-inline-note">#{row.rank} · {row.displayName ?? row.userId} ({row.userId})</p>
                  <p className="contest-inline-note">Rule={row.sourceRuleType ?? "n/a"} ({row.sourceRuleId ?? "n/a"}) · Bundle={row.sourceBundleId ?? "n/a"}</p>
                  <p className="contest-inline-note">Rewards: {row.rewardComponents.map((component) => {
                    if (component.type === "POINTS") return `POINTS:${component.amount ?? 0}`;
                    if (component.type === "XP") return `XP:${component.amount ?? 0}`;
                    return `PACK:${component.packDefinitionId ?? "?"}x${component.quantity ?? 0}`;
                  }).join(" | ")}</p>
                </div>
              ))}
              {preview.rows.length > 50 ? <p className="contest-inline-note">Showing 50 / {preview.rows.length} rows.</p> : null}
            </div>
          </>
        ) : null}
      </section>

      <section className="contest-section" style={{ display: "grid", gap: "0.4rem" }}>
        <h2 className="contest-section-title">Legacy fallback</h2>
        <p className="contest-inline-note">Legacy manual settlement remains available only for old contests without published policy config.</p>
        <Link href={`/admin/contests/legacy/${params.contestId}`} className="contest-inline-note">Open legacy contest detail</Link>
      </section>
    </div>
  );
}
