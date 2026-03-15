"use client";

import type { MilestoneType } from "@/lib/domain/quests/social";
import { useEffect, useMemo, useRef, useState } from "react";

import { SiteShell } from "@/components/layout/SiteShell";
import { useSession } from "@/components/useSession";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Surface } from "@/components/ui/Surface";

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

type HistoryRow = {
  id: string;
  title: string;
  itemType: "Quest" | "Milestone" | "Reward";
  statusLabel: string;
  points: number;
  happenedAt: string;
  dedupeKey: string;
};

function isSocial(quest: QuestRow) {
  return quest.type === "SOCIAL_FOLLOW_X" || quest.type === "SOCIAL_ENGAGEMENT_X";
}

function isMilestone(quest: QuestRow) {
  return quest.type === "CONTEST_COUNT_MILESTONE";
}

function isQuestCompleted(quest: QuestRow) {
  return quest.status === "COMPLETED" || quest.latestSubmissionStatus === "APPROVED";
}

function getQuestState(quest: QuestRow) {
  if (quest.latestSubmissionStatus === "SUBMITTED") return "PENDING_REVIEW" as const;
  if (quest.latestSubmissionStatus === "REJECTED" || quest.status === "REJECTED") return "REJECTED" as const;
  if (isQuestCompleted(quest)) {
    if (quest.claimedAt) return "CLAIMED_SETTLED" as const;
    return "COMPLETED" as const;
  }
  if (quest.status === "IN_PROGRESS") return "IN_PROGRESS" as const;
  return "OPEN" as const;
}

function toStatusTone(state: ReturnType<typeof getQuestState>): "open" | "locked" | "live" | "settled" {
  if (state === "CLAIMED_SETTLED" || state === "COMPLETED") return "settled";
  if (state === "PENDING_REVIEW") return "locked";
  if (state === "IN_PROGRESS") return "live";
  if (state === "REJECTED") return "locked";
  return "open";
}

