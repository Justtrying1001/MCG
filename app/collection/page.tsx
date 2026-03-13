"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { MvpCardTile } from "@/components/ui/MvpCardTile";
import { CardZoomModal } from "@/components/ui/CardZoomModal";
import { useSession } from "@/components/useSession";
import { useMemo, useState } from "react";
import type { MvpCardView } from "@/types/cards";

type CollectionSortKey = "name" | "rarity" | "edition" | "quantity";

const rarityRank: Record<string, number> = {
  COMMON: 0,
  UNCOMMON: 1,
  RARE: 2,
  EPIC: 3,
  LEGENDARY: 4,
};

export default function CollectionPage() {
  const { me } = useSession();
  const [search, setSearch] = useState("");
  const [faction, setFaction] = useState("");
  const [sortBy, setSortBy] = useState<CollectionSortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [zoomedCard, setZoomedCard] = useState<{ card: MvpCardView | null; quantity?: number }>({ card: null });

  const isAuthUser = me?.mode === "user";
  const mvpCollection = me?.mvpCollection;
  const useMvpCollection = isAuthUser && Array.isArray(mvpCollection);

  const sourceCollection = useMemo(() => {
    if (!me) return [];
    if (isAuthUser) return mvpCollection ?? [];
    return me.mvpCollection;
  }, [isAuthUser, me, mvpCollection]);

  const factions = useMemo(
    () => [...new Set(sourceCollection.map((x) => x.card.faction).filter(Boolean) as string[])].sort(),
    [sourceCollection]
  );

  const visibleCards = useMemo(() => {
    const filtered = sourceCollection
      .filter((item) => !faction || item.card.faction === faction)
      .filter((item) =>
        `${item.card.displayName} ${item.card.symbol} ${item.card.faction || ""} ${item.card.rarity} ${item.card.edition}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "rarity") {
        return (rarityRank[a.card.rarity] ?? -1) - (rarityRank[b.card.rarity] ?? -1);
      }
      if (sortBy === "edition") {
        return (a.card.setEditionLabel || a.card.edition || "").localeCompare(b.card.setEditionLabel || b.card.edition || "");
      }
      if (sortBy === "quantity") {
        return a.instanceCount - b.instanceCount;
      }
      return a.card.displayName.localeCompare(b.card.displayName);
    });

    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [faction, search, sortBy, sortDir, sourceCollection]);

  const totalCards = sourceCollection.reduce((acc, x) => acc + x.instanceCount, 0);
  const uniqueCards = sourceCollection.length;
  const legendaryCount = sourceCollection.filter((x) => x.card.rarity === "LEGENDARY").length;

  return (
    <SiteShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Collection</h1>
          <p className="page-subtitle">MVP view: basic collection stats, filters, and sorting.</p>
        </div>
      </div>

      {me && (
        <div className="collection-stat-row">
          <div className="collection-stat-box">
            <span>Total cards</span>
            <strong>{totalCards}</strong>
          </div>
          <div className="collection-stat-box">
            <span>Unique owned</span>
            <strong>{uniqueCards}</strong>
          </div>
          <div className="collection-stat-box">
            <span>Legendary</span>
            <strong>{legendaryCount}</strong>
          </div>
        </div>
      )}

      <div className="filters-bar collection-simple-toolbar">
        <input
          className="filter-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cards..."
          aria-label="Search cards"
        />
        <select className="filter-select" value={faction} onChange={(e) => setFaction(e.target.value)}>
          <option value="">All factions</option>
          {factions.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select className="filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as CollectionSortKey)}>
          <option value="name">Sort: Name</option>
          <option value="rarity">Sort: Rarity</option>
          <option value="edition">Sort: Edition</option>
          <option value="quantity">Sort: Quantity</option>
        </select>
        <select className="filter-select" value={sortDir} onChange={(e) => setSortDir(e.target.value as "asc" | "desc") }>
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>

      {!me ? (
        <div className="empty-state">
          <div className="empty-state-icon">▦</div>
          <p className="empty-state-title">Connect or start guest mode to view your collection</p>
          <p className="empty-state-desc">Use X for persistent collection, or guest mode for temporary testing.</p>
        </div>
      ) : isAuthUser && !useMvpCollection ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚠</div>
          <p className="empty-state-title">MVP collection payload unavailable</p>
          <p className="empty-state-desc">Refresh your session and verify `/api/me` returns `mvpCollection`.</p>
        </div>
      ) : visibleCards.length > 0 ? (
        <div className="card-grid">
          {visibleCards.map((item) => (
            <button
              key={item.templateId}
              type="button"
              className="card-tile-trigger"
              onClick={() => setZoomedCard({ card: item.card, quantity: item.instanceCount })}
            >
              <MvpCardTile card={item.card} quantity={item.instanceCount} variant="collection" />
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">◈</div>
          <p className="empty-state-title">No cards match your filters</p>
          <p className="empty-state-desc">Try another search term, faction, or sorting option.</p>
        </div>
      )}

      <CardZoomModal card={zoomedCard.card} quantity={zoomedCard.quantity} open={Boolean(zoomedCard.card)} onClose={() => setZoomedCard({ card: null })} />
    </SiteShell>
  );
}
