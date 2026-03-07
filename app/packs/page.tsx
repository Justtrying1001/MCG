"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { CardFrame } from "@/components/ui/CardFrame";
import { Modal } from "@/components/ui/Modal";
import { useSession } from "@/components/useSession";
import type { BaseCard } from "@/types/cards";
import { useState } from "react";

export default function PacksPage() {
  const { me, refresh } = useSession();
  const [result, setResult] = useState<BaseCard[]>([]);
  const [isOpening, setIsOpening] = useState(false);

  const openPack = async () => {
    setIsOpening(true);
    const res = await fetch("/api/pack/open", { method: "POST" });
    if (!res.ok) {
      alert(await res.text());
      setIsOpening(false);
      return;
    }
    const payload = await res.json();
    setResult(payload.pulledCards as BaseCard[]);
    await refresh();
    setTimeout(() => setIsOpening(false), 760);
  };

  return (
    <SiteShell>
      <section className="section-head">
        <h2>Packs</h2>
        <p>Choose your risk profile, open boosters, and chase rare meme archetypes.</p>
        <div className="inline-actions">
          <Button onClick={() => void openPack()} disabled={!me || isOpening}>
            {isOpening ? "Opening..." : "Open pack"}
          </Button>
          <span className="hint">Tip: each pack can unlock your next PvE-winning combo.</span>
        </div>
      </section>

      <section className={`pack-simulator ${isOpening ? "opening" : ""}`}>
        <div className="pack-foil">GENESIS BOOSTER</div>
      </section>

      <section className="feature-grid">
        <article className="feature-panel">
          <h3>Drop design</h3>
          <p>Weighted rarity keeps progression exciting while preserving long-term chase value.</p>
        </article>
        <article className="feature-panel">
          <h3>Reveal ritual</h3>
          <p>Foil animation + card-by-card reveal reinforces ownership and collection desire.</p>
        </article>
      </section>

      <Modal title="Pack Reveal" open={result.length > 0 && !isOpening} onClose={() => setResult([])}>
        <div className="card-grid">
          {result.map((card) => (
            <CardFrame key={card.baseCardId} card={card} />
          ))}
        </div>
      </Modal>
    </SiteShell>
  );
}
