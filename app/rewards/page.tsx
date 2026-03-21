"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ConnectXCallout } from "@/components/auth/ConnectXCallout";
import { SiteShell } from "@/components/layout/SiteShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSession } from "@/components/useSession";
import type { MilestoneType } from "@/lib/domain/quests/social";

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
        accent: "#F5B544",
      };
    case "in_progress":
      return {
        title: "In progress",
        subtitle: "Quests already underway or waiting on validation.",
        accent: "#5B8FFF",
      };
    case "available":
      return {
        title: "Available quests",
        subtitle: "Simple actions you can start right now.",
        accent: "#E8834A",
      };
    case "completed":
      return {
        title: "Completed",
        subtitle: "Rewards already credited to your account.",
        accent: "#4AAA6B",
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
  const statusTone =
    state === "CLAIMABLE"
      ? "#F5B544"
      : state === "COMPLETED"
        ? "#4AAA6B"
        : state === "IN_PROGRESS"
          ? "#5B8FFF"
          : "#E8834A";

  return (
    <article
      style={{
        borderRadius: 22,
        border: `1px solid ${state === "CLAIMABLE" ? "rgba(245,181,68,0.55)" : "rgba(255,255,255,0.08)"}`,
        background:
          state === "CLAIMABLE"
            ? "linear-gradient(180deg, rgba(46,30,4,0.98) 0%, rgba(24,19,10,0.98) 100%)"
            : "linear-gradient(180deg, rgba(28,29,38,0.98) 0%, rgba(17,18,25,0.98) 100%)",
        boxShadow:
          state === "CLAIMABLE"
            ? "0 18px 40px rgba(245,181,68,0.16)"
            : "0 18px 32px rgba(0,0,0,0.24)",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "0.8rem",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "0.7rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.52)",
              fontWeight: 800,
            }}
          >
            {quest.type === "CONTEST_COUNT_MILESTONE"
              ? "Milestone"
              : (quest.configSummary.socialAction ??
                (quest.type === "SOCIAL_FOLLOW_X" ? "Follow" : "Quest"))}
          </p>
          <h3
            style={{
              margin: "0.2rem 0 0",
              fontSize: "1.05rem",
              color: "var(--color-text-primary)",
            }}
          >
            {quest.title}
          </h3>
        </div>
        <span
          style={{
            alignSelf: "flex-start",
            borderRadius: 999,
            padding: "0.35rem 0.7rem",
            fontSize: "0.72rem",
            fontWeight: 800,
            color: statusTone,
            border: `1px solid ${statusTone}55`,
            background: `${statusTone}18`,
          }}
        >
          {state.replace("_", " ")}
        </span>
      </div>

      <p
        style={{
          margin: 0,
          color: "rgba(255,255,255,0.68)",
          lineHeight: 1.45,
          minHeight: 44,
        }}
      >
        {quest.description ??
          quest.configSummary.instructions ??
          "Complete this quest to earn rewards."}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "0.75rem",
          alignItems: "center",
          borderRadius: 16,
          padding: "0.8rem 0.9rem",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.72rem",
              color: "rgba(255,255,255,0.52)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 800,
            }}
          >
            Reward
          </div>
          <div
            style={{
              color:
                state === "CLAIMABLE"
                  ? "#F5B544"
                  : "var(--color-accent-primary)",
              fontWeight: 800,
            }}
          >
            {formatReward(quest)}
          </div>
        </div>
        <div
          style={{
            textAlign: "right",
            color: "rgba(255,255,255,0.62)",
            fontSize: "0.8rem",
          }}
        >
          <div>{getProgressLabel(quest)}</div>
          <div>{formatDate(quest.completedAt ?? quest.startedAt)}</div>
        </div>
      </div>

      {manual && state !== "COMPLETED" && state !== "CLAIMABLE" ? (
        <div style={{ display: "grid", gap: "0.55rem" }}>
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
        className="btn"
        style={{
          width: "100%",
          justifyContent: "center",
          background:
            state === "COMPLETED"
              ? "rgba(74,170,107,0.16)"
              : state === "CLAIMABLE"
                ? "#F5B544"
                : undefined,
          color: state === "CLAIMABLE" ? "#201500" : undefined,
          opacity: disabled && state !== "COMPLETED" ? 0.72 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {busy ? "Working…" : getQuestCta(quest, state)}
      </button>

      {state === "IN_PROGRESS" ? (
        <p
          style={{
            margin: 0,
            fontSize: "0.8rem",
            color: "rgba(255,255,255,0.55)",
          }}
        >
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
      {showLoading ? <EmptyState title="Loading rewards…" /> : null}
      {!showLoading && !me ? (
        <div style={{ padding: "1.5rem 0", display: "grid", gap: "1rem" }}>
          <section
            style={{
              padding: "1.25rem",
              borderRadius: 20,
              background:
                "linear-gradient(180deg, rgba(30,31,40,0.98), rgba(20,21,28,0.98))",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: "2rem",
                color: "var(--color-text-primary)",
              }}
            >
              Rewards hub
            </h1>
            <p style={{ color: "rgba(255,255,255,0.68)", marginTop: "0.5rem" }}>
              Track live quests, milestone progress, and credited rewards in one
              tactile board.
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
        <div style={{ padding: "1.5rem 0", display: "grid", gap: "1.1rem" }}>
          <section
            style={{
              padding: "1.2rem",
              borderRadius: 24,
              background:
                "linear-gradient(135deg, rgba(36,24,14,0.98), rgba(19,20,29,0.98))",
              border: "1px solid rgba(232,131,74,0.22)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    color: "#E8834A",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    fontWeight: 800,
                    fontSize: "0.72rem",
                  }}
                >
                  Quest board
                </p>
                <h1
                  style={{
                    margin: "0.35rem 0 0",
                    fontSize: "2rem",
                    color: "var(--color-text-primary)",
                  }}
                >
                  Rewards & Quests
                </h1>
                <p
                  style={{
                    margin: "0.4rem 0 0",
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  Complete social actions, watch progress update, and get
                  credited without breaking ledger integrity.
                </p>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(130px, 1fr))",
                  gap: "0.75rem",
                  minWidth: "min(100%, 320px)",
                }}
              >
                <div
                  style={{
                    padding: "0.9rem",
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    style={{
                      color: "rgba(255,255,255,0.55)",
                      fontSize: "0.72rem",
                      textTransform: "uppercase",
                      fontWeight: 800,
                    }}
                  >
                    Current points
                  </div>
                  <div
                    style={{
                      color: "#F5B544",
                      fontWeight: 900,
                      fontSize: "1.35rem",
                    }}
                  >
                    {currentPoints.toLocaleString()}
                  </div>
                </div>
                <div
                  style={{
                    padding: "0.9rem",
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    style={{
                      color: "rgba(255,255,255,0.55)",
                      fontSize: "0.72rem",
                      textTransform: "uppercase",
                      fontWeight: 800,
                    }}
                  >
                    Total earned
                  </div>
                  <div
                    style={{
                      color: "var(--color-text-primary)",
                      fontWeight: 900,
                      fontSize: "1.35rem",
                    }}
                  >
                    {pointsEarned.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {message ? (
            <div
              style={{
                padding: "0.9rem 1rem",
                borderRadius: 16,
                color: "#9ef0b0",
                border: "1px solid rgba(74,170,107,0.3)",
                background: "rgba(74,170,107,0.12)",
              }}
            >
              {message}
            </div>
          ) : null}
          {error ? (
            <div
              style={{
                padding: "0.9rem 1rem",
                borderRadius: 16,
                color: "#ff9c95",
                border: "1px solid rgba(214,58,50,0.28)",
                background: "rgba(214,58,50,0.12)",
              }}
            >
              {error}
            </div>
          ) : null}

          {(
            [
              "claimable",
              "in_progress",
              "available",
              "completed",
            ] as SectionKey[]
          ).map((sectionKey) => {
            const section = grouped[sectionKey];
            const meta = getSectionMeta(sectionKey);
            if (section.length === 0 && sectionKey !== "completed") return null;
            return (
              <section
                key={sectionKey}
                style={{ display: "grid", gap: "0.8rem" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "end",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: 0,
                        color: meta.accent,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                      }}
                    >
                      {meta.title}
                    </p>
                    <h2
                      style={{
                        margin: "0.25rem 0 0",
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {section.length}{" "}
                      {section.length === 1 ? "quest" : "quests"}
                    </h2>
                    <p
                      style={{
                        margin: "0.25rem 0 0",
                        color: "rgba(255,255,255,0.6)",
                      }}
                    >
                      {meta.subtitle}
                    </p>
                  </div>
                </div>
                {section.length === 0 ? (
                  <div
                    style={{
                      padding: "1rem",
                      borderRadius: 18,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.03)",
                      color: "rgba(255,255,255,0.55)",
                    }}
                  >
                    Nothing here yet.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: "0.9rem",
                    }}
                  >
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
    </SiteShell>
  );
}
