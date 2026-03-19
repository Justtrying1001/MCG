"use client";

import { useEffect, useMemo, useState } from "react";

import {
  AdminDataTable,
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminStatusBadge,
  AdminTableHead,
  AdminTableRow,
} from "@/components/admin/AdminUi";

// ─── Supply types ────────────────────────────────────────────────────────────

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

// ─── History types ────────────────────────────────────────────────────────────

type PerPackTotal = {
  packDefinitionId: string;
  packCode: string;
  displayName: string;
  totalAttributed: number;
  claimed: number;
  pending: number;
};

type BySourceRow = {
  sourceType: "CONTEST_SETTLEMENT" | "MANUAL_OR_OTHER";
  contestId: string | null;
  contestTitle: string | null;
  contestCode: string | null;
  settlementId: string | null;
  packDefinitionId: string;
  packCode: string;
  count: number;
  claimed: number;
  pending: number;
  firstGrantedAt: string;
  lastGrantedAt: string;
};

type RecentGrant = {
  id: string;
  userId: string;
  userLabel: string;
  packCode: string;
  sourceType: "CONTEST_SETTLEMENT" | "MANUAL_OR_OTHER";
  contestTitle: string | null;
  claimed: boolean;
  claimedAt: string | null;
  grantedAt: string;
};

type PackPurchaseLimitAdminPayload = {
  ok: true;
  config: {
    enabled: boolean;
    maxPurchasesPer24h: number;
  };
  preview: string;
  helperText: string;
};

type HistoryPayload = {
  ok: true;
  perPackTotals: PerPackTotal[];
  bySource: BySourceRow[];
  recentGrants: RecentGrant[];
  fetchedAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (value / total) * 100));
}

