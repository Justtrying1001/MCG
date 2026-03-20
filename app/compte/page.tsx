"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { useSession } from "@/components/useSession";
import { EmptyState } from "@/components/ui/EmptyState";
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

  const completedQuests = userQuests.filter((quest) => quest.status === "COMPLETED").length;
  const pendingRewards = userQuests.filter((quest) => quest.status === "CLAIMABLE" || quest.status === "IN_PROGRESS").length;

  return (
    <SiteShell>
      {!me ? (
        <EmptyState title="Sign in to open your collector profile" description="Connect with X to load persistent progression and contest identity." />
      ) : (
        <div className="profile-page-shell">
          <CollectorShowcase
            displayName={me.user.displayName}
            points={me.user.points}
            level={account?.level ?? 1}
            completionPct={collection?.completionPct ?? null}
          />

          <section className="profile-stats-grid">
            <div className="profile-stat-panel">
              <span className="mcg-eyebrow">Collection</span>
              <strong>{collection?.ownedTemplateCount ?? me.mvpCollection.length}</strong>
              <p className="contest-inline-note">Cards currently tracked across your repository.</p>
            </div>
            <div className="profile-stat-panel">
              <span className="mcg-eyebrow">Rewards</span>
              <strong>{completedQuests}</strong>
              <p className="contest-inline-note">Completed quests and milestones currently settled on your account.</p>
            </div>
            <div className="profile-stat-panel">
              <span className="mcg-eyebrow">Activity</span>
              <strong>{competitive?.contestsEntered ?? 0}</strong>
              <p className="contest-inline-note">Contests entered across your current progression history.</p>
            </div>
          </section>

          <section className="profile-content-grid">
            <div className="profile-main-column">
              <FeaturedCardsStrip cards={featuredCards} />
              <SetCompletionSection rows={setCompletionRows} />
            </div>

            <div className="profile-side-column">
              <div className="mcg-surface raised profile-summary-panel">
                <div className="profile-summary-header">
                  <span className="mcg-eyebrow">Rewards summary</span>
                  <h2 className="profile-summary-title">Quest and milestone status</h2>
                </div>
                <div className="profile-summary-stats">
                  <div className="profile-summary-stat">
                    <span>Completed</span>
                    <strong>{completedQuests}</strong>
                  </div>
                  <div className="profile-summary-stat">
                    <span>Pending</span>
                    <strong>{pendingRewards}</strong>
                  </div>
                  <div className="profile-summary-stat">
                    <span>Unlocked milestones</span>
                    <strong>{unlockedMilestoneCount}</strong>
                  </div>
                </div>
              </div>

              <ContestAchievements
                contestsEntered={competitive?.contestsEntered ?? 0}
                bestRank={competitive?.bestRank ?? null}
                rating={competitive?.rating ?? null}
                leagueTier={competitive?.leagueTier ?? null}
                seasonRank={competitive?.seasonRank ?? null}
              />
            </div>
          </section>

          {recentResults.length > 0 ? (
            <RecentResults results={recentResults} />
          ) : (
            <EmptyState title="No recent contest results" description="Enter contests to build your competitive history." />
          )}
        </div>
      )}
    </SiteShell>
  );
}
