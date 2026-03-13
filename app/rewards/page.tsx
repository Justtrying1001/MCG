"use client";

import { useEffect, useMemo, useState } from "react";

import { MilestoneQuestCard } from "@/components/quests/MilestoneQuestCard";
import { SocialQuestCard } from "@/components/quests/SocialQuestCard";
import { SiteShell } from "@/components/layout/SiteShell";
import { useSession } from "@/components/useSession";

import styles from "./rewards.module.css";

type LedgerRow = {
  id: string;
  entryType: "CREDIT" | "DEBIT";
  amount: number;
  reasonType: string;
  createdAt: string;
};

type QuestStatus = "AVAILABLE" | "IN_PROGRESS" | "CLAIMABLE" | "COMPLETED" | "REJECTED";

type QuestRow = {
  id: string;
  code: string;
  type: "WELCOME" | "SOCIAL_FOLLOW_X" | "SOCIAL_ENGAGEMENT_X" | "CONTEST_COUNT_MILESTONE" | "MANUAL";
  title: string;
  description: string | null;
  rewardPoints: number;
  status: QuestStatus;
  progressValue: number;
  targetValue: number | null;
  isActive: boolean;
  completedAt: string | null;
  validationMode: "AUTO" | "SUBMIT" | "MANUAL_REVIEW";
  latestSubmissionStatus: "SUBMITTED" | "APPROVED" | "REJECTED" | null;
  configSummary: {
    milestoneType?: "PACK_OPEN_COUNT" | "CONTEST_PARTICIPATION_COUNT" | "CARD_COLLECTION_COUNT";
    targetValue?: number;
    proofRequired?: boolean;
    targetUrl?: string | null;
    ctaLabel?: string | null;
    instructions?: string | null;
    socialAction?: string | null;
  };
};

function isSocialQuest(quest: QuestRow) {
  return quest.type === "SOCIAL_FOLLOW_X" || quest.type === "SOCIAL_ENGAGEMENT_X";
}

function isMilestoneQuest(quest: QuestRow) {
  return quest.type === "CONTEST_COUNT_MILESTONE";
}

function applyStatusFilter(rows: QuestRow[], statusFilter: "ALL" | QuestStatus) {
  if (statusFilter === "ALL") return rows;
  return rows.filter((row) => row.status === statusFilter);
}

function applySort(rows: QuestRow[], sortBy: "REWARD_DESC" | "REWARD_ASC" | "RECENT") {
  const copy = [...rows];
  if (sortBy === "REWARD_DESC") return copy.sort((a, b) => b.rewardPoints - a.rewardPoints);
  if (sortBy === "REWARD_ASC") return copy.sort((a, b) => a.rewardPoints - b.rewardPoints);
  return copy.sort((a, b) => b.code.localeCompare(a.code));
}

