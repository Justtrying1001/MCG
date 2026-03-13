"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { MvpCardTile } from "@/components/ui/MvpCardTile";
import { CardZoomModal } from "@/components/ui/CardZoomModal";
import { useSession } from "@/components/useSession";
import { useMemo, useState } from "react";
import type { MvpCardView } from "@/types/cards";

type CollectionSortKey = "name" | "rarity" | "edition" | "quantity";

const rarityRank: Record<string, number> = {
  COMMON: 0, UNCOMMON: 1, RARE: 2, EPIC: 3, LEGENDARY: 4,
};

const rarityChips = [
  { key: "",          label: "All",        cls: "" },
  { key: "COMMON",    label: "Common",     cls: "rc-common" },
  { key: "UNCOMMON",  label: "Uncommon",   cls: "rc-uncommon" },
  { key: "RARE",      label: "Rare",       cls: "rc-rare" },
  { key: "EPIC",      label: "Epic",       cls: "rc-epic" },
  { key: "LEGENDARY", label: "Legendary",  cls: "rc-legendary" },
];


function formatEditionLabel(editionCode: string) {
  const normalized = (editionCode || "").trim();
  if (!normalized) return "Unknown";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

export default function CollectionPage() {
  const { me } = useSession();
  const [search,      setSearch]      = useState("");
  const [rarityFilter,setRarityFilter]= useState("");
  const [faction,     setFaction]     = useState("");
  const [edition,     setEdition]     = useState("");
  const [sortBy,      setSortBy]      = useState<CollectionSortKey>("rarity");
  const [sortDir,     setSortDir]     = useState<"asc" | "desc">("desc");
  const [zoomedCard,  setZoomedCard]  = useState<{ card: MvpCardView | null; quantity?: number }>({ card: null });

  const isAuthUser       = me?.mode === "user";
  const mvpCollection    = me?.mvpCollection;
  const useMvpCollection = isAuthUser && Array.isArray(mvpCollection);

  const sourceCollection = useMemo(() => {
    if (!me) return [];
    return isAuthUser ? (mvpCollection ?? []) : me.mvpCollection;
  }, [isAuthUser, me, mvpCollection]);

  const factions = useMemo(
    () => [...new Set(sourceCollection.map((x) => x.card.faction).filter(Boolean) as string[])].sort(),
    [sourceCollection]
  );

  const editions = useMemo(
    () => [...new Set(sourceCollection.map((x) => x.card.edition).filter(Boolean) as string[])].sort(),
    [sourceCollection]
  );

  const editionChips = useMemo(
    () => editions.map((editionLabel) => ({
      key: editionLabel,
      label: editionLabel,
      count: sourceCollection.filter((item) => (item.card.edition || "") === editionLabel).length,
    })),
    [editions, sourceCollection]
  );

  const rarityStats = useMemo(() => {
    const seed = {
      COMMON: { unique: 0, owned: 0 },
      UNCOMMON: { unique: 0, owned: 0 },
      RARE: { unique: 0, owned: 0 },
      EPIC: { unique: 0, owned: 0 },
      LEGENDARY: { unique: 0, owned: 0 },
    };

    for (const item of sourceCollection) {
      const rarity = item.card.rarity;
      if (!seed[rarity as keyof typeof seed]) continue;
      seed[rarity as keyof typeof seed].unique += 1;
      seed[rarity as keyof typeof seed].owned += item.instanceCount;
    }
    return seed;
  }, [sourceCollection]);

  const editionStats = useMemo(() => {
    const map = new Map<string, { unique: number; owned: number }>();
    for (const item of sourceCollection) {
      const editionName = item.card.edition || "Unknown";
      const prev = map.get(editionName) ?? { unique: 0, owned: 0 };
      map.set(editionName, { unique: prev.unique + 1, owned: prev.owned + item.instanceCount });
    }
    return [...map.entries()]
      .map(([label, stats]) => ({ label, ...stats }))
      .sort((a, b) => b.owned - a.owned || a.label.localeCompare(b.label));
  }, [sourceCollection]);

  const visibleCards = useMemo(() => {
    const filtered = sourceCollection
      .filter((item) => !faction || item.card.faction === faction)
      .filter((item) => !rarityFilter || item.card.rarity === rarityFilter)
      .filter((item) => !edition || (item.card.edition || "") === edition)
      .filter((item) =>
        `${item.card.displayName} ${item.card.symbol} ${item.card.faction ?? ""} ${item.card.rarity} ${item.card.edition}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "rarity")    return (rarityRank[a.card.rarity] ?? -1) - (rarityRank[b.card.rarity] ?? -1);
      if (sortBy === "edition")   return (a.card.edition || "").localeCompare(b.card.edition || "");
      if (sortBy === "quantity")  return a.instanceCount - b.instanceCount;
      return a.card.displayName.localeCompare(b.card.displayName);
    });

    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [edition, faction, rarityFilter, search, sortBy, sortDir, sourceCollection]);

  /* Stats */
  const totalCards    = sourceCollection.reduce((acc, x) => acc + x.instanceCount, 0);
  const uniqueCards   = sourceCollection.length;
  const legendaryCount= rarityStats.LEGENDARY.unique;
  const epicCount     = rarityStats.EPIC.unique;
  const rareCount     = rarityStats.RARE.unique;
  const uncommonCount = rarityStats.UNCOMMON.unique;
  const commonCount   = rarityStats.COMMON.unique;

  const collectionProg = me?.mode === "user" ? me.coexistence?.v2?.collectionProgression : undefined;
  const projectionPct  = me?.mode === "user" ? me.coexistence?.v2?.collectionProjection?.completionPct : undefined;
  const completionPct  = collectionProg?.completionPct ?? projectionPct ?? null;

  return (
    <SiteShell>
      <div className="hub-page">

        {/* ── Page Header ── */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Collection</h1>
            <p className="page-subtitle">
              Your binder — every card you own, sorted by rarity, faction, or edition.
            </p>
          </div>
          {me && (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-3)" }}>
                {visibleCards.length} shown
              </span>
            </div>
          )}
        </div>

        {/* ── Stats Banner ── */}
        {me && (
          <div className="collection-stats-banner">
            <div className="csb-card">
              <div className="csb-num">{totalCards}</div>
              <div className="csb-lbl">Total Cards</div>
            </div>
            <div className="csb-card">
              <div className="csb-num">{uniqueCards}</div>
              <div className="csb-lbl">Unique</div>
            </div>
            <div className="csb-card">
              <div className="csb-num" style={{ color: "var(--rarity-legendary)" }}>{legendaryCount}</div>
              <div className="csb-lbl">Legendary</div>
            </div>
            <div className="csb-card">
              <div className="csb-num" style={{ color: "var(--rarity-epic)" }}>{epicCount}</div>
              <div className="csb-lbl">Epic</div>
            </div>
          </div>
        )}

        {/* ── Collection Completion Bar ── */}
        {me && uniqueCards > 0 && (
          <div className="collection-completion-bar">
            <div className="collection-completion-bg" />
            <div className="ccb-inner">
              <div>
                <div className="ccb-label">Collection Completion</div>
                <div className="ccb-pct">
                  {completionPct ?? "—"}
                  {completionPct !== null && <span style={{ fontSize: "1rem", opacity: 0.5 }}>%</span>}
                </div>
                <div className="ccb-track">
                  <div className="ccb-fill" style={{ width: `${completionPct ?? 0}%` }} />
                </div>
                {completionPct === null && (
                  <div className="ccb-note">Completion available for signed-in profiles only.</div>
                )}
              </div>
              <div className="ccb-rarity-grid">
                {[
                  { key: "LEGENDARY", label: "Legendary", color: "var(--rarity-legendary)" },
                  { key: "EPIC",      label: "Epic",      color: "var(--rarity-epic)" },
                  { key: "RARE",      label: "Rare",      color: "var(--rarity-rare)" },
                  { key: "UNCOMMON",  label: "Uncommon",  color: "var(--rarity-uncommon)" },
                  { key: "COMMON",    label: "Common",    color: "var(--rarity-common)" },
                ].map(({ key, label, color }) => (
                  <div key={label} className="ccb-rarity-row">
                    <span className="ccb-rarity-dot" style={{ background: color }} />
                    <span className="ccb-rarity-label" style={{ color }}>{label}</span>
                    <span className="ccb-rarity-count">
                      {rarityStats[key as keyof typeof rarityStats].owned} owned · {rarityStats[key as keyof typeof rarityStats].unique} unique
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {editionStats.length > 0 && (
              <div className="ccb-edition-grid">
                <div className="ccb-label">Owned by Edition</div>
                {editionStats.map((editionRow) => (
                  <div key={editionRow.label} className="ccb-edition-row">
                    <span className="ccb-edition-label">{formatEditionLabel(editionRow.label)}</span>
                    <span className="ccb-edition-count">{editionRow.owned} owned · {editionRow.unique} unique</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Rarity Filter Chips ── */}
        {me && (
          <div className="edition-filter-chips">
            <button
              type="button"
              className={`rarity-chip ${edition === "" ? " rc-active" : ""}`}
              onClick={() => setEdition("")}
            >
              All editions
            </button>
            {editionChips.map((editionChip) => (
              <button
                key={editionChip.key}
                type="button"
                className={`rarity-chip ${edition === editionChip.key ? " rc-active" : ""}`}
                onClick={() => setEdition(editionChip.key)}
              >
                <span className="rarity-chip-dot" />
                {formatEditionLabel(editionChip.label)}
                <span style={{ opacity: 0.65, marginLeft: 2, fontSize: "0.68rem" }}>
                  ({editionChip.count})
                </span>
              </button>
            ))}
          </div>
        )}

        {me && (
          <div className="rarity-filter-chips">
            {rarityChips.map(({ key, label, cls }) => (
              <button
                key={key}
                type="button"
                className={`rarity-chip ${cls}${rarityFilter === key ? " rc-active" : ""}`}
                onClick={() => setRarityFilter(key)}
              >
                {key && <span className="rarity-chip-dot" />}
                {label}
                {key && (
                  <span style={{ opacity: 0.65, marginLeft: 2, fontSize: "0.68rem" }}>
                    ({sourceCollection.filter((x) => x.card.rarity === key).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Filters Bar ── */}
        {me && (
          <div className="filters-bar">
            <input
              className="filter-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cards, factions, editions…"
              aria-label="Search cards"
            />
            {factions.length > 0 && (
              <select className="filter-select" value={faction} onChange={(e) => setFaction(e.target.value)}>
                <option value="">All factions</option>
                {factions.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            )}
            {editions.length > 0 && (
              <select className="filter-select" value={edition} onChange={(e) => setEdition(e.target.value)}>
                <option value="">All editions</option>
                {editions.map((setEdition) => <option key={setEdition} value={setEdition}>{formatEditionLabel(setEdition)}</option>)}
              </select>
            )}
            <select className="filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as CollectionSortKey)}>
              <option value="rarity">Sort: Rarity</option>
              <option value="name">Sort: Name</option>
              <option value="edition">Sort: Edition</option>
              <option value="quantity">Sort: Quantity</option>
            </select>
            <select className="filter-select" value={sortDir} onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        )}

        {/* ── Cards Grid ── */}
        {!me ? (
          <div className="empty-state">
            <div className="empty-state-icon">▦</div>
            <p className="empty-state-title">Connect to view your collection</p>
            <p className="empty-state-desc">
              Sign in with X for a persistent collection, or start a guest session to preview.
            </p>
          </div>
        ) : isAuthUser && !useMvpCollection ? (
          <div className="empty-state">
            <div className="empty-state-icon">⚠</div>
            <p className="empty-state-title">Collection data unavailable</p>
            <p className="empty-state-desc">
              Refresh your session and verify the API returns your collection.
            </p>
          </div>
        ) : visibleCards.length > 0 ? (
          <div className="card-grid">
            {visibleCards.map((item) => (
              <button
                key={item.templateId}
                type="button"
                className="card-tile-trigger"
                onClick={() => setZoomedCard({ card: item.card, quantity: item.instanceCount })}
                title={`${item.card.displayName} · ×${item.instanceCount}`}
              >
                <MvpCardTile card={item.card} quantity={item.instanceCount} variant="collection" />
              </button>
            ))}
          </div>
        ) : me && sourceCollection.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">◈</div>
            <p className="empty-state-title">Your collection is empty</p>
            <p className="empty-state-desc">
              Open your first pack to start collecting cards.
            </p>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">◈</div>
            <p className="empty-state-title">No cards match your filters</p>
            <p className="empty-state-desc">
              Try a different rarity, faction, or search term.
            </p>
          </div>
        )}

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
