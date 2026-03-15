"use client";

import type { MilestoneType } from "@/lib/domain/quests/social";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { useSession } from "@/components/useSession";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MILESTONE_SEED_DEFINITIONS } from "@/lib/domain/quests/milestone-definitions";
import { getMilestoneObjectiveText, resolveSocialCtaLabelForUserQuest } from "@/lib/domain/quests/social";

type LedgerRow = {
  id: string;
  entryType: "CREDIT" | "DEBIT";
  amount: number;
  reasonType: string;
  reasonRef?: string | null;
  createdAt: string;
};

type QuestStatus = "AVAILABLE" | "IN_PROGRESS" | "CLAIMABLE" | "COMPLETED" | "REJECTED";
type SubmissionStatus = "SUBMITTED" | "APPROVED" | "REJECTED" | null;

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
  completedAt: string | null;
  claimedAt: string | null;
  validationMode: "AUTO" | "SUBMIT" | "MANUAL_REVIEW";
  latestSubmissionStatus: SubmissionStatus;
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

type QuestGroup = { key: string; title: string; quests: QuestRow[] };

function isSocial(quest: QuestRow) {
  return quest.type === "SOCIAL_FOLLOW_X" || quest.type === "SOCIAL_ENGAGEMENT_X";
}

function isMilestone(quest: QuestRow) {
  return quest.type === "CONTEST_COUNT_MILESTONE";
}

function isQuestCompleted(quest: QuestRow) {
  return quest.status === "COMPLETED" || quest.latestSubmissionStatus === "APPROVED";
}

function toStatusTone(status: QuestStatus, latestSubmissionStatus: SubmissionStatus): "open" | "locked" | "live" | "settled" {
  if (status === "COMPLETED" || latestSubmissionStatus === "APPROVED") return "settled";
  if (status === "CLAIMABLE") return "live";
  if (latestSubmissionStatus === "SUBMITTED") return "locked";
  return "open";
}


function getQuestStateLabel(quest: QuestRow) {
  if (quest.latestSubmissionStatus === "SUBMITTED") return "PENDING REVIEW";
  if (quest.latestSubmissionStatus === "REJECTED") return "REJECTED";
  if (isQuestCompleted(quest)) return "COMPLETED";
  if (quest.status === "IN_PROGRESS") return "IN PROGRESS";
  if (quest.status === "CLAIMABLE") return "CLAIMABLE";
  return "AVAILABLE";
}

function isQuestActionable(quest: QuestRow) {
  if (isQuestCompleted(quest)) return false;
  if (quest.latestSubmissionStatus === "SUBMITTED") return true;
  return true;
}

function getGroupKey(quest: QuestRow) {
  if (quest.type === "SOCIAL_FOLLOW_X") return "follow";
  if ((quest.configSummary.socialAction ?? "") === "RETWEET") return "retweet";
  if ((quest.configSummary.socialAction ?? "") === "LIKE") return "like";
  if ((quest.configSummary.socialAction ?? "") === "COMMENT") return "comment";
  return "social";
}

