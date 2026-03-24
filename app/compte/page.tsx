"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { useSession } from "@/components/useSession";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { ConnectXCallout } from "@/components/auth/ConnectXCallout";
import { CollectorShowcase } from "@/components/profile/CollectorShowcase";
import { FeaturedCardsStrip } from "@/components/profile/FeaturedCardsStrip";
import { MvpCardTile } from "@/components/ui/MvpCardTile";
import { SolanaWalletCard } from "@/components/profile/SolanaWalletCard";

type UserQuestRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  completedAt: string | null;
  rewardPoints: number;
  configSummary?: { milestoneType?: string };
};

export default function AccountPage() {
  const { me } = useSession();

  const v2 = me?.mode === "user" ? me.coexistence?.v2 : undefined;
  const account = v2?.accountProgression;
  const collection = v2?.collectionProgression;
  const competitive = v2?.competitiveProgression;

  const [userQuests, setUserQuests] = useState<UserQuestRow[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShowcaseEditing, setIsShowcaseEditing] = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [showcaseNameFilter, setShowcaseNameFilter] = useState("");
  const [showcaseRarityFilter, setShowcaseRarityFilter] = useState("ALL");
  const [showcaseOwnedFilter, setShowcaseOwnedFilter] = useState("ALL");
  const [showcaseSortMode, setShowcaseSortMode] = useState("RARITY");

  useEffect(() => {
    if (me?.mode !== "user") return;
    void (async () => {
      const response = await fetch("/api/quests", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { quests?: UserQuestRow[] };
      setUserQuests(payload.quests ?? []);
    })();
  }, [me]);

  const sortedCollection = useMemo(() => {
    if (!me?.mvpCollection?.length) return [];
    return [...me.mvpCollection].sort((a, b) => {
      const rarityWeight = (value: string) => {
        if (value === "LEGENDARY") return 5;
        if (value === "EPIC") return 4;
        if (value === "RARE") return 3;
        if (value === "UNCOMMON") return 2;
        return 1;
      };
      return (
        rarityWeight(b.card.rarity) - rarityWeight(a.card.rarity) ||
        b.instanceCount - a.instanceCount
      );
    });
  }, [me?.mvpCollection]);

  useEffect(() => {
    if (!sortedCollection.length) {
      setSelectedTemplateIds([]);
      return;
    }
    setSelectedTemplateIds((current) => {
      const available = new Set(sortedCollection.map((item) => item.templateId));
      const preserved = current.filter((id) => available.has(id));
      if (preserved.length > 0) return preserved.slice(0, 5);
      return sortedCollection.slice(0, 5).map((item) => item.templateId);
    });
  }, [sortedCollection]);

  const featuredCards = useMemo(() => {
    if (!sortedCollection.length) return [];
    const selected = selectedTemplateIds
      .map((templateId) =>
        sortedCollection.find((item) => item.templateId === templateId),
      )
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    return selected.slice(0, 5);
  }, [selectedTemplateIds, sortedCollection]);

  const showcaseRarityOptions = useMemo(() => {
    const rarities = Array.from(new Set(sortedCollection.map((item) => item.card.rarity))).sort();
    return ["ALL", ...rarities];
  }, [sortedCollection]);

  const filteredShowcaseCollection = useMemo(() => {
    const nameNeedle = showcaseNameFilter.trim().toLowerCase();
    const rarityWeight = (value: string) => {
      if (value === "LEGENDARY") return 5;
      if (value === "EPIC") return 4;
      if (value === "RARE") return 3;
      if (value === "UNCOMMON") return 2;
      return 1;
    };
    const filtered = sortedCollection.filter((item) => {
      const matchesName = !nameNeedle || item.card.displayName.toLowerCase().includes(nameNeedle);
      const matchesRarity = showcaseRarityFilter === "ALL" || item.card.rarity === showcaseRarityFilter;
      const matchesOwned =
        showcaseOwnedFilter === "ALL"
          ? true
          : showcaseOwnedFilter === "MULTI"
            ? item.instanceCount > 1
            : item.instanceCount === 1;

      return matchesName && matchesRarity && matchesOwned;
    });
    const sorted = [...filtered].sort((a, b) => {
      if (showcaseSortMode === "NAME") {
        return a.card.displayName.localeCompare(b.card.displayName);
      }
      if (showcaseSortMode === "NEWEST") {
        return (b.card.editionNumber ?? b.card.issuedSupply ?? 0) - (a.card.editionNumber ?? a.card.issuedSupply ?? 0);
      }
      if (showcaseSortMode === "EDITION") {
        const editionCompare = (a.card.edition ?? "").localeCompare(b.card.edition ?? "");
        if (editionCompare !== 0) return editionCompare;
        return a.card.displayName.localeCompare(b.card.displayName);
      }
      return (
        rarityWeight(b.card.rarity) - rarityWeight(a.card.rarity) ||
        a.card.displayName.localeCompare(b.card.displayName)
      );
    });
    return sorted;
  }, [showcaseNameFilter, showcaseOwnedFilter, showcaseRarityFilter, showcaseSortMode, sortedCollection]);

  const unlockedMilestones = useMemo(
    () =>
      userQuests.filter(
        (quest) =>
          quest.type === "CONTEST_COUNT_MILESTONE" &&
          quest.status === "COMPLETED",
      ),
    [userQuests],
  );

  const milestoneBadges = useMemo(
    () =>
      unlockedMilestones.map((quest) => ({
        id: quest.id,
        icon:
          quest.type === "CONTEST_COUNT_MILESTONE"
            ? "🏆"
            : quest.type === "SUBMISSION_STREAK"
              ? "🔥"
              : quest.type === "POINTS_MILESTONE"
                ? "⚡"
                : "✨",
        title: quest.title,
        subtitle: quest.rewardPoints
          ? `+${quest.rewardPoints.toLocaleString()} pts`
          : quest.configSummary?.milestoneType ?? "Milestone",
      })),
    [unlockedMilestones],
  );

  const completionPct = collection?.completionPct ?? null;
  const collectionXp = account?.progressionBreakdown.collectionXp ?? null;
  const battlesEnteredLabel =
    competitive && competitive.contestsEntered > 0
      ? competitive.contestsEntered.toLocaleString()
      : "—";
  const bestBattleFinishLabel =
    competitive?.bestRank != null
      ? `#${competitive.bestRank}`
      : "—";
  const tagline = me
    ? completionPct !== null
      ? `${completionPct}% of the Memedex secured with ${collection?.totalOwnedInstances?.toLocaleString() ?? "0"} cards owned and ${unlockedMilestones.length} milestones unlocked.`
      : "Rookie collector building an MCG identity one pull at a time."
    : "Connect to turn this trencher card into your public player identity.";

  return (
    <SiteShell>
      <div className="profile-account-layout stitch-screen stitch-profile-screen">
        <div className="profile-account-shell">
          <CollectorShowcase
            displayName={me?.user.displayName ?? "Guest Collector"}
            title={
              completionPct !== null && completionPct >= 75
                ? "Dex Master"
                : competitive?.rating && competitive.rating >= 1400
                  ? "Arena Climber"
                  : completionPct !== null && completionPct >= 35
                    ? "Collector"
                    : "Rookie Collector"
            }
            trencherId={`${String(account?.level ?? 1).padStart(2, "0")}-${String(me?.user.points ?? 0).slice(-4).padStart(4, "0")}`}
            level={account?.level ?? 1}
            avatarUrl={me?.user.avatarUrl}
            totalPointsLabel={(me?.user.points ?? 0).toLocaleString()}
            completionLabel={completionPct === null ? "—" : `${completionPct}%`}
            cardsOwnedLabel={collection?.totalOwnedInstances?.toLocaleString() ?? "0"}
            collectionXpLabel={collectionXp?.toLocaleString() ?? "0"}
            milestonesUnlockedLabel={unlockedMilestones.length.toLocaleString()}
            battlesEnteredLabel={battlesEnteredLabel}
            bestBattleFinishLabel={bestBattleFinishLabel}
            xpLabel={`${account?.xp?.toLocaleString?.() ?? "0"} / ${account?.levelXpCeil?.toLocaleString?.() ?? "0"} XP`}
            progressPct={Math.max(8, Math.min(100, account?.progressPct ?? 8))}
            tagline={tagline}
            settingsAction={
              me ? (
                <button
                  type="button"
                  className="mcg-btn ghost btn-sm"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  Account settings
                </button>
              ) : undefined
            }
            primaryAction={
              me ? undefined : (
                <ConnectXCallout
                  layout="inline"
                  title="Memedex access"
                  description="Open your real Memedex vault, saved cards, and ownership counts once you connect."
                  ctaLabel="Connect wallet / X to open your Memedex"
                />
              )
            }
          />

          <div className="profile-account-sections">
            <section className="mcg-surface profile-milestones-panel">
              <div className="profile-section-heading">
                <span className="profile-section-chip">Unlocked Milestones</span>
              </div>
              {milestoneBadges.length > 0 ? (
                <div className="profile-milestone-row" aria-label="Unlocked milestones">
                  {milestoneBadges.map((badge) => (
                    <article key={badge.id} className="profile-milestone-badge">
                      <span className="profile-trophy-icon" aria-hidden="true">{badge.icon}</span>
                      <strong>{badge.title}</strong>
                      <small>{badge.subtitle}</small>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={me ? "No milestones unlocked yet" : "Connect to start unlocking milestones"}
                  description={
                    me
                      ? "Enter contests and progress through your player journey to fill this milestone rail."
                      : "Your unlocked milestones will appear here once your profile is active."
                  }
                />
              )}
            </section>

            <FeaturedCardsStrip
              cards={featuredCards}
              action={
                me?.mvpCollection?.length ? (
                  <button
                    type="button"
                    className="mcg-btn ghost btn-sm"
                    onClick={() => setIsShowcaseEditing(true)}
                  >
                    Edit showcase
                  </button>
                ) : null
              }
              emptyState={
                <EmptyState
                  title={me ? "No showcase cards selected" : "No showcase pulls yet"}
                  description={
                    me
                      ? "Open packs and pick up to 5 collection cards to feature in your showcase."
                      : "Connect wallet / X to start building a trencher identity with featured cards."
                  }
                />
              }
            />
          </div>
        </div>

        <Modal
          title="Account settings"
          open={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          className="profile-settings-modal"
          contentClassName="profile-settings-modal-content"
        >
          <SolanaWalletCard />
        </Modal>

        <Modal
          title="Edit showcase"
          open={isShowcaseEditing}
          onClose={() => setIsShowcaseEditing(false)}
          className="profile-showcase-modal"
          contentClassName="profile-showcase-modal-content"
        >
          <div className="profile-showcase-editor">
            <div className="profile-showcase-editor-head">
              <div>
                <h3 className="profile-showcase-editor-title">Edit Showcase</h3>
                <p className="profile-showcase-editor-copy">Tap cards to select or unselect instantly.</p>
                <p className="profile-showcase-editor-status">
                  {selectedTemplateIds.length} / 5 selected
                </p>
              </div>
            </div>

            <div className="profile-showcase-filters" aria-label="Showcase filters">
              <label className="profile-showcase-filter-field">
                <span>Name</span>
                <input
                  type="search"
                  value={showcaseNameFilter}
                  onChange={(event) => setShowcaseNameFilter(event.target.value)}
                  placeholder="Search by card name"
                />
              </label>

              <label className="profile-showcase-filter-field">
                <span>Rarity</span>
                <select
                  value={showcaseRarityFilter}
                  onChange={(event) => setShowcaseRarityFilter(event.target.value)}
                >
                  {showcaseRarityOptions.map((rarity) => (
                    <option key={rarity} value={rarity}>
                      {rarity === "ALL" ? "All rarities" : rarity}
                    </option>
                  ))}
                </select>
              </label>

              <label className="profile-showcase-filter-field">
                <span>Owned</span>
                <select
                  value={showcaseOwnedFilter}
                  onChange={(event) => setShowcaseOwnedFilter(event.target.value)}
                >
                  <option value="ALL">Any ownership</option>
                  <option value="MULTI">2+ copies</option>
                  <option value="SINGLE">1 copy</option>
                </select>
              </label>

              <label className="profile-showcase-filter-field">
                <span>Sort</span>
                <select
                  value={showcaseSortMode}
                  onChange={(event) => setShowcaseSortMode(event.target.value)}
                >
                  <option value="RARITY">Rarity</option>
                  <option value="NAME">Name</option>
                  <option value="NEWEST">Newest</option>
                  <option value="EDITION">Edition</option>
                </select>
              </label>
            </div>

            <div className="profile-showcase-picker-grid" role="list" aria-label="Selectable showcase cards">
              {filteredShowcaseCollection.map((item) => {
                const selected = selectedTemplateIds.includes(item.templateId);
                const disabled = !selected && selectedTemplateIds.length >= 5;
                return (
                  <button
                    key={item.templateId}
                    type="button"
                    aria-pressed={selected}
                    className={`profile-showcase-picker ${selected ? "is-selected" : ""}`}
                    onClick={() => {
                      setSelectedTemplateIds((current) => {
                        if (current.includes(item.templateId)) {
                          return current.filter((id) => id !== item.templateId);
                        }
                        if (current.length >= 5) return current;
                        return [...current, item.templateId];
                      });
                    }}
                    disabled={disabled}
                  >
                    <div className="profile-showcase-picker-frame">
                      <div className="profile-showcase-picker-media">
                        <MvpCardTile card={item.card} quantity={item.instanceCount} variant="canonical" interactive={false} />
                      </div>
                      <div className="profile-showcase-picker-card">
                        <div>
                          <strong>{item.card.displayName}</strong>
                          <span>{item.card.rarity} · {item.card.edition}</span>
                        </div>
                        <small>{item.instanceCount} owned</small>
                      </div>
                    </div>
                    <span className="profile-showcase-picker-state">
                      {selected ? "Selected" : disabled ? "Limit reached" : "Tap to select"}
                    </span>
                  </button>
                );
              })}
            </div>

            {filteredShowcaseCollection.length === 0 ? (
              <EmptyState
                title="No cards match these filters"
                description="Try a different name, rarity, or ownership filter to find cards for your showcase."
              />
            ) : null}
          </div>
        </Modal>
      </div>
    </SiteShell>
  );
}
