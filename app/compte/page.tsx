"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { useSession } from "@/components/useSession";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { ConnectXCallout } from "@/components/auth/ConnectXCallout";
import { CollectorShowcase } from "@/components/profile/CollectorShowcase";
import { FeaturedCardsStrip } from "@/components/profile/FeaturedCardsStrip";
import { ContestAchievements } from "@/components/profile/ContestAchievements";
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
  const tagline = me
    ? completionPct
      ? `${completionPct}% of the Memedex secured. ${competitive?.leagueTier ?? "Unranked"} league energy, collector mindset.`
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
            rankLabel={competitive?.bestRank ? `#${competitive.bestRank}` : "Unranked"}
            leagueLabel={competitive?.leagueTier ?? "Open"}
            prestigeLabel={
              account?.level && account.level >= 25
                ? "Tier III"
                : account?.level && account.level >= 10
                  ? "Tier II"
                  : "Tier I"
            }
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
            <section className="profile-hero-side-stack">
              <section className="profile-stat-bento mcg-surface">
                <div className="profile-section-heading profile-stat-bento__heading">
                  <div>
                    <p className="mcg-eyebrow">Collection stats</p>
                    <h2>Vault overview</h2>
                  </div>
                  <p className="profile-section-caption">Compact collector snapshot inspired by Stitch, adapted to your real vault data.</p>
                </div>
                <div className="profile-stat-bento__grid">
                  <article className="profile-stat-bento__card tone-primary">
                    <span>Total cards owned</span>
                    <strong>{(collection?.totalOwnedInstances ?? 0).toLocaleString()}</strong>
                    <small>Across your Memedex</small>
                  </article>
                  <article className="profile-stat-bento__card tone-secondary">
                    <span>Memedex completion</span>
                    <strong>{completionPct === null ? "—" : `${completionPct}%`}</strong>
                    <small>{(collection?.ownedTemplateCount ?? 0).toLocaleString()} unique templates</small>
                  </article>
                  <article className="profile-stat-bento__card tone-tertiary">
                    <span>Collection XP</span>
                    <strong>{(account?.progressionBreakdown.collectionXp ?? 0).toLocaleString()}</strong>
                    <small>Collector progression</small>
                  </article>
                  <article className="profile-stat-bento__card tone-gold">
                    <span>Milestones unlocked</span>
                    <strong>{unlockedMilestones.length}</strong>
                    <small>Trophies earned</small>
                  </article>
                </div>
              </section>

              <ContestAchievements
                competitiveXp={account?.progressionBreakdown.competitiveXp ?? 0}
                contestsEntered={competitive?.contestsEntered ?? 0}
                contestsWon={competitive?.contestsWon ?? 0}
                bestRank={competitive?.bestRank ?? null}
                averageRank={competitive?.averageRank ?? null}
                rating={competitive?.rating ?? null}
                leagueTier={competitive?.leagueTier ?? null}
              />
            </section>

            <section className="mcg-surface profile-milestones-panel">
              <div className="profile-section-heading">
                <div>
                  <p className="mcg-eyebrow">Unlocked milestones</p>
                  <h2>Trophy cabinet</h2>
                </div>
                <p className="profile-section-caption">Unlocked only, presented like collectibles instead of admin tiles.</p>
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
            <p className="profile-showcase-editor-copy">
              Pick up to 5 cards from your collection to feature on your profile.
            </p>
            <div className="profile-showcase-picker-grid">
              {sortedCollection.map((item) => {
                const selected = selectedTemplateIds.includes(item.templateId);
                const disabled = !selected && selectedTemplateIds.length >= 5;
                return (
                  <button
                    key={item.templateId}
                    type="button"
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
                      <span className="profile-showcase-picker-state">
                        {selected ? "Featured" : disabled ? "Limit reached" : "Add to showcase"}
                      </span>
                      <div className="profile-showcase-picker-card">
                        <span>{item.card.displayName}</span>
                        <strong>{item.card.rarity}</strong>
                        <small>{item.instanceCount} owned</small>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Modal>
      </div>
    </SiteShell>
  );
}
