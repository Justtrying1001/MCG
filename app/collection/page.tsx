"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { CardFrame } from "@/components/ui/CardFrame";
import { useSession } from "@/components/useSession";
import { useMemo, useState } from "react";

export default function CollectionPage() {
  const { me } = useSession();
  const [search, setSearch] = useState("");
  const [faction, setFaction] = useState("");

  const factions = useMemo(() => {
    if (!me) return [];
    return [...new Set(me.collection.map((x) => x.card.faction).filter(Boolean) as string[])].sort();
  }, [me]);

  const cards = useMemo(() => {
    if (!me) return [];
    return me.collection
      .filter((item) => !faction || item.card.faction === faction)
      .filter((item) => `${item.card.name} ${item.card.symbol}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.quantity - a.quantity);
  }, [me, faction, search]);

  return (
    <SiteShell>
      <section className="section-head">
        <h2>Collection</h2>
        <p>Filtrer par faction, analyser les stats et préparer vos meilleures synergies.</p>
      </section>

      <section className="filters">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Recherche nom / symbole" />
        <select value={faction} onChange={(e) => setFaction(e.target.value)}>
          <option value="">Toutes factions</option>
          {factions.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </section>

      <section className="card-grid">
        {cards.length ? cards.map((item) => <CardFrame key={item.baseCardId} card={item.card} quantity={item.quantity} />) : <p>Aucune carte.</p>}
      </section>
    </SiteShell>
  );
}
