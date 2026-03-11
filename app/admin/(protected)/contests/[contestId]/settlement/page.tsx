"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { summarizeSettlementTotals } from "@/lib/admin/contest-workbench";

type RewardType = "POINTS" | "PACK" | "CARD_INSTANCE";
type RewardRow = { userId: string; type: RewardType; amount: string; packDefinitionId: string };

function newIdempotencyKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ContestSettlementWorkbenchPage({ params }: { params: { contestId: string } }) {
  const [rows, setRows] = useState<RewardRow[]>([{ userId: "", type: "POINTS", amount: "", packDefinitionId: "" }]);
  const [issues, setIssues] = useState<Array<{ severity: string; message: string }>>([]);
  const [planId, setPlanId] = useState("");
  const [preview, setPreview] = useState<{ totals?: { usersCount: number; pointsCreditTotal: number; rewardActionsCount: number } } | null>(null);
  const [message, setMessage] = useState("");

  const normalized = useMemo(
    () => rows
      .filter((row) => row.userId.trim())
      .map((row) => ({
        userId: row.userId.trim(),
        type: row.type,
        amount: row.amount.trim() ? Number(row.amount) : undefined,
        packDefinitionId: row.packDefinitionId.trim() || undefined,
      })),
    [rows]
  );

  const localTotals = summarizeSettlementTotals(normalized.map((row) => ({ type: row.type, amount: row.amount })));

  const validateAndPreview = async () => {
    setMessage("");
    setIssues([]);
    setPlanId("");
    setPreview(null);

    const response = await fetch(`/api/internal/contest-runs/${params.contestId}/settlement/plan/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rewards: normalized }),
    });

    const validation = (await response.json().catch(() => null)) as {
      error?: string;
      blocking?: boolean;
      issues?: Array<{ severity: string; message: string }>;
      planId?: string;
    } | null;

    if (!response.ok || !validation || !validation.planId) {
      setMessage(validation?.error ?? "Settlement validation failed");
      return;
    }

    setIssues(validation.issues ?? []);
    setPlanId(validation.planId);

    if (validation.blocking) {
      setMessage("Validation blocked. Fix errors before execute.");
      return;
    }

    const previewResponse = await fetch(`/api/internal/contest-runs/${params.contestId}/settlement/preview/${validation.planId}`, { cache: "no-store" });
    const previewPayload = (await previewResponse.json().catch(() => null)) as {
      preview?: { totals?: { usersCount: number; pointsCreditTotal: number; rewardActionsCount: number } };
      error?: string;
    } | null;

    if (!previewResponse.ok || !previewPayload?.preview) {
      setMessage(previewPayload?.error ?? "Settlement preview failed");
      return;
    }

    setPreview(previewPayload.preview);
    setMessage("Validation and preview ready.");
  };

  const executeSettlement = async () => {
    if (!planId) {
      setMessage("Validate first.");
      return;
    }

    const totals = preview?.totals ?? localTotals;
    if (!window.confirm(`Confirm settlement? users=${totals.usersCount}, rewards=${totals.rewardActionsCount}, points=${totals.pointsCreditTotal}`)) {
      return;
    }

    const response = await fetch(`/api/internal/contests/${params.contestId}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": newIdempotencyKey("contest-settlement") },
      body: JSON.stringify({ planId }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; settlementId?: string; rewardCount?: number } | null;
    if (!response.ok) {
      setMessage(payload?.error ?? "Settlement execute failed");
      return;
    }

    setMessage(`Settlement executed. settlementId=${payload?.settlementId}, rewards=${payload?.rewardCount}`);
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="contest-section">
        <Link href={`/admin/contests/${params.contestId}`} className="contest-inline-note">← Back to contest overview</Link>
      </section>

      <section className="contest-section" style={{ display: "grid", gap: "0.7rem" }}>
        <h1 className="page-title">Settlement Workbench</h1>
        <p className="contest-inline-note">Build reward rows in table form, validate plan, preview impact, then execute with token and idempotency key.</p>

        {rows.map((row, index) => (
          <div key={index} style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "1fr 180px 160px 1fr auto" }}>
            <input className="input" placeholder="userId" value={row.userId} onChange={(event) => setRows((prev) => prev.map((r, i) => i === index ? { ...r, userId: event.target.value } : r))} />
            <select className="input" value={row.type} onChange={(event) => setRows((prev) => prev.map((r, i) => i === index ? { ...r, type: event.target.value as RewardType } : r))}>
              <option value="POINTS">POINTS</option>
              <option value="PACK">PACK</option>
              <option value="CARD_INSTANCE">CARD_INSTANCE</option>
            </select>
            <input className="input" placeholder="amount" value={row.amount} onChange={(event) => setRows((prev) => prev.map((r, i) => i === index ? { ...r, amount: event.target.value } : r))} />
            <input className="input" placeholder="packDefinitionId" value={row.packDefinitionId} onChange={(event) => setRows((prev) => prev.map((r, i) => i === index ? { ...r, packDefinitionId: event.target.value } : r))} />
            <Button variant="ghost" onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}>Remove</Button>
          </div>
        ))}

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <Button variant="ghost" onClick={() => setRows((prev) => [...prev, { userId: "", type: "POINTS", amount: "", packDefinitionId: "" }])}>Add row</Button>
          <Button onClick={() => void validateAndPreview()}>Validate + Preview</Button>
          <Button onClick={() => void executeSettlement()} disabled={!planId}>Execute settlement</Button>
        </div>

        <p className="contest-inline-note">Draft totals: users={localTotals.usersCount}, rewards={localTotals.rewardActionsCount}, points={localTotals.pointsCreditTotal}</p>
        {message ? <p className="contest-inline-note">{message}</p> : null}
        {issues.map((issue, index) => (
          <p key={`${issue.message}-${index}`} className={issue.severity === "ERROR" ? "contest-error" : "contest-inline-note"}>{issue.message}</p>
        ))}

        {preview?.totals ? <p className="contest-inline-note">Preview totals: users={preview.totals.usersCount}, rewards={preview.totals.rewardActionsCount}, points={preview.totals.pointsCreditTotal}</p> : null}
      </section>
    </div>
  );
}
