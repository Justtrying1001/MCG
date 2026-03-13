"use client";

import { useEffect, useState } from "react";

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

  return (
    <div className="admin-page">
      <section className="admin-page-header">
        <div>
          <h1 className="admin-title">Admin Dashboard</h1>
          <p className="admin-subtitle">Simple operational overview for packs, contests, quests and milestones.</p>
        </div>
      </section>

      {loading ? <section className="admin-panel"><p className="contest-inline-note">Loading dashboard…</p></section> : null}
      {error ? <section className="admin-panel"><p className="contest-error">{error}</p></section> : null}

      {data ? (
        <div style={{ display: "grid", gap: "0.8rem" }}>
          <section className="admin-kpi-grid">
            <Card title="Packs" lines={[
              `Opened packs: ${data.packs.opened}`,
              `Planned packs: ${data.packs.planned}`,
              `Packs in rewards: ${data.packs.inRewards}`,
              `Packs on sale: ${data.packs.onSale}`,
            ]} />
            <Card title="Contests" lines={[
              `Total contests: ${data.contests.total}`,
              `Live contests: ${data.contests.live}`,
            ]} />
            <Card title="Quests" lines={[
              `Social quests: ${data.quests.totalSocial}`,
            ]} />
            <Card title="Milestones" lines={[
              `Total milestones: ${data.milestones.total}`,
            ]} />
          </section>

          <section className="admin-panel">
            <p className="admin-section-title">Pack details (set / edition runtime reference)</p>
            <div style={{ display: "grid", gap: "0.35rem" }}>
              {data.packs.rows.map((row) => (
                <p key={row.id} className="contest-inline-note">{row.displayName || row.code} · opened {row.openedPackCount}/{row.plannedPackCount} · {row.source}</p>
              ))}
              {data.packs.rows.length === 0 ? <p className="contest-inline-note">No pack rows found.</p> : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function Card({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="admin-kpi" style={{ minHeight: 140 }}>
      <p className="admin-kpi-label" style={{ fontSize: "0.82rem" }}>{title}</p>
      <div style={{ display: "grid", gap: "0.3rem" }}>
        {lines.map((line) => <p key={line} className="contest-inline-note">{line}</p>)}
      </div>
    </div>
  );
}
