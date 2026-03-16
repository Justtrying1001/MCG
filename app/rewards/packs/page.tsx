"use client";

import { useEffect, useMemo, useState } from "react";

import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { MvpCardTile } from "@/components/ui/MvpCardTile";
import type { MvpCardView } from "@/types/cards";

type RewardPackGrant = {
  id: string;
  createdAt: string;
  packDefinition: { id: string; code: string; displayName: string; description: string | null };
};

export default function RewardPacksPage() {
  const [grants, setGrants] = useState<RewardPackGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [resultMvp, setResultMvp] = useState<MvpCardView[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>([]);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/rewards/packs", { cache: "no-store" });
    if (!res.ok) {
      setGrants([]);
      setLoading(false);
      return;
    }
    const payload = (await res.json().catch(() => null)) as { grants?: RewardPackGrant[] } | null;
    setGrants(Array.isArray(payload?.grants) ? payload.grants : []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const openGrant = async (grantId: string) => {
    setOpeningId(grantId);
    const res = await fetch("/api/rewards/packs/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grantId }),
    });
    if (!res.ok) {
      alert(await res.text());
      setOpeningId(null);
      return;
    }
    const payload = (await res.json()) as { pulledCardsMvp?: MvpCardView[] };
    const pulled = payload.pulledCardsMvp ?? [];
    setResultMvp(pulled);
    setRevealed(new Array(pulled.length).fill(false));
    setGrants((prev) => prev.filter((grant) => grant.id !== grantId));
    setOpeningId(null);
  };

  const nextReveal = useMemo(() => revealed.findIndex((v) => !v), [revealed]);

  return (
    <SiteShell>
      <section className="mcg-surface" style={{ display: "grid", gap: "1rem" }}>
        <p className="mcg-eyebrow">Rewards</p>
        <h1 className="mcg-title">Packs remportés</h1>
        <p className="mcg-muted">Ouvrez ici les packs gagnés lors des concours.</p>

        {loading ? <p className="mcg-muted">Chargement…</p> : null}

        {!loading && grants.length === 0 ? (
          <EmptyState title="No reward packs pending" description="Your claimed contest packs will appear here." />
        ) : null}

        {grants.map((grant) => (
          <article key={grant.id} className="mcg-surface-raised" style={{ padding: "1rem", display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0 }}>{grant.packDefinition.displayName}</h3>
              <p className="mcg-muted" style={{ marginTop: "0.3rem" }}>{grant.packDefinition.description ?? "Reward pack from contest placement."}</p>
            </div>
            <Button disabled={openingId === grant.id} onClick={() => void openGrant(grant.id)}>
              {openingId === grant.id ? "Opening…" : "Ouvrir"}
            </Button>
          </article>
        ))}
      </section>

      <Modal open={resultMvp.length > 0} title="Pack opened" onClose={() => { setResultMvp([]); setRevealed([]); }}>
        <div style={{ display: "grid", gap: "0.8rem" }}>
          <p className="mcg-muted">Click cards in order to reveal them.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "0.75rem" }}>
            {resultMvp.map((card, idx) => (
              <button
                type="button"
                key={`${card.templateId}-${idx}`}
                onClick={() => {
                  if (idx === nextReveal) setRevealed((prev) => prev.map((v, i) => (i === idx ? true : v)));
                }}
                style={{ background: "transparent", border: "none", padding: 0, cursor: idx === nextReveal ? "pointer" : "default", opacity: revealed[idx] ? 1 : 0.72 }}
              >
                {revealed[idx] ? <MvpCardTile card={card} quantity={1} variant="reveal" /> : <div className="mcg-surface" style={{ minHeight: 230, display: "grid", placeItems: "center" }}>Reveal</div>}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </SiteShell>
  );
}
