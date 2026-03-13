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

const rarityChips = [
  { key: "", label: "All", cls: "" },
  { key: "COMMON", label: "Common", cls: "rc-common" },
  { key: "UNCOMMON", label: "Uncommon", cls: "rc-uncommon" },
  { key: "RARE", label: "Rare", cls: "rc-rare" },
  { key: "EPIC", label: "Epic", cls: "rc-epic" },
  { key: "LEGENDARY", label: "Legendary", cls: "rc-legendary" },
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
  const [faction, setFaction] = useState("");
  const [edition, setEdition] = useState("");
  const [sortBy, setSortBy] = useState<CollectionSortKey>("rarity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [zoomedCard, setZoomedCard] = useState<{ card: MvpCardView | null; quantity?: number }>({ card: null });

  const isAuthUser = me?.mode === "user";
  const mvpCollection = me?.mvpCollection;
  const useMvpCollection = isAuthUser && Array.isArray(mvpCollection);

  const sourceCollection = useMemo(() => {
    if (!me) return [];
    return isAuthUser ? mvpCollection ?? [] : me.mvpCollection;
  }, [isAuthUser, me, mvpCollection]);

  const factions = useMemo(
    () => [...new Set(sourceCollection.map((x) => x.card.faction).filter(Boolean) as string[])].sort(),
    [sourceCollection]
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
    [editionCounts, editions]
  );

  const rarityCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of sourceCollection) {
      map.set(item.card.rarity, (map.get(item.card.rarity) ?? 0) + 1);
    }
    return map;
  }, [sourceCollection]);

  const visibleCards = useMemo(() => {
    const filtered = sourceCollection
      .filter((item) => !faction || item.card.faction === faction)
      .filter((item) => !rarityFilter || item.card.rarity === rarityFilter)
      .filter((item) => !edition || normalizeEditionCode(item.card.edition) === edition)
      .filter((item) =>
        `${item.card.displayName} ${item.card.symbol} ${item.card.faction ?? ""} ${item.card.rarity} ${item.card.edition}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "rarity") return (rarityRank[a.card.rarity] ?? -1) - (rarityRank[b.card.rarity] ?? -1);
      if (sortBy === "edition") return normalizeEditionCode(a.card.edition).localeCompare(normalizeEditionCode(b.card.edition));
      if (sortBy === "quantity") return a.instanceCount - b.instanceCount;
      return a.card.displayName.localeCompare(b.card.displayName);
    });

    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [edition, faction, rarityFilter, search, sortBy, sortDir, sourceCollection]);

  const totalCards = sourceCollection.reduce((acc, x) => acc + x.instanceCount, 0);
  const uniqueCards = sourceCollection.length;
  const collectionProg = me?.mode === "user" ? me.coexistence?.v2?.collectionProgression : undefined;
  const projectionPct = me?.mode === "user" ? me.coexistence?.v2?.collectionProjection?.completionPct : undefined;
  const completionPct = collectionProg?.completionPct ?? projectionPct ?? null;

  return (
    <SiteShell>
      <div className="hub-page">
        {me && (
          <section className="collection-head">
            <div className="collection-head-top">
              <div>
                <h1 className="page-title">Collection</h1>
                <p className="page-subtitle">Build your TCG binder. Filter by rarity, edition, faction and quantity.</p>
              </div>
              <div className="collection-shown-pill">{visibleCards.length} shown</div>
            </div>

            <div className="collection-head-stats">
              <div className="ch-stat-card">
                <span className="ch-stat-label">Owned</span>
                <strong className="ch-stat-value">{totalCards}</strong>
              </div>
              <div className="ch-stat-card">
                <span className="ch-stat-label">Unique</span>
                <strong className="ch-stat-value">{uniqueCards}</strong>
              </div>
              <div className="ch-stat-card">
                <span className="ch-stat-label">Completion</span>
                <strong className="ch-stat-value">{completionPct === null ? "—" : `${completionPct}%`}</strong>
              </div>
              <div className="ch-stat-card">
                <span className="ch-stat-label">Filtered</span>
                <strong className="ch-stat-value">{visibleCards.length}</strong>
              </div>
            </div>

            <div className="collection-head-controls">
              <input
                className="filter-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cards, symbols, factions..."
                aria-label="Search cards"
              />
              {factions.length > 0 && (
                <select className="filter-select" value={faction} onChange={(e) => setFaction(e.target.value)}>
                  <option value="">All factions</option>
                  {factions.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              )}
              <select className="filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as CollectionSortKey)}>
                <option value="rarity">Sort: Rarity</option>
                <option value="name">Sort: Name</option>
                <option value="edition">Sort: Edition</option>
                <option value="quantity">Sort: Quantity</option>
              </select>
              <select className="filter-select" value={sortDir} onChange={(e) => setSortDir(e.target.value as "asc" | "desc") }>
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            <div className="collection-chip-group">
              <div className="collection-chip-title">Edition</div>
              <div className="edition-filter-chips">
                <button
                  type="button"
                  className={`rarity-chip ${edition === "" ? "rc-active" : ""}`}
                  onClick={() => setEdition("")}
                >
                  All editions
                </button>
                {editionChips.map((editionChip) => (
                  <button
                    key={editionChip.key}
                    type="button"
                    className={`rarity-chip ${edition === editionChip.key ? "rc-active" : ""}`}
                    onClick={() => setEdition(editionChip.key)}
                  >
                    <span className="rarity-chip-dot" />
                    {editionChip.label}
                    <span style={{ opacity: 0.65, marginLeft: 2, fontSize: "0.68rem" }}>({editionChip.count})</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="collection-chip-group">
              <div className="collection-chip-title">Rarity</div>
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
                    {key && <span style={{ opacity: 0.65, marginLeft: 2, fontSize: "0.68rem" }}>({rarityCounts.get(key) ?? 0})</span>}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Cards Grid ── */}
        {!me ? (
          <div className="empty-state">
            <div className="empty-state-icon">▦</div>
            <p className="empty-state-title">Connect to view your collection</p>
            <p className="empty-state-desc">Sign in with X for a persistent collection, or start a guest session to preview.</p>
          </div>
        ) : isAuthUser && !useMvpCollection ? (
          <div className="empty-state">
            <div className="empty-state-icon">⚠</div>
            <p className="empty-state-title">Collection data unavailable</p>
            <p className="empty-state-desc">Refresh your session and verify the API returns your collection.</p>
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
            <p className="empty-state-desc">Open your first pack to start collecting cards.</p>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">◈</div>
            <p className="empty-state-title">No cards match your filters</p>
            <p className="empty-state-desc">Try a different rarity, edition, faction, or search term.</p>
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
