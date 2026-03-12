"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { parseScoringRowsFromText } from "@/lib/admin/contest-workbench";

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
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="contest-section">
        <Link href={`/admin/contests/${params.contestId}`} className="contest-inline-note">← Back to contest overview</Link>
      </section>

      <section className="contest-section" style={{ display: "grid", gap: "0.7rem" }}>
        <h1 className="page-title">Scoring Workbench</h1>
        <p className="contest-inline-note">Primary flow: structured rows → validate → preview ranking impact → execute.</p>

        <textarea className="input" rows={4} placeholder={"Paste rows: userId,score per line"} value={pasteText} onChange={(event) => setPasteText(event.target.value)} />
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <Button onClick={applyPaste}>Parse pasted rows</Button>
          <Button variant="ghost" onClick={() => setRows((prev) => [...prev, { userId: "", score: "" }])}>Add row</Button>
        </div>

        {rows.map((row, index) => (
          <div key={index} style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "1fr 180px auto" }}>
            <input className="input" placeholder="userId" value={row.userId} onChange={(event) => setRows((prev) => prev.map((r, i) => i === index ? { ...r, userId: event.target.value } : r))} />
            <input className="input" placeholder="score" value={row.score} onChange={(event) => setRows((prev) => prev.map((r, i) => i === index ? { ...r, score: event.target.value } : r))} />
            <Button variant="ghost" onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}>Remove</Button>
          </div>
        ))}

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <Button onClick={() => void validateAndPreview()}>Validate + Preview</Button>
          <Button onClick={() => void executeScoring()} disabled={!importId}>Execute scoring</Button>
        </div>
        {message ? <p className="contest-inline-note">{message}</p> : null}

        {issues.map((issue, index) => (
          <p key={`${issue.message}-${index}`} className={issue.severity === "ERROR" ? "contest-error" : "contest-inline-note"}>
            {issue.rowIndex !== null && issue.rowIndex !== undefined ? `Row ${issue.rowIndex + 1}: ` : ""}{issue.message}
          </p>
        ))}

        {preview ? (
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <p className="contest-inline-note">Top ranking preview:</p>
            {(preview.afterTop ?? []).slice(0, 10).map((row) => (
              <p key={row.userId} className="contest-inline-note">#{row.rank} {row.userId} — {row.score}</p>
            ))}
            <p className="contest-inline-note">Rank movements: {preview.rankMovements?.length ?? 0}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