export default function RewardsPage() {
  const { me, loading } = useSession();
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | QuestStatus>("ALL");
  const [sortBy, setSortBy] = useState<"REWARD_DESC" | "REWARD_ASC" | "RECENT">("REWARD_DESC");

  const loadData = async () => {
    const [ledgerRes, questsRes] = await Promise.all([
      fetch("/api/rewards/ledger", { cache: "no-store" }),
      fetch("/api/quests", { cache: "no-store" }),
    ]);

    if (!ledgerRes.ok || !questsRes.ok) {
      setError("Cannot load rewards data");
      return;
    }

    const ledgerPayload = (await ledgerRes.json()) as { entries: LedgerRow[] };
    const questsPayload = (await questsRes.json()) as { quests: QuestRow[] };

    setLedger(ledgerPayload.entries ?? []);
    setQuests(questsPayload.quests ?? []);
  };

  useEffect(() => {
    if (loading || !me || me.mode === "guest") return;

    setError("");
    void loadData();
  }, [loading, me]);

  const viewModel = useMemo(() => {
    const social = quests.filter(isSocialQuest);
    const milestones = quests.filter(isMilestoneQuest);
    const underReview = quests.filter((quest) => quest.latestSubmissionStatus === "SUBMITTED");
    const completed = quests.filter((quest) => quest.status === "COMPLETED" || quest.latestSubmissionStatus === "APPROVED");

    const filteredSocial = applySort(applyStatusFilter(social, statusFilter), sortBy);
    const filteredMilestones = applySort(applyStatusFilter(milestones, statusFilter), sortBy);

    return { social: filteredSocial, milestones: filteredMilestones, completed, underReview };
  }, [quests, statusFilter, sortBy]);

  return (
    <SiteShell>
      <div className={`page-header ${styles.hero}`}>
        <div>
          <h1 className="page-title">Rewards & Quests</h1>
          <p className="page-subtitle">Complete social actions and milestones to progress your account rewards.</p>
        </div>
      </div>

      {loading ? <p className="contest-inline-note">Loading session…</p> : null}
      {!loading && !me ? <div className="empty-state"><p className="empty-state-title">Sign in with X to access rewards.</p></div> : null}
      {me?.mode === "guest" ? <div className="empty-state"><p className="empty-state-title">Rewards and quests are available for authenticated accounts only.</p></div> : null}
      {error ? <p className="contest-error">{error}</p> : null}

      {me?.mode === "user" ? (
        <div className={styles.layout}>
          <section className="contest-section">
            <h2 className="contest-section-title">Quest filters</h2>
            <div className={styles.controls}>
              <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | QuestStatus)}>
                <option value="ALL">All statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="CLAIMABLE">Claimable</option>
                <option value="COMPLETED">Completed</option>
              </select>
              <select className="input" value={sortBy} onChange={(event) => setSortBy(event.target.value as "REWARD_DESC" | "REWARD_ASC" | "RECENT")}>
                <option value="REWARD_DESC">Sort: reward high → low</option>
                <option value="REWARD_ASC">Sort: reward low → high</option>
                <option value="RECENT">Sort: latest code first</option>
              </select>
            </div>
          </section>

          <section className="contest-section">
            <h2 className="contest-section-title">Social quests</h2>
            <div className={styles.cards}>
              {viewModel.social.length === 0 ? <p className="contest-inline-note">No social quests for current filters.</p> : null}
              {viewModel.social.map((quest) => <SocialQuestCard key={quest.id} quest={quest} />)}
            </div>
          </section>

          <section className="contest-section">
            <h2 className="contest-section-title">Milestones</h2>
            <div className={styles.cards}>
              {viewModel.milestones.length === 0 ? <p className="contest-inline-note">No milestones for current filters.</p> : null}
              {viewModel.milestones.map((quest) => <MilestoneQuestCard key={quest.id} quest={quest} />)}
            </div>
          </section>

          {viewModel.underReview.length > 0 ? (
            <section className="contest-section">
              <h2 className="contest-section-title">Under review</h2>
              <p className="contest-inline-note">{viewModel.underReview.length} submissions are currently under review by moderators.</p>
            </section>
          ) : null}

          {viewModel.completed.length > 0 ? (
            <section className="contest-section">
              <h2 className="contest-section-title">Completed</h2>
              <p className="contest-inline-note">{viewModel.completed.length} quests completed.</p>
            </section>
          ) : null}

          <section className="contest-section">
            <h2 className="contest-section-title">Points history</h2>
            {ledger.length === 0 ? (
              <p className="contest-inline-note">No point movements yet.</p>
            ) : (
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {ledger.map((entry) => (
                  <div key={entry.id} className="contest-ranking-row" style={{ gridTemplateColumns: "1fr auto auto" }}>
                    <span>{entry.reasonType}</span>
                    <span style={{ color: entry.entryType === "CREDIT" ? "var(--emerald)" : "var(--red)" }}>
                      {entry.entryType === "CREDIT" ? "+" : "-"}{entry.amount}
                    </span>
                    <span>{new Date(entry.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </SiteShell>
  );
}
