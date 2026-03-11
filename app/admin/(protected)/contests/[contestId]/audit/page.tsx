"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { buildContestAuditQuery } from "@/lib/admin/contest-workbench";

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

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="contest-section">
        <Link href={`/admin/contests/${params.contestId}`} className="contest-inline-note">← Back to contest overview</Link>
      </section>

      <section className="contest-section">
        <h1 className="page-title">Contest Audit Timeline</h1>
        <p className="page-subtitle">Transitions, scoring, settlement validations/executions, failures and actor attribution.</p>
      </section>

      <section className="contest-section" style={{ display: "grid", gap: "0.5rem" }}>
        {loading ? <p className="contest-inline-note">Loading timeline…</p> : null}
        {!loading && rows.map((row) => (
          <div key={row.id} className="contest-card" style={{ padding: "0.6rem" }}>
            <div className="contest-card-top">
              <p className="contest-code">{row.actionType}</p>
              <span className={`contest-status status-${row.status === "FAILED" ? "canceled" : "live"}`}>{row.status}</span>
            </div>
            <p className="contest-inline-note">actor={row.actorLabel} · {new Date(row.createdAt).toLocaleString()}</p>
            {row.errorCode ? <p className="contest-error">{row.errorCode} {row.errorMessage ?? ""}</p> : null}
          </div>
        ))}
        {!loading && rows.length === 0 ? <p className="contest-inline-note">No contest audit actions found.</p> : null}
      </section>
    </div>
  );
}
