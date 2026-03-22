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

function isSocialQuest(quest: QuestRow) {
  return (
    quest.type === "SOCIAL_FOLLOW_X" || quest.type === "SOCIAL_ENGAGEMENT_X"
  );
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
        title: "Claimable",
        subtitle: "Freshly completed rewards ready to celebrate.",
      };
    case "in_progress":
      return {
        title: "In progress",
        subtitle: "Quests already underway or waiting on validation.",
      };
    case "available":
      return {
        title: "Available quests",
        subtitle: "Simple actions you can start right now.",
      };
    case "completed":
      return {
        title: "Completed",
        subtitle: "Rewards already credited to your account.",
      };
  }
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
    <article
      className={`${styles.questCard} ${styles[`questCard${state}`]}`}
    >
      <div className={styles.questCardHead}>
        <div>
          <p className={styles.questCardEyebrow}>
            {quest.type === "CONTEST_COUNT_MILESTONE"
              ? "Milestone"
              : (quest.configSummary.socialAction ??
                (quest.type === "SOCIAL_FOLLOW_X" ? "Follow" : "Quest"))}
          </p>
          <h3 className={styles.questCardTitle}>{quest.title}</h3>
        </div>
        <span className={`${styles.questStateBadge} ${styles[`questStateBadge${state}`]}`}>
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
          <div className={`${styles.questRewardValue} ${styles[`questRewardValue${state}`]}`}>
            {formatReward(quest)}
          </div>
        </div>
        <div className={styles.questProgressMeta}>
          <div>{getProgressLabel(quest)}</div>
          <div>{formatDate(quest.completedAt ?? quest.startedAt)}</div>
        </div>
      </div>

      {manual && state !== "COMPLETED" && state !== "CLAIMABLE" ? (
        <div className={styles.questProofFields}>
          <input
            className="input"
            value={proofUrl}
            onChange={(event) => onProofChange(event.target.value)}
            placeholder={
              proofRequired ? "Proof URL (required)" : "Proof URL (optional)"
            }
          />
          <textarea
            className="input"
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
        {busy ? "Working…" : getQuestCta(quest, state)}
      </button>

      {state === "IN_PROGRESS" ? (
        <p className={styles.questHint}>
          {quest.status === "PENDING_VALIDATION"
            ? "Validation is running now. Rewards will be credited automatically once the backend confirms completion."
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

  const grouped = useMemo(() => {
    const social = quests.filter(isSocialQuest);
    const sections: Record<SectionKey, QuestRow[]> = {
      claimable: [],
      in_progress: [],
      available: [],
      completed: [],
    };
    for (const quest of social) {
      const state = resolveCardState(quest, justCompleted);
      if (state === "CLAIMABLE") sections.claimable.push(quest);
      else if (state === "IN_PROGRESS") sections.in_progress.push(quest);
      else if (state === "AVAILABLE") sections.available.push(quest);
      else sections.completed.push(quest);
    }
    return sections;
  }, [quests, justCompleted]);

  const pointsEarned = ledger
    .filter((entry) => entry.entryType === "CREDIT")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const currentPoints = me?.user.points ?? 0;
  const showLoading = loading || (me && loadingData && quests.length === 0);

  return (
    <SiteShell>
      <div className="stitch-screen stitch-rewards-screen rewards-screen-layout">
        {showLoading ? <EmptyState title="Loading rewards…" /> : null}
        {!showLoading && !me ? (
          <div className={styles.boardLayout}>
            <section className={styles.heroBoard}>
              <h1 className={styles.heroTitle}>Rewards hub</h1>
              <p className={styles.heroCopy}>
                Track live quests, milestone progress, and credited rewards in
                one tactile board.
              </p>
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
                <div>
                  <p className={styles.boardEyebrow}>Quest board</p>
                  <h1 className={styles.questBoardTitle}>Rewards &amp; Quests</h1>
                  <p className={styles.questBoardCopy}>
                    Complete social actions, watch progress update, and get
                    credited without breaking ledger integrity.
                  </p>
                </div>
                <div className={styles.statGrid}>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Current points</div>
                    <div className={styles.statValueWarm}>
                      {currentPoints.toLocaleString()}
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Total earned</div>
                    <div className={styles.statValue}>
                      {pointsEarned.toLocaleString()}
                    </div>
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

            {([
              "claimable",
              "in_progress",
              "available",
              "completed",
            ] as SectionKey[]).map((sectionKey) => {
              const section = grouped[sectionKey];
              const meta = getSectionMeta(sectionKey);
              if (section.length === 0 && sectionKey !== "completed")
                return null;
              return (
                <section
                  key={sectionKey}
                  className={`${styles.boardSection} ${styles[`boardSection${sectionKey}`]}`}
                >
                  <div className={styles.boardSectionHead}>
                    <div>
                      <p className={`${styles.boardSectionEyebrow} ${styles[`boardSectionEyebrow${sectionKey}`]}`}>
                        {meta.title}
                      </p>
                      <h2 className={styles.boardSectionTitle}>
                        {section.length} {section.length === 1 ? "quest" : "quests"}
                      </h2>
                      <p className={styles.boardSectionCopy}>{meta.subtitle}</p>
                    </div>
                  </div>
                  {section.length === 0 ? (
                    <div className={styles.emptySectionCard}>Nothing here yet.</div>
                  ) : (
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
                              void submitQuest(quest, "manual");
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : null}
      </div>
    </SiteShell>
  );
}
