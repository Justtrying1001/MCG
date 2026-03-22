"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ConnectXCallout } from "@/components/auth/ConnectXCallout";
import { SiteShell } from "@/components/layout/SiteShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSession } from "@/components/useSession";
import type { MilestoneType } from "@/lib/domain/quests/social";

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

type SectionKey = "claimable" | "in_progress" | "available" | "completed";

type PassNode = {
  questId: string;
  level: number;
  title: string;
  reward: string;
  active: boolean;
  completed: boolean;
};

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
  if (quest.rewardPoints > 0)
    parts.push(`+${quest.rewardPoints.toLocaleString()} pts`);
  if (quest.rewardPackCode)
    parts.push(`${quest.rewardPackQuantity ?? 1}× ${quest.rewardPackCode}`);
  return parts.join(" · ") || "No reward";
}

function getProgressLabel(quest: QuestRow) {
  if (!quest.targetValue) return quest.startedAt ? "Started" : "Ready";
  return `${Math.min(quest.progressValue, quest.targetValue)}/${quest.targetValue}`;
}

function getProgressRatio(quest: QuestRow) {
  if (!quest.targetValue) return quest.startedAt ? 0.35 : 0;
  return Math.max(0, Math.min(1, quest.progressValue / quest.targetValue));
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
  if (state === "CLAIMABLE") return "Claim reward";
  if (state === "COMPLETED") return "Completed";
  if (state === "IN_PROGRESS") {
    if (quest.validationMode === "AUTO") return "Continue";
    if (quest.latestSubmissionStatus === "SUBMITTED") return "Under review";
    return "Continue";
  }
  return "Start";
}

function getSectionMeta(section: SectionKey) {
  switch (section) {
    case "claimable":
      return {
        title: "Ready to claim",
        subtitle: "Fresh clears that are ready for a victory lap.",
      };
    case "in_progress":
      return {
        title: "Daily missions",
        subtitle: "Quests already underway or waiting on validation.",
      };
    case "available":
      return {
        title: "Open missions",
        subtitle: "Simple actions you can jump into right now.",
      };
    case "completed":
      return {
        title: "Completed",
        subtitle: "Cleared missions and rewards already credited.",
      };
  }
}

function getQuestTypeLabel(quest: QuestRow) {
  if (quest.type === "CONTEST_COUNT_MILESTONE") return "Milestone";
  return (
    quest.configSummary.socialAction ??
    (quest.type === "SOCIAL_FOLLOW_X" ? "Follow" : "Quest")
  );
}

function getMilestoneTheme(index: number) {
  return [
    styles.milestoneCardSky,
    styles.milestoneCardLemon,
    styles.milestoneCardPink,
    styles.milestoneCardMint,
  ][index % 4];
}

