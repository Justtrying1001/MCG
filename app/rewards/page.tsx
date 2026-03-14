"use client";

import type { MilestoneType } from "@/lib/domain/quests/social";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { useSession } from "@/components/useSession";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { RewardSpotlight } from "@/components/rewards/RewardSpotlight";
import { RewardCard } from "@/components/rewards/RewardCard";
import { RewardCardGrid } from "@/components/rewards/RewardCardGrid";
import { MilestoneTrack } from "@/components/rewards/MilestoneTrack";
import { getMilestoneObjectiveText, resolveSocialCtaLabelForUserQuest } from "@/lib/domain/quests/social";

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
    milestoneType?: MilestoneType;
    targetValue?: number;
    proofRequired?: boolean;
    targetUrl?: string | null;
    ctaLabel?: string | null;
    instructions?: string | null;
    socialAction?: string | null;
  };
};

type RewardsTab = "social" | "milestones" | "history";
type MilestoneTemplate = { key: string; type: MilestoneType; title: string; targetValue: number; icon: string };

const milestoneCatalog: MilestoneTemplate[] = [
  { key: "PACK_OPEN_COUNT:5", type: "PACK_OPEN_COUNT", title: "Pack Explorer", targetValue: 5, icon: "📦" },
  { key: "TOTAL_CARDS_COLLECTED:50", type: "TOTAL_CARDS_COLLECTED", title: "Collection Starter", targetValue: 50, icon: "🃏" },
  { key: "UNIQUE_CARDS_COLLECTED:20", type: "UNIQUE_CARDS_COLLECTED", title: "Unique Hunter", targetValue: 20, icon: "🧩" },
  { key: "CONTESTS_JOINED:3", type: "CONTESTS_JOINED", title: "Arena Challenger", targetValue: 3, icon: "⚔️" },
  { key: "CONTESTS_TOP3:2", type: "CONTESTS_TOP3", title: "Top 3 Finisher", targetValue: 2, icon: "🥉" },
  { key: "REWARD_POINTS_EARNED:5000", type: "REWARD_POINTS_EARNED", title: "Points Grinder", targetValue: 5000, icon: "✨" },
  { key: "INVITED_FRIENDS:5", type: "INVITED_FRIENDS", title: "Invites Bronze", targetValue: 5, icon: "🥉" },
  { key: "INVITED_FRIENDS:10", type: "INVITED_FRIENDS", title: "Invites Iron", targetValue: 10, icon: "⚙️" },
  { key: "INVITED_FRIENDS:20", type: "INVITED_FRIENDS", title: "Invites Silver", targetValue: 20, icon: "🥈" },
  { key: "INVITED_FRIENDS:50", type: "INVITED_FRIENDS", title: "Invites Gold", targetValue: 50, icon: "🥇" },
  { key: "INVITED_FRIENDS:100", type: "INVITED_FRIENDS", title: "Invites Platinum", targetValue: 100, icon: "💠" },
  { key: "INVITED_FRIENDS:200", type: "INVITED_FRIENDS", title: "Invites Diamond", targetValue: 200, icon: "💎" },
];

function isSocial(q: QuestRow) {
  return q.type === "SOCIAL_FOLLOW_X" || q.type === "SOCIAL_ENGAGEMENT_X";
}
function isMilestone(q: QuestRow) {
  return q.type === "CONTEST_COUNT_MILESTONE";
}

function questTone(q: QuestRow): "open" | "locked" | "live" | "settled" {
  if (q.status === "COMPLETED" || q.latestSubmissionStatus === "APPROVED") return "settled";
  if (q.status === "CLAIMABLE") return "live";
  if (q.latestSubmissionStatus === "SUBMITTED") return "locked";
  return "open";
}

