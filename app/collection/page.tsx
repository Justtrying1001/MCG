"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { MvpCardTile } from "@/components/ui/MvpCardTile";
import { CardZoomModal } from "@/components/ui/CardZoomModal";
import { useSession } from "@/components/useSession";
import { useMemo, useState } from "react";
import type { MvpCardView } from "@/types/cards";

type CollectionViewMode = "album" | "list" | "factions";

const rarityRank: Record<string, number> = {
  COMMON: 0,
  UNCOMMON: 1,
  RARE: 2,
  EPIC: 3,
  LEGENDARY: 4,
};

function sortByFactionThenRarity(a: MvpCardView, b: MvpCardView) {
  const factionA = a.faction ?? "";
  const factionB = b.faction ?? "";

  if (factionA !== factionB) return factionA.localeCompare(factionB);

  const rarityA = rarityRank[a.rarity] ?? -1;
  const rarityB = rarityRank[b.rarity] ?? -1;
  if (rarityA !== rarityB) return rarityB - rarityA;

  return a.displayName.localeCompare(b.displayName);
}

export default function CollectionPage() {
  const { me } = useSession();
  const [search, setSearch] = useState("");
  const [faction, setFaction] = useState("");
  const [viewMode, setViewMode] = useState<CollectionViewMode>("album");
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

  const filteredCollection = useMemo(
    () =>
      sourceCollection
        .filter((item) => !faction || item.card.faction === faction)
        .filter((item) =>
          `${item.card.displayName} ${item.card.symbol} ${item.card.faction || ""}`.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => a.card.displayName.localeCompare(b.card.displayName)),
    [faction, search, sourceCollection]
  );

  const albumCards = useMemo(
    () => [...filteredCollection].sort((a, b) => sortByFactionThenRarity(a.card, b.card)),
    [filteredCollection]
  );

  const groupedByFaction = useMemo(() => {
    const groupMap = new Map<string, typeof filteredCollection>();

    for (const item of filteredCollection) {
      const group = item.card.faction || "Unaligned";
      const list = groupMap.get(group) ?? [];
      list.push(item);
      groupMap.set(group, list);
    }

    return [...groupMap.entries()]
      .map(([name, cards]) => ({
        name,
        cards: cards.sort((a, b) => sortByFactionThenRarity(a.card, b.card)),
        totalInstances: cards.reduce((sum, card) => sum + card.instanceCount, 0),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredCollection]);

  const factionProgress = useMemo(() => {
    const totals = new Map<string, number>();
    const owned = new Map<string, number>();

    for (const item of sourceCollection) {
      const key = item.card.faction || "Unaligned";
      totals.set(key, (totals.get(key) ?? 0) + 1);
      owned.set(key, (owned.get(key) ?? 0) + (item.instanceCount > 0 ? 1 : 0));
    }

    return [...totals.entries()]
      .map(([name, total]) => {
        const ownedCount = owned.get(name) ?? 0;
        const pct = total > 0 ? Math.round((ownedCount / total) * 100) : 0;
        return { name, total, owned: ownedCount, pct };
      })
      .sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name));
  }, [sourceCollection]);

  const totalCards = sourceCollection.reduce((acc, x) => acc + x.instanceCount, 0);
  const uniqueCards = sourceCollection.length;
  const legendaryCount = sourceCollection.filter((x) => x.card.rarity === "LEGENDARY").length;
  const v2Projection = isAuthUser ? me.coexistence?.v2?.collectionProjection : undefined;
  const missingTemplates = v2Projection?.missingTemplateCount ?? 0;
  const completionPct = v2Projection?.completionPct ?? (uniqueCards > 0 ? 100 : 0);
  const albumMissingSlots = !search && !faction ? missingTemplates : 0;

  return (
    <SiteShell>
      <section className="collection-binder-shell">
        <div className="collection-hero-header">
          <div>
            <p className="collection-kicker">Collection Command Center</p>
            <h1 className="collection-title">Collection</h1>
            <p className="collection-subtitle">
              Track completion, chase rarities, and inspect every card in a modern album layout.
            </p>
          </div>
          <div className="collection-completion-chip" aria-label={`Completion ${completionPct}%`}>
            <span>Completion</span>
            <strong>{completionPct}%</strong>
          </div>
        </div>

        {me && (
          <div className="collection-stat-badges">
            <article className="collection-stat-badge">
              <span className="badge-emoji">🎴</span>
              <span className="collection-stat-value">{v2Projection?.totalOwnedInstances ?? totalCards}</span>
              <span className="collection-stat-label">Total cards</span>
            </article>
            <article className="collection-stat-badge">
              <span className="badge-emoji">🧠</span>
              <span className="collection-stat-value">{v2Projection?.ownedTemplateCount ?? uniqueCards}</span>
              <span className="collection-stat-label">Unique owned</span>
            </article>
            <article className="collection-stat-badge is-legendary">
              <span className="badge-emoji">🌟</span>
              <span className="collection-stat-value">{legendaryCount}</span>
              <span className="collection-stat-label">Legendary cards</span>
            </article>
            <article className="collection-stat-badge">
              <span className="badge-emoji">🎯</span>
              <span className="collection-stat-value">{missingTemplates}</span>
              <span className="collection-stat-label">Missing templates</span>
            </article>
          </div>
        )}

        <div className="collection-toolbar">
          <div className="collection-view-tabs" role="tablist" aria-label="Collection view modes">
            {[
              { id: "album", label: "Album View" },
              { id: "list", label: "List View" },
              { id: "factions", label: "Faction View" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={viewMode === tab.id}
                className={`collection-view-tab ${viewMode === tab.id ? "is-active" : ""}`}
                onClick={() => setViewMode(tab.id as CollectionViewMode)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="filters-bar collection-filters">
            <input
              className="filter-input collection-filter-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, symbol, or faction..."
              aria-label="Search cards"
            />
            <select className="filter-select collection-filter-select" value={faction} onChange={(e) => setFaction(e.target.value)}>
              <option value="">All factions</option>
              {factions.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!me ? (
          <div className="empty-state collection-empty-state">
            <div className="empty-state-icon">📘</div>
            <p className="empty-state-title">Connect or start guest mode to view your collection</p>
            <p className="empty-state-desc">Use X for a persistent collection, or guest mode for quick testing.</p>
          </div>
        ) : isAuthUser && !useMvpCollection ? (
          <div className="empty-state collection-empty-state">
            <div className="empty-state-icon">⚠</div>
            <p className="empty-state-title">MVP collection payload unavailable</p>
            <p className="empty-state-desc">Refresh your session and confirm `/api/me` returns `mvpCollection`.</p>
          </div>
        ) : filteredCollection.length === 0 ? (
          <div className="empty-state collection-empty-state">
            <div className="empty-state-icon">🧩</div>
            <p className="empty-state-title">{search || faction ? "No cards match your filters" : "Your collection is empty"}</p>
            <p className="empty-state-desc">
              {search || faction
                ? "Try a different search or clear the faction filter."
                : isAuthUser
                  ? "Open packs to begin filling your album."
                  : "Open a guest pack to fill this temporary collection."}
            </p>
          </div>
        ) : (
          <div className="collection-content-layout">
            <aside className="collection-progress-panel" aria-label="Progress by faction">
              <h2>Faction completion</h2>
              <div className="collection-progress-list">
                {factionProgress.map((entry) => (
                  <div key={entry.name} className="collection-progress-item">
                    <div className="progress-item-head">
                      <strong>{entry.name}</strong>
                      <span>
                        {entry.owned}/{entry.total}
                      </span>
                    </div>
                    <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={entry.pct}>
                      <div className="progress-fill" style={{ width: `${entry.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            <div>
              {viewMode === "album" && (
                <div className="collection-album-grid">
                  {albumCards.map((item) => (
                    <button
                      key={item.templateId}
                      type="button"
                      className="card-tile-trigger binder-slot binder-slot-filled"
                      onClick={() => setZoomedCard({ card: item.card, quantity: item.instanceCount })}
                    >
                      <MvpCardTile card={item.card} quantity={item.instanceCount} variant="collection" />
                    </button>
                  ))}

                  {Array.from({ length: albumMissingSlots }).map((_, index) => (
                    <div key={`missing-${index}`} className="binder-slot binder-slot-missing" aria-label="Missing card slot">
                      <span className="missing-symbol">?</span>
                      <span>Missing card</span>
                    </div>
                  ))}
                </div>
              )}

              {viewMode === "list" && (
                <div className="collection-list-wrap">
                  <table className="collection-list-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Rarity</th>
                        <th>Edition</th>
                        <th>Acquired</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCollection.map((item) => (
                        <tr key={item.templateId}>
                          <td>
                            <button
                              type="button"
                              className="collection-list-card-link"
                              onClick={() => setZoomedCard({ card: item.card, quantity: item.instanceCount })}
                            >
                              {item.card.displayName}
                            </button>
                          </td>
                          <td>{item.card.rarity}</td>
                          <td>{item.card.setEditionLabel || item.card.edition || "-"}</td>
                          <td>—</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {viewMode === "factions" && (
                <div className="collection-faction-groups">
                  {groupedByFaction.map((group) => (
                    <section key={group.name} className="collection-faction-group">
                      <header>
                        <h3>{group.name}</h3>
                        <span>{group.totalInstances} copies</span>
                      </header>
                      <div className="collection-faction-grid">
                        {group.cards.map((item) => (
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
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <CardZoomModal
        card={zoomedCard.card}
        quantity={zoomedCard.quantity}
        open={Boolean(zoomedCard.card)}
        onClose={() => setZoomedCard({ card: null })}
      />
    </SiteShell>
  );
}
