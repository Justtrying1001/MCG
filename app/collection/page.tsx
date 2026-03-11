"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { CardFrame } from "@/components/ui/CardFrame";
import { MvpCardTile } from "@/components/ui/MvpCardTile";
import { useSession } from "@/components/useSession";
import { useMemo, useState } from "react";

export default function CollectionPage() {
  const { me } = useSession();
  const [search, setSearch] = useState("");
  const [faction, setFaction] = useState("");

  const mvpCollection = me?.mode === "user" ? me.coexistence?.v2?.mvpCollection : undefined;
  const useMvpCollection = me?.mode === "user" && Array.isArray(mvpCollection);

  const factions = useMemo(() => {
    if (!me) return [];
    if (useMvpCollection) {
      return [...new Set((mvpCollection ?? []).map((x) => x.card.faction).filter(Boolean) as string[])].sort();
    }
    return [...new Set(me.collection.map((x) => x.card.faction).filter(Boolean) as string[])].sort();
  }, [me, mvpCollection, useMvpCollection]);

  const legacyCards = useMemo(() => {
    if (!me || useMvpCollection) return [];
    return me.collection
      .filter((item) => !faction || item.card.faction === faction)
      .filter((item) =>
        `${item.card.name} ${item.card.symbol} ${item.card.faction || ""}`.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => (a.card.marketCapRank ?? 9999) - (b.card.marketCapRank ?? 9999));
  }, [me, faction, search, useMvpCollection]);

  const mvpCards = useMemo(() => {
    if (!useMvpCollection) return [];
    return (mvpCollection ?? [])
      .filter((item) => !faction || item.card.faction === faction)
      .filter((item) =>
        `${item.card.displayName} ${item.card.symbol} ${item.card.faction || ""}`.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => a.card.displayName.localeCompare(b.card.displayName));
  }, [faction, mvpCollection, search, useMvpCollection]);

  const totalCards = useMvpCollection
    ? (mvpCollection ?? []).reduce((acc, x) => acc + x.instanceCount, 0)
    : me?.collection.reduce((acc, x) => acc + x.quantity, 0) ?? 0;
  const uniqueCards = useMvpCollection ? (mvpCollection ?? []).length : me?.collection.length ?? 0;
  const legendaryCount = useMvpCollection
    ? (mvpCollection ?? []).filter((x) => x.card.rarity === "LEGENDARY").length
    : me?.collection.filter((x) => (x.card.marketCapRank ?? 9999) <= 10).length ?? 0;
  const v2Projection = me?.mode === "user" ? me.coexistence?.v2?.collectionProjection : undefined;

  return (
    <SiteShell>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Collection</h1>
          <p className="page-subtitle">
            Your complete card roster. Filter by faction, search by name, and audit your
            strongest cores before entering contests.
          </p>
          {useMvpCollection ? <p className="contest-inline-note">MVP DTO mode enabled (`coexistence.v2.mvpCollection`).</p> : null}
        </div>
      </div>

      {/* Stats strip */}
      {me && (
        <div className="collection-stats">
          <div className="stat-pill">
            <span className="stat-pill-value" style={{ color: "var(--text)" }}>{v2Projection?.totalOwnedInstances ?? totalCards}</span>
            <span className="stat-pill-label">Total cards {v2Projection ? "(v2)" : ""}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-value">{v2Projection?.ownedTemplateCount ?? uniqueCards}</span>
            <span className="stat-pill-label">Unique owned</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-value" style={{ color: "var(--rarity-legendary)" }}>{legendaryCount}</span>
            <span className="stat-pill-label">Legendary</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-value">{v2Projection?.missingTemplateCount ?? factions.length}</span>
            <span className="stat-pill-label">Missing templates</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <input
          className="filter-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, symbol, faction…"
        />
        <select
          className="filter-select"
          value={faction}
          onChange={(e) => setFaction(e.target.value)}
        >
          <option value="">All factions</option>
          {factions.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* Card grid */}
      {!me ? (
        <div className="empty-state">
          <div className="empty-state-icon">▦</div>
          <p className="empty-state-title">Connect or start guest mode to view your collection</p>
          <p className="empty-state-desc">
            Use X for persistent collection, or guest mode for temporary testing.
          </p>
        </div>
      ) : useMvpCollection ? (
        mvpCards.length > 0 ? (
          <div className="card-grid">
            {mvpCards.map((item) => (
              <MvpCardTile key={item.templateId} card={item.card} quantity={item.instanceCount} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">◈</div>
            <p className="empty-state-title">
              {search || faction ? "No cards match your filters" : "Your collection is empty"}
            </p>
            <p className="empty-state-desc">
              {search || faction
                ? "Try adjusting your search or removing the faction filter."
                : "Head to Packs and crack open your first booster to get started."}
            </p>
          </div>
        )
      ) : legacyCards.length > 0 ? (
        <div className="card-grid">
          {legacyCards.map((item) => (
            <CardFrame key={item.baseCardId} card={item.card} quantity={item.quantity} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">◈</div>
          <p className="empty-state-title">
            {search || faction ? "No cards match your filters" : "Your collection is empty"}
          </p>
          <p className="empty-state-desc">
            {search || faction
              ? "Try adjusting your search or removing the faction filter."
              : "Head to Packs and crack open your first booster to get started."}
          </p>
        </div>
      )}
    </SiteShell>
  );
}