function getStatusLabel(state: ReturnType<typeof getQuestState>) {
  if (state === "PENDING_REVIEW") return "PENDING REVIEW";
  if (state === "IN_PROGRESS") return "IN PROGRESS";
  if (state === "COMPLETED") return "COMPLETED";
  if (state === "CLAIMED_SETTLED") return "SETTLED";
  if (state === "REJECTED") return "REJECTED";
  return "OPEN";
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
  const [questsError, setQuestsError] = useState("");
  const [ledgerError, setLedgerError] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [proofUrlByQuest, setProofUrlByQuest] = useState<Record<string, string>>({});
  const [noteByQuest, setNoteByQuest] = useState<Record<string, string>>({});
  const [clock, setClock] = useState(() => Date.now());
  const [autoPendingByQuest, setAutoPendingByQuest] = useState<Record<string, number>>({});

  const autoTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const loadData = async () => {
    setLoadingData(true);
    setQuestsError("");
    setLedgerError("");

    try {
      const [questsResult, ledgerResult] = await Promise.allSettled([
        fetch("/api/quests", { cache: "no-store" }),
        fetch("/api/rewards/ledger", { cache: "no-store" }),
      ]);

      if (questsResult.status === "rejected") {
        setQuests([]);
        setQuestsError("Cannot load quests data (network error)");
      } else if (!questsResult.value.ok) {
        setQuests([]);
        setQuestsError(`Cannot load quests data (/api/quests ${questsResult.value.status})`);
      } else {
        const payload = (await questsResult.value.json()) as { quests?: QuestRow[] };
        setQuests(payload.quests ?? []);
      }

      if (ledgerResult.status === "rejected") {
        setLedger([]);
        setLedgerError("Cannot load rewards ledger (network error)");
      } else if (!ledgerResult.value.ok) {
        setLedger([]);
        setLedgerError(`Cannot load rewards ledger (/api/rewards/ledger ${ledgerResult.value.status})`);
      } else {
        const payload = (await ledgerResult.value.json()) as { entries?: LedgerRow[] };
        setLedger(payload.entries ?? []);
      }
    } catch {
      setQuests([]);
      setLedger([]);
      setQuestsError("Cannot load quests data (unexpected error)");
      setLedgerError("Cannot load rewards ledger (unexpected error)");
    } finally {
      setLoadingData(false);
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
      .filter((quest) => {
        const state = getQuestState(quest);
        return state !== "COMPLETED" && state !== "CLAIMED_SETTLED";
      })
      .sort((left, right) => {
        const rank = (quest: QuestRow) => {
          const state = getQuestState(quest);
          if (state === "IN_PROGRESS") return 0;
          if (state === "OPEN") return 1;
          if (state === "PENDING_REVIEW") return 2;
          if (state === "REJECTED") return 3;
          return 4;
        };

        const delta = rank(left) - rank(right);
        if (delta !== 0) return delta;
        return left.title.localeCompare(right.title);
      });

    const completedSocialQuests = socialQuests
      .filter((quest) => {
        const state = getQuestState(quest);
        return state === "COMPLETED" || state === "CLAIMED_SETTLED";
      })
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
        const completed = getQuestState(quest) === "COMPLETED" || getQuestState(quest) === "CLAIMED_SETTLED";

        return {
          key: quest.id,
          title: quest.title,
          objective: getMilestoneObjectiveText(quest.configSummary.milestoneType, targetValue),
          rewardPoints: quest.rewardPoints,
          progressValue: quest.progressValue,
          targetValue,
          completed,
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
    const historyRows = new Map<string, HistoryRow>();

    for (const entry of ledger) {
      if (entry.entryType !== "CREDIT" || entry.reasonType !== "QUEST_REWARD") continue;

      const quest = entry.reasonRef ? questById.get(entry.reasonRef) : undefined;
      const row: HistoryRow = {
        id: `ledger-${entry.id}`,
        itemType: quest ? (isMilestone(quest) ? "Milestone" : "Quest") : "Reward",
        title: quest?.title ?? (entry.reasonRef ? `Quest ${entry.reasonRef}` : "Quest reward"),
        statusLabel: "Reward credited",
        points: entry.amount,
        happenedAt: entry.createdAt,
        dedupeKey: `ledger:${entry.reasonRef ?? entry.id}`,
      };

      historyRows.set(row.dedupeKey, row);
    }

    for (const quest of quests) {
      const state = getQuestState(quest);
      if (state !== "COMPLETED" && state !== "CLAIMED_SETTLED") continue;
      if (historyRows.has(`ledger:${quest.id}`)) continue;

      const happenedAt = quest.claimedAt ?? quest.completedAt;
      if (!happenedAt) continue;

      const row: HistoryRow = {
        id: `quest-${quest.id}`,
        itemType: isMilestone(quest) ? "Milestone" : "Quest",
        title: quest.title,
        statusLabel: state === "CLAIMED_SETTLED" ? "Settled" : "Completed (awaiting ledger credit)",
        points: quest.rewardPoints,
        happenedAt,
        dedupeKey: `fallback:${quest.id}`,
      };

      historyRows.set(row.dedupeKey, row);
    }

    return {
      activeSocialGroups,
      completedSocialQuests,
      milestones: milestoneRows,
      historyRows: [...historyRows.values()].sort((left, right) => new Date(right.happenedAt).getTime() - new Date(left.happenedAt).getTime()),
    };
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

      {loading || loadingData ? <EmptyState title="Loading rewards…" /> : null}
      {!loading && me?.mode === "guest" ? <EmptyState title="Sign in with X to access rewards" /> : null}
      {!loading && me?.mode === "user" ? (
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
          {questsError ? <div className="rewards-inline-warning-v3">{questsError}. Quest data is partially unavailable.</div> : null}
          {ledgerError ? <div className="rewards-inline-warning-v3">{ledgerError}. History is partially unavailable.</div> : null}

          <section className="rewards-section-v3">
            <SectionHeader
              eyebrow="1. Quests"
              title="Actionable quests"
              subtitle="Only open, in-progress, pending-review or rejected quests stay in the main list. Completed quests are moved to a secondary zone."
            />

            {viewModel.activeSocialGroups.length === 0 ? <EmptyState title="No actionable social quests" description="All social quests are already completed or settled." /> : null}

            {viewModel.activeSocialGroups.map((group) => (
              <Surface key={group.key} className="rewards-quest-group-v3">
                <div className="rewards-quest-group-head-v3">
                  <h3>{group.title}</h3>
                  <span className="mcg-chip">{group.quests.length} quest(s)</span>
                </div>

                <div className="rewards-quest-grid-v3">
                  {group.quests.map((quest) => {
                    const state = getQuestState(quest);
                    const etaStart = autoPendingByQuest[quest.id];
                    const etaRemainingSec = etaStart ? Math.max(0, Math.ceil((etaStart + 60_000 - clock) / 1000)) : null;
                    const proofRequired = Boolean(quest.configSummary.proofRequired);
                    const canSubmitManually = quest.validationMode !== "AUTO";
                    const canAutoTrigger = quest.validationMode === "AUTO" && Boolean(quest.configSummary.targetUrl) && state !== "PENDING_REVIEW";

                    return (
                      <article key={quest.id} className="rewards-quest-card-v3">
                        <div className="rewards-quest-card-head-v3">
                          <div>
                            <p className="mcg-eyebrow">{quest.type === "SOCIAL_FOLLOW_X" ? "Follow" : "Engagement"}</p>
                            <h4>{quest.title}</h4>
                          </div>
                          <StatusBadge tone={toStatusTone(state)} label={getStatusLabel(state)} />
                        </div>

                        <p className="contest-inline-note">{quest.description ?? quest.configSummary.instructions ?? "Social quest"}</p>

                        <div className="rewards-quest-meta-v3">
                          <span className="mcg-chip">+{quest.rewardPoints} points</span>
                          <span className="mcg-chip">Validation: {quest.validationMode === "MANUAL_REVIEW" ? "Pending review" : quest.validationMode}</span>
                          {quest.latestSubmissionStatus ? <span className="mcg-chip">Latest submission: {quest.latestSubmissionStatus}</span> : null}
                        </div>

                        <div className="rewards-quest-actions-v3">
                          {state === "PENDING_REVIEW" ? (
                            <p className="contest-inline-note">Your submission is pending moderator review.</p>
                          ) : null}

                          {canAutoTrigger ? (
                            <Button
                              variant="primary"
                              disabled={submittingId === quest.id || Boolean(etaRemainingSec)}
                              onClick={() => startAutoSocialQuest(quest)}
                            >
                              {etaRemainingSec ? `Auto-check in ${etaRemainingSec}s` : resolveSocialCtaLabelForUserQuest(quest)}
                            </Button>
                          ) : null}

                          {canSubmitManually ? (
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
                                disabled={state === "PENDING_REVIEW" || submittingId === quest.id || (proofRequired && !(proofUrlByQuest[quest.id] ?? "").trim())}
                                onClick={() => {
                                  void submitQuest(quest, "manual");
                                }}
                              >
                                Submit proof
                              </Button>
                            </>
                          ) : null}
                        </div>
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
                title="Already completed"
                subtitle="Completed and settled social quests are intentionally de-emphasized and separated from active work."
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
                        <StatusBadge tone="settled" label={getStatusLabel(getQuestState(quest))} />
                      </div>
                      <p className="contest-inline-note">{quest.description ?? "Social quest"}</p>
                      <div className="rewards-quest-meta-v3">
                        <span className="mcg-chip">+{quest.rewardPoints} points</span>
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
              title="Milestone progress"
              subtitle="Completed milestones are shown first. Incomplete milestones remain visible but muted as secondary targets."
            />
            <Surface>
              {viewModel.milestones.length === 0 ? (
                <EmptyState title="No milestones available" description="Milestones will appear when the backend seed data is available." />
              ) : (
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
              )}
            </Surface>
          </section>

          <section className="rewards-section-v3">
            <SectionHeader
              eyebrow="3. History"
              title="Rewards history"
              subtitle="Chronological ledger-backed timeline of completed quests and milestones without duplicates."
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
