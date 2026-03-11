"use client";

import { SiteShell } from "@/components/layout/SiteShell";
import { MvpCardTile } from "@/components/ui/MvpCardTile";
import { useSession } from "@/components/useSession";
import { useMemo, useState } from "react";

export default function CollectionPage() {
  const { me } = useSession();
  const [search, setSearch] = useState("");
  const [faction, setFaction] = useState("");

  const isAuthUser = me?.mode === "user";
  const mvpCollection = me?.mvpCollection;
  const useMvpCollection = isAuthUser && Array.isArray(mvpCollection);

  const factions = useMemo(() => {
    if (!me) return [];

    if (isAuthUser) {
      const source = mvpCollection ?? [];
      return [...new Set(source.map((x) => x.card.faction).filter(Boolean) as string[])].sort();
    }

    return [...new Set(me.mvpCollection.map((x) => x.card.faction).filter(Boolean) as string[])].sort();
  }, [isAuthUser, me, mvpCollection]);

  const mvpCards = useMemo(() => {
    if (!isAuthUser) return [];

    return (mvpCollection ?? [])
      .filter((item) => !faction || item.card.faction === faction)
      .filter((item) =>
        `${item.card.displayName} ${item.card.symbol} ${item.card.faction || ""}`.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => a.card.displayName.localeCompare(b.card.displayName));
  }, [faction, isAuthUser, mvpCollection, search]);

  const guestCards = useMemo(() => {
    if (!me || me.mode !== "guest") return [];

    return me.mvpCollection
      .filter((item) => !faction || item.card.faction === faction)
      .filter((item) =>
        `${item.card.displayName} ${item.card.symbol} ${item.card.faction || ""}`.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => a.card.displayName.localeCompare(b.card.displayName));
  }, [me, faction, search]);

  const totalCards = isAuthUser
    ? (mvpCollection ?? []).reduce((acc, x) => acc + x.instanceCount, 0)
    : me?.mvpCollection.reduce((acc, x) => acc + x.instanceCount, 0) ?? 0;
  const uniqueCards = isAuthUser ? (mvpCollection ?? []).length : me?.mvpCollection.length ?? 0;
  const legendaryCount = isAuthUser
    ? (mvpCollection ?? []).filter((x) => x.card.rarity === "LEGENDARY").length
     : me?.mvpCollection.filter((x) => x.card.rarity === "LEGENDARY").length ?? 0;
  const v2Projection = isAuthUser ? me.coexistence?.v2?.collectionProjection : undefined;

  return (
    <SiteShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Collection</h1>
          <p className="page-subtitle">
            Your complete card roster. Filter by faction, search by name, and audit your
            strongest cores with a premium TCG face-front card layout.
          </p>
        </div>
      </div>

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

      {!me ? (
        <div className="empty-state">
          <div className="empty-state-icon">▦</div>
          <p className="empty-state-title">Connect or start guest mode to view your collection</p>
          <p className="empty-state-desc">
            Use X for persistent collection, or guest mode for temporary testing.
          </p>
        </div>
      ) : isAuthUser ? (
        !useMvpCollection ? (
          <div className="empty-state">
            <div className="empty-state-icon">⚠</div>
            <p className="empty-state-title">MVP collection payload unavailable</p>
            <p className="empty-state-desc">
              Auth collection no longer falls back to legacy cards. Refresh your session and verify `/api/me` returns
              `mvpCollection`.
            </p>
          </div>
        ) : mvpCards.length > 0 ? (
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
      ) : guestCards.length > 0 ? (
        <div className="card-grid">
          {guestCards.map((item) => (
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
              : "Open a guest pack to start filling this temporary collection."}
          </p>
        </div>
      )}
    </SiteShell>
  );
}
