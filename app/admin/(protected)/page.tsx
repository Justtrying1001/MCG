"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DashboardPayload = {
  summary: {
    contestsByStatus: Record<string, number>;
    pendingModerationCount: number;
    manualGrantsLast24h: number;
    failedAdminActionsLast24h: number;
  };
  recentCriticalEvents: Array<{
    id: string;
    module: string;
    actionType: string;
    status: "VALIDATED" | "EXECUTED" | "FAILED";
    actorLabel: string;
    targetType: string | null;
    targetId: string | null;
    errorCode: string | null;
    createdAt: string;
  }>;
};

export default function AdminHomePage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/internal/admin/dashboard-summary", { cache: "no-store" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Cannot load dashboard");
        setLoading(false);
        return;
      }
      const payload = (await response.json()) as DashboardPayload;
      setData(payload);
      setLoading(false);
    };

    void load();
  }, []);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="contest-section">
        <h1 className="page-title">Operations Dashboard</h1>
        <p className="page-subtitle">High-signal admin state for contest ops, moderation health, compensations, and incident visibility.</p>
      </section>

      {loading ? <section className="contest-section"><p className="contest-inline-note">Loading dashboard…</p></section> : null}
      {error ? <section className="contest-section"><p className="contest-error">{error}</p></section> : null}

      {data ? (
        <>
          <section className="contest-section" style={{ display: "grid", gap: "0.6rem" }}>
            <h2 className="contest-section-title">Priority actions</h2>
            <div style={{ display: "grid", gap: "0.4rem" }}>
              <DashboardAction
                label="Moderation queue"
                value={`${data.summary.pendingModerationCount} pending submissions`}
                href="/admin/moderation"
                critical={data.summary.pendingModerationCount > 20}
              />
              <DashboardAction
                label="Live contests"
                value={`${data.summary.contestsByStatus.LIVE ?? 0} currently LIVE`}
                href="/admin/contests"
              />
              <DashboardAction
                label="Failed admin actions (24h)"
                value={String(data.summary.failedAdminActionsLast24h)}
                href="/admin/activity-log"
                critical={data.summary.failedAdminActionsLast24h > 0}
              />
            </div>
          </section>

          <section className="contest-section">
            <h2 className="contest-section-title">Queue health</h2>
            <div className="contest-meta-grid">
              {Object.entries(data.summary.contestsByStatus).map(([status, count]) => (
                <div key={status}>
                  <p className="contest-meta-label">{status}</p>
                  <p className="contest-meta-value">{count}</p>
                </div>
              ))}
              <div>
                <p className="contest-meta-label">Manual grants (24h)</p>
                <p className="contest-meta-value">{data.summary.manualGrantsLast24h}</p>
              </div>
            </div>
          </section>

          <section className="contest-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
              <h2 className="contest-section-title">Recent critical events</h2>
              <Link href="/admin/activity-log" className="contest-inline-note">Open full log</Link>
            </div>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {data.recentCriticalEvents.map((event) => (
                <div key={event.id} className="contest-card" style={{ padding: "0.6rem" }}>
                  <div className="contest-card-top">
                    <p className="contest-code">{event.module}</p>
                    <span className={`contest-status status-${event.status === "FAILED" ? "canceled" : "live"}`}>{event.status}</span>
                  </div>
                  <p className="contest-inline-note" style={{ marginTop: "0.4rem" }}>{event.actionType} · actor={event.actorLabel}</p>
                  <p className="contest-inline-note">{new Date(event.createdAt).toLocaleString()} · {event.targetType ?? "—"}/{event.targetId ?? "—"}</p>
                  {event.errorCode ? <p className="contest-error">errorCode: {event.errorCode}</p> : null}
                </div>
              ))}
              {data.recentCriticalEvents.length === 0 ? <p className="contest-inline-note">No recent admin events.</p> : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function DashboardAction({ label, value, href, critical }: { label: string; value: string; href: string; critical?: boolean }) {
  return (
    <Link href={href} className="contest-card" style={{ textDecoration: "none", borderColor: critical ? "#ef4444" : undefined }}>
      <div className="contest-card-top">
        <p className="contest-code">{critical ? "PRIORITY" : "OPS"}</p>
      </div>
      <h3 className="contest-title">{label}</h3>
      <p className="contest-inline-note">{value}</p>
    </Link>
  );
}
