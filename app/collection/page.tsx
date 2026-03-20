"use client";

import Image from "next/image";
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
  const spotlight = zoomedCard.card
    ? { card: zoomedCard.card, quantity: zoomedCard.quantity ?? 1 }
    : visibleCards[0]
      ? { card: visibleCards[0].card, quantity: visibleCards[0].instanceCount }
      : null;

  return (
    <SiteShell>
      <div className="collection-page-shell">
        <Surface variant="raised" className="collection-hero-panel">
          <div className="collection-hero-grid">
            <div className="collection-hero-copy">
              <span className="mcg-eyebrow">Collection archive</span>
              <h1 className="collection-data-title">Your repository</h1>
              <p className="collection-hero-desc">Manage your digital artifacts, track completion, and focus individual cards without changing your existing collection flow.</p>
            </div>

            <div className="collection-hero-stats">
              <div className="collection-stat-chip">
                <span>Completion</span>
                <strong>{completionPct === null ? "—" : `${completionPct}%`}</strong>
              </div>
              <div className="collection-stat-chip">
                <span>Owned</span>
                <strong>{totalCards}</strong>
              </div>
              <div className="collection-stat-chip">
                <span>Unique</span>
                <strong>{uniqueCards}</strong>
              </div>
              <div className="collection-stat-chip">
                <span>Shown</span>
                <strong>{visibleCards.length}</strong>
              </div>
            </div>
          </div>
        </Surface>

        <div className="collection-layout-grid">
          <section className="collection-main-column">
            <Surface variant="raised">
              <div className="collection-toolbar collection-toolbar--panel">
                <div className="collection-data-block">
                  <span className="mcg-eyebrow">Inventory controls</span>
                  <h2 className="collection-section-title">Binder filters</h2>
                  <div className="collection-data-stats">
                    <span>Sort the live collection feed</span>
                    <span>Preserves existing modal and focus behavior</span>
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
              <Surface variant="raised">
                <div className="collection-grid-panel">
                  <CardGrid
                    items={visibleCards}
                    onOpenCard={(card, quantity) => setZoomedCard({ card, quantity })}
                  />
                </div>
              </Surface>
            ) : me && sourceCollection.length === 0 ? (
              <EmptyState title="Your collection is empty" description="Open your first pack to start collecting cards." />
            ) : (
              <EmptyState title="No cards available" description="Open more packs to grow your collection." />
            )}
          </section>

          <aside className="collection-side-column">
            <Surface variant="raised" className="collection-focus-panel">
              <div className="collection-focus-header">
                <span className="mcg-eyebrow">Focus panel</span>
                <h2 className="collection-section-title">{spotlight?.card.displayName ?? "No card selected"}</h2>
                <p className="contest-inline-note">
                  {spotlight
                    ? "Use the existing card modal to inspect the selected card in detail."
                    : "Open packs to start building your artifact wall."}
                </p>
              </div>

              {spotlight ? (
                <>
                  <button
                    type="button"
                    className="collection-focus-card"
                    onClick={() => setZoomedCard({ card: spotlight.card, quantity: spotlight.quantity })}
                  >
                    <div className="collection-focus-card-art">
                      {spotlight.card.imageUrl ? (
                        <Image
                          src={spotlight.card.imageUrl}
                          alt={spotlight.card.displayName}
                          fill
                          sizes="(max-width: 980px) 100vw, 320px"
                          className="collection-focus-card-img"
                          unoptimized
                        />
                      ) : null}
                    </div>
                  </button>

                  <div className="collection-focus-stats">
                    <div className="collection-focus-stat">
                      <span>Rarity</span>
                      <strong>{spotlight.card.rarity}</strong>
                    </div>
                    <div className="collection-focus-stat">
                      <span>Edition</span>
                      <strong>{spotlight.card.edition}</strong>
                    </div>
                    <div className="collection-focus-stat">
                      <span>Copies</span>
                      <strong>{spotlight.quantity}</strong>
                    </div>
                  </div>
                </>
              ) : null}
            </Surface>
          </aside>
        </div>
      </div>

      <CardZoomModal
        card={zoomedCard.card}
        quantity={zoomedCard.quantity}
        open={Boolean(zoomedCard.card)}
        onClose={() => setZoomedCard({ card: null })}
      />
    </SiteShell>
  );
}