function fmt(n: number) {
  return n.toLocaleString();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function barColor(remaining: number): string {
  if (remaining <= 500) return "#f97316";
  if (remaining <= 1000) return "#eab308";
  return "#60a5fa";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminSupplyPage() {
  const [data, setData] = useState<SupplyPayload | null>(null);
  const [loadingSupply, setLoadingSupply] = useState(true);
  const [errorSupply, setErrorSupply] = useState("");

  const [history, setHistory] = useState<HistoryPayload | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorHistory, setErrorHistory] = useState("");

  const [historyTab, setHistoryTab] = useState<"by-source" | "recent">("by-source");
  const [limitData, setLimitData] = useState<PackPurchaseLimitAdminPayload | null>(null);
  const [limitEnabled, setLimitEnabled] = useState(true);
  const [limitValue, setLimitValue] = useState("5");
  const [limitSaving, setLimitSaving] = useState(false);
  const [limitMessage, setLimitMessage] = useState("");
  const [limitError, setLimitError] = useState("");

  const loadSupply = async () => {
    setLoadingSupply(true);
    setErrorSupply("");
    const response = await fetch("/api/admin/packs/supply", { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setErrorSupply(payload?.error ?? "Cannot load supply");
      setLoadingSupply(false);
      return;
    }
    setData((await response.json()) as SupplyPayload);
    setLoadingSupply(false);
  };


  const loadPurchaseLimit = async () => {
    setLimitError("");
    const response = await fetch("/api/internal/admin/pack-purchase-limit", { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setLimitError(payload?.error ?? "Cannot load purchase limit settings");
      return;
    }
    const payload = (await response.json()) as PackPurchaseLimitAdminPayload;
    setLimitData(payload);
    setLimitEnabled(payload.config.enabled);
    setLimitValue(String(payload.config.maxPurchasesPer24h));
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    setErrorHistory("");
    const response = await fetch("/api/internal/supply/reward-pack-history?limit=200", {
      cache: "no-store",
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setErrorHistory(payload?.error ?? "Cannot load history");
      setLoadingHistory(false);
      return;
    }
    setHistory((await response.json()) as HistoryPayload);
    setLoadingHistory(false);
  };

  const load = () => {
    void loadSupply();
    void loadHistory();
    void loadPurchaseLimit();
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const savePurchaseLimit = async () => {
    setLimitSaving(true);
    setLimitError("");
    setLimitMessage("");
    const parsedLimit = Number(limitValue);
    const response = await fetch("/api/internal/admin/pack-purchase-limit", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: limitEnabled,
        maxPurchasesPer24h: Number.isInteger(parsedLimit) ? parsedLimit : -1,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } & Partial<PackPurchaseLimitAdminPayload> | null;
    if (!response.ok || !payload?.ok) {
      setLimitError(payload?.error ?? "Cannot save purchase limit settings");
      setLimitSaving(false);
      return;
    }

    setLimitData(payload as PackPurchaseLimitAdminPayload);
    setLimitEnabled(payload.config!.enabled);
    setLimitValue(String(payload.config!.maxPurchasesPer24h));
    setLimitMessage("Purchase limit settings saved.");
    setLimitSaving(false);
  };

  const updatedLabel = useMemo(
    () => (data ? new Date(data.lastUpdatedAt).toLocaleString() : "-"),
    [data],
  );

  const saleUsage = pct(data?.sale.opened ?? 0, data?.sale.totalSupply ?? 0);
  const rewardUsage = pct(data?.reward.attributed ?? 0, data?.reward.totalSupply ?? 0);

  const loading = loadingSupply || loadingHistory;

  return (
    <div className="admin-page admin-v2-page">
      <AdminPageHeader
        title="Pack Supply"
        subtitle="Canonical supply and lifecycle state for sale and reward packs."
        actions={
          <button type="button" className="mcg-btn ghost" onClick={load} disabled={loading}>
            Refresh
          </button>
        }
      />

      {loadingSupply ? (
        <AdminPanel>
          <AdminEmptyState title="Loading supply…" />
        </AdminPanel>
      ) : null}
      {errorSupply ? (
        <AdminPanel>
          <AdminEmptyState title="Supply unavailable" description={errorSupply} />
        </AdminPanel>
      ) : null}

      {limitData || limitError ? (
        <AdminPanel>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <p className="admin-v2-section-title">PURCHASE LIMIT</p>
              <p className="contest-inline-note">{limitData?.preview ?? "Runtime-configured rule for store pack purchases."}</p>
              <p className="contest-inline-note" style={{ marginTop: 6 }}>{limitData?.helperText ?? "Applies only to SALE pack purchases."}</p>
            </div>
            <div style={{ minWidth: 280, flex: "0 0 320px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <input type="checkbox" checked={limitEnabled} onChange={(e) => setLimitEnabled(e.target.checked)} />
                <span>Enable 24h purchase cap</span>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="contest-inline-note">Max purchased packs per 24h</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={limitValue}
                  onChange={(e) => setLimitValue(e.target.value)}
                  className="admin-input"
                  style={{ width: "100%" }}
                />
              </label>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button type="button" className="mcg-btn" onClick={savePurchaseLimit} disabled={limitSaving}>
                  {limitSaving ? "Saving…" : "Save settings"}
                </button>
                <button type="button" className="mcg-btn ghost" onClick={loadPurchaseLimit} disabled={limitSaving}>
                  Reload
                </button>
              </div>
              {limitMessage ? <p className="contest-inline-note" style={{ marginTop: 8, color: "#86efac" }}>{limitMessage}</p> : null}
              {limitError ? <p className="contest-inline-note" style={{ marginTop: 8, color: "#fca5a5" }}>{limitError}</p> : null}
            </div>
          </div>
        </AdminPanel>
      ) : null}

      {data ? (
        <>
          {/* ── Quick cards ─────────────────────────────────────────────── */}
          <AdminPanel>
            <p className="contest-inline-note">Last updated: {updatedLabel}</p>
            <div className="admin-v2-quick-grid" style={{ marginTop: 12 }}>
              <div className="admin-v2-quick-card">
                <p className="admin-v2-section-title">SALE PACKS</p>
                <p>
                  Opened: {fmt(data.sale.opened)} / {fmt(data.sale.totalSupply)}
                </p>
                <div
                  style={{
                    height: 10,
                    background: "rgba(255,255,255,0.12)",
                    borderRadius: 999,
                    overflow: "hidden",
                    marginTop: 8,
                  }}
                >
                  <div style={{ width: `${saleUsage}%`, height: "100%", background: "#60a5fa" }} />
                </div>
                <p className="contest-inline-note" style={{ marginTop: 8 }}>
                  {fmt(data.sale.remaining)} remaining
                </p>
              </div>

              <div
                className={`admin-v2-quick-card ${data.reward.remaining <= 0 ? "admin-v2-card-danger" : ""}`}
              >
                <p className="admin-v2-section-title">REWARD PACKS</p>
                <p>
                  Attributed: {fmt(data.reward.attributed)} / {fmt(data.reward.totalSupply)}
                </p>
                <p className="contest-inline-note">
                  Claimed: {fmt(data.reward.claimed)} · Reserved: {fmt(data.reward.reserved)}
                </p>
                <div
                  style={{
                    height: 10,
                    background: "rgba(255,255,255,0.12)",
                    borderRadius: 999,
                    overflow: "hidden",
                    marginTop: 8,
                  }}
                >
                  <div
                    style={{
                      width: `${rewardUsage}%`,
                      height: "100%",
                      background: data.reward.remaining <= 0 ? "#f97316" : "#60a5fa",
                    }}
                  />
                </div>
                <p className="contest-inline-note" style={{ marginTop: 8 }}>
                  {fmt(data.reward.remaining)} remaining
                </p>
              </div>
            </div>
          </AdminPanel>

          {/* ── Reward pool — per pack breakdown ────────────────────────── */}
          <AdminPanel>
            <p className="admin-v2-section-title" style={{ marginBottom: 12 }}>
              Reward pool — per pack breakdown
            </p>
            {loadingHistory ? (
              <AdminEmptyState title="Loading breakdown…" />
            ) : errorHistory ? (
              <AdminEmptyState title="Breakdown unavailable" description={errorHistory} />
            ) : history && history.perPackTotals.length === 0 ? (
              <AdminEmptyState title="No reward grants found." />
            ) : (
              history?.perPackTotals.map((pack) => {
                const rewardPool = data.reward.pools.find(
                  (p) => p.packDefinitionId === pack.packDefinitionId,
                );
                const totalSupply = rewardPool?.totalSupply ?? 0;
                const remaining = totalSupply - pack.totalAttributed;
                const usedPct = pct(pack.totalAttributed, totalSupply);
                const color = barColor(remaining);

                return (
                  <div key={pack.packDefinitionId} style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>
                        {pack.displayName}{" "}
                        <span className="contest-inline-note">({pack.packCode})</span>
                      </span>
                      <span
                        className="contest-inline-note"
                        style={{ color: remaining <= 500 ? "#f97316" : undefined }}
                      >
                        {fmt(remaining)} remaining
                      </span>
                    </div>
                    <div
                      style={{
                        height: 10,
                        background: "rgba(255,255,255,0.12)",
                        borderRadius: 999,
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ width: `${usedPct}%`, height: "100%", background: color }} />
                    </div>
                    <p className="contest-inline-note" style={{ marginTop: 4 }}>
                      Attributed: {fmt(pack.totalAttributed)} / {fmt(totalSupply)} · Claimed:{" "}
                      {fmt(pack.claimed)} · Pending: {fmt(pack.pending)}
                    </p>
                  </div>
                );
              })
            )}
          </AdminPanel>

          {/* ── Sale pack pools ──────────────────────────────────────────── */}
          <AdminPanel>
            <p className="admin-v2-section-title">Sale pack pools</p>
            {data.sale.pools.length === 0 ? (
              <p className="contest-inline-note">No sale pack definitions found.</p>
            ) : null}
            {data.sale.pools.map((pool) => (
              <p key={pool.packDefinitionId} className="contest-inline-note">
                {pool.displayName} ({pool.packCode}) · opened {pool.opened}/{pool.totalSupply} ·
                remaining {pool.remaining} · {pool.isActive ? "ACTIVE" : "INACTIVE"}
              </p>
            ))}
          </AdminPanel>

          {/* ── Reward pack pools ────────────────────────────────────────── */}
          <AdminPanel>
            <p className="admin-v2-section-title">Reward pack pools</p>
            {data.reward.pools.length === 0 ? (
              <p className="contest-inline-note">No reward pack definitions found.</p>
            ) : null}
            {data.reward.pools.map((pool) => (
              <p
                key={pool.packDefinitionId}
                className={`contest-inline-note ${pool.poolStatus === "MISSING_POOL" ? "contest-error" : ""}`}
              >
                {pool.displayName} ({pool.packCode}) · attributed {pool.attributed}/
                {pool.totalSupply} · claimed {pool.claimed} · reserved {pool.reserved} · remaining{" "}
                {pool.remaining} · pool {pool.poolStatus}
              </p>
            ))}
          </AdminPanel>

          {/* ── Global summary ───────────────────────────────────────────── */}
          <AdminPanel>
            <p className="admin-v2-section-title">Global summary</p>
            <p className="contest-inline-note">Total supply: {fmt(data.global.totalSupply)}</p>
            <p className="contest-inline-note">Sale opened: {fmt(data.global.saleOpened)}</p>
            <p className="contest-inline-note">
              Reward attributed: {fmt(data.global.rewardAttributed)}
            </p>
            <p className="contest-inline-note">Reward claimed: {fmt(data.global.rewardClaimed)}</p>
            <p className="contest-inline-note">
              Reward reserved: {fmt(data.global.rewardReserved)}
            </p>
            <p className="contest-inline-note">
              Remaining (sale + reward): {fmt(data.global.remaining)}
            </p>
          </AdminPanel>
        </>
      ) : null}

      {/* ── Reward pack distribution history ──────────────────────────────── */}
      <AdminPanel>
        <p className="admin-v2-section-title" style={{ marginBottom: 12 }}>
          Reward pack distribution history
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            className={`mcg-btn ${historyTab === "by-source" ? "" : "ghost"}`}
            onClick={() => setHistoryTab("by-source")}
          >
            By source
          </button>
          <button
            type="button"
            className={`mcg-btn ${historyTab === "recent" ? "" : "ghost"}`}
            onClick={() => setHistoryTab("recent")}
          >
            Recent grants
          </button>
        </div>

        {loadingHistory ? (
          <AdminEmptyState title="Loading history…" />
        ) : errorHistory ? (
          <AdminEmptyState title="History unavailable" description={errorHistory} />
        ) : !history ? null : historyTab === "by-source" ? (
          history.bySource.length === 0 ? (
            <AdminEmptyState title="No distribution history found." />
          ) : (
            <AdminDataTable columns="140px 1fr 120px 80px 80px 80px 160px">
              <AdminTableHead>
                <span>Source</span>
                <span>Contest</span>
                <span>Pack</span>
                <span>Granted</span>
                <span>Claimed</span>
                <span>Pending</span>
                <span>Last grant</span>
              </AdminTableHead>
              {history.bySource.map((row) => (
                <AdminTableRow
                  key={`${row.sourceType}|${row.settlementId ?? "manual"}|${row.packDefinitionId}`}
                >
                  <span>
                    <AdminStatusBadge
                      tone={row.sourceType === "CONTEST_SETTLEMENT" ? "success" : "neutral"}
                      label={row.sourceType === "CONTEST_SETTLEMENT" ? "CONTEST" : "MANUAL"}
                    />
                  </span>
                  <span>
                    {row.contestTitle ? (
                      <>
                        {row.contestTitle}{" "}
                        {row.contestCode ? (
                          <span className="contest-inline-note">({row.contestCode})</span>
                        ) : null}
                      </>
                    ) : (
                      <span className="contest-inline-note">—</span>
                    )}
                  </span>
                  <span>{row.packCode}</span>
                  <span>{fmt(row.count)}</span>
                  <span>{fmt(row.claimed)}</span>
                  <span>{fmt(row.pending)}</span>
                  <span className="contest-inline-note">{fmtDate(row.lastGrantedAt)}</span>
                </AdminTableRow>
              ))}
            </AdminDataTable>
          )
        ) : history.recentGrants.length === 0 ? (
          <AdminEmptyState title="No recent grants found." />
        ) : (
          <AdminDataTable columns="1fr 120px 140px 1fr 120px 160px">
            <AdminTableHead>
              <span>User</span>
              <span>Pack</span>
              <span>Source</span>
              <span>Contest</span>
              <span>Status</span>
              <span>Granted at</span>
            </AdminTableHead>
            {history.recentGrants.map((grant) => (
              <AdminTableRow key={grant.id}>
                <span>{grant.userLabel}</span>
                <span>{grant.packCode}</span>
                <span>
                  <AdminStatusBadge
                    tone={grant.sourceType === "CONTEST_SETTLEMENT" ? "success" : "neutral"}
                    label={grant.sourceType === "CONTEST_SETTLEMENT" ? "CONTEST" : "MANUAL"}
                  />
                </span>
                <span>
                  {grant.contestTitle ?? <span className="contest-inline-note">—</span>}
                </span>
                <span>
                  <AdminStatusBadge
                    tone={grant.claimed ? "success" : "warn"}
                    label={grant.claimed ? "Claimed" : "Pending"}
                  />
                </span>
                <span className="contest-inline-note">{fmtDate(grant.grantedAt)}</span>
              </AdminTableRow>
            ))}
          </AdminDataTable>
        )}
      </AdminPanel>
    </div>
  );
}
