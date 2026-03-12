"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { MvpCardTile } from "@/components/ui/MvpCardTile";
import { useSession } from "@/components/useSession";
import type { MvpCollectionItem } from "@/types/cards";
import { useMemo, useState } from "react";

type SortMode = "NAME" | "RARITY" | "QTY";

const rarityRank: Record<string, number> = {
  LEGENDARY: 5,
  EPIC: 4,
  RARE: 3,
  UNCOMMON: 2,
  COMMON: 1,
};

export default function CollectionPage() {
  const { me } = useSession();
  const [search, setSearch] = useState("");
  const [faction, setFaction] = useState("");
  const [rarity, setRarity] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("NAME");
  const [selectedCard, setSelectedCard] = useState<MvpCollectionItem | null>(null);

  const isAuthUser = me?.mode === "user";
  const source = me?.mvpCollection ?? [];
  const v2Projection = isAuthUser ? me.coexistence?.v2?.collectionProjection : undefined;
  const collectionSummary = isAuthUser ? me.coexistence?.v2?.collectionProgression : undefined;

  const factions = useMemo(
    () => [...new Set(source.map((x) => x.card.faction).filter(Boolean) as string[])].sort(),
    [source]
  );

  const rarities = useMemo(
    () => [...new Set(source.map((x) => x.card.rarity).filter(Boolean))].sort((a, b) => (rarityRank[b] ?? 0) - (rarityRank[a] ?? 0)),
    [source]
  );

  const filteredCards = useMemo(() => {
    const result = source
      .filter((item) => !faction || item.card.faction === faction)
      .filter((item) => !rarity || item.card.rarity === rarity)
      .filter((item) =>
        `${item.card.displayName} ${item.card.symbol} ${item.card.faction ?? ""}`.toLowerCase().includes(search.toLowerCase())
      );

    return result.sort((a, b) => {
      if (sortMode === "QTY") return b.instanceCount - a.instanceCount;
      if (sortMode === "RARITY") return (rarityRank[b.card.rarity] ?? 0) - (rarityRank[a.card.rarity] ?? 0);
      return a.card.displayName.localeCompare(b.card.displayName);
    });
  }, [faction, rarity, search, sortMode, source]);

  const totalCards = source.reduce((acc, x) => acc + x.instanceCount, 0);
  const uniqueCards = source.length;
  const missingCards = v2Projection?.missingTemplateCount ?? 0;
  const topRarity = collectionSummary?.topRarityCode ?? (rarities[0] ?? "-");

  return (
    <SiteShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Collection</h1>
          <p className="page-subtitle">
            Build your premium Pokedex: track completion, hunt missing templates, and inspect every card in detail.
          </p>
        </div>
      </div>

      {me ? (
        <section className="collection-hero">
          <div className="collection-hero-main">
            <p className="profile-hero-label">Collection progression</p>
            <h2>{collectionSummary?.completionPct ?? 0}% completed</h2>
            <p className="contest-inline-note">
              {uniqueCards} unique owned · {missingCards} missing · Highest rarity: {topRarity}
            </p>
            <div className="collection-progress-track">
              <div className="collection-progress-fill" style={{ width: `${collectionSummary?.completionPct ?? 0}%` }} />
            </div>
          </div>
          <div className="collection-stat-grid">
            <div className="profile-kpi-card"><p className="profile-kpi-label">Total cards</p><p className="profile-kpi-value">{v2Projection?.totalOwnedInstances ?? totalCards}</p></div>
            <div className="profile-kpi-card"><p className="profile-kpi-label">Unique owned</p><p className="profile-kpi-value">{v2Projection?.ownedTemplateCount ?? uniqueCards}</p></div>
            <div className="profile-kpi-card"><p className="profile-kpi-label">Missing</p><p className="profile-kpi-value">{missingCards}</p></div>
            <div className="profile-kpi-card"><p className="profile-kpi-label">Top rarity</p><p className="profile-kpi-value">{topRarity}</p></div>
          </div>
        </section>
      ) : null}

      <div className="filters-bar collection-filters-premium">
        <input className="filter-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search card name, symbol, faction…" />
        <select className="filter-select" value={faction} onChange={(e) => setFaction(e.target.value)}>
          <option value="">All factions</option>
          {factions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select className="filter-select" value={rarity} onChange={(e) => setRarity(e.target.value)}>
          <option value="">All rarities</option>
          {rarities.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select className="filter-select" value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}>
          <option value="NAME">Sort: Name</option>
          <option value="RARITY">Sort: Rarity</option>
          <option value="QTY">Sort: Quantity owned</option>
        </select>
      </div>

      {!me ? (
        <div className="empty-state">
          <div className="empty-state-icon">▦</div>
          <p className="empty-state-title">Connect or start guest mode to view your collection</p>
          <p className="empty-state-desc">Use X for persistent collection, or guest mode for temporary testing.</p>
        </div>
      ) : filteredCards.length > 0 ? (
        <div className="card-grid collection-grid">
          {filteredCards.map((item) => (
            <button key={item.templateId} type="button" className="collection-card-trigger" onClick={() => setSelectedCard(item)}>
              <MvpCardTile card={item.card} quantity={item.instanceCount} variant="collection" />
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">◈</div>
          <p className="empty-state-title">{search || faction || rarity ? "No cards match your filters" : "Your collection is empty"}</p>
          <p className="empty-state-desc">
            {search || faction || rarity ? "Try broader filters to continue your hunt." : "Head to Packs and crack open your first booster to start collecting."}
          </p>
        </div>
      )}

      {selectedCard ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setSelectedCard(null)}>
          <div className="modal collection-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h3 className="modal-title">{selectedCard.card.displayName}</h3>
              <button className="modal-close" onClick={() => setSelectedCard(null)}>✕</button>
            </div>
            <div className="collection-modal-content">
              <div className="collection-modal-card">
                <MvpCardTile card={selectedCard.card} quantity={selectedCard.instanceCount} variant="reveal" />
              </div>
              <aside className="collection-modal-details">
                <p className="profile-kpi-label">Card details</p>
                <h4>{selectedCard.card.symbol}</h4>
                <p className="contest-inline-note">Rarity: {selectedCard.card.rarity}</p>
                <p className="contest-inline-note">Edition: {selectedCard.card.edition}</p>
                <p className="contest-inline-note">Faction: {selectedCard.card.faction ?? "Unknown"}</p>
                <p className="contest-inline-note">Owned: {selectedCard.instanceCount}</p>
                <p className="contest-inline-note">Set: {selectedCard.card.setCode ?? "GENESIS"}</p>
                <p className="contest-inline-note">{selectedCard.card.cardText ?? "No additional lore available yet."}</p>
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </SiteShell>
  );
}
