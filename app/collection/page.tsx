"use client";

import { useMemo, useState } from "react";
import type { MvpCardView } from "@/types/cards";
import { SiteShell } from "@/components/layout/SiteShell";
import { CardZoomModal } from "@/components/ui/CardZoomModal";
import { Chip } from "@/components/ui/Chip";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Surface } from "@/components/ui/Surface";
import { CollectionHeader } from "@/components/collection/CollectionHeader";
import { CardGrid } from "@/components/collection/CardGrid";
import { MissingCardsShelf } from "@/components/collection/MissingCardsShelf";
import { useSession } from "@/components/useSession";

type CollectionSortKey = "name" | "rarity" | "edition" | "quantity";

const rarityRank: Record<string, number> = {
  COMMON: 0,
  UNCOMMON: 1,
  RARE: 2,
  EPIC: 3,
  LEGENDARY: 4,
};

const rarityChips = [
  { key: "", label: "All" },
  { key: "COMMON", label: "Common" },
  { key: "UNCOMMON", label: "Uncommon" },
  { key: "RARE", label: "Rare" },
  { key: "EPIC", label: "Epic" },
  { key: "LEGENDARY", label: "Legendary" },
];

const knownEditionOrder = ["BASE", "REVERSE", "HOLO", "BRILLANTE", "MCG_ART"];

function normalizeEditionCode(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toUpperCase();
  if (!normalized) return "";
  if (normalized === "FULL_ART") return "MCG_ART";
  return normalized;
}

function formatEditionLabel(editionCode: string) {
  if (editionCode === "MCG_ART") return "MCG art";
  if (!editionCode) return "Unknown";
  return editionCode.charAt(0) + editionCode.slice(1).toLowerCase();
}

