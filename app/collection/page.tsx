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
      .filter((item) =>
        `${item.card.name} ${item.card.symbol} ${item.card.faction || ""}`.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => (a.card.marketCapRank ?? 9999) - (b.card.marketCapRank ?? 9999));
  }, [me, faction, search]);

  const totalCards = me?.collection.reduce((acc, x) => acc + x.quantity, 0) ?? 0;
  const uniqueCards = me?.collection.length ?? 0;
  const legendaryCount = me?.collection.filter((x) => (x.card.marketCapRank ?? 9999) <= 10).length ?? 0;
  const v2Projection = me?.mode === "user" ? me.coexistence?.v2?.collectionProjection : undefined;

  return (
    <SiteShell>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Collection</h1>
          <p className="page-subtitle">
            Your complete card roster. Filter by faction, search by name, and audit your
            strongest cores before heading into battle.
          </p>
        </div>
      </div>

      {/* Stats strip */}
      {me && (
        <div className="collection-stats">
          <div className="stat-pill">
            <span className="stat-pill-value" style={{ color: "var(--text)" }}>{v2Projection?.totalOwnedInstances ?? totalCards}</span>
            <span className="stat-pill-label">Total cards {v2Projection ? "(v2)" : ""}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-value">{v2Projection?.ownedTemplateCount ?? uniqueCards}</span>
            <span className="stat-pill-label">Unique owned</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-value" style={{ color: "var(--rarity-legendary)" }}>{legendaryCount}</span>
            <span className="stat-pill-label">Legendary</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-value">{v2Projection?.missingTemplateCount ?? factions.length}</span>
            <span className="stat-pill-label">Missing templates</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <input
          className="filter-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, symbol, faction…"
        />
        <select
          className="filter-select"
          value={faction}
          onChange={(e) => setFaction(e.target.value)}
        >
          <option value="">All factions</option>
          {factions.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* Card grid */}
      {!me ? (
        <div className="empty-state">
          <div className="empty-state-icon">▦</div>
          <p className="empty-state-title">Connect or start guest mode to view your collection</p>
          <p className="empty-state-desc">
            Use X for persistent collection, or guest mode for temporary testing.
          </p>
        </div>
      ) : cards.length > 0 ? (
        <div className="card-grid">
          {cards.map((item) => (
            <CardFrame key={item.baseCardId} card={item.card} quantity={item.quantity} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">◈</div>
          <p className="empty-state-title">
            {search || faction ? "No cards match your filters" : "Your collection is empty"}
          </p>
          <p className="empty-state-desc">
            {search || faction
              ? "Try adjusting your search or removing the faction filter."
              : "Head to Packs and crack open your first booster to get started."}
          </p>
        </div>
      )}
    </SiteShell>
  );
}
