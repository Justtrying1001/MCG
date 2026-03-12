"use client";

import { useEffect, useState } from "react";

type Summary = {
  summary: {
    contestsByStatus: Record<string, number>;
    pendingModerationCount: number;
    manualGrantsLast24h: number;
    failedAdminActionsLast24h: number;
  };
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    void fetch("/api/internal/admin/dashboard-summary", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => setData(payload as Summary | null));
  }, []);

  return (
    <div className="admin-page">
      <section className="admin-page-header">
        <div>
          <h1 className="admin-title">Analytics Baseline</h1>
          <p className="admin-subtitle">Compact operational metrics panel pending advanced analytics suite delivery.</p>
        </div>
      </section>

      <section className="admin-panel">
        {!data ? (
          <p className="contest-inline-note">Loading metrics…</p>
        ) : (
          <div className="admin-kpi-grid">
            <Metric label="LIVE contests" value={String(data.summary.contestsByStatus.LIVE ?? 0)} />
            <Metric label="Pending moderation" value={String(data.summary.pendingModerationCount)} />
            <Metric label="Manual grants (24h)" value={String(data.summary.manualGrantsLast24h)} />
            <Metric label="Failed admin actions (24h)" value={String(data.summary.failedAdminActionsLast24h)} />
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="admin-kpi"><p className="admin-kpi-label">{label}</p><p className="admin-kpi-value">{value}</p></div>;
}
