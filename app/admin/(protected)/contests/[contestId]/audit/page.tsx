"use client";

import { useEffect, useMemo, useState } from "react";

import { buildContestAuditQuery } from "@/lib/admin/contest-workbench";

import { ContestWorkbenchShell, useContestWorkbenchMeta } from "../_components/ContestWorkbenchShell";

type ActionRow = {
  id: string;
  actionType: string;
  module: string;
  status: "VALIDATED" | "EXECUTED" | "FAILED";
  actorLabel: string;
  createdAt: string;
  errorCode: string | null;
  errorMessage: string | null;
};

export default function ContestAuditTimelinePage({ params }: { params: { contestId: string } }) {
  const [rows, setRows] = useState<ActionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | ActionRow["status"]>("ALL");
  const meta = useContestWorkbenchMeta(params.contestId);

  useEffect(() => {
    const load = async () => {
      const response = await fetch(buildContestAuditQuery(params.contestId), { cache: "no-store" });
      if (response.ok) {
        const payload = (await response.json()) as { items: ActionRow[] };
        setRows(payload.items ?? []);
      }
      setLoading(false);
    };
    void load();
  }, [params.contestId]);

  const filtered = useMemo(() => {
    if (statusFilter === "ALL") return rows;
    return rows.filter((row) => row.status === statusFilter);
  }, [rows, statusFilter]);

  return (
    <ContestWorkbenchShell
      contestId={params.contestId}
      section="Audit"
      description="Review transition, scoring, and settlement events with actor and status context."
      meta={meta}
    >
      <section className="admin-v2-panel contest-workbench-two-col">
        <div>
          <h2 className="contest-admin-section-title">Timeline summary</h2>
          <div className="contest-admin-summary-grid">
            <div className="contest-admin-meta-item"><p className="contest-admin-meta-label">Total events</p><p className="contest-admin-meta-value">{rows.length}</p></div>
            <div className="contest-admin-meta-item"><p className="contest-admin-meta-label">Executed</p><p className="contest-admin-meta-value">{rows.filter((row) => row.status === "EXECUTED").length}</p></div>
            <div className="contest-admin-meta-item"><p className="contest-admin-meta-label">Validated</p><p className="contest-admin-meta-value">{rows.filter((row) => row.status === "VALIDATED").length}</p></div>
            <div className="contest-admin-meta-item"><p className="contest-admin-meta-label">Failed</p><p className="contest-admin-meta-value">{rows.filter((row) => row.status === "FAILED").length}</p></div>
          </div>
        </div>
        <div>
          <h2 className="contest-admin-section-title">Filter</h2>
          <div className="contest-workbench-actions-row">
            {(["ALL", "VALIDATED", "EXECUTED", "FAILED"] as const).map((value) => (
              <button key={value} type="button" className={`admin-v2-link-chip ${statusFilter === value ? "contest-workbench-nav-active" : ""}`} onClick={() => setStatusFilter(value)}>
                {value}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="admin-v2-panel">
        <h2 className="contest-admin-section-title">Event timeline</h2>
        {loading ? <p className="contest-admin-muted">Loading timeline…</p> : null}
        {!loading && filtered.length === 0 ? <p className="contest-admin-subtle">No contest audit actions found for this filter.</p> : null}
        <div className="contest-workbench-rows-stack">
          {!loading && filtered.map((row) => (
            <article key={row.id} className="contest-workbench-audit-row">
              <div className="contest-workbench-audit-head">
                <p className="contest-admin-code">{row.module}</p>
                <span className={`contest-workbench-audit-status is-${row.status.toLowerCase()}`}>{row.status}</span>
              </div>
              <p className="contest-admin-muted"><strong>{row.actionType}</strong> · actor={row.actorLabel}</p>
              <p className="contest-admin-subtle">{new Date(row.createdAt).toLocaleString()}</p>
              {row.errorCode ? (
                <div className="contest-admin-blocker-item">
                  <span aria-hidden>⚠</span>
                  <p>{row.errorCode} {row.errorMessage ?? ""}</p>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </ContestWorkbenchShell>
  );
}