export default function CollectionPage() {
  const { me } = useSession();
  const [search, setSearch] = useState("");
  const [rarityFilter, setRarityFilter] = useState("");
  const [setFilter, setSetFilter] = useState("");
  const [edition, setEdition] = useState("");
  const [sortBy, setSortBy] = useState<CollectionSortKey>("rarity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [zoomedCard, setZoomedCard] = useState<{ card: MvpCardView | null; quantity?: number }>({ card: null });
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);

  const isAuthUser = me?.mode === "user";
  const mvpCollection = me?.mvpCollection;
  const useMvpCollection = isAuthUser && Array.isArray(mvpCollection);

  const sourceCollection = useMemo(() => {
    if (!me) return [];
    return isAuthUser ? mvpCollection ?? [] : me.mvpCollection;
  }, [isAuthUser, me, mvpCollection]);

  const sets = useMemo(
    () => [...new Set(sourceCollection.map((x) => x.card.faction).filter(Boolean) as string[])].sort(),
    [sourceCollection],
  );

  const editionCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of sourceCollection) {
      const code = normalizeEditionCode(item.card.edition);
      if (!code) continue;
      map.set(code, (map.get(code) ?? 0) + 1);
    }
    return map;
  }, [sourceCollection]);

  const editions = useMemo(() => {
    const observed = Array.from(editionCounts.keys()).sort();
    const withKnown = [...knownEditionOrder, ...observed.filter((ed) => !knownEditionOrder.includes(ed))];
    return [...new Set(withKnown)];
  }, [editionCounts]);

  const editionChips = useMemo(
    () => editions.map((editionCode) => ({ key: editionCode, label: formatEditionLabel(editionCode), count: editionCounts.get(editionCode) ?? 0 })),
    [editionCounts, editions],
  );

  const visibleCards = useMemo(() => {
    const filtered = sourceCollection
      .filter((item) => !setFilter || item.card.faction === setFilter)
      .filter((item) => !rarityFilter || item.card.rarity === rarityFilter)
      .filter((item) => !edition || normalizeEditionCode(item.card.edition) === edition)
      .filter((item) =>
        `${item.card.displayName} ${item.card.symbol} ${item.card.faction ?? ""} ${item.card.rarity} ${item.card.edition}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      );

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "rarity") return (rarityRank[a.card.rarity] ?? -1) - (rarityRank[b.card.rarity] ?? -1);
      if (sortBy === "edition") return normalizeEditionCode(a.card.edition).localeCompare(normalizeEditionCode(b.card.edition));
      if (sortBy === "quantity") return a.instanceCount - b.instanceCount;
      return a.card.displayName.localeCompare(b.card.displayName);
    });

    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [edition, setFilter, rarityFilter, search, sortBy, sortDir, sourceCollection]);

  const totalCards = sourceCollection.reduce((acc, x) => acc + x.instanceCount, 0);
  const uniqueCards = sourceCollection.length;
  const collectionProg = me?.mode === "user" ? me.coexistence?.v2?.collectionProgression : undefined;
  const projectionPct = me?.mode === "user" ? me.coexistence?.v2?.collectionProjection?.completionPct : undefined;
  const completionPct = collectionProg?.completionPct ?? projectionPct ?? null;

  const missingCount = Math.max((collectionProg?.missingTemplateCount ?? 0), 0);

  const filterPanel = (
    <div className="collection-filter-panel">
      <div className="collection-search-wrap">
        <input
          className="collection-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cards, symbols, sets..."
          aria-label="Search cards"
        />
      </div>

      <div className="collection-filter-row">
        <span className="mcg-eyebrow">Rarity</span>
        <div className="collection-chip-wrap">
          {rarityChips.map((chip) => (
            <Chip key={chip.key || "all"} label={chip.label} selected={rarityFilter === chip.key} onClick={() => setRarityFilter(chip.key)} />
          ))}
        </div>
      </div>

      <div className="collection-filter-row">
        <span className="mcg-eyebrow">Edition</span>
        <div className="collection-chip-wrap">
          <Chip label="All editions" selected={edition === ""} onClick={() => setEdition("")} />
          {editionChips.map((chip) => (
            <Chip key={chip.key} label={chip.label} selected={edition === chip.key} count={chip.count} onClick={() => setEdition(chip.key)} />
          ))}
        </div>
      </div>

      {sets.length > 0 ? (
        <div className="collection-filter-row">
          <span className="mcg-eyebrow">Set</span>
          <div className="collection-chip-wrap">
            <Chip label="All sets" selected={setFilter === ""} onClick={() => setSetFilter("")} />
            {sets.map((setName) => (
              <Chip key={setName} label={setName} selected={setFilter === setName} onClick={() => setSetFilter(setName)} />
            ))}
          </div>
        </div>
      ) : null}

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
  );

  return (
    <SiteShell>
      <CollectionHeader
        completionPct={completionPct}
        totalCards={totalCards}
        uniqueCards={uniqueCards}
        shown={visibleCards.length}
      />

      <Surface>
        <div className="collection-filters-shell">
          <div className="collection-filters-head">
            <span className="mcg-eyebrow">Filter bar</span>
            <button type="button" className="mcg-btn ghost collection-mobile-filter-btn" onClick={() => setFiltersDrawerOpen(true)}>
              Open filters
            </button>
          </div>
          <div className="collection-desktop-filters">{filterPanel}</div>
        </div>
      </Surface>

      <Drawer open={filtersDrawerOpen} onClose={() => setFiltersDrawerOpen(false)} title="Collection filters">
        {filterPanel}
      </Drawer>

      {!me ? (
        <EmptyState title="Connect to view your collection" description="Sign in with X for persistent ownership, or use guest mode to preview." />
      ) : isAuthUser && !useMvpCollection ? (
        <EmptyState title="Collection data unavailable" description="Refresh your session and verify collection payload." />
      ) : visibleCards.length > 0 ? (
        <CardGrid
          items={visibleCards}
          onOpenCard={(card, quantity) => setZoomedCard({ card, quantity })}
        />
      ) : me && sourceCollection.length === 0 ? (
        <EmptyState title="Your collection is empty" description="Open your first pack to start collecting cards." />
      ) : (
        <EmptyState title="No cards match your filters" description="Try different rarity, edition, set or search terms." />
      )}

      <MissingCardsShelf missingCount={missingCount} />

      <CardZoomModal
        card={zoomedCard.card}
        quantity={zoomedCard.quantity}
        open={Boolean(zoomedCard.card)}
        onClose={() => setZoomedCard({ card: null })}
      />
    </SiteShell>
  );
}
