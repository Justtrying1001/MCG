"use client";

import { useEffect, useState } from "react";

type Row = {
  id: string;
  module: string;
  actionType: string;
  status: "VALIDATED" | "EXECUTED" | "FAILED";
  actorLabel: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
  errorCode: string | null;
  errorMessage: string | null;
};

export default function ActivityLogPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "VALIDATED" | "EXECUTED" | "FAILED">("ALL");

  useEffect(() => {
    const load = async () => {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const response = await fetch(`/api/internal/admin-actions?${params.toString()}`, { cache: "no-store" });
      if (response.ok) {
        const payload = (await response.json()) as { items: Row[] };
        setRows(payload.items ?? []);
      }
    };
    void load();
  }, [statusFilter]);

  return (
    <div className="admin-page">
      <section className="admin-page-header">
        <div>
          <h1 className="admin-title">Activity Log</h1>
          <p className="admin-subtitle">Audit timeline for actor attribution, execution outcomes, and failure diagnostics.</p>
        </div>
      </section>

      <section className="admin-toolbar">
        <label className="contest-inline-note">Status</label>
        <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
          <option value="ALL">ALL</option><option value="VALIDATED">VALIDATED</option><option value="EXECUTED">EXECUTED</option><option value="FAILED">FAILED</option>
        </select>
        <span className="admin-badge neutral">{rows.length} events</span>
      </section>

      <section className="admin-table">
        <div className="admin-table-head" style={{ gridTemplateColumns: "0.9fr 1.2fr 0.9fr 1.2fr 1.1fr 1fr" }}>
          <span>Module</span><span>Action</span><span>Status</span><span>Actor</span><span>Target</span><span>Time</span>
        </div>
        {rows.map((row) => (
          <div key={row.id} className="admin-table-row" style={{ gridTemplateColumns: "0.9fr 1.2fr 0.9fr 1.2fr 1.1fr 1fr" }}>
            <span className="contest-code">{row.module}</span>
            <span>{row.actionType}</span>
            <span className={`admin-badge ${row.status === "FAILED" ? "danger" : row.status === "EXECUTED" ? "success" : "warn"}`}>{row.status}</span>
            <span>{row.actorLabel}</span>
            <span className="contest-inline-note">{row.targetType ?? "—"}/{row.targetId ?? "—"}</span>
            <span className="contest-inline-note">{new Date(row.createdAt).toLocaleString()}</span>
            {row.errorCode ? <p className="contest-error" style={{ gridColumn: "1 / -1" }}>{row.errorCode}: {row.errorMessage ?? ""}</p> : null}
          </div>
        ))}
        {rows.length === 0 ? <div className="admin-table-row"><p className="contest-inline-note">No actions found for this filter.</p></div> : null}
      </section>
    </div>
  );
}