function QuestCard(props: {
  quest: QuestRow;
  state: CardState;
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
    <article className={`${styles.questCard} ${styles[`questCard${state}`]}`}>
      <div className={styles.questCardHead}>
        <div>
          <p className={styles.questCardEyebrow}>{getQuestTypeLabel(quest)}</p>
          <h3 className={styles.questCardTitle}>{quest.title}</h3>
        </div>
        <span
          className={`${styles.questStateBadge} ${styles[`questStateBadge${state}`]}`}
        >
          {state.replace("_", " ")}
        </span>
      </div>

      <p className={styles.questCardDescription}>
        {quest.description ??
          quest.configSummary.instructions ??
          "Complete this quest to earn rewards."}
      </p>

      <div className={styles.questRewardPanel}>
        <div>
          <div className={styles.questRewardLabel}>Reward</div>
          <div
            className={`${styles.questRewardValue} ${styles[`questRewardValue${state}`]}`}
          >
            {formatReward(quest)}
          </div>
        </div>
        <div className={styles.questProgressMeta}>
          <div>{getProgressLabel(quest)}</div>
          <div>{formatDate(quest.completedAt ?? quest.startedAt)}</div>
        </div>
      </div>

      {quest.targetValue ? (
        <div className={styles.missionProgressBlock}>
          <div className={styles.missionProgressLabels}>
            <span>Progress</span>
            <span>{getProgressLabel(quest)}</span>
          </div>
          <div className={styles.missionProgressTrack}>
            <span
              className={styles.missionProgressFill}
              style={{ width: `${getProgressRatio(quest) * 100}%` }}
            />
          </div>
        </div>
      ) : null}

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
            placeholder="Optional note for review"
          />
        </div>
      ) : null}

      <button
        type="button"
        onClick={onAction}
        disabled={disabled}
        className={`btn ${styles.questActionButton} ${styles[`questActionButton${state}`]}`}
      >
        {busy ? "Working…" : getQuestCta(quest, state).toUpperCase()}
      </button>

      {state === "IN_PROGRESS" ? (
        <p className={styles.questHint}>
          {quest.status === "PENDING_VALIDATION"
            ? "Validation is running now. Rewards will be credited automatically once confirmed."
            : quest.latestSubmissionStatus === "SUBMITTED"
              ? "Your submission is in moderation."
              : "Progress is tracked automatically while you continue playing."}
        </p>
      ) : null}
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
  const [proofUrlByQuest, setProofUrlByQuest] = useState<
    Record<string, string>
  >({});
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
      setError("Could not load rewards right now.");
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
      setMessage("Reward granted successfully.");
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
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    if (!response.ok) {
      setError(payload?.error ?? "Quest action failed.");
      setSubmittingId(null);
      return;
    }
    setMessage(
      mode === "auto"
        ? "Quest started. Complete the action and we will keep tracking it."
        : "Submission sent for review.",
    );
    await loadData();
    setSubmittingId(null);
  };

  const socialQuests = useMemo(() => quests.filter(isSocialQuest), [quests]);
  const milestoneQuests = useMemo(
    () => quests.filter(isMilestoneQuest),
    [quests],
  );

  const grouped = useMemo(() => {
    const sections: Record<SectionKey, QuestRow[]> = {
      claimable: [],
      in_progress: [],
      available: [],
      completed: [],
    };
    for (const quest of socialQuests) {
      const state = resolveCardState(quest, justCompleted);
      if (state === "CLAIMABLE") sections.claimable.push(quest);
      else if (state === "IN_PROGRESS") sections.in_progress.push(quest);
      else if (state === "AVAILABLE") sections.available.push(quest);
      else sections.completed.push(quest);
    }
    return sections;
  }, [socialQuests, justCompleted]);

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

  const passNodes = useMemo<PassNode[]>(() => {
    const source = [...socialQuests]
      .sort((a, b) => {
        const left = a.targetValue ?? Number.MAX_SAFE_INTEGER;
        const right = b.targetValue ?? Number.MAX_SAFE_INTEGER;
        return left - right;
      })
      .slice(0, 5);

    return source.map((quest, index) => {
      const state = resolveCardState(quest, justCompleted);
      const fallbackLevel = currentLevel + index;
      return {
        questId: quest.id,
        level: quest.targetValue ?? quest.configSummary.targetValue ?? fallbackLevel,
        title: quest.title,
        reward: formatReward(quest),
        active: state === "IN_PROGRESS" || state === "CLAIMABLE",
        completed: state === "COMPLETED",
      };
    });
  }, [socialQuests, justCompleted, currentLevel]);

  const showLoading = loading || (me && loadingData && quests.length === 0);

  return (
    <SiteShell>
      <div className="stitch-screen stitch-rewards-screen rewards-screen-layout">
        {showLoading ? <EmptyState title="Loading rewards…" /> : null}
        {!showLoading && !me ? (
          <div className={styles.boardLayout}>
            <section className={styles.heroBoard}>
              <div>
                <p className={styles.boardEyebrow}>Mission log</p>
                <h1 className={styles.heroTitle}>Rewards hub</h1>
                <p className={styles.heroCopy}>
                  Track live quests, milestone progress, and credited rewards in
                  one playful board.
                </p>
              </div>
            </section>
            <ConnectXCallout
              layout="inline"
              title="Connect to unlock quests"
              description="Rewards only load for connected players so the ledger and quest state stay accurate."
              ctaLabel="Connect wallet / X"
            />
          </div>
        ) : null}

        {!showLoading && me ? (
          <div className={styles.boardLayout}>
            <section className={styles.questBoardHero}>
              <div className={styles.questBoardHeroHeader}>
                <div className={styles.heroCopyBlock}>
                  <p className={styles.boardEyebrow}>Season rewards</p>
                  <h1 className={styles.questBoardTitle}>MISSION LOG</h1>
                  <p className={styles.questBoardCopy}>
                    Complete social actions, stack progress, and watch rewards
                    land in your account.
                  </p>
                </div>
                <div className={styles.heroProgressCard}>
                  <div className={styles.heroProgressTopline}>Current XP</div>
                  <div className={styles.heroProgressValue}>
                    {currentPoints.toLocaleString()} pts
                  </div>
                  <div className={styles.heroProgressMeta}>
                    Level {currentLevel} · {Math.max(nextLevelPoints - currentPoints, 0).toLocaleString()} pts to next level
                  </div>
                  <div className={styles.heroProgressTrack}>
                    <span
                      className={styles.heroProgressFill}
                      style={{ width: `${levelProgress * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className={styles.heroStatsRow}>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Total earned</div>
                  <div className={styles.statValue}>{pointsEarned.toLocaleString()}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Mission count</div>
                  <div className={styles.statValue}>{socialQuests.length.toLocaleString()}</div>
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

            <section className={styles.passSection}>
              <div className={styles.sectionHeadingRow}>
                <div>
                  <p className={styles.sectionKicker}>Section 2</p>
                  <h2 className={styles.sectionTitle}>Season pass</h2>
                </div>
                <div className={styles.passPill}>Level {currentLevel}</div>
              </div>
              {passNodes.length > 0 ? (
                <div className={styles.passRailWrap}>
                  <div className={styles.passRailTrack}>
                    <span
                      className={styles.passRailFill}
                      style={{
                        width: `${Math.max(
                          12,
                          ((passNodes.findIndex((node) => node.active) + (passNodes.some((node) => node.active) ? 1 : passNodes.filter((node) => node.completed).length)) /
                            Math.max(passNodes.length, 1)) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                  <div className={styles.passNodeGrid}>
                    {passNodes.map((node) => (
                      <article
                        key={node.questId}
                        className={`${styles.passNode} ${node.active ? styles.passNodeActive : ""} ${node.completed ? styles.passNodeComplete : ""}`}
                      >
                        <div className={styles.passNodeBadge}>LVL {node.level}</div>
                        <div className={styles.passNodeOrb} />
                        <h3 className={styles.passNodeTitle}>{node.title}</h3>
                        <p className={styles.passNodeReward}>{node.reward}</p>
                      </article>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={styles.emptySectionCard}>
                  Season pass milestones will appear here as progression data becomes available.
                </div>
              )}
            </section>

            {([
              "claimable",
              "in_progress",
              "available",
            ] as SectionKey[]).map((sectionKey) => {
              const section = grouped[sectionKey];
              const meta = getSectionMeta(sectionKey);
              if (section.length === 0) return null;
              return (
                <section
                  key={sectionKey}
                  className={`${styles.boardSection} ${styles[`boardSection${sectionKey}`]}`}
                >
                  <div className={styles.sectionHeadingRow}>
                    <div>
                      <p className={styles.sectionKicker}>{meta.title}</p>
                      <h2 className={styles.sectionTitle}>Daily missions</h2>
                      <p className={styles.boardSectionCopy}>{meta.subtitle}</p>
                    </div>
                    <div className={styles.sectionCounter}>{section.length} live</div>
                  </div>
                  <div className={styles.questGrid}>
                    {section.map((quest) => {
                      const state = resolveCardState(quest, justCompleted);
                      return (
                        <QuestCard
                          key={quest.id}
                          quest={quest}
                          state={state}
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
                              setMessage(
                                "Reward collected in the UI. Ledger credit already landed on your account.",
                              );
                              return;
                            }
                            if (quest.validationMode === "AUTO") {
                              if (quest.configSummary.targetUrl)
                                window.open(
                                  quest.configSummary.targetUrl,
                                  "_blank",
                                  "noopener,noreferrer",
                                );
                              void submitQuest(quest, "auto");
                              return;
                            }
                            if (quest.configSummary.targetUrl)
                              window.open(
                                quest.configSummary.targetUrl,
                                "_blank",
                                "noopener,noreferrer",
                              );
                            void submitQuest(quest, "manual");
                          }}
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {milestoneQuests.length > 0 ? (
              <section className={styles.milestoneSection}>
                <div className={styles.sectionHeadingRow}>
                  <div>
                    <p className={styles.sectionKicker}>Section 4</p>
                    <h2 className={styles.sectionTitle}>Milestones</h2>
                    <p className={styles.boardSectionCopy}>
                      Long-term goals powered by your existing quest progression.
                    </p>
                  </div>
                </div>
                <div className={styles.milestoneGrid}>
                  {milestoneQuests.map((quest, index) => (
                    <article
                      key={quest.id}
                      className={`${styles.milestoneCard} ${getMilestoneTheme(index)}`}
                    >
                      <div className={styles.milestoneHeader}>
                        <p className={styles.milestoneEyebrow}>
                          {quest.configSummary.milestoneType?.replaceAll("_", " ") ?? "Milestone"}
                        </p>
                        <span className={styles.milestoneReward}>{formatReward(quest)}</span>
                      </div>
                      <h3 className={styles.milestoneTitle}>{quest.title}</h3>
                      <p className={styles.milestoneDescription}>
                        {quest.description ??
                          quest.configSummary.instructions ??
                          "Keep pushing forward to unlock this reward."}
                      </p>
                      {quest.targetValue ? (
                        <>
                          <div className={styles.milestoneProgressRow}>
                            <span>Progress</span>
                            <span>{getProgressLabel(quest)}</span>
                          </div>
                          <div className={styles.milestoneTrack}>
                            <span
                              className={styles.milestoneFill}
                              style={{ width: `${getProgressRatio(quest) * 100}%` }}
                            />
                          </div>
                        </>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <section
              className={`${styles.boardSection} ${styles.boardSectioncompleted} ${styles.completedSection}`}
            >
              <div className={styles.sectionHeadingRow}>
                <div>
                  <p className={styles.sectionKicker}>Completed</p>
                  <h2 className={styles.sectionTitle}>Archive</h2>
                  <p className={styles.boardSectionCopy}>
                    A lighter log of the missions you already cleared.
                  </p>
                </div>
                <div className={styles.sectionCounter}>{grouped.completed.length} done</div>
              </div>
              {grouped.completed.length === 0 ? (
                <div className={styles.emptySectionCard}>Nothing here yet.</div>
              ) : (
                <div className={styles.completedGrid}>
                  {grouped.completed.map((quest) => (
                    <article key={quest.id} className={styles.completedCard}>
                      <div>
                        <p className={styles.completedLabel}>{getQuestTypeLabel(quest)}</p>
                        <h3 className={styles.completedTitle}>{quest.title}</h3>
                      </div>
                      <div className={styles.completedMeta}>
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
