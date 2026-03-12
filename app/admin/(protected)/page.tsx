"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

  const contestStatusCards = useMemo(() => Object.entries(data?.summary.contestsByStatus ?? {}), [data]);

  return (
    <div className="admin-page">
      <section className="admin-page-header">
        <div>
          <h1 className="admin-title">Operations Dashboard</h1>
          <p className="admin-subtitle">Compact cockpit for incidents, queue pressure, and critical admin workload.</p>
        </div>
        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
          <Link className="admin-badge neutral" href="/admin/activity-log">Full log</Link>
          <Link className="admin-badge neutral" href="/admin/moderation">Moderation queue</Link>
        </div>
      </section>

      {loading ? <section className="admin-panel"><p className="contest-inline-note">Loading dashboard…</p></section> : null}
      {error ? <section className="admin-panel"><p className="contest-error">{error}</p></section> : null}

      {data ? (
        <>
          <section className="admin-kpi-grid">
            <Kpi label="Pending moderation" value={String(data.summary.pendingModerationCount)} tone={data.summary.pendingModerationCount > 20 ? "danger" : "warn"} />
            <Kpi label="Failed admin actions (24h)" value={String(data.summary.failedAdminActionsLast24h)} tone={data.summary.failedAdminActionsLast24h > 0 ? "danger" : "success"} />
            <Kpi label="Manual grants (24h)" value={String(data.summary.manualGrantsLast24h)} tone="neutral" />
            <Kpi label="Live contests" value={String(data.summary.contestsByStatus.LIVE ?? 0)} tone="success" />
          </section>

          <section className="admin-split">
            <div className="admin-panel">
              <p className="admin-section-title">Priority actions</p>
              <ActionRow href="/admin/moderation" label="Clear moderation backlog" detail={`${data.summary.pendingModerationCount} items pending review`} critical={data.summary.pendingModerationCount > 20} />
              <ActionRow href="/admin/contests" label="Watch live contests" detail={`${data.summary.contestsByStatus.LIVE ?? 0} contests in LIVE state`} />
              <ActionRow href="/admin/rewards" label="Review compensations" detail={`${data.summary.manualGrantsLast24h} grant events in 24h`} />
              <ActionRow href="/admin/activity-log" label="Investigate failures" detail={`${data.summary.failedAdminActionsLast24h} failed actions in 24h`} critical={data.summary.failedAdminActionsLast24h > 0} />
            </div>

            <div className="admin-panel">
              <p className="admin-section-title">Contest state health</p>
              <div className="admin-kpi-grid">
                {contestStatusCards.map(([status, count]) => (
                  <Kpi key={status} label={status} value={String(count)} tone={status === "LIVE" ? "success" : "neutral"} />
                ))}
              </div>
            </div>
          </section>

          <section className="admin-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem" }}>
              <p className="admin-section-title">Recent critical events</p>
              <Link href="/admin/activity-log" className="admin-badge neutral">Open full log</Link>
            </div>

            <div style={{ display: "grid", gap: "0.45rem" }}>
              {data.recentCriticalEvents.map((event) => (
                <div key={event.id} className="admin-panel" style={{ padding: "0.55rem", gap: "0.35rem", background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem", alignItems: "center" }}>
                    <p className="contest-code">{event.module} · {event.actionType}</p>
                    <span className={`admin-badge ${event.status === "FAILED" ? "danger" : "success"}`}>{event.status}</span>
                  </div>
                  <p className="contest-inline-note">actor: {event.actorLabel} · target: {event.targetType ?? "—"}/{event.targetId ?? "—"}</p>
                  <p className="contest-inline-note">{new Date(event.createdAt).toLocaleString()}</p>
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

function Kpi({ label, value, tone }: { label: string; value: string; tone: "success" | "warn" | "danger" | "neutral" }) {
  return (
    <div className="admin-kpi">
      <p className="admin-kpi-label">{label}</p>
      <p className="admin-kpi-value">{value}</p>
      <span className={`admin-badge ${tone}`}>{tone.toUpperCase()}</span>
    </div>
  );
}

function ActionRow({ href, label, detail, critical }: { href: string; label: string; detail: string; critical?: boolean }) {
  return (
    <Link href={href} className="admin-panel" style={{ padding: "0.55rem", gap: "0.3rem", textDecoration: "none", borderColor: critical ? "rgba(248,113,113,0.5)" : undefined }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem" }}>
        <p style={{ fontSize: "0.86rem", fontWeight: 700 }}>{label}</p>
        <span className={`admin-badge ${critical ? "danger" : "neutral"}`}>{critical ? "priority" : "action"}</span>
      </div>
      <p className="contest-inline-note">{detail}</p>
    </Link>
  );
}
