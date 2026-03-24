"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ConnectXCallout } from "@/components/auth/ConnectXCallout";
import { SiteShell } from "@/components/layout/SiteShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSession } from "@/components/useSession";
import {
  getMilestoneObjectiveText,
  type MilestoneType,
} from "@/lib/domain/quests/social";
import { formatQuestAction } from "@/lib/utils/questLabels";

import styles from "./rewards.module.css";

type LedgerRow = {
  id: string;
  entryType: "CREDIT" | "DEBIT";
  amount: number;
  reasonType: string;
  reasonRef?: string | null;
  createdAt: string;
};

type QuestStatus =
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "PENDING_VALIDATION"
  | "CLAIMABLE"
  | "COMPLETED"
  | "REJECTED";
type SubmissionStatus = "SUBMITTED" | "APPROVED" | "REJECTED" | null;

type QuestRow = {
  id: string;
  code: string;
  type:
    | "WELCOME"
    | "SOCIAL_FOLLOW_X"
    | "SOCIAL_ENGAGEMENT_X"
    | "CONTEST_COUNT_MILESTONE"
    | "MANUAL";
  title: string;
  description: string | null;
  rewardPoints: number;
  rewardPackCode: string | null;
  rewardPackQuantity: number | null;
  status: QuestStatus;
  startedAt: string | null;
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

type CardState = "AVAILABLE" | "IN_PROGRESS" | "CLAIMABLE" | "COMPLETED";

function isSocialQuest(quest: QuestRow) {
  return (
    quest.type === "SOCIAL_FOLLOW_X" || quest.type === "SOCIAL_ENGAGEMENT_X"
  );
}

function isMilestoneQuest(quest: QuestRow) {
  return quest.type === "CONTEST_COUNT_MILESTONE";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatReward(
  quest: Pick<
    QuestRow,
    "rewardPoints" | "rewardPackCode" | "rewardPackQuantity"
  >,
) {
  const parts: string[] = [];
  if (quest.rewardPoints > 0) {
    parts.push(`+${quest.rewardPoints.toLocaleString()} Points`);
  }
  if (quest.rewardPackCode) {
    parts.push(`${quest.rewardPackQuantity ?? 1}× ${quest.rewardPackCode}`);
  }
  return parts.join(" · ") || "No reward";
}

function resolveCardState(
  quest: QuestRow,
  newlyCompleted: Set<string>,
): CardState {
  const completed =
    quest.status === "COMPLETED" ||
    quest.latestSubmissionStatus === "APPROVED" ||
    Boolean(quest.claimedAt);
  if (completed) {
    return newlyCompleted.has(quest.id) ? "CLAIMABLE" : "COMPLETED";
  }
  if (
    quest.status === "IN_PROGRESS" ||
    quest.status === "PENDING_VALIDATION" ||
    quest.latestSubmissionStatus === "SUBMITTED"
  ) {
    return "IN_PROGRESS";
  }
  return "AVAILABLE";
}

function getQuestCta(quest: QuestRow, state: CardState) {
  if (state === "CLAIMABLE") return "Complete";
  if (state === "IN_PROGRESS") {
    if (quest.latestSubmissionStatus === "SUBMITTED") return "Under review";
    return "Continue";
  }
  if (state === "COMPLETED") return "Completed";
  return "Start";
}

function getQuestTypeLabel(quest: QuestRow) {
  const raw =
    quest.configSummary.socialAction ??
    (quest.type === "SOCIAL_FOLLOW_X" ? "Follow" : "Social quest");
  return formatQuestAction(raw);
}

function getQuestFlavorText(quest: QuestRow) {
  return (
    quest.description ??
    quest.configSummary.instructions ??
    "Take the action, lock the XP, keep the streak alive."
  );
}

function getQuestStatusCopy(quest: QuestRow, state: CardState) {
  if (state === "CLAIMABLE") return "XP secured.";
  if (state === "IN_PROGRESS") {
    if (quest.latestSubmissionStatus === "SUBMITTED") return "Review pending.";
    if (quest.status === "PENDING_VALIDATION") return "Checking proof.";
    return "Quest live.";
  }
  if (state === "COMPLETED") return "Already cleared.";
  return "Ready to roll.";
}

function getMilestoneIcon(index: number) {
  return ["🏆", "💎", "⚡", "🌟", "🎯", "👑"][index % 6];
}

function QuestCard(props: {
  quest: QuestRow;
  state: CardState;
  index: number;
  busy: boolean;
  proofUrl: string;
  note: string;
  onProofChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onAction: () => void;
}) {
  const {
    quest,
    state,
    index,
    busy,
    proofUrl,
    note,
    onProofChange,
    onNoteChange,
    onAction,
  } = props;
  const proofRequired = Boolean(quest.configSummary.proofRequired);
  const manual = quest.validationMode !== "AUTO";
  const disabled =
    state === "COMPLETED" ||
    busy ||
    (manual && proofRequired && !proofUrl.trim()) ||
    quest.latestSubmissionStatus === "SUBMITTED";

  return (
    <article
      className={`${styles.questCard} ${styles[`questCard${state}`]} ${styles[`questTone${index % 4}`]}`}
    >
      <div className={styles.questCardTop}>
        <span className={styles.questTag}>{getQuestTypeLabel(quest)}</span>
        <div className={styles.questRewardBadge}>{formatReward(quest)}</div>
      </div>

      <div className={styles.questBody}>
        <h3 className={styles.questTitle}>{quest.title}</h3>
        <p className={styles.questDescription}>{getQuestFlavorText(quest)}</p>
      </div>

      {manual && state !== "COMPLETED" && state !== "CLAIMABLE" ? (
        <div className={styles.questProofFields}>
          <input
            className={`input ${styles.questInput}`}
            value={proofUrl}
            onChange={(event) => onProofChange(event.target.value)}
            placeholder={
              proofRequired ? "Proof URL (required)" : "Proof URL (optional)"
            }
          />
          <textarea
            className={`input ${styles.questInput}`}
            rows={2}
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Optional note"
          />
        </div>
      ) : null}

      <div className={styles.questFooter}>
        <span className={styles.questStatusBadge}>{getQuestStatusCopy(quest, state)}</span>
        <button
          type="button"
          onClick={onAction}
          disabled={disabled}
          className={`btn ${styles.questActionButton} ${styles[`questActionButton${state}`]}`}
        >
          {busy ? "Working…" : getQuestCta(quest, state).toUpperCase()}
        </button>
      </div>
    </article>
  );
}

export default function RewardsPage() {
  const { me, loading } = useSession();
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [proofUrlByQuest, setProofUrlByQuest] = useState<Record<string, string>>({});
  const [noteByQuest, setNoteByQuest] = useState<Record<string, string>>({});
  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set());
  const prevCompletionRef = useRef<Map<string, string>>(new Map());

  const loadData = useCallback(async () => {
    setLoadingData(true);
    setError("");
    const [questRes, ledgerRes] = await Promise.all([
      fetch("/api/quests", { cache: "no-store" }),
      fetch("/api/rewards/ledger", { cache: "no-store" }),
    ]);

    if (!questRes.ok || !ledgerRes.ok) {
      setError("Could not load quests right now.");
      setLoadingData(false);
      return;
    }

    const questPayload = (await questRes.json()) as { quests?: QuestRow[] };
    const ledgerPayload = (await ledgerRes.json()) as { entries?: LedgerRow[] };
    const nextQuests = questPayload.quests ?? [];
    const nextMap = new Map<string, string>();
    const newClaims = new Set<string>();

    for (const quest of nextQuests) {
      const stamp = quest.claimedAt ?? quest.completedAt;
      if (!stamp) continue;
      nextMap.set(quest.id, stamp);
      if (
        prevCompletionRef.current.size > 0 &&
        prevCompletionRef.current.get(quest.id) !== stamp
      ) {
        newClaims.add(quest.id);
      }
    }

    if (newClaims.size > 0) {
      setMessage("Quest completion synced.");
      setJustCompleted(newClaims);
    }

    prevCompletionRef.current = nextMap;
    setQuests(nextQuests);
    setLedger(ledgerPayload.entries ?? []);
    setLoadingData(false);
  }, []);

  useEffect(() => {
    if (!loading && me) void loadData();
  }, [loading, me, loadData]);

  const submitQuest = async (quest: QuestRow, mode: "auto" | "manual") => {
    setSubmittingId(quest.id);
    setMessage("");
    setError("");
    const response = await fetch(`/api/quests/${quest.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        mode === "manual"
          ? {
              proofUrl: proofUrlByQuest[quest.id]?.trim() || undefined,
              note: noteByQuest[quest.id]?.trim() || undefined,
            }
          : {},
      ),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(payload?.error ?? "Quest action failed.");
      setSubmittingId(null);
      return;
    }
    setMessage(
      mode === "auto"
        ? "Quest started. We will keep tracking your progress."
        : "Quest submitted for review.",
    );
    await loadData();
    setSubmittingId(null);
  };

  const socialQuests = useMemo(() => quests.filter(isSocialQuest), [quests]);
  const milestoneQuests = useMemo(() => quests.filter(isMilestoneQuest), [quests]);

  const activeSocialQuests = useMemo(() => {
    return [...socialQuests]
      .map((quest) => ({ quest, state: resolveCardState(quest, justCompleted) }))
      .filter(({ state }) => state !== "COMPLETED")
      .sort((left, right) => {
        const rank = { CLAIMABLE: 0, IN_PROGRESS: 1, AVAILABLE: 2, COMPLETED: 3 } as const;
        return rank[left.state] - rank[right.state];
      });
  }, [socialQuests, justCompleted]);

  const completedSocialQuests = useMemo(() => {
    return [...socialQuests]
      .filter((quest) => resolveCardState(quest, justCompleted) === "COMPLETED")
      .sort((left, right) => {
        const leftTime = new Date(left.completedAt ?? left.claimedAt ?? 0).getTime();
        const rightTime = new Date(right.completedAt ?? right.claimedAt ?? 0).getTime();
        return rightTime - leftTime;
      });
  }, [socialQuests, justCompleted]);

  const milestoneCards = useMemo(() => {
    return [...milestoneQuests]
      .map((quest) => ({
        quest,
        state: resolveCardState(quest, justCompleted),
      }))
      .sort((left, right) => {
        const leftProgress = (left.quest.targetValue ?? left.quest.configSummary.targetValue ?? 1) - left.quest.progressValue;
        const rightProgress = (right.quest.targetValue ?? right.quest.configSummary.targetValue ?? 1) - right.quest.progressValue;
        return leftProgress - rightProgress;
      });
  }, [milestoneQuests, justCompleted]);

  const unlockedMilestones = useMemo(() => {
    return milestoneCards
      .filter(({ state }) => state === "COMPLETED" || state === "CLAIMABLE")
      .sort((left, right) => {
        const leftTime = new Date(left.quest.completedAt ?? left.quest.claimedAt ?? 0).getTime();
        const rightTime = new Date(right.quest.completedAt ?? right.quest.claimedAt ?? 0).getTime();
        return rightTime - leftTime;
      });
  }, [milestoneCards]);

  const lastUnlockedMilestone = unlockedMilestones[0] ?? null;
  const secondaryMilestones = milestoneCards.filter(({ quest }) => quest.id !== lastUnlockedMilestone?.quest.id);

  const pointsEarned = ledger
    .filter((entry) => entry.entryType === "CREDIT")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const currentPoints = me?.user.points ?? 0;
  const currentLevel = Math.max(1, Math.floor(currentPoints / 500) + 1);
  const currentLevelFloor = Math.floor(currentPoints / 500) * 500;
  const nextLevelPoints = currentLevelFloor + 500;
  const levelProgress = Math.max(
    0,
    Math.min(1, (currentPoints - currentLevelFloor) / 500),
  );

  const lastMilestoneReward = lastUnlockedMilestone ? formatReward(lastUnlockedMilestone.quest) : null;

  const showLoading = loading || (me && loadingData && quests.length === 0);

  return (
    <SiteShell>
      <div className="stitch-screen stitch-rewards-screen rewards-screen-layout">
        {showLoading ? <EmptyState title="Loading quests…" /> : null}

        {!showLoading && !me ? (
          <div className={styles.boardLayout}>
            <section className={styles.heroSection}>
              <div>
                <p className={styles.sectionEyebrow}>Quest system</p>
                <h1 className={styles.pageTitle}>QUESTS</h1>
                <p className={styles.heroCopy}>
                  Track active quests, hidden milestones, and your XP progress in one place.
                </p>
              </div>
            </section>
            <ConnectXCallout
              layout="inline"
              title="Connect to unlock quests"
              description="Quests only load for connected players so progress and XP stay accurate."
              ctaLabel="Connect wallet / X"
            />
          </div>
        ) : null}

        {!showLoading && me ? (
          <div className={styles.boardLayout}>
            <section className={styles.heroSection}>
              <div className={styles.heroTopRow}>
                <div className={styles.heroHeading}>
                  <p className={styles.sectionEyebrow}>Quest progression</p>
                  <h1 className={styles.pageTitle}>QUESTS</h1>
                  <p className={styles.heroCopy}>
                    Chase XP, clear social missions, and unlock mystery milestones.
                  </p>
                </div>
                <div className={styles.heroStats}>
                  <div className={styles.heroStatCard}>
                    <span className={styles.statLabel}>Current XP</span>
                    <strong className={styles.statValue}>{currentPoints.toLocaleString()}</strong>
                  </div>
                  <div className={styles.heroStatCard}>
                    <span className={styles.statLabel}>Level</span>
                    <strong className={styles.statValue}>{currentLevel}</strong>
                  </div>
                  <div className={styles.heroStatCard}>
                    <span className={styles.statLabel}>Total earned</span>
                    <strong className={styles.statValue}>{pointsEarned.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              <div className={styles.heroProgressPanel}>
                <div>
                  <p className={styles.levelLabel}>XP progress</p>
                  <p className={styles.levelMeta}>
                    {Math.max(nextLevelPoints - currentPoints, 0).toLocaleString()} XP to Level {currentLevel + 1}
                  </p>
                </div>
                <div className={styles.heroTrackWrap}>
                  <div className={styles.levelTrack} aria-hidden="true">
                    <span
                      className={styles.levelFill}
                      style={{ width: `${levelProgress * 100}%` }}
                    />
                  </div>
                  <div className={styles.heroProgressTicks}>
                    <span>{currentLevelFloor.toLocaleString()} XP</span>
                    <span>{nextLevelPoints.toLocaleString()} XP</span>
                  </div>
                </div>
              </div>
            </section>

            {message ? (
              <div className={`${styles.statusBanner} ${styles.statusBannerSuccess}`}>
                {message}
              </div>
            ) : null}
            {error ? (
              <div className={`${styles.statusBanner} ${styles.statusBannerError}`}>
                {error}
              </div>
            ) : null}

            <section className={styles.questSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>Social quests</p>
                  <h2 className={styles.sectionTitle}>Active social quests</h2>
                  <p className={styles.sectionCopy}>
                    Jump into quick actions and keep your points climbing.
                  </p>
                </div>
                <div className={styles.sectionCount}>{activeSocialQuests.length}</div>
              </div>

              {activeSocialQuests.length === 0 ? (
                <div className={styles.emptyCard}>No active social quests right now.</div>
              ) : (
                <div className={styles.questGrid}>
                  {activeSocialQuests.map(({ quest, state }, index) => (
                    <QuestCard
                      key={quest.id}
                      quest={quest}
                      state={state}
                      index={index}
                      busy={submittingId === quest.id}
                      proofUrl={proofUrlByQuest[quest.id] ?? ""}
                      note={noteByQuest[quest.id] ?? ""}
                      onProofChange={(value) =>
                        setProofUrlByQuest((current) => ({
                          ...current,
                          [quest.id]: value,
                        }))
                      }
                      onNoteChange={(value) =>
                        setNoteByQuest((current) => ({
                          ...current,
                          [quest.id]: value,
                        }))
                      }
                      onAction={() => {
                        if (state === "CLAIMABLE") {
                          setJustCompleted((current) => {
                            const next = new Set(current);
                            next.delete(quest.id);
                            return next;
                          });
                          setMessage("Quest completion acknowledged.");
                          return;
                        }
                        if (quest.validationMode === "AUTO") {
                          if (quest.configSummary.targetUrl) {
                            window.open(
                              quest.configSummary.targetUrl,
                              "_blank",
                              "noopener,noreferrer",
                            );
                          }
                          void submitQuest(quest, "auto");
                          return;
                        }
                        if (quest.configSummary.targetUrl) {
                          window.open(
                            quest.configSummary.targetUrl,
                            "_blank",
                            "noopener,noreferrer",
                          );
                        }
                        void submitQuest(quest, "manual");
                      }}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className={styles.dailySection}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>Daily quests</p>
                  <h2 className={styles.sectionTitle}>Daily quests</h2>
                </div>
              </div>
              <div className={styles.dailyComingSoon}>Daily quests coming soon</div>
            </section>

            <section className={styles.milestoneSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>Milestones</p>
                  <h2 className={styles.sectionTitle}>Hidden milestones</h2>
                  <p className={styles.sectionCopy}>
                    One big goal up front. The rest stay mysterious until you earn them.
                  </p>
                </div>
              </div>

              <article className={styles.featuredMilestoneCard}>
                <div className={styles.featuredMilestoneIcon}>{lastUnlockedMilestone ? "🏆" : "✨"}</div>
                <div className={styles.featuredMilestoneContent}>
                  <p className={styles.milestoneLabel}>Last Milestone</p>
                  <h3 className={styles.featuredMilestoneTitle}>
                    {lastUnlockedMilestone?.quest.title ?? "No milestone unlocked yet"}
                  </h3>
                  <p className={styles.featuredMilestoneDescription}>
                    {lastUnlockedMilestone
                      ? lastUnlockedMilestone.quest.description ??
                        getMilestoneObjectiveText(
                          lastUnlockedMilestone.quest.configSummary.milestoneType,
                          lastUnlockedMilestone.quest.targetValue ??
                            lastUnlockedMilestone.quest.configSummary.targetValue ??
                            0,
                        )
                      : "Keep progressing through contests, packs, and rewards to reveal your first milestone win."}
                  </p>
                  {lastUnlockedMilestone ? (
                    <div className={styles.featuredMilestoneMeta}>
                      <span>Unlocked {formatDate(lastUnlockedMilestone.quest.completedAt ?? lastUnlockedMilestone.quest.claimedAt)}</span>
                      {lastMilestoneReward ? <span>{lastMilestoneReward}</span> : null}
                    </div>
                  ) : (
                    <div className={styles.featuredMilestoneMeta}>
                      <span>Your latest milestone success will appear here.</span>
                    </div>
                  )}
                </div>
              </article>

              {secondaryMilestones.length > 0 ? (
                <div className={styles.milestoneGrid}>
                  {secondaryMilestones.map(({ quest, state }, index) => {
                    const unlocked = state === "COMPLETED" || state === "CLAIMABLE";
                    const milestoneDetails =
                      quest.description ??
                      getMilestoneObjectiveText(
                        quest.configSummary.milestoneType,
                        quest.targetValue ?? quest.configSummary.targetValue ?? 0,
                      );

                    return (
                      <article
                        key={quest.id}
                        className={`${styles.milestoneCard} ${unlocked ? styles.milestoneUnlocked : styles.milestoneLocked} ${unlocked ? styles.milestoneCardInteractive : ""}`}
                        tabIndex={unlocked ? 0 : undefined}
                        aria-label={unlocked ? `${quest.title}. ${milestoneDetails}` : undefined}
                      >
                        <div className={styles.milestoneIcon}>{unlocked ? getMilestoneIcon(index) : "❔"}</div>
                        <div>
                          <p className={styles.milestoneLabel}>{unlocked ? "Unlocked" : "Hidden"}</p>
                          <h3 className={styles.milestoneTitle}>{unlocked ? quest.title : "???"}</h3>
                        </div>
                        {unlocked ? (
                          <div className={styles.milestoneTooltip} role="note">
                            <p className={styles.milestoneTooltipTitle}>{quest.title}</p>
                            <p className={styles.milestoneTooltipCopy}>{milestoneDetails}</p>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </section>

            <section className={styles.archiveSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>Archive</p>
                  <h2 className={styles.sectionTitle}>Completed quests</h2>
                </div>
                <div className={styles.sectionCount}>{completedSocialQuests.length}</div>
              </div>

              {completedSocialQuests.length === 0 ? (
                <div className={styles.emptyCard}>No completed quests yet.</div>
              ) : (
                <div className={styles.archiveList}>
                  {completedSocialQuests.map((quest) => (
                    <article key={quest.id} className={styles.archiveRow}>
                      <div>
                        <p className={styles.archiveMeta}>{getQuestTypeLabel(quest)}</p>
                        <h3 className={styles.archiveTitle}>{quest.title}</h3>
                      </div>
                      <div className={styles.archiveFooter}>
                        <span>{formatReward(quest)}</span>
                        <span>{formatDate(quest.completedAt ?? quest.claimedAt)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </SiteShell>
  );
}
