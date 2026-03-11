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
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="contest-section">
        <h1 className="page-title">Analytics (Phase 2 baseline)</h1>
        <p className="page-subtitle">Limited operational analytics for quick health checks. Full analytics suite ships later.</p>
      </section>

      <section className="contest-section">
        {!data ? (
          <p className="contest-inline-note">Loading metrics…</p>
        ) : (
          <div className="contest-meta-grid">
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
  return (
    <div>
      <p className="contest-meta-label">{label}</p>
      <p className="contest-meta-value">{value}</p>
    </div>
  );
}
