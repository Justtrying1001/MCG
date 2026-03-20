"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminStatStrip,
  AdminTableHead,
  AdminTableRow,
  AdminDataTable,
  AdminToolbar,
} from "@/components/admin/AdminUi";

type AnalyticsRange = "today" | "7d" | "all";

type AnalyticsPayload = {
  analytics: {
    range: AnalyticsRange;
    overview: {
      visitorsToday: number;
      visitorsTotal: number;
      packsOpenedToday: number;
      packsOpenedTotal: number;
      packsRemaining: number;
    };
    funnel: {
      visitors: number;
      clickOpenPack: number;
      login: number;
      packOpen: number;
      conversion: {
        visitorToClickOpenPack: number;
        clickOpenPackToLogin: number;
        loginToPackOpen: number;
        visitorToPackOpen: number;
      };
    };
    packs: {
      totalOpened: number;
      guestOpened: number;
      loggedOpened: number;
      remainingSupply: number;
    };
  };
};

const RANGE_OPTIONS: Array<{ value: AnalyticsRange; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7D" },
  { value: "all", label: "All time" },
];

function formatPct(value: number) {
  return `${value.toFixed(1)}%`;
}

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>("today");
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    void (async () => {
      const response = await fetch(`/api/internal/admin/analytics?range=${range}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as AnalyticsPayload & { error?: string } | null;
      if (!response.ok || !payload) {
        setError(payload?.error ?? "Cannot load analytics");
        setData(null);
        setLoading(false);
        return;
      }
      setData(payload);
      setLoading(false);
    })();
  }, [range]);

  const stats = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Visitors today", value: String(data.analytics.overview.visitorsToday) },
      { label: "Visitors total", value: String(data.analytics.overview.visitorsTotal) },
      { label: "Packs opened today", value: String(data.analytics.overview.packsOpenedToday) },
      { label: "Packs remaining", value: String(data.analytics.overview.packsRemaining) },
    ];
  }, [data]);

  return (
    <div className="admin-page admin-v2-page">
      <AdminPageHeader
        title="Analytics"
        subtitle="Lightweight internal product analytics for acquisition, login, and pack-open conversion."
      />

      <AdminToolbar>
        <div className="admin-v2-action-row">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="admin-v2-link-chip"
              onClick={() => setRange(option.value)}
              aria-pressed={range === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </AdminToolbar>

      {loading ? <AdminPanel><AdminEmptyState title="Loading analytics…" /></AdminPanel> : null}
      {error ? <AdminPanel><AdminEmptyState title="Analytics unavailable" description={error} /></AdminPanel> : null}

      {data ? (
        <>
          <AdminStatStrip items={stats} />

          <div className="admin-v2-split">
            <AdminPanel>
              <p className="admin-v2-section-title">Funnel</p>
              <AdminDataTable columns="1.2fr .9fr .9fr">
                <AdminTableHead>
                  <span>Stage</span><span>Count</span><span>Step CVR</span>
                </AdminTableHead>
                <AdminTableRow>
                  <span>Visitors</span><span>{data.analytics.funnel.visitors}</span><span>—</span>
                </AdminTableRow>
                <AdminTableRow>
                  <span>Click open pack</span><span>{data.analytics.funnel.clickOpenPack}</span><span>{formatPct(data.analytics.funnel.conversion.visitorToClickOpenPack)}</span>
                </AdminTableRow>
                <AdminTableRow>
                  <span>Login</span><span>{data.analytics.funnel.login}</span><span>{formatPct(data.analytics.funnel.conversion.clickOpenPackToLogin)}</span>
                </AdminTableRow>
                <AdminTableRow>
                  <span>Pack opened</span><span>{data.analytics.funnel.packOpen}</span><span>{formatPct(data.analytics.funnel.conversion.loginToPackOpen)}</span>
                </AdminTableRow>
              </AdminDataTable>
              <p className="contest-inline-note" style={{ marginTop: 12 }}>
                End-to-end visitor → pack-open conversion: {formatPct(data.analytics.funnel.conversion.visitorToPackOpen)}.
              </p>
            </AdminPanel>

            <AdminPanel>
              <p className="admin-v2-section-title">Packs</p>
              <div className="admin-v2-list-stack">
                <div className="admin-v2-list-row"><span>Total opened</span><strong>{data.analytics.packs.totalOpened}</strong></div>
                <div className="admin-v2-list-row"><span>Guest opens</span><strong>{data.analytics.packs.guestOpened}</strong></div>
                <div className="admin-v2-list-row"><span>Logged opens</span><strong>{data.analytics.packs.loggedOpened}</strong></div>
                <div className="admin-v2-list-row"><span>Remaining supply</span><strong>{data.analytics.packs.remainingSupply}</strong></div>
              </div>
            </AdminPanel>
          </div>
        </>
      ) : null}
    </div>
  );
}
