"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminStatStrip,
  AdminStatusBadge,
  AdminTableHead,
  AdminTableRow,
  AdminDataTable,
} from "@/components/admin/AdminUi";

type EssentialsPayload = {
  packs: {
    opened: number;
    planned: number;
    openedByPlan: number;
    inRewards: number;
    onSale: number;
    rows: Array<{ id: string; code: string; displayName: string; plannedPackCount: number; openedPackCount: number; source: string }>;
  };
  contests: { total: number; live: number };
  quests: { totalSocial: number };
  milestones: { total: number };
};

export default function AdminHomePage() {
  const [data, setData] = useState<EssentialsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/internal/admin/essentials-summary", { cache: "no-store" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Cannot load dashboard summary");
        setLoading(false);
        return;
      }
      setData((await response.json()) as EssentialsPayload);
      setLoading(false);
    })();
  }, []);

  const alerts = useMemo(() => {
    if (!data) return [] as Array<{ label: string; tone: "warn" | "danger" | "success" }>;
    const rows: Array<{ label: string; tone: "warn" | "danger" | "success" }> = [];
    if (data.contests.live === 0) rows.push({ label: "No live battle", tone: "warn" });
    if (data.packs.onSale === 0) rows.push({ label: "No pack on sale", tone: "danger" });
    if (data.quests.totalSocial < 3) rows.push({ label: "Low social quest inventory", tone: "warn" });
    if (rows.length === 0) rows.push({ label: "Core systems healthy", tone: "success" });
    return rows;
  }, [data]);

  return (
    <div className="admin-page admin-v2-page">
      <AdminPageHeader
        title="Dashboard"
        subtitle="Operator overview for health, workload and quick execution paths."
        actions={
          <div className="admin-v2-action-row">
            <Link href="/admin/contests" className="admin-v2-link-chip">Battles</Link>
            <Link href="/admin/moderation" className="admin-v2-link-chip">Moderation queue</Link>
            <Link href="/admin/rewards" className="admin-v2-link-chip">Manual rewards</Link>
          </div>
        }
      />

      {loading ? <AdminPanel><AdminEmptyState title="Loading dashboard…" /></AdminPanel> : null}
      {error ? <AdminPanel><AdminEmptyState title="Dashboard unavailable" description={error} /></AdminPanel> : null}

      {data ? (
        <>
          <AdminStatStrip items={[
            { label: "Packs opened", value: String(data.packs.opened) },
            { label: "Packs on sale", value: String(data.packs.onSale), tone: data.packs.onSale > 0 ? "success" : "danger" },
            { label: "Battles live", value: String(data.contests.live), tone: data.contests.live > 0 ? "success" : "warn" },
            { label: "Social quests", value: String(data.quests.totalSocial), tone: data.quests.totalSocial >= 3 ? "success" : "warn" },
            { label: "Milestones", value: String(data.milestones.total) },
          ]} />

          <div className="admin-v2-split">
            <AdminPanel>
              <p className="admin-v2-section-title">Alerts & pending actions</p>
              <div className="admin-v2-list-stack">
                {alerts.map((alert) => (
                  <div key={alert.label} className="admin-v2-list-row">
                    <span>{alert.label}</span>
                    <AdminStatusBadge tone={alert.tone} label={alert.tone.toUpperCase()} />
                  </div>
                ))}
              </div>
            </AdminPanel>

            <AdminPanel>
              <p className="admin-v2-section-title">Quick execution paths</p>
              <div className="admin-v2-quick-grid">
                <Link href="/admin/contests/create" className="admin-v2-quick-card">Create battle</Link>
                <Link href="/admin/moderation" className="admin-v2-quick-card">Review submissions</Link>
                <Link href="/admin/quests/builder" className="admin-v2-quick-card">Build quest</Link>
                <Link href="/admin/users" className="admin-v2-quick-card">Inspect user context</Link>
              </div>
            </AdminPanel>
          </div>

          <AdminPanel>
            <p className="admin-v2-section-title">Pack inventory snapshot</p>
            <AdminDataTable columns="1.2fr .8fr .8fr .9fr">
              <AdminTableHead>
                <span>Pack</span><span>Opened</span><span>Planned</span><span>Source</span>
              </AdminTableHead>
              {data.packs.rows.map((row) => (
                <AdminTableRow key={row.id}>
                  <span>{row.displayName || row.code}</span>
                  <span>{row.openedPackCount}</span>
                  <span>{row.plannedPackCount}</span>
                  <span className={`admin-v2-source-tag ${row.source.toLowerCase() === "sale" ? "sale" : row.source.toLowerCase() === "reward" ? "reward" : ""}`}>{row.source}</span>
                </AdminTableRow>
              ))}
              {data.packs.rows.length === 0 ? <AdminTableRow><span>No pack rows found.</span></AdminTableRow> : null}
            </AdminDataTable>
          </AdminPanel>
        </>
      ) : null}
    </div>
  );
}
