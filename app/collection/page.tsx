"use client";

import { useMemo, useState } from "react";
import type { MvpCardView } from "@/types/cards";
import { SiteShell } from "@/components/layout/SiteShell";
import { CardZoomModal } from "@/components/ui/CardZoomModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Surface } from "@/components/ui/Surface";
import { CardGrid } from "@/components/collection/CardGrid";
import { useSession } from "@/components/useSession";

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
  const [sortBy, setSortBy] = useState<CollectionSortKey>("rarity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [zoomedCard, setZoomedCard] = useState<{ card: MvpCardView | null; quantity?: number }>({ card: null });

  const mvpCollection = me?.mvpCollection;
  const useMvpCollection = Array.isArray(mvpCollection);

  const sourceCollection = useMemo(() => (mvpCollection ?? []), [mvpCollection]);

  const visibleCards = useMemo(() => {
    const sorted = [...sourceCollection].sort((a, b) => {
      if (sortBy === "rarity") return (rarityRank[a.card.rarity] ?? -1) - (rarityRank[b.card.rarity] ?? -1);
      if (sortBy === "edition") return (a.card.edition ?? "").localeCompare(b.card.edition ?? "");
      if (sortBy === "quantity") return a.instanceCount - b.instanceCount;
      return a.card.displayName.localeCompare(b.card.displayName);
    });

    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [sortBy, sortDir, sourceCollection]);

  const totalCards = sourceCollection.reduce((acc, x) => acc + x.instanceCount, 0);
  const uniqueCards = sourceCollection.length;
  const collectionProg = me?.coexistence?.v2?.collectionProgression;
  const projectionPct = me?.coexistence?.v2?.collectionProjection?.completionPct;
  const completionPct = collectionProg?.completionPct ?? projectionPct ?? null;

  return (
    <SiteShell>
      <Surface>
        <div className="collection-toolbar">
          <div className="collection-data-block">
            <span className="mcg-eyebrow">Collection data</span>
            <h1 className="collection-data-title">Collection</h1>
            <div className="collection-data-stats">
              <span>Completion {completionPct === null ? "—" : `${completionPct}%`}</span>
              <span>Owned {totalCards}</span>
              <span>Unique {uniqueCards}</span>
              <span>Shown {visibleCards.length}</span>
            </div>
          </div>

          <div className="collection-sort-block">
            <span className="mcg-eyebrow">Sort</span>
            <div className="collection-sort-row">
              <label>
                Sort by
                <select className="collection-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as CollectionSortKey)}>
                  <option value="rarity">Rarity</option>
                  <option value="name">Name</option>
                  <option value="edition">Edition</option>
                  <option value="quantity">Quantity</option>
                </select>
              </label>
              <label>
                Direction
                <select className="collection-select" value={sortDir} onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}>
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      </Surface>

      {!me ? (
        <EmptyState title="Connect to view your collection" description="Sign in with X for persistent ownership." />
      ) : !useMvpCollection ? (
        <EmptyState title="Collection data unavailable" description="Refresh your session and verify collection payload." />
      ) : visibleCards.length > 0 ? (
        <CardGrid
          items={visibleCards}
          onOpenCard={(card, quantity) => setZoomedCard({ card, quantity })}
        />
      ) : me && sourceCollection.length === 0 ? (
        <EmptyState title="Your collection is empty" description="Open your first pack to start collecting cards." />
      ) : (
        <EmptyState title="No cards available" description="Open more packs to grow your collection." />
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
