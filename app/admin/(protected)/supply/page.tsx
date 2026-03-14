"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminEmptyState, AdminPageHeader, AdminPanel } from "@/components/admin/AdminUi";

type SupplyBlock = { total: number; distributed: number; remaining: number };
type SupplyPayload = {
  sale: SupplyBlock;
  reward: SupplyBlock;
  total: SupplyBlock;
  last_updated_at: string;
};

function pct(distributed: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (distributed / total) * 100));
}

function warningTone(block: SupplyBlock) {
  return block.remaining / block.total < 0.1;
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

  const updatedLabel = useMemo(() => (data ? new Date(data.last_updated_at).toLocaleString() : "-"), [data]);

  const renderBlock = (label: string, block: SupplyBlock) => {
    const progress = pct(block.distributed, block.total);
    const warn = warningTone(block);
    return (
      <div className={`admin-v2-quick-card ${warn ? "admin-v2-card-danger" : ""}`}>
        <p className="admin-v2-section-title">{label}</p>
        <p>{block.distributed.toLocaleString()} / {block.total.toLocaleString()} distributed</p>
        <div style={{ height: 10, background: "rgba(255,255,255,0.12)", borderRadius: 999, overflow: "hidden", marginTop: 8 }}>
          <div style={{ width: `${progress}%`, height: "100%", background: warn ? "#f97316" : "#60a5fa" }} />
        </div>
        <p style={{ marginTop: 8, color: warn ? "#fb923c" : "#a3a3a3" }}>{block.remaining.toLocaleString()} remaining</p>
      </div>
    );
  };

  return (
    <div className="admin-page admin-v2-page">
      <AdminPageHeader
        title="Pack Supply"
        subtitle="Read-only live distribution state for sale and reward packs."
        actions={<button type="button" className="mcg-btn ghost" onClick={() => void load()}>Refresh</button>}
      />

      {loading ? <AdminPanel><AdminEmptyState title="Loading supply…" /></AdminPanel> : null}
      {error ? <AdminPanel><AdminEmptyState title="Supply unavailable" description={error} /></AdminPanel> : null}

      {data ? (
        <AdminPanel>
          <p className="contest-inline-note">Last updated: {updatedLabel}</p>
          <div className="admin-v2-quick-grid" style={{ marginTop: 12 }}>
            {renderBlock("SALE PACKS", data.sale)}
            {renderBlock("REWARD PACKS", data.reward)}
          </div>
          <p style={{ marginTop: 12 }}>
            Total: {data.total.distributed.toLocaleString()} / {data.total.total.toLocaleString()} distributed ({data.total.remaining.toLocaleString()} remaining)
          </p>
        </AdminPanel>
      ) : null}
    </div>
  );
}
