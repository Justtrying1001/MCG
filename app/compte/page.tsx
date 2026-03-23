"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { useSession } from "@/components/useSession";
import { EmptyState } from "@/components/ui/EmptyState";
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

  useEffect(() => {
    if (me?.mode !== "user") return;
    void (async () => {
      const response = await fetch("/api/quests", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { quests?: UserQuestRow[] };
      setUserQuests(payload.quests ?? []);
    })();
  }, [me]);

  const featuredCards = useMemo(() => {
    if (!me?.mvpCollection?.length) return [];
    return [...me.mvpCollection]
      .sort((a, b) => {
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
      })
      .slice(0, 6);
  }, [me?.mvpCollection]);

  const unlockedMilestoneCount = useMemo(
    () =>
      userQuests.filter(
        (quest) =>
          quest.type === "CONTEST_COUNT_MILESTONE" &&
          quest.status === "COMPLETED",
      ).length,
    [userQuests],
  );

  const accountBreakdown = account?.progressionBreakdown;
  const trophyBadges = useMemo(() => {
    const completedMilestones = userQuests
      .filter((quest) => quest.status === "COMPLETED")
      .slice(0, 6);

    return completedMilestones.map((quest, index) => ({
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
      locked: false,
    }));
  }, [userQuests]);

  const guestTrophyBadges = [
    { id: "guest-1", icon: "🏆", title: "First Arena", subtitle: "Battle debut", locked: true },
    { id: "guest-2", icon: "⚡", title: "Point Surge", subtitle: "Score streak", locked: true },
    { id: "guest-3", icon: "✨", title: "Collector Rise", subtitle: "Collection milestone", locked: true },
  ];

  const spotlightStats = [
    {
      label: "Player level",
      value: String(account?.level ?? 1),
      tone: "primary",
    },
    {
      label: "Total points",
      value: (me?.user.points ?? 0).toLocaleString(),
      tone: "secondary",
    },
    {
      label: "Milestones",
      value: String(unlockedMilestoneCount),
      tone: "tertiary",
    },
    {
      label: "Competitive rating",
      value: competitive?.rating ? String(competitive.rating) : "—",
      tone: "neutral",
    },
  ];

  const statsPanel = (
    <section
      className="profile-spotlight-panel"
      aria-label={me ? "Trainer spotlight metrics" : "Guest trainer overview"}
    >
      <div className="profile-spotlight-heading">
        <p className="mcg-eyebrow">Trainer stats</p>
        <h2>Prestige at a glance</h2>
      </div>
      <div className="profile-spotlight-grid">
        {spotlightStats.map((stat) => (
          <article
            key={stat.label}
            className={`profile-spotlight-card tone-${stat.tone}`}
          >
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>
      {accountBreakdown ? (
        <div className="profile-spotlight-footer">
          <span>Progress mix</span>
          <strong>
            {accountBreakdown.pointsXp.toLocaleString()} pts ·{" "}
            {accountBreakdown.competitiveXp.toLocaleString()} comp ·{" "}
            {accountBreakdown.collectionXp.toLocaleString()} collection
          </strong>
        </div>
      ) : null}
    </section>
  );

  return (
    <SiteShell>
      <div className="profile-account-layout stitch-screen stitch-profile-screen">
        {!me ? (
          <>
            <div className="profile-account-hero-grid">
              <CollectorShowcase
                displayName="Guest Collector"
                points={0}
                level={1}
                completionPct={null}
                primaryAction={
                  <ConnectXCallout
                    layout="inline"
                    title="Memedex access"
                    description="Open your real Memedex vault, saved cards, and ownership counts once you connect."
                    ctaLabel="Connect wallet / X to open your Memedex"
                  />
                }
              />
              {statsPanel}
            </div>

            <div className="profile-account-sections">
              <section className="mcg-surface profile-trophy-panel">
                <div className="profile-section-heading">
                  <p className="mcg-eyebrow">Achievements</p>
                  <h2>Trophy case</h2>
                </div>
                <div className="profile-trophy-row" aria-label="Trainer achievements">
                  {guestTrophyBadges.map((badge) => (
                    <article
                      key={badge.id}
                      className={`profile-trophy-badge ${badge.locked ? "is-locked" : ""}`}
                    >
                      <span className="profile-trophy-icon" aria-hidden="true">{badge.icon}</span>
                      <strong>{badge.title}</strong>
                      <small>{badge.subtitle}</small>
                    </article>
                  ))}
                </div>
              </section>

              <FeaturedCardsStrip
                cards={[]}
                emptyState={
                  <EmptyState
                    title="No showcase pulls yet"
                    description="Connect wallet / X to start building a trainer identity with featured cards."
                  />
                }
              />

              <ContestAchievements
                contestsEntered={0}
                bestRank={null}
                rating={null}
                leagueTier={null}
                seasonRank={null}
              />

              <section className="profile-settings-shell">
                <EmptyState
                  title="No profile data yet"
                  description="Connect wallet / X to start collecting cards, entering battles, and building your public MCG identity."
                />
              </section>
            </div>
          </>
        ) : (
          <>
            <div className="profile-account-hero-grid">
              <CollectorShowcase
                displayName={me.user.displayName}
                points={me.user.points}
                level={account?.level ?? 1}
                completionPct={collection?.completionPct ?? null}
              />
              {statsPanel}
            </div>

            <div className="profile-account-sections">
              <section className="mcg-surface profile-trophy-panel">
                <div className="profile-section-heading">
                  <p className="mcg-eyebrow">Achievements</p>
                  <h2>Trophy case</h2>
                </div>
                {trophyBadges.length > 0 ? (
                  <div className="profile-trophy-row" aria-label="Trainer achievements">
                    {trophyBadges.map((badge) => (
                      <article key={badge.id} className="profile-trophy-badge">
                        <span className="profile-trophy-icon" aria-hidden="true">{badge.icon}</span>
                        <strong>{badge.title}</strong>
                        <small>{badge.subtitle}</small>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No trophies unlocked yet"
                    description="Complete milestones and battles to start filling your trainer trophy case."
                  />
                )}
              </section>

              <FeaturedCardsStrip
                cards={featuredCards}
                emptyState={
                  <EmptyState
                    title="No showcase pulls yet"
                    description="Open packs and collect standout cards to feature them here."
                  />
                }
              />

              <ContestAchievements
                contestsEntered={competitive?.contestsEntered ?? 0}
                bestRank={competitive?.bestRank ?? null}
                rating={competitive?.rating ?? null}
                leagueTier={competitive?.leagueTier ?? null}
                seasonRank={competitive?.seasonRank ?? null}
              />

              <div className="profile-settings-shell">
                <SolanaWalletCard />
              </div>
            </div>
          </>
        )}
      </div>
    </SiteShell>
  );
}
