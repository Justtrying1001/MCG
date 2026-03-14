"use client";

import { useEffect, useState } from "react";

import {
  AdminDataTable,
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
  AdminTableHead,
  AdminTableRow,
  AdminToolbar,
} from "@/components/admin/AdminUi";

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
    <div className="admin-page admin-v2-page">
      <AdminPageHeader
        title="Activity log"
        subtitle="Audit timeline for actor attribution, execution outcomes and failure diagnostics."
      />

      <AdminToolbar>
        <label className="contest-inline-note">Status</label>
        <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
          <option value="ALL">ALL</option><option value="VALIDATED">VALIDATED</option><option value="EXECUTED">EXECUTED</option><option value="FAILED">FAILED</option>
        </select>
        <AdminStatusBadge tone="neutral" label={`${rows.length} events`} />
      </AdminToolbar>

      <AdminPanel>
        <AdminDataTable columns=".8fr 1.1fr .8fr 1.1fr 1.1fr .9fr">
          <AdminTableHead>
            <span>Module</span><span>Action</span><span>Status</span><span>Actor</span><span>Target</span><span>Time</span>
          </AdminTableHead>
          {rows.map((row) => (
            <AdminTableRow key={row.id}>
              <span className="contest-code">{row.module}</span>
              <span>{row.actionType}</span>
              <AdminStatusBadge tone={row.status === "FAILED" ? "danger" : row.status === "EXECUTED" ? "success" : "warn"} label={row.status} />
              <span>{row.actorLabel}</span>
              <span className="contest-inline-note">{row.targetType ?? "—"}/{row.targetId ?? "—"}</span>
              <span className="contest-inline-note">{new Date(row.createdAt).toLocaleString()}</span>
              {row.errorCode ? <p className="contest-error">{row.errorCode}: {row.errorMessage ?? ""}</p> : null}
            </AdminTableRow>
          ))}
          {rows.length === 0 ? <AdminTableRow><AdminEmptyState title="No actions found for this filter." /></AdminTableRow> : null}
        </AdminDataTable>
      </AdminPanel>
    </div>
  );
}
