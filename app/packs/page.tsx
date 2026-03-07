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
    setTimeout(() => setIsOpening(false), 650);
  };

  return (
    <SiteShell>
      <section className="section-head">
        <h2>Packs</h2>
        <p>Achetez des packs, déclenchez le reveal et enrichissez votre deck.</p>
        <Button onClick={() => void openPack()} disabled={!me || isOpening}>
          {isOpening ? "Ouverture…" : "Ouvrir un pack"}
        </Button>
      </section>

      <div className={`pack-simulator ${isOpening ? "opening" : ""}`}>
        <div className="pack-foil">MCG BOOSTER</div>
      </div>

      <Modal title="Résultat du pack" open={result.length > 0 && !isOpening} onClose={() => setResult([])}>
        <div className="card-grid">
          {result.map((card) => (
            <CardFrame key={card.baseCardId} card={card} />
          ))}
        </div>
      </Modal>
    </SiteShell>
  );
}
