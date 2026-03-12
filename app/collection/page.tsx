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
  const [sortMode, setSortMode] = useState<SortMode>("RARITY");
  const [selectedCard, setSelectedCard] = useState<MvpCollectionItem | null>(null);

  const source = me?.mvpCollection ?? [];
  const isAuthUser = me?.mode === "user";
  const collectionSummary = isAuthUser ? me.coexistence?.v2?.collectionProgression : undefined;
  const collectionProjection = isAuthUser ? me.coexistence?.v2?.collectionProjection : undefined;

  const factions = useMemo(
    () => [...new Set(source.map((item) => item.card.faction).filter(Boolean) as string[])].sort(),
    [source]
  );

  const rarities = useMemo(
    () => [...new Set(source.map((item) => item.card.rarity))].sort((a, b) => (rarityRank[b] ?? 0) - (rarityRank[a] ?? 0)),
    [source]
  );

  const filteredCards = useMemo(() => {
    const base = source
      .filter((item) => !faction || item.card.faction === faction)
      .filter((item) => !rarity || item.card.rarity === rarity)
      .filter((item) => `${item.card.displayName} ${item.card.symbol} ${item.card.faction ?? ""}`.toLowerCase().includes(search.toLowerCase()));

    return base.sort((a, b) => {
      if (sortMode === "QTY") return b.instanceCount - a.instanceCount;
      if (sortMode === "RARITY") return (rarityRank[b.card.rarity] ?? 0) - (rarityRank[a.card.rarity] ?? 0);
      return a.card.displayName.localeCompare(b.card.displayName);
    });
  }, [faction, rarity, search, sortMode, source]);

  const totalCards = source.reduce((acc, item) => acc + item.instanceCount, 0);
  const uniqueCards = source.length;
  const missingCards = collectionProjection?.missingTemplateCount ?? 0;
  const completion = collectionSummary?.completionPct ?? 0;
  const topRarity = collectionSummary?.topRarityCode ?? rarities[0] ?? "-";

  return (
    <SiteShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Collection</h1>
          <p className="page-subtitle">Pokedex mode: inspect every owned card, track completion, and hunt missing rarities.</p>
        </div>
      </div>

      {me ? (
        <section className="collection-v3-hero">
          <div className="collection-v3-gauge">
            <p className="collection-v3-eyebrow">Global completion</p>
            <div className="collection-v3-ring">
              <div className="collection-v3-ring-inner">
                <strong>{completion}%</strong>
                <span>completed</span>
              </div>
            </div>
            <p className="profile-result-sub">{missingCards} templates missing from full set completion.</p>
          </div>

          <div className="collection-v3-kpis">
            <article>
              <p>Total cards</p>
              <strong>{collectionProjection?.totalOwnedInstances ?? totalCards}</strong>
            </article>
            <article>
              <p>Unique owned</p>
              <strong>{collectionProjection?.ownedTemplateCount ?? uniqueCards}</strong>
            </article>
            <article>
              <p>Missing</p>
              <strong>{missingCards}</strong>
            </article>
            <article>
              <p>Highest rarity</p>
              <strong>{topRarity}</strong>
            </article>
          </div>
        </section>
      ) : null}

      <section className="collection-v3-toolbar">
        <div className="collection-v3-toolbar-title">
          <h2>Collection browser</h2>
          <p>Apply filters, sort your hunt, then click a card to inspect it in full size.</p>
        </div>
        <div className="collection-v3-filters">
          <input
            className="filter-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, symbol, faction"
          />
          <select className="filter-select" value={faction} onChange={(event) => setFaction(event.target.value)}>
            <option value="">All factions</option>
            {factions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select className="filter-select" value={rarity} onChange={(event) => setRarity(event.target.value)}>
            <option value="">All rarities</option>
            {rarities.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select className="filter-select" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
            <option value="RARITY">Sort by rarity</option>
            <option value="QTY">Sort by quantity</option>
            <option value="NAME">Sort by name</option>
          </select>
        </div>
      </section>

      {!me ? (
        <div className="empty-state">
          <div className="empty-state-icon">▦</div>
          <p className="empty-state-title">Connect or start guest mode to access your collection</p>
          <p className="empty-state-desc">Use X for persistent cards and progression, or guest mode for temporary testing.</p>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="empty-state collection-v3-empty">
          <div className="empty-state-icon">◈</div>
          <p className="empty-state-title">No cards match this hunt setup</p>
          <p className="empty-state-desc">Try broader filters or clear search to continue your collection run.</p>
        </div>
      ) : (
        <div className="card-grid collection-v3-grid">
          {filteredCards.map((item) => (
            <button key={item.templateId} type="button" className="collection-v3-card-trigger" onClick={() => setSelectedCard(item)}>
              <MvpCardTile card={item.card} quantity={item.instanceCount} variant="collection" />
            </button>
          ))}
        </div>
      )}

      {selectedCard ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setSelectedCard(null)}>
          <div className="modal collection-v3-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h3 className="modal-title">{selectedCard.card.displayName}</h3>
              <button className="modal-close" onClick={() => setSelectedCard(null)}>✕</button>
            </div>
            <div className="collection-v3-modal-layout">
              <div className="collection-v3-modal-card">
                <MvpCardTile card={selectedCard.card} quantity={selectedCard.instanceCount} variant="reveal" />
              </div>
              <aside className="collection-v3-modal-info">
                <p className="collection-v3-eyebrow">Card dossier</p>
                <h4>{selectedCard.card.symbol}</h4>
                <ul>
                  <li><span>Rarity</span><strong>{selectedCard.card.rarity}</strong></li>
                  <li><span>Edition</span><strong>{selectedCard.card.edition}</strong></li>
                  <li><span>Faction</span><strong>{selectedCard.card.faction ?? "Unknown"}</strong></li>
                  <li><span>Owned</span><strong>{selectedCard.instanceCount}</strong></li>
                  <li><span>Set</span><strong>{selectedCard.card.setCode ?? "GENESIS"}</strong></li>
                </ul>
                <p className="profile-result-sub">{selectedCard.card.cardText ?? "No additional lore available."}</p>
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </SiteShell>
  );
}