export default function RewardsPage() {
  const { me, loading } = useSession();
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<RewardsTab>("social");
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState("");
  const [clock, setClock] = useState(() => Date.now());
  const [autoPendingByQuest, setAutoPendingByQuest] = useState<Record<string, number>>({});
  const autoTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const loadData = async () => {
    const [lRes, qRes] = await Promise.all([
      fetch("/api/rewards/ledger", { cache: "no-store" }),
      fetch("/api/quests", { cache: "no-store" }),
    ]);
    if (!lRes.ok || !qRes.ok) {
      setError("Cannot load rewards data");
      return;
    }
    const lp = (await lRes.json()) as { entries: LedgerRow[] };
    const qp = (await qRes.json()) as { quests: QuestRow[] };
    setLedger(lp.entries ?? []);
    setQuests(qp.quests ?? []);
  };

  const submitQuest = async (questId: string) => {
    setSubmittingId(questId);
    setActionMsg("");
    const res = await fetch(`/api/quests/${questId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setActionMsg(payload?.error ?? "Quest submission failed");
      setSubmittingId(null);
      return;
    }
    setActionMsg("Quest submitted. Rewards will be applied after review.");
    await loadData();
    setSubmittingId(null);
  };

  const startAutoSocialQuest = (quest: QuestRow) => {
    if (!quest.configSummary.targetUrl || autoTimerRef.current.has(quest.id) || submittingId === quest.id) return;
    window.open(quest.configSummary.targetUrl, "_blank", "noopener,noreferrer");

    const startedAt = Date.now();
    setActionMsg("Action detected. Auto-validation will run in 60 seconds.");
    setAutoPendingByQuest((prev) => ({ ...prev, [quest.id]: startedAt }));

    const timeout = setTimeout(() => {
      autoTimerRef.current.delete(quest.id);
      setAutoPendingByQuest((prev) => {
        const next = { ...prev };
        delete next[quest.id];
        return next;
      });
      void submitQuest(quest.id);
    }, 60_000);

    autoTimerRef.current.set(quest.id, timeout);
  };

  useEffect(() => {
    if (loading || !me || me.mode === "guest") return;
    setError("");
    void loadData();
  }, [loading, me]);

  useEffect(
    () => () => {
      autoTimerRef.current.forEach((timer) => clearTimeout(timer));
      autoTimerRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    if (Object.keys(autoPendingByQuest).length === 0) return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [autoPendingByQuest]);

  const vm = useMemo(() => {
    const social = quests.filter(isSocial);
    const milestones = quests.filter(isMilestone);
    const completed = quests
      .filter((quest) => quest.status === "COMPLETED" || quest.latestSubmissionStatus === "APPROVED")
      .sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime());

    const spotlight = quests.find((quest) => quest.status === "CLAIMABLE") ?? quests.find((quest) => quest.status === "IN_PROGRESS") ?? quests[0] ?? null;

    const milestoneByTypeAndThreshold = new Map<string, QuestRow>();
    milestones.forEach((milestoneQuest) => {
      const type = milestoneQuest.configSummary.milestoneType;
      if (!type) return;
      const key = `${type}:${milestoneQuest.targetValue ?? 0}`;
      milestoneByTypeAndThreshold.set(key, milestoneQuest);
    });

    return { social, milestones, completed, milestoneByTypeAndThreshold, spotlight };
  }, [quests]);

  const currentPoints = me?.mode === "user" ? me.user.points : 0;
  const totalCredits = ledger.filter((e) => e.entryType === "CREDIT").reduce((s, e) => s + e.amount, 0);
  const now = clock;

  const spotlight = vm.spotlight;

  return (
    <SiteShell>
      <SectionHeader
        eyebrow="Rewards"
        title="Progress and Gratification"
        subtitle="Complete quests, unlock milestones, and keep your collectible momentum alive."
      />

      {loading ? <EmptyState title="Loading rewards…" /> : null}
      {!loading && me?.mode === "guest" ? <EmptyState title="Sign in with X to access rewards" /> : null}
      {!loading && me?.mode === "user" && error ? <EmptyState title="Rewards unavailable" description={error} /> : null}

      {!loading && me?.mode === "user" && !error ? (
        <>
          <RewardSpotlight
            title={spotlight?.title ?? "No active rewards"}
            description={spotlight?.description ?? "Complete social quests and milestones to earn points."}
            reward={spotlight ? `+${spotlight.rewardPoints} points` : `${totalCredits} total earned`}
            progress={spotlight ? `${spotlight.progressValue} / ${spotlight.targetValue ?? 1}` : "—"}
            status={spotlight ? questTone(spotlight) : "settled"}
            ctaLabel={spotlight ? (spotlight.validationMode === "AUTO" ? "Start quest" : "Submit proof") : undefined}
            onCta={spotlight ? (() => {
              if (spotlight.validationMode === "AUTO") startAutoSocialQuest(spotlight);
              else void submitQuest(spotlight.id);
            }) : undefined}
            ctaDisabled={!spotlight || submittingId === spotlight.id}
          />

          {actionMsg ? <div className="contest-inline-note">{actionMsg}</div> : null}

          <div className="mcg-surface" style={{ padding: "0.85rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <p className="mcg-eyebrow">Invite Program</p>
              <p className="contest-inline-note">Invite code: <strong>{me.user.inviteCode}</strong> · Friends invited: <strong>{me.user.invitedFriendsCount}</strong></p>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const inviteUrl = `${window.location.origin}/?invite=${encodeURIComponent(me.user.inviteCode)}`;
                void navigator.clipboard.writeText(inviteUrl);
                setActionMsg("Invite link copied to clipboard.");
              }}
            >
              Copy invite link
            </button>
          </div>

          <div className="rewards-tab-row-v2">
            <button type="button" className={`mcg-chip ${tab === "social" ? "selected" : ""}`} onClick={() => setTab("social")}>Social Quests ({vm.social.length})</button>
            <button type="button" className={`mcg-chip ${tab === "milestones" ? "selected" : ""}`} onClick={() => setTab("milestones")}>Milestones ({milestoneCatalog.length})</button>
            <button type="button" className={`mcg-chip ${tab === "history" ? "selected" : ""}`} onClick={() => setTab("history")}>History ({vm.completed.length})</button>
          </div>

          {tab === "social" ? (
            vm.social.length === 0 ? (
              <EmptyState title="No social quests available" />
            ) : (
              <RewardCardGrid>
                {vm.social.map((quest) => {
                  const etaStart = autoPendingByQuest[quest.id];
                  const etaRemainingSec = etaStart ? Math.max(0, Math.ceil((etaStart + 60_000 - now) / 1000)) : null;
                  const ctaLabel = resolveSocialCtaLabelForUserQuest({
                    type: quest.type,
                    configSummary: {
                      ctaLabel: quest.configSummary.ctaLabel ?? null,
                      socialAction: quest.configSummary.socialAction ?? null,
                    },
                  });

                  return (
                    <RewardCard
                      key={quest.id}
                      icon="✦"
                      title={quest.title}
                      description={quest.description ?? "Social quest"}
                      reward={`+${quest.rewardPoints} points`}
                      progressText={etaRemainingSec != null ? `${etaRemainingSec}s auto-check` : `${quest.progressValue} / ${quest.targetValue ?? 1}`}
                      status={questTone(quest)}
                      ctaLabel={quest.status === "COMPLETED" ? "Completed" : ctaLabel}
                      onCta={quest.status === "COMPLETED" ? undefined : (() => {
                        if (quest.validationMode === "AUTO") startAutoSocialQuest(quest);
                        else void submitQuest(quest.id);
                      })}
                      disabled={submittingId === quest.id}
                    />
                  );
                })}
              </RewardCardGrid>
            )
          ) : null}

          {tab === "milestones" ? (
            <MilestoneTrack
              items={milestoneCatalog.map((milestone) => {
                const linkedQuest = vm.milestoneByTypeAndThreshold.get(milestone.key);
                const progressValue = linkedQuest?.progressValue ?? 0;
                const targetValue = linkedQuest?.targetValue ?? milestone.targetValue;
                const done = linkedQuest?.status === "COMPLETED" || progressValue >= targetValue;
                return {
                  key: milestone.key,
                  title: milestone.title,
                  icon: milestone.icon,
                  objective: getMilestoneObjectiveText(milestone.type, targetValue),
                  progressValue,
                  targetValue,
                  done,
                };
              })}
            />
          ) : null}

          {tab === "history" ? (
            <div className="points-history-section-v2 mcg-surface">
              <div className="points-history-head">
                <p className="mcg-eyebrow">Points history</p>
                <p className="contest-inline-note">Balance {currentPoints.toLocaleString()} · Credits earned {totalCredits.toLocaleString()}</p>
              </div>
              <div className="points-history-list-v2">
                {ledger.slice(0, 24).map((entry) => (
                  <div key={entry.id} className="points-history-row-v2">
                    <span>{entry.entryType === "CREDIT" ? "+" : "-"}{entry.amount}</span>
                    <span>{entry.reasonType}</span>
                    <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
                {ledger.length === 0 ? <EmptyState title="No ledger entries yet" /> : null}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </SiteShell>
  );
}
