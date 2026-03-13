"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { MvpCardTile } from "@/components/ui/MvpCardTile";
import { CardZoomModal } from "@/components/ui/CardZoomModal";
import { useSession } from "@/components/useSession";
import { useMemo, useState } from "react";
import type { MvpCardView } from "@/types/cards";

type SortMode = "NAME" | "RARITY" | "COPIES";

export default function CollectionPage() {
  const { me } = useSession();
  const [search, setSearch] = useState("");
  const [faction, setFaction] = useState("");
  const [sortBy, setSortBy] = useState<SortMode>("NAME");
  const [zoomedCard, setZoomedCard] = useState<{ card: MvpCardView | null; quantity?: number }>({ card: null });

  const isAuthUser = me?.mode === "user";
  const mvpCollection = me?.mvpCollection;
  const source = isAuthUser ? (mvpCollection ?? []) : (me?.mvpCollection ?? []);

  const factions = useMemo(
    () => [...new Set(source.map((x) => x.card.faction).filter(Boolean) as string[])].sort(),
    [source]
  );

  const filteredCards = useMemo(() => {
    const rarityWeight: Record<string, number> = {
      LEGENDARY: 5,
      EPIC: 4,
      RARE: 3,
      UNCOMMON: 2,
      COMMON: 1,
    };

    const rows = source
      .filter((item) => !faction || item.card.faction === faction)
      .filter((item) =>
        `${item.card.displayName} ${item.card.symbol} ${item.card.faction || ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );

    if (sortBy === "NAME") {
      return rows.sort((a, b) => a.card.displayName.localeCompare(b.card.displayName));
    }

    if (sortBy === "COPIES") {
      return rows.sort((a, b) => b.instanceCount - a.instanceCount);
    }

    return rows.sort((a, b) => (rarityWeight[b.card.rarity] ?? 0) - (rarityWeight[a.card.rarity] ?? 0));
  }, [faction, search, sortBy, source]);

  const totalCards = source.reduce((acc, x) => acc + x.instanceCount, 0);
  const uniqueCards = source.length;
  const legendaryCount = source.filter((x) => x.card.rarity === "LEGENDARY").length;
  const completionHint = uniqueCards > 0 ? Math.round((legendaryCount / uniqueCards) * 100) : 0;

  return (
    <SiteShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Collection</h1>
          <p className="page-subtitle">
            Your collector dashboard: inspect your binder, sort your cards, and quickly identify your strongest rarity pockets.
          </p>
        </div>
      </div>

      {me && (
        <div className="collection-stats">
          <div className="stat-pill">
            <span className="stat-pill-value" style={{ color: "var(--text)" }}>{totalCards}</span>
            <span className="stat-pill-label">Total copies</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-value">{uniqueCards}</span>
            <span className="stat-pill-label">Unique cards</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-value" style={{ color: "var(--rarity-legendary)" }}>{legendaryCount}</span>
            <span className="stat-pill-label">Legendary cards</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-value">{completionHint}%</span>
            <span className="stat-pill-label">Legendary ratio</span>
          </div>
        </div>
      )}

      <section className="collector-toolbar">
        <input
          className="filter-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, symbol, faction…"
        />
        <select className="filter-select" value={faction} onChange={(e) => setFaction(e.target.value)}>
          <option value="">All factions</option>
          {factions.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <select className="filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortMode)}>
          <option value="NAME">Sort: Name</option>
          <option value="RARITY">Sort: Rarity</option>
          <option value="COPIES">Sort: Copies owned</option>
        </select>
      </section>

      {!me ? (
        <div className="empty-state">
          <div className="empty-state-icon">▦</div>
          <p className="empty-state-title">Sign in or start guest mode to open your collection binder</p>
          <p className="empty-state-desc">Use X login for persistent ownership, or guest mode for temporary collection sessions.</p>
        </div>
      ) : filteredCards.length > 0 ? (
        <div className="card-grid">
          {filteredCards.map((item) => (
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
          <div className="empty-state-icon">🗂️</div>
          <p className="empty-state-title">No cards match your current filters</p>
          <p className="empty-state-desc">Try another faction, clear search terms, or open new packs to expand your collection.</p>
        </div>
      )}

      <CardZoomModal
        card={zoomedCard.card}
        quantity={zoomedCard.quantity}
        open={Boolean(zoomedCard.card)}
        onClose={() => setZoomedCard({ card: null })}
      />
    </SiteShell>
  );
}