function getGroupTitle(groupKey: string) {
  switch (groupKey) {
    case "follow":
      return "Follow quests";
    case "retweet":
      return "Repost quests";
    case "like":
      return "Like quests";
    case "comment":
      return "Comment quests";
    default:
      return "Social actions";
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function RewardsPage() {
  const { me, loading } = useSession();
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [proofUrlByQuest, setProofUrlByQuest] = useState<Record<string, string>>({});
  const [noteByQuest, setNoteByQuest] = useState<Record<string, string>>({});
  const [clock, setClock] = useState(() => Date.now());
  const [autoPendingByQuest, setAutoPendingByQuest] = useState<Record<string, number>>({});
  const autoTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const loadData = async () => {
    try {
      const [ledgerResponse, questsResponse] = await Promise.all([
        fetch("/api/rewards/ledger", { cache: "no-store" }),
        fetch("/api/quests", { cache: "no-store" }),
      ]);

      if (!ledgerResponse.ok || !questsResponse.ok) {
        const details = [
          !questsResponse.ok ? `/api/quests ${questsResponse.status}` : null,
          !ledgerResponse.ok ? `/api/rewards/ledger ${ledgerResponse.status}` : null,
        ].filter(Boolean).join(" · ");

        setError(details ? `Cannot load rewards data (${details})` : "Cannot load rewards data");
        return;
      }

      const ledgerPayload = (await ledgerResponse.json()) as { entries: LedgerRow[] };
      const questsPayload = (await questsResponse.json()) as { quests: QuestRow[] };

      setLedger(ledgerPayload.entries ?? []);
      setQuests(questsPayload.quests ?? []);
    } catch {
      setError("Cannot load rewards data (network error)");
    }
  };

  const submitQuest = async (quest: QuestRow, mode: "manual" | "auto") => {
    setSubmittingId(quest.id);
    setActionMsg("");

    const proofUrl = proofUrlByQuest[quest.id]?.trim();
    const note = noteByQuest[quest.id]?.trim();

    const response = await fetch(`/api/quests/${quest.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(mode === "manual" ? { proofUrl: proofUrl || undefined, note: note || undefined } : {}),
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setActionMsg(payload?.error ?? "Quest submission failed");
      setSubmittingId(null);
      return;
    }

    setActionMsg(mode === "auto" ? "Quest auto-check submitted." : "Quest proof submitted for validation.");
    await loadData();
    setSubmittingId(null);
  };

  const startAutoSocialQuest = (quest: QuestRow) => {
    if (!quest.configSummary.targetUrl || autoTimerRef.current.has(quest.id) || submittingId === quest.id) return;

    window.open(quest.configSummary.targetUrl, "_blank", "noopener,noreferrer");

    const startedAt = Date.now();
    setActionMsg("Action detected. Auto-validation runs in 60 seconds.");
    setAutoPendingByQuest((previous) => ({ ...previous, [quest.id]: startedAt }));

    const timeout = setTimeout(() => {
      autoTimerRef.current.delete(quest.id);
      setAutoPendingByQuest((previous) => {
        const next = { ...previous };
        delete next[quest.id];
        return next;
      });
      void submitQuest(quest, "auto");
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

  const viewModel = useMemo(() => {
    const socialQuests = quests.filter(isSocial);
    const activeSocialQuests = socialQuests
      .filter((quest) => !isQuestCompleted(quest))
      .sort((left, right) => {
        const leftPending = left.latestSubmissionStatus === "SUBMITTED" ? 0 : 1;
        const rightPending = right.latestSubmissionStatus === "SUBMITTED" ? 0 : 1;
        if (leftPending !== rightPending) return leftPending - rightPending;
        const leftProgress = left.status === "IN_PROGRESS" ? 0 : 1;
        const rightProgress = right.status === "IN_PROGRESS" ? 0 : 1;
        if (leftProgress !== rightProgress) return leftProgress - rightProgress;
        return left.title.localeCompare(right.title);
      });

    const completedSocialQuests = socialQuests
      .filter((quest) => isQuestCompleted(quest))
      .sort((left, right) => new Date(right.completedAt ?? 0).getTime() - new Date(left.completedAt ?? 0).getTime());

    const groupedActive = activeSocialQuests.reduce<Map<string, QuestRow[]>>((accumulator, quest) => {
      const groupKey = getGroupKey(quest);
      const group = accumulator.get(groupKey) ?? [];
      group.push(quest);
      accumulator.set(groupKey, group);
      return accumulator;
    }, new Map());

    const activeSocialGroups: QuestGroup[] = [...groupedActive.entries()].map(([key, groupQuests]) => ({
      key,
      title: getGroupTitle(key),
      quests: groupQuests,
    }));

    const seedByCode = new Map(MILESTONE_SEED_DEFINITIONS.map((definition) => [definition.code, definition] as const));

    const milestoneRows = quests
      .filter(isMilestone)
      .map((quest) => {
        const definition = seedByCode.get(quest.code);
        const targetValue = quest.targetValue ?? quest.configSummary.targetValue ?? definition?.threshold ?? 0;
        return {
          key: quest.id,
          title: quest.title,
          objective: getMilestoneObjectiveText(quest.configSummary.milestoneType, targetValue),
          rewardPoints: quest.rewardPoints,
          progressValue: quest.progressValue,
          targetValue,
          completed: isQuestCompleted(quest),
          completedAt: quest.completedAt,
          sortOrder: definition?.sortOrder ?? Number.MAX_SAFE_INTEGER,
        };
      })
      .sort((left, right) => {
        if (left.completed !== right.completed) return left.completed ? -1 : 1;
        if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
        return left.title.localeCompare(right.title);
      });

    const questById = new Map(quests.map((quest) => [quest.id, quest] as const));

    const ledgerQuestRows = ledger
      .filter((entry) => entry.entryType === "CREDIT" && entry.reasonType === "QUEST_REWARD")
      .map((entry) => {
        const quest = entry.reasonRef ? questById.get(entry.reasonRef) : undefined;
        return {
          id: `ledger-${entry.id}`,
          itemType: quest ? (isMilestone(quest) ? "Milestone" : "Quest") : "Reward",
          title: quest?.title ?? (entry.reasonRef ? `Quest ${entry.reasonRef}` : "Quest reward"),
          statusLabel: "Reward credited",
          points: entry.amount,
          happenedAt: entry.createdAt,
          reasonRef: entry.reasonRef ?? null,
        };
      });

    const ledgerQuestIds = new Set(ledgerQuestRows.map((row) => row.reasonRef).filter(Boolean));

    const fallbackCompletedRows = quests
      .filter((quest) => isQuestCompleted(quest) && !ledgerQuestIds.has(quest.id))
      .map((quest) => ({
        id: `quest-${quest.id}`,
        itemType: isMilestone(quest) ? "Milestone" : "Quest",
        title: quest.title,
        statusLabel: "Completed (awaiting ledger credit)",
        points: quest.rewardPoints,
        happenedAt: quest.claimedAt ?? quest.completedAt,
      }))
      .filter((row) => row.happenedAt);

    const historyRows = [...ledgerQuestRows, ...fallbackCompletedRows]
      .sort((left, right) => new Date(right.happenedAt as string).getTime() - new Date(left.happenedAt as string).getTime());

    return { activeSocialGroups, completedSocialQuests, milestones: milestoneRows, historyRows };
  }, [ledger, quests]);

  const totalCredits = ledger.filter((entry) => entry.entryType === "CREDIT").reduce((sum, entry) => sum + entry.amount, 0);
  const currentPoints = me?.mode === "user" ? me.user.points : 0;

  return (
    <SiteShell>
      <SectionHeader
        eyebrow="Rewards"
        title="Quests, Milestones & History"
        subtitle="Complete actions, unlock milestones, and track every earned reward from real backend data."
      />

      {loading ? <EmptyState title="Loading rewards…" /> : null}
      {!loading && me?.mode === "guest" ? <EmptyState title="Sign in with X to access rewards" /> : null}
      {!loading && me?.mode === "user" && error ? <EmptyState title="Rewards unavailable" description={error} /> : null}

      {!loading && me?.mode === "user" && !error ? (
        <div className="rewards-page-layout-v3">
          <Surface className="rewards-summary-v3" variant="raised">
            <div>
              <p className="mcg-eyebrow">Account rewards summary</p>
              <h2 className="rewards-summary-title-v3">{currentPoints.toLocaleString()} points</h2>
              <p className="contest-inline-note">Total credits earned: {totalCredits.toLocaleString()}</p>
            </div>
            <div className="rewards-summary-actions-v3">
              <p className="contest-inline-note">Invite code: <strong>{me.user.inviteCode}</strong></p>
              <p className="contest-inline-note">Friends invited: <strong>{me.user.invitedFriendsCount}</strong></p>
              <Button
                variant="ghost"
                onClick={() => {
                  const inviteUrl = `${window.location.origin}/?invite=${encodeURIComponent(me.user.inviteCode)}`;
                  void navigator.clipboard.writeText(inviteUrl);
                  setActionMsg("Invite link copied to clipboard.");
                }}
              >
                Copy invite link
              </Button>
            </div>
          </Surface>

          {actionMsg ? <div className="contest-inline-note">{actionMsg}</div> : null}

          <section className="rewards-section-v3">
            <SectionHeader
              eyebrow="1. Quests"
              title="Do-to-earn"
              subtitle="Social quests are grouped by action so each task is easy to understand and execute."
            />

            {viewModel.activeSocialGroups.length === 0 ? <EmptyState title="No active social quests" description="All current social quests are completed. Check History for earned rewards." /> : null}

            {viewModel.activeSocialGroups.map((group) => (
              <Surface key={group.key} className="rewards-quest-group-v3">
                <div className="rewards-quest-group-head-v3">
                  <h3>{group.title}</h3>
                  <span className="mcg-chip">{group.quests.length} quest(s)</span>
                </div>
                <div className="rewards-quest-grid-v3">
                  {group.quests.map((quest) => {
                    const etaStart = autoPendingByQuest[quest.id];
                    const etaRemainingSec = etaStart ? Math.max(0, Math.ceil((etaStart + 60_000 - clock) / 1000)) : null;
                    const isCompleted = isQuestCompleted(quest);
                    const proofRequired = Boolean(quest.configSummary.proofRequired && quest.validationMode !== "AUTO");
                    const isPendingReview = quest.latestSubmissionStatus === "SUBMITTED";
                    const statusTone = toStatusTone(quest.status, quest.latestSubmissionStatus);
                    const ctaLabel = resolveSocialCtaLabelForUserQuest({
                      type: quest.type,
                      configSummary: {
                        ctaLabel: quest.configSummary.ctaLabel ?? null,
                        socialAction: quest.configSummary.socialAction ?? null,
                      },
                    });

                    return (
                      <article key={quest.id} className={`rewards-quest-card-v3${isQuestActionable(quest) ? "" : " completed"}`}>
                        <div className="rewards-quest-card-head-v3">
                          <div>
                            <p className="mcg-eyebrow">{quest.type === "SOCIAL_FOLLOW_X" ? "Follow" : "Engagement"}</p>
                            <h4>{quest.title}</h4>
                          </div>
                          <StatusBadge tone={statusTone} label={getQuestStateLabel(quest)} />
                        </div>
                        <p className="contest-inline-note">{quest.description ?? "Social quest"}</p>
                        {quest.configSummary.instructions ? <p className="contest-inline-note">{quest.configSummary.instructions}</p> : null}

                        <div className="rewards-quest-meta-v3">
                          <span className="mcg-chip">{quest.rewardPoints > 0 ? `+${quest.rewardPoints} points` : "No points reward"}</span>
                          <span className="mcg-chip">{etaRemainingSec != null ? `${etaRemainingSec}s auto-check` : `${quest.progressValue}/${quest.targetValue ?? 1}`}</span>
                        </div>

                        {isCompleted ? (
                          <p className="contest-inline-note">Completed on {formatDate(quest.completedAt)}</p>
                        ) : isPendingReview ? (
                          <p className="contest-inline-note">Submission pending review. You cannot submit again until moderation decision.</p>
                        ) : (
                          <div className="rewards-quest-actions-v3">
                            {quest.validationMode === "AUTO" ? (
                              <>
                                <Button
                                  variant="ghost"
                                  disabled={submittingId === quest.id || !quest.configSummary.targetUrl}
                                  onClick={() => startAutoSocialQuest(quest)}
                                >
                                  {ctaLabel}
                                </Button>
                                {!quest.configSummary.targetUrl ? <p className="contest-inline-note">Target URL unavailable for this quest.</p> : null}
                              </>
                            ) : (
                              <>
                                <input
                                  className="input"
                                  placeholder={proofRequired ? "Proof URL (required)" : "Proof URL (optional)"}
                                  value={proofUrlByQuest[quest.id] ?? ""}
                                  onChange={(event) => setProofUrlByQuest((previous) => ({ ...previous, [quest.id]: event.target.value }))}
                                />
                                <textarea
                                  className="input"
                                  rows={2}
                                  placeholder="Note for moderation (optional)"
                                  value={noteByQuest[quest.id] ?? ""}
                                  onChange={(event) => setNoteByQuest((previous) => ({ ...previous, [quest.id]: event.target.value }))}
                                />
                                <Button
                                  variant="ghost"
                                  disabled={submittingId === quest.id || (proofRequired && !(proofUrlByQuest[quest.id] ?? "").trim())}
                                  onClick={() => {
                                    void submitQuest(quest, "manual");
                                  }}
                                >
                                  Submit proof
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </Surface>
            ))}
          </section>

          {viewModel.completedSocialQuests.length > 0 ? (
            <section className="rewards-section-v3">
              <SectionHeader
                eyebrow="Completed quests"
                title="Already done"
                subtitle="Completed social quests are moved out of the active list and kept here as a secondary, muted section."
              />
              <Surface className="rewards-completed-wrap-v3">
                <div className="rewards-completed-grid-v3">
                  {viewModel.completedSocialQuests.map((quest) => (
                    <article key={quest.id} className="rewards-quest-card-v3 completed">
                      <div className="rewards-quest-card-head-v3">
                        <div>
                          <p className="mcg-eyebrow">{quest.type === "SOCIAL_FOLLOW_X" ? "Follow" : "Engagement"}</p>
                          <h4>{quest.title}</h4>
                        </div>
                        <StatusBadge tone="settled" label="COMPLETED" />
                      </div>
                      <p className="contest-inline-note">{quest.description ?? "Social quest"}</p>
                      <div className="rewards-quest-meta-v3">
                        <span className="mcg-chip">{quest.rewardPoints > 0 ? `+${quest.rewardPoints} points` : "No points reward"}</span>
                        <span className="mcg-chip">Completed {formatDate(quest.completedAt)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </Surface>
            </section>
          ) : null}

          <section className="rewards-section-v3">
            <SectionHeader
              eyebrow="2. Milestones"
              title="Progress milestones"
              subtitle="Completed milestones are highlighted first. Remaining milestones stay visible but muted."
            />
            <Surface>
              <div className="rewards-milestone-grid-v3">
                {viewModel.milestones.map((milestone) => {
                  const progressPct = Math.min(100, Math.round((milestone.progressValue / Math.max(1, milestone.targetValue)) * 100));
                  return (
                    <article key={milestone.key} className={`rewards-milestone-card-v3${milestone.completed ? " completed" : " muted"}`}>
                      <div className="rewards-milestone-head-v3">
                        <h4>{milestone.title}</h4>
                        <StatusBadge tone={milestone.completed ? "settled" : "locked"} label={milestone.completed ? "DONE" : "LOCKED"} />
                      </div>
                      <p className="contest-inline-note">{milestone.objective}</p>
                      <div className="rewards-milestone-bar-v3"><span style={{ width: `${progressPct}%` }} /></div>
                      <div className="rewards-milestone-meta-v3">
                        <span className="mcg-chip">{milestone.progressValue}/{milestone.targetValue}</span>
                        <span className="mcg-chip">+{milestone.rewardPoints} points</span>
                      </div>
                      <p className="contest-inline-note">{milestone.completed ? `Completed on ${formatDate(milestone.completedAt)}` : "Not completed yet"}</p>
                    </article>
                  );
                })}
              </div>
            </Surface>
          </section>

          <section className="rewards-section-v3">
            <SectionHeader
              eyebrow="3. History"
              title="Validated rewards history"
              subtitle="Chronological timeline of completed quests and milestones tied to real reward events."
            />
            <Surface>
              {viewModel.historyRows.length === 0 ? (
                <EmptyState title="No completed rewards yet" description="Complete quests or milestones to populate this timeline." />
              ) : (
                <div className="rewards-history-list-v3">
                  {viewModel.historyRows.map((row) => (
                    <div key={row.id} className="rewards-history-row-v3">
                      <div>
                        <p className="mcg-eyebrow">{row.itemType}</p>
                        <strong>{row.title}</strong>
                        <p className="contest-inline-note">{row.statusLabel}</p>
                      </div>
                      <div className="rewards-history-points-v3">+{row.points}</div>
                      <div className="contest-inline-note">{formatDate(row.happenedAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </Surface>
          </section>
        </div>
      ) : null}
    </SiteShell>
  );
}
