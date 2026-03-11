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
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="contest-section">
        <h1 className="page-title">Activity Log</h1>
        <p className="page-subtitle">Trace critical admin actions with actor attribution and status.</p>
      </section>

      <section className="contest-section" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <label className="contest-inline-note">Status filter</label>
        <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
          <option value="ALL">ALL</option>
          <option value="VALIDATED">VALIDATED</option>
          <option value="EXECUTED">EXECUTED</option>
          <option value="FAILED">FAILED</option>
        </select>
      </section>

      <section className="contest-section" style={{ display: "grid", gap: "0.5rem" }}>
        {rows.map((row) => (
          <div key={row.id} className="contest-card" style={{ padding: "0.6rem" }}>
            <div className="contest-card-top">
              <p className="contest-code">{row.module}</p>
              <span className={`contest-status status-${row.status === "FAILED" ? "canceled" : "live"}`}>{row.status}</span>
            </div>
            <p className="contest-inline-note">{row.actionType} · actor={row.actorLabel}</p>
            <p className="contest-inline-note">target={row.targetType ?? "—"}/{row.targetId ?? "—"}</p>
            <p className="contest-inline-note">{new Date(row.createdAt).toLocaleString()}</p>
            {row.errorCode ? <p className="contest-error">{row.errorCode}: {row.errorMessage ?? ""}</p> : null}
          </div>
        ))}
        {rows.length === 0 ? <p className="contest-inline-note">No actions found for this filter.</p> : null}
      </section>
    </div>
  );
}
