"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { useSession } from "@/components/useSession";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConnectXCallout } from "@/components/auth/ConnectXCallout";
import { CollectorShowcase } from "@/components/profile/CollectorShowcase";
import { FeaturedCardsStrip } from "@/components/profile/FeaturedCardsStrip";
import { SetCompletionSection } from "@/components/profile/SetCompletionSection";
import { ContestAchievements } from "@/components/profile/ContestAchievements";
import { RecentResults } from "@/components/profile/RecentResults";

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
        return rarityWeight(b.card.rarity) - rarityWeight(a.card.rarity) || b.instanceCount - a.instanceCount;
      })
      .slice(0, 6);
  }, [me?.mvpCollection]);

  const setCompletionRows = useMemo(() => {
    const done = collection?.ownedTemplateCount ?? me?.mvpCollection.length ?? 0;
    const total = Math.max(done + (collection?.missingTemplateCount ?? 0), 1);
    const half = Math.max(1, Math.round(total * 0.5));
    return [
      { label: "Genesis Set", done: Math.min(done, total), total },
      { label: "Arena Set", done: Math.min(Math.round(done * 0.6), half), total: half },
      { label: "Meme Icons", done: Math.min(Math.round(done * 0.4), half), total: half },
    ];
  }, [collection, me?.mvpCollection.length]);

  const recentResults = competitive?.recentResults ?? [];

  const unlockedMilestoneCount = useMemo(
    () => userQuests.filter((quest) => quest.type === "CONTEST_COUNT_MILESTONE" && quest.status === "COMPLETED").length,
    [userQuests],
  );

  const accountBreakdown = account?.progressionBreakdown;
  const spotlightStats = [
    { label: "Player level", value: String(account?.level ?? 1), tone: "primary" },
    { label: "Total points", value: (me?.user.points ?? 0).toLocaleString(), tone: "secondary" },
    { label: "Milestones", value: String(unlockedMilestoneCount), tone: "tertiary" },
    { label: "Competitive rating", value: competitive?.rating ? String(competitive.rating) : "—", tone: "neutral" },
  ];

  return (
    <SiteShell>
      <div className="profile-account-layout">
        {!me ? (
          <>
            <div className="profile-account-hero-grid">
              <CollectorShowcase
                displayName="Guest Collector"
                points={0}
                level={1}
                completionPct={null}
                primaryAction={<ConnectXCallout layout="inline" title="Memedex access" description="Open your real Memedex vault, saved cards, and ownership counts once you connect." ctaLabel="Connect X to open your Memedex" />}
              />

              <section className="profile-spotlight-grid" aria-label="Guest trainer overview">
                {spotlightStats.map((stat) => (
                  <article key={stat.label} className={`profile-spotlight-card tone-${stat.tone}`}>
                    <span>{stat.label}</span>
                    <strong>{stat.value}</strong>
                  </article>
                ))}
              </section>
            </div>

            <div className="profile-account-main-grid">
              <div className="profile-account-main-stack">
                <FeaturedCardsStrip cards={[]} />
                <SetCompletionSection rows={[{ label: "Genesis Set", done: 0, total: 100 }, { label: "Arena Set", done: 0, total: 50 }, { label: "Meme Icons", done: 0, total: 50 }]} />
              </div>
              <div className="profile-account-side-stack">
                <ContestAchievements
                  contestsEntered={0}
                  bestRank={null}
                  rating={null}
                  leagueTier={null}
                  seasonRank={null}
                />
                <EmptyState title="No profile data yet" description="Connect X to start collecting cards, entering contests, and building your public MCG identity." />
              </div>
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

              <section className="profile-spotlight-grid" aria-label="Trainer spotlight metrics">
                {spotlightStats.map((stat) => (
                  <article key={stat.label} className={`profile-spotlight-card tone-${stat.tone}`}>
                    <span>{stat.label}</span>
                    <strong>{stat.value}</strong>
                  </article>
                ))}
                {accountBreakdown ? (
                  <article className="profile-spotlight-card tone-wide">
                    <span>Progress breakdown</span>
                    <div className="profile-breakdown-list">
                      <strong>Points {accountBreakdown.pointsXp.toLocaleString()}</strong>
                      <strong>Competitive {accountBreakdown.competitiveXp.toLocaleString()}</strong>
                      <strong>Collection {accountBreakdown.collectionXp.toLocaleString()}</strong>
                    </div>
                  </article>
                ) : null}
              </section>
            </div>

            <div className="profile-account-main-grid">
              <div className="profile-account-main-stack">
                <FeaturedCardsStrip cards={featuredCards} />
                <SetCompletionSection rows={setCompletionRows} />
                {recentResults.length > 0 ? (
                  <RecentResults results={recentResults} />
                ) : (
                  <EmptyState title="No recent contest results" description="Enter contests to build your competitive history." />
                )}
              </div>

              <div className="profile-account-side-stack">
                <ContestAchievements
                  contestsEntered={competitive?.contestsEntered ?? 0}
                  bestRank={competitive?.bestRank ?? null}
                  rating={competitive?.rating ?? null}
                  leagueTier={competitive?.leagueTier ?? null}
                  seasonRank={competitive?.seasonRank ?? null}
                />

                {unlockedMilestoneCount > 0 ? (
                  <div className="mcg-surface profile-unlocked-strip">
                    <p className="mcg-eyebrow">Milestone badges unlocked</p>
                    <strong>{unlockedMilestoneCount} unlocked</strong>
                    <span>Trainer-card progression keeps your completed contest milestones visible here.</span>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </SiteShell>
  );
}
