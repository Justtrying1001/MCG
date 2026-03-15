"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminEmptyState, AdminPageHeader, AdminPanel } from "@/components/admin/AdminUi";

type SalePool = {
  packDefinitionId: string;
  packCode: string;
  displayName: string;
  totalSupply: number;
  opened: number;
  remaining: number;
  isActive: boolean;
};

type RewardPool = {
  packDefinitionId: string;
  packCode: string;
  displayName: string;
  totalSupply: number;
  attributed: number;
  claimed: number;
  reserved: number;
  remaining: number;
  isActive: boolean;
  poolStatus: "TRACKED" | "MISSING_POOL";
};

type SupplyPayload = {
  sale: {
    totalSupply: number;
    opened: number;
    remaining: number;
    pools: SalePool[];
  };
  reward: {
    totalSupply: number;
    attributed: number;
    claimed: number;
    reserved: number;
    remaining: number;
    pools: RewardPool[];
  };
  global: {
    totalSupply: number;
    saleOpened: number;
    rewardAttributed: number;
    rewardClaimed: number;
    rewardReserved: number;
    remaining: number;
  };
  lastUpdatedAt: string;
};

function pct(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (value / total) * 100));
}

export default function AdminSupplyPage() {
  const [data, setData] = useState<SupplyPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/packs/supply", { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Cannot load supply");
      setLoading(false);
      return;
    }

    setData((await response.json()) as SupplyPayload);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const updatedLabel = useMemo(() => (data ? new Date(data.lastUpdatedAt).toLocaleString() : "-"), [data]);

  const saleUsage = pct(data?.sale.opened ?? 0, data?.sale.totalSupply ?? 0);
  const rewardUsage = pct(data?.reward.attributed ?? 0, data?.reward.totalSupply ?? 0);

  return (
    <div className="admin-page admin-v2-page">
      <AdminPageHeader
        title="Pack Supply"
        subtitle="Canonical supply and lifecycle state for sale and reward packs."
        actions={<button type="button" className="mcg-btn ghost" onClick={() => void load()}>Refresh</button>}
      />

      {loading ? <AdminPanel><AdminEmptyState title="Loading supply…" /></AdminPanel> : null}
      {error ? <AdminPanel><AdminEmptyState title="Supply unavailable" description={error} /></AdminPanel> : null}

      {data ? (
        <>
          <AdminPanel>
            <p className="contest-inline-note">Last updated: {updatedLabel}</p>
            <div className="admin-v2-quick-grid" style={{ marginTop: 12 }}>
              <div className="admin-v2-quick-card">
                <p className="admin-v2-section-title">SALE PACKS</p>
                <p>Opened: {data.sale.opened.toLocaleString()} / {data.sale.totalSupply.toLocaleString()}</p>
                <div style={{ height: 10, background: "rgba(255,255,255,0.12)", borderRadius: 999, overflow: "hidden", marginTop: 8 }}>
                  <div style={{ width: `${saleUsage}%`, height: "100%", background: "#60a5fa" }} />
                </div>
                <p className="contest-inline-note" style={{ marginTop: 8 }}>{data.sale.remaining.toLocaleString()} remaining</p>
              </div>

              <div className={`admin-v2-quick-card ${data.reward.remaining <= 0 ? "admin-v2-card-danger" : ""}`}>
                <p className="admin-v2-section-title">REWARD PACKS</p>
                <p>Attributed: {data.reward.attributed.toLocaleString()} / {data.reward.totalSupply.toLocaleString()}</p>
                <p className="contest-inline-note">Claimed: {data.reward.claimed.toLocaleString()} · Reserved: {data.reward.reserved.toLocaleString()}</p>
                <div style={{ height: 10, background: "rgba(255,255,255,0.12)", borderRadius: 999, overflow: "hidden", marginTop: 8 }}>
                  <div style={{ width: `${rewardUsage}%`, height: "100%", background: data.reward.remaining <= 0 ? "#f97316" : "#60a5fa" }} />
                </div>
                <p className="contest-inline-note" style={{ marginTop: 8 }}>{data.reward.remaining.toLocaleString()} remaining</p>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel>
            <p className="admin-v2-section-title">Sale pack pools</p>
            {data.sale.pools.length === 0 ? <p className="contest-inline-note">No sale pack definitions found.</p> : null}
            {data.sale.pools.map((pool) => (
              <p key={pool.packDefinitionId} className="contest-inline-note">
                {pool.displayName} ({pool.packCode}) · opened {pool.opened}/{pool.totalSupply} · remaining {pool.remaining} · {pool.isActive ? "ACTIVE" : "INACTIVE"}
              </p>
            ))}
          </AdminPanel>

          <AdminPanel>
            <p className="admin-v2-section-title">Reward pack pools</p>
            {data.reward.pools.length === 0 ? <p className="contest-inline-note">No reward pack definitions found.</p> : null}
            {data.reward.pools.map((pool) => (
              <p key={pool.packDefinitionId} className={`contest-inline-note ${pool.poolStatus === "MISSING_POOL" ? "contest-error" : ""}`}>
                {pool.displayName} ({pool.packCode}) · attributed {pool.attributed}/{pool.totalSupply} · claimed {pool.claimed} · reserved {pool.reserved} · remaining {pool.remaining} · pool {pool.poolStatus}
              </p>
            ))}
          </AdminPanel>

          <AdminPanel>
            <p className="admin-v2-section-title">Global summary</p>
            <p className="contest-inline-note">Total supply: {data.global.totalSupply.toLocaleString()}</p>
            <p className="contest-inline-note">Sale opened: {data.global.saleOpened.toLocaleString()}</p>
            <p className="contest-inline-note">Reward attributed: {data.global.rewardAttributed.toLocaleString()}</p>
            <p className="contest-inline-note">Reward claimed: {data.global.rewardClaimed.toLocaleString()}</p>
            <p className="contest-inline-note">Reward reserved: {data.global.rewardReserved.toLocaleString()}</p>
            <p className="contest-inline-note">Remaining (sale + reward): {data.global.remaining.toLocaleString()}</p>
          </AdminPanel>
        </>
      ) : null}
    </div>
  );
}
