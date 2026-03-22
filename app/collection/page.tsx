"use client";

import { useMemo, useState } from "react";
import type { MvpCardView } from "@/types/cards";
import { SiteShell } from "@/components/layout/SiteShell";
import { CardZoomModal } from "@/components/ui/CardZoomModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConnectXCallout } from "@/components/auth/ConnectXCallout";
import { Surface } from "@/components/ui/Surface";
import { CardGrid } from "@/components/collection/CardGrid";
import { CollectionHeader } from "@/components/collection/CollectionHeader";
import { MissingCardsShelf } from "@/components/collection/MissingCardsShelf";
import { useSession } from "@/components/useSession";
import { GUEST_PACK_PREVIEW_CARDS } from "@/lib/packs/guest-preview";

type CollectionSortKey = "name" | "rarity" | "edition" | "quantity";
type OwnershipFilter = "all" | "duplicates" | "singles";

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
  const [query, setQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState<string>("ALL");
  const [ownershipFilter, setOwnershipFilter] =
    useState<OwnershipFilter>("all");
  const [zoomedCard, setZoomedCard] = useState<{
    card: MvpCardView | null;
    quantity?: number;
  }>({ card: null });

  const mvpCollection = me?.mvpCollection;
  const useMvpCollection = Array.isArray(mvpCollection);

  const sourceCollection = useMemo(() => mvpCollection ?? [], [mvpCollection]);
  const guestCollection = useMemo(
    () =>
      GUEST_PACK_PREVIEW_CARDS.slice(0, 5).map((card, index) => ({
        templateId: `guest-${card.templateId}-${index}`,
        instanceCount: index === 0 ? 2 : 1,
        card,
      })),
    [],
  );

  const totalCards = sourceCollection.reduce(
    (acc, x) => acc + x.instanceCount,
    0,
  );
  const uniqueCards = sourceCollection.length;
  const collectionProg = me?.coexistence?.v2?.collectionProgression;
  const projection = me?.coexistence?.v2?.collectionProjection;
  const projectionPct = projection?.completionPct;
  const completionPct = collectionProg?.completionPct ?? projectionPct ?? null;
  const missingTemplates =
    collectionProg?.missingTemplateCount ??
    projection?.missingTemplateCount ??
    0;
  const ownedTemplates =
    collectionProg?.ownedTemplateCount ??
    projection?.ownedTemplateCount ??
    uniqueCards;
  const totalTemplates = Math.max(
    ownedTemplates + missingTemplates,
    ownedTemplates,
    1,
  );
  const completionWidth =
    completionPct === null ? 12 : Math.max(6, Math.min(100, completionPct));

  const rarityOptions = useMemo(() => {
    const values = new Set(
      sourceCollection.map((item) => item.card.rarity).filter(Boolean),
    );
    return Array.from(values).sort(
      (a, b) => (rarityRank[a] ?? -1) - (rarityRank[b] ?? -1),
    );
  }, [sourceCollection]);

  const visibleCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = sourceCollection.filter((item) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        item.card.displayName.toLowerCase().includes(normalizedQuery) ||
        (item.card.edition ?? "").toLowerCase().includes(normalizedQuery) ||
        (item.card.setEditionLabel ?? "")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesRarity =
        rarityFilter === "ALL" || item.card.rarity === rarityFilter;
      const matchesOwnership =
        ownershipFilter === "all" ||
        (ownershipFilter === "duplicates" && item.instanceCount > 1) ||
        (ownershipFilter === "singles" && item.instanceCount === 1);
      return matchesQuery && matchesRarity && matchesOwnership;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "rarity")
        return (
          (rarityRank[a.card.rarity] ?? -1) - (rarityRank[b.card.rarity] ?? -1)
        );
      if (sortBy === "edition")
        return (a.card.edition ?? "").localeCompare(b.card.edition ?? "");
      if (sortBy === "quantity") return a.instanceCount - b.instanceCount;
      return a.card.displayName.localeCompare(b.card.displayName);
    });

    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [ownershipFilter, query, rarityFilter, sortBy, sortDir, sourceCollection]);

  const guestCount = guestCollection.reduce(
    (acc, item) => acc + item.instanceCount,
    0,
  );
  const guestUnique = guestCollection.length;
  const displayedItems = me ? visibleCards : guestCollection;
  const shownCount = displayedItems.length;

  return (
    <SiteShell>
      <div className="stitch-screen stitch-memedex-screen">
        <CollectionHeader
          completionPct={completionPct}
          totalCards={me ? totalCards : guestCount}
          uniqueCards={me ? uniqueCards : guestUnique}
          shown={shownCount}
          missingCount={me ? missingTemplates : null}
          totalTemplates={me ? totalTemplates : null}
          completionWidth={completionWidth}
        />

        <Surface variant="raised" className="memedex-toolbar-shell memedex-control-shell">
          <div className="memedex-control-ribbon">Album tools</div>
          <div className="collection-toolbar memedex-toolbar">
            <div className="collection-data-block memedex-data-block">
              <span className="mcg-eyebrow">Memedex status</span>
              <h1 className="collection-data-title">My Memedex</h1>
              <p className="memedex-data-copy">
                Track every meme card you have discovered, spot duplicates
                instantly, and see how close you are to a full album.
              </p>
              <div className="collection-data-stats memedex-data-stats">
                <span>
                  Memedex completion{" "}
                  {completionPct === null ? "—" : `${completionPct}%`}
                </span>
                <span>Owned entries {me ? totalCards : guestCount}</span>
                <span>Unique discovered {me ? uniqueCards : guestUnique}</span>
                <span>Visible now {shownCount}</span>
              </div>
              {me ? (
                <div
                  className="memedex-progress-callout"
                  aria-label="Memedex progress summary"
                >
                  <div>
                    <strong>
                      {ownedTemplates.toLocaleString()}/
                      {totalTemplates.toLocaleString()}
                    </strong>
                    <span>Memedex entries discovered</span>
                  </div>
                  <div
                    className="collection-progress-track memedex-progress-track"
                    aria-hidden="true"
                  >
                    <span style={{ width: `${completionWidth}%` }} />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="collection-sort-block memedex-sort-block">
              <div className="memedex-control-head">
                <span className="mcg-eyebrow">Search + filters</span>
                <p>
                  Use tactile controls to browse your Memedex without changing
                  the underlying collection data.
                </p>
              </div>

              <label className="memedex-search-field">
                <span>Search your Memedex</span>
                <input
                  className="collection-search-input memedex-search-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name, set, or edition"
                />
              </label>

              <div
                className="memedex-filter-pills"
                aria-label="Ownership filters"
              >
                {[
                  { value: "all", label: "All entries" },
                  { value: "duplicates", label: "Duplicates" },
                  { value: "singles", label: "Singles" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`memedex-filter-pill${ownershipFilter === option.value ? " is-active" : ""}`}
                    onClick={() =>
                      setOwnershipFilter(option.value as OwnershipFilter)
                    }
                    aria-pressed={ownershipFilter === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="collection-sort-row memedex-sort-row">
                <label>
                  Rarity
                  <select
                    className="collection-select"
                    value={rarityFilter}
                    onChange={(e) => setRarityFilter(e.target.value)}
                  >
                    <option value="ALL">All rarities</option>
                    {rarityOptions.map((rarity) => (
                      <option key={rarity} value={rarity}>
                        {rarity}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Sort by
                  <select
                    className="collection-select"
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(e.target.value as CollectionSortKey)
                    }
                  >
                    <option value="rarity">Rarity</option>
                    <option value="name">Name</option>
                    <option value="edition">Edition</option>
                    <option value="quantity">Quantity</option>
                  </select>
                </label>
                <label>
                  Direction
                  <select
                    className="collection-select"
                    value={sortDir}
                    onChange={(e) =>
                      setSortDir(e.target.value as "asc" | "desc")
                    }
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </label>
              </div>
            </div>

            {!me ? (
              <div className="memedex-callout-wrap">
                <ConnectXCallout
                  layout="inline"
                  title="Memedex sync"
                  description="Save your real pulls, rarity counts, and Memedex progress once you connect."
                  ctaLabel="Connect wallet / X to open your Memedex"
                />
              </div>
            ) : null}
          </div>
        </Surface>

        <section className="memedex-gallery-stage">
          <div className="memedex-gallery-head">
            <div>
              <p className="mcg-eyebrow">Album view</p>
              <h2 className="memedex-gallery-title">Collectible slots</h2>
              <p className="memedex-gallery-copy">
                Browse discovered cards and locked spaces like a real collectible
                album instead of a plain inventory table.
              </p>
            </div>
            <div className="memedex-gallery-stats" aria-label="Album summary">
              <span>Showing {shownCount}</span>
              <span>{me ? `${ownedTemplates.toLocaleString()} discovered` : `${guestUnique} preview cards`}</span>
            </div>
          </div>

          {!me ? (
            <CardGrid
              items={guestCollection}
              onOpenCard={(card, quantity) => setZoomedCard({ card, quantity })}
              guestMode
            />
          ) : !useMvpCollection ? (
            <EmptyState
              title="Memedex data unavailable"
              description="Refresh your session and verify the Memedex payload."
            />
          ) : visibleCards.length > 0 ? (
            <CardGrid
              items={visibleCards}
              onOpenCard={(card, quantity) => setZoomedCard({ card, quantity })}
              missingCount={missingTemplates}
            />
          ) : me && sourceCollection.length === 0 ? (
            <EmptyState
              title="Your Memedex is empty"
              description="Open your first pack to discover your first Memedex entry."
            />
          ) : (
            <EmptyState
              title="No Memedex entries match"
              description="Try a different search or filter to surface more discovered cards."
            />
          )}
        </section>

        {me && missingTemplates > 0 ? (
          <MissingCardsShelf missingCount={missingTemplates} />
        ) : null}

        <CardZoomModal
          card={zoomedCard.card}
          quantity={zoomedCard.quantity}
          open={Boolean(zoomedCard.card)}
          onClose={() => setZoomedCard({ card: null })}
        />
      </div>
    </SiteShell>
  );
}
