"use client";

import { useMemo, useState } from "react";
import type { MvpCardView } from "@/types/cards";
import { SiteShell } from "@/components/layout/SiteShell";
import { CardZoomModal } from "@/components/ui/CardZoomModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConnectXCallout } from "@/components/auth/ConnectXCallout";
import { CardGrid } from "@/components/collection/CardGrid";
import { CollectionHeader } from "@/components/collection/CollectionHeader";
import { formatMemedexFinish } from "@/components/collection/memedexFinish";
import { useSession } from "@/components/useSession";
import { GUEST_PACK_PREVIEW_CARDS } from "@/lib/packs/guest-preview";

type CollectionSortKey = "name" | "rarity" | "finish" | "quantity";
type OwnershipFilter = "all" | "owned" | "missing" | "duplicates";

type CountRow = {
  label: string;
  count: number;
};

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
  const [finishFilter, setFinishFilter] = useState<string>("ALL");
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
  const statsCollection = me ? sourceCollection : guestCollection;
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
      (a, b) => (rarityRank[a] ?? Number.MAX_SAFE_INTEGER) - (rarityRank[b] ?? Number.MAX_SAFE_INTEGER) || a.localeCompare(b),
    );
  }, [sourceCollection]);

  const finishOptions = useMemo(() => {
    const values = new Set(
      sourceCollection
        .map((item) => formatMemedexFinish(item.card.edition))
        .filter((value): value is string => Boolean(value)),
    );
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [sourceCollection]);

  const duplicateCount = useMemo(
    () => sourceCollection.reduce((acc, item) => acc + Math.max(item.instanceCount - 1, 0), 0),
    [sourceCollection],
  );

  const hasDuplicateCards = duplicateCount > 0;

  const hasMissingCards = Boolean(me && missingTemplates > 0);


  const rarityCounts = useMemo<CountRow[]>(() => {
    const counts = new Map<string, number>();
    statsCollection.forEach((item) => {
      counts.set(item.card.rarity, (counts.get(item.card.rarity) ?? 0) + 1);
    });

    return ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"].map((label) => ({
      label,
      count: counts.get(label) ?? 0,
    }));
  }, [statsCollection]);

  const finishCounts = useMemo<CountRow[]>(() => {
    const counts = new Map<string, number>();
    statsCollection.forEach((item) => {
      const finish = formatMemedexFinish(item.card.edition);
      counts.set(finish, (counts.get(finish) ?? 0) + 1);
    });

    return ["Base", "Reverse", "Holo", "Full Art"].map((label) => ({
      label,
      count: counts.get(label) ?? 0,
    }));
  }, [statsCollection]);

  const ownershipOptions = useMemo(
    () => [
      { value: "all" as const, label: "All" },
      { value: "owned" as const, label: "Owned" },
      { value: "missing" as const, label: "Missing", disabled: !hasMissingCards },
      { value: "duplicates" as const, label: "Duplicates", disabled: !hasDuplicateCards },
    ],
    [hasDuplicateCards, hasMissingCards],
  );

  const visibleCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = sourceCollection.filter((item) => {
      const finishValue = formatMemedexFinish(item.card.edition);
      const matchesQuery =
        normalizedQuery.length === 0 ||
        item.card.displayName.toLowerCase().includes(normalizedQuery) ||
        finishValue.toLowerCase().includes(normalizedQuery) ||
        item.card.rarity.toLowerCase().includes(normalizedQuery);
      const matchesRarity =
        rarityFilter === "ALL" || item.card.rarity === rarityFilter;
      const matchesFinish =
        finishFilter === "ALL" || finishValue === finishFilter;
      const matchesOwnership =
        ownershipFilter === "all" ||
        ownershipFilter === "owned" ||
        (ownershipFilter === "duplicates" && item.instanceCount > 1) ||
        ownershipFilter === "missing";
      return matchesQuery && matchesRarity && matchesFinish && matchesOwnership;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "rarity") {
        return (
          (rarityRank[a.card.rarity] ?? Number.MAX_SAFE_INTEGER) -
          (rarityRank[b.card.rarity] ?? Number.MAX_SAFE_INTEGER)
        );
      }
      if (sortBy === "finish") {
        return formatMemedexFinish(a.card.edition).localeCompare(
          formatMemedexFinish(b.card.edition),
        );
      }
      if (sortBy === "quantity") return a.instanceCount - b.instanceCount;
      return a.card.displayName.localeCompare(b.card.displayName);
    });

    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [finishFilter, ownershipFilter, query, rarityFilter, sortBy, sortDir, sourceCollection]);

  const gridItems = ownershipFilter === "missing" ? [] : visibleCards;
  const lockedPreviewCount = ownershipFilter === "owned" || ownershipFilter === "duplicates"
    ? 0
    : missingTemplates;

  const guestCount = guestCollection.reduce(
    (acc, item) => acc + item.instanceCount,
    0,
  );
  const guestUnique = guestCollection.length;
  const displayedItems = me ? gridItems : guestCollection;
  const shownCount = ownershipFilter === "missing" ? lockedPreviewCount : displayedItems.length;

  return (
    <SiteShell>
      <div className="stitch-screen stitch-memedex-screen">
        <CollectionHeader
          completionPct={completionPct}
          totalCards={me ? totalCards : guestCount}
          uniqueCards={me ? uniqueCards : guestUnique}
          duplicateCount={me ? duplicateCount : Math.max(guestCount - guestUnique, 0)}
          rarityCounts={rarityCounts}
          finishCounts={finishCounts}
          totalTemplates={me ? totalTemplates : null}
          completionWidth={completionWidth}
        />

        <section className="memedex-gallery-stage">
          <div className="memedex-gallery-head">
            <div className="memedex-gallery-title-wrap">
              <h2 className="memedex-gallery-title">Collectible Slots</h2>
              <p className="memedex-gallery-copy">
                Browse your Memedex like a collectible binder with compact tools
                and the cards front and center.
              </p>
            </div>
            <div className="memedex-gallery-stats" aria-label="Memedex summary">
              <span>Showing {shownCount}</span>
              <span>
                {me
                  ? `${Math.min(shownCount, ownedTemplates).toLocaleString()} preview cards`
                  : `${guestUnique} preview cards`}
              </span>
            </div>
          </div>

          <div className="memedex-gallery-toolbar" aria-label="Collectible slot filters">
            <div className="memedex-toolbar-top">
              <div className="memedex-filter-field memedex-filter-field--chips">
                <span>Ownership</span>
                <div className="memedex-filter-pills" aria-label="Entry type">
                  {ownershipOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`memedex-filter-pill${ownershipFilter === option.value ? " is-active" : ""}`}
                      onClick={() => setOwnershipFilter(option.value as OwnershipFilter)}
                      aria-pressed={ownershipFilter === option.value}
                      disabled={option.disabled}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="memedex-toolbar-search">
                <span>Search</span>
                <input
                  className="collection-search-input memedex-search-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name, rarity, or finish"
                />
              </label>
            </div>

            <div className="memedex-toolbar-bottom">
              <label className="memedex-filter-field">
                <span>Rarity</span>
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

              <label className="memedex-filter-field">
                <span>Finish</span>
                <select
                  className="collection-select"
                  value={finishFilter}
                  onChange={(e) => setFinishFilter(e.target.value)}
                >
                  <option value="ALL">All finishes</option>
                  {finishOptions.map((finish) => (
                    <option key={finish} value={finish}>
                      {finish}
                    </option>
                  ))}
                </select>
              </label>

              <label className="memedex-filter-field">
                <span>Sort</span>
                <select
                  className="collection-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as CollectionSortKey)}
                >
                  <option value="rarity">Rarity</option>
                  <option value="name">Name</option>
                  <option value="finish">Finish</option>
                  <option value="quantity">Quantity</option>
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
          ) : visibleCards.length > 0 || ownershipFilter === "missing" ? (
            <CardGrid
              items={gridItems}
              onOpenCard={(card, quantity) => setZoomedCard({ card, quantity })}
              missingCount={lockedPreviewCount}
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
