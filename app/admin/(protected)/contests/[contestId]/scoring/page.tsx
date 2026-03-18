"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { parseScoringRowsFromText } from "@/lib/admin/contest-workbench";

import { ContestWorkbenchShell, useContestWorkbenchMeta } from "../_components/ContestWorkbenchShell";

type ScoreRow = { userId: string; score: string };

function newIdempotencyKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ContestScoringWorkbenchPage({ params }: { params: { contestId: string } }) {
  const [rows, setRows] = useState<ScoreRow[]>([{ userId: "", score: "" }]);
  const [pasteText, setPasteText] = useState("");
  const [issues, setIssues] = useState<Array<{ severity: string; message: string; rowIndex?: number | null }>>([]);
  const [importId, setImportId] = useState("");
  const [preview, setPreview] = useState<{ afterTop?: Array<{ userId: string; rank: number; score: number }>; rankMovements?: Array<{ userId: string; from: number; to: number }> } | null>(null);
  const [message, setMessage] = useState("");
  const meta = useContestWorkbenchMeta(params.contestId);

  const normalizedRows = rows
    .filter((row) => row.userId.trim())
    .map((row) => ({ userId: row.userId.trim(), score: Number(row.score) }));

  const applyPaste = () => {
    const parsed = parseScoringRowsFromText(pasteText);
    if (parsed.errors.length > 0) {
      setMessage(`Paste parse errors: ${parsed.errors.join("; ")}`);
      return;
    }
    setRows(parsed.rows.map((row) => ({ userId: row.userId, score: String(row.score) })));
    setMessage(`Loaded ${parsed.rows.length} scoring rows from paste.`);
  };

  const validateAndPreview = async () => {
    setIssues([]);
    setImportId("");
    setPreview(null);
    setMessage("");

    if (normalizedRows.length === 0 || normalizedRows.some((row) => !Number.isFinite(row.score))) {
      setMessage("Fill at least one valid row with numeric score.");
      return;
    }

    const validateResponse = await fetch(`/api/internal/contest-runs/${params.contestId}/scoring/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: normalizedRows.map((row, index) => ({ rowId: String(index), userId: row.userId, score: row.score })) }),
    });

    const validation = (await validateResponse.json().catch(() => null)) as {
      blocking?: boolean;
      issues?: Array<{ severity: string; message: string; rowIndex?: number | null }>;
      importId?: string;
      error?: string;
    } | null;

    if (!validateResponse.ok || !validation || !validation.importId) {
      setMessage(validation?.error ?? "Scoring validation failed");
      return;
    }

    setIssues(validation.issues ?? []);
    setImportId(validation.importId);

    if (validation.blocking) {
      setMessage("Validation blocked. Fix errors before execute.");
      return;
    }

    const previewResponse = await fetch(`/api/internal/contest-runs/${params.contestId}/scoring/preview/${validation.importId}`, { cache: "no-store" });
    const previewPayload = (await previewResponse.json().catch(() => null)) as { preview?: { afterTop?: Array<{ userId: string; rank: number; score: number }>; rankMovements?: Array<{ userId: string; from: number; to: number }> }; error?: string } | null;
    if (!previewResponse.ok || !previewPayload?.preview) {
      setMessage(previewPayload?.error ?? "Scoring preview failed");
      return;
    }

    setPreview(previewPayload.preview);
    setMessage("Validation and preview ready.");
  };

  const executeScoring = async () => {
    if (!importId) {
      setMessage("Validate first.");
      return;
    }

    if (!window.confirm(`Execute scoring with importId=${importId}?`)) return;

    const response = await fetch(`/api/internal/contests/${params.contestId}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": newIdempotencyKey("contest-scoring") },
      body: JSON.stringify({ importId }),
    });

    const payload = (await response.json().catch(() => null)) as { rankingsCount?: number; error?: string } | null;
    if (!response.ok) {
      setMessage(payload?.error ?? "Scoring execute failed");
      return;
    }

    setMessage(`Scoring executed. Rankings count: ${payload?.rankingsCount ?? "?"}.`);
  };

  return (
    <ContestWorkbenchShell
      contestId={params.contestId}
      section="Scoring"
      description="Import rows, validate impact, and execute scoring with clear pre-flight checks."
      meta={meta}
      actions={<Button onClick={() => void validateAndPreview()}>Validate + preview</Button>}
    >
      <section className="admin-v2-panel">
        <h2 className="contest-admin-section-title">Scoring summary</h2>
        <div className="contest-admin-summary-grid">
          <div className="contest-admin-meta-item"><p className="contest-admin-meta-label">Rows ready</p><p className="contest-admin-meta-value">{normalizedRows.length}</p></div>
          <div className="contest-admin-meta-item"><p className="contest-admin-meta-label">Import token</p><p className="contest-admin-meta-value">{importId || "—"}</p></div>
          <div className="contest-admin-meta-item"><p className="contest-admin-meta-label">Issues</p><p className="contest-admin-meta-value">{issues.length}</p></div>
          <div className="contest-admin-meta-item"><p className="contest-admin-meta-label">Preview top rows</p><p className="contest-admin-meta-value">{preview?.afterTop?.length ?? 0}</p></div>
        </div>
      </section>

      <section className="admin-v2-panel contest-workbench-two-col">
        <div>
          <h2 className="contest-admin-section-title">Import source</h2>
          <textarea className="input contest-workbench-textarea" rows={6} placeholder="Paste rows: userId,score per line" value={pasteText} onChange={(event) => setPasteText(event.target.value)} />
          <div className="contest-workbench-actions-row">
            <Button onClick={applyPaste}>Parse pasted rows</Button>
            <Button variant="ghost" onClick={() => setRows((prev) => [...prev, { userId: "", score: "" }])}>Add row</Button>
          </div>
        </div>

        <div>
          <h2 className="contest-admin-section-title">Execution</h2>
          <p className="contest-admin-muted">Validation is required before execute. Preview must be clean (no blocking issues).</p>
          <div className="contest-workbench-actions-row">
            <Button onClick={() => void validateAndPreview()}>Validate + Preview</Button>
            <Button onClick={() => void executeScoring()} disabled={!importId}>Execute scoring</Button>
          </div>
          {message ? <p className="contest-admin-muted">{message}</p> : null}
        </div>
      </section>

      <section className="admin-v2-panel">
        <h2 className="contest-admin-section-title">Scoring rows</h2>
        <div className="contest-workbench-row-grid">
          {rows.map((row, index) => (
            <div key={index} className="contest-workbench-row-item">
              <input className="input" placeholder="userId" value={row.userId} onChange={(event) => setRows((prev) => prev.map((r, i) => i === index ? { ...r, userId: event.target.value } : r))} />
              <input className="input" placeholder="score" value={row.score} onChange={(event) => setRows((prev) => prev.map((r, i) => i === index ? { ...r, score: event.target.value } : r))} />
              <Button variant="ghost" onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}>Remove</Button>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-v2-panel contest-workbench-two-col">
        <div>
          <h2 className="contest-admin-section-title">Validation issues</h2>
          {issues.length === 0 ? <p className="contest-admin-subtle">No validation issues.</p> : null}
          <div className="contest-admin-blocker-list">
            {issues.map((issue, index) => (
              <div key={`${issue.message}-${index}`} className={issue.severity === "ERROR" ? "contest-admin-blocker-item" : "contest-workbench-warning-item"}>
                <span aria-hidden>{issue.severity === "ERROR" ? "⚠" : "•"}</span>
                <p>{issue.rowIndex !== null && issue.rowIndex !== undefined ? `Row ${issue.rowIndex + 1}: ` : ""}{issue.message}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="contest-admin-section-title">Preview</h2>
          {preview ? (
            <div className="contest-workbench-note-block">
              <p className="contest-admin-muted">Top ranking preview:</p>
              {(preview.afterTop ?? []).slice(0, 10).map((row) => (
                <p key={row.userId} className="contest-admin-subtle">#{row.rank} {row.userId} — {row.score}</p>
              ))}
              <p className="contest-admin-muted">Rank movements: {preview.rankMovements?.length ?? 0}</p>
            </div>
          ) : <p className="contest-admin-subtle">No preview available yet.</p>}
        </div>
      </section>
    </ContestWorkbenchShell>
  );
}
