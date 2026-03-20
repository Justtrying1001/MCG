"use client";

import type { MilestoneType } from "@/lib/domain/quests/social";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SiteShell } from "@/components/layout/SiteShell";
import { useSession } from "@/components/useSession";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConnectXCallout } from "@/components/auth/ConnectXCallout";

import { MILESTONE_SEED_DEFINITIONS } from "@/lib/domain/quests/milestone-definitions";
import { getMilestoneObjectiveText, resolveSocialCtaLabelForUserQuest } from "@/lib/domain/quests/social";

// ── Types ─────────────────────────────────────────────────────────────────────

type LedgerRow = {
  id: string;
  entryType: "CREDIT" | "DEBIT";
  amount: number;
  reasonType: string;
  reasonRef?: string | null;
  createdAt: string;
};

type QuestStatus = "AVAILABLE" | "IN_PROGRESS" | "PENDING_VALIDATION" | "CLAIMABLE" | "COMPLETED" | "REJECTED";
type SubmissionStatus = "SUBMITTED" | "APPROVED" | "REJECTED" | null;

type QuestRow = {
  id: string;
  code: string;
  type: "WELCOME" | "SOCIAL_FOLLOW_X" | "SOCIAL_ENGAGEMENT_X" | "CONTEST_COUNT_MILESTONE" | "MANUAL";
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

type HistoryRow = {
  id: string;
  title: string;
  itemType: "Quest" | "Milestone" | "Reward";
  points: number;
  happenedAt: string;
  dedupeKey: string;
};

// ── Milestone series definitions (UI layer) ───────────────────────────────────

// SVG icons (inline, no external dependency)
function IconBox() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}

function IconCard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <line x1="2" y1="9" x2="22" y2="9" />
      <line x1="8" y1="3" x2="8" y2="9" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconTrophy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
      <polyline points="8 21 12 17 16 21" />
      <line x1="12" y1="17" x2="12" y2="11" />
      <path d="M7 4H4a2 2 0 0 0-2 2v3a6 6 0 0 0 6 6" />
      <path d="M17 4h3a2 2 0 0 1 2 2v3a6 6 0 0 1-6 6" />
      <rect x="7" y="2" width="10" height="9" rx="1" />
    </svg>
  );
}

function IconCrown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
      <path d="M2 20h20" />
      <path d="M2 16l4-10 6 6 4-8 4 12" />
    </svg>
  );
}

function IconUserPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="16" y1="11" x2="22" y2="11" />
    </svg>
  );
}

function IconLightning() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

const SERIES_ICONS: Record<string, ReactNode> = {
  OPEN_PACKS: <IconBox />,
  TOTAL_CARDS_COLLECTED: <IconCard />,
  UNIQUE_CARDS_COLLECTED: <IconStar />,
  CONTESTS_JOINED: <IconTrophy />,
  CONTESTS_WON: <IconCrown />,
  REWARD_POINTS_EARNED: <IconLightning />,
};

// Tier colors (index 0 = Bronze, 1 = Silver, 2 = Gold, 3 = Platinum, 4 = Diamond)
const TIER_COLORS = [
  { bg: "#3D2200", border: "#CD7F32", color: "#E8A855", shadow: undefined },
  { bg: "#252525", border: "#A8A9AD", color: "#C8C9CC", shadow: undefined },
  { bg: "#3A2900", border: "#FFD700", color: "#FFE55C", shadow: undefined },
  { bg: "#1A2A2A", border: "#78BFBF", color: "#A8DFDF", shadow: undefined },
  { bg: "#1A1040", border: "#B9F2FF", color: "#D6F8FF", shadow: "0 0 12px rgba(185,242,255,0.2)" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function isSocial(quest: QuestRow) {
  return quest.type === "SOCIAL_FOLLOW_X" || quest.type === "SOCIAL_ENGAGEMENT_X";
}

function isMilestoneQuest(quest: QuestRow) {
  return quest.type === "CONTEST_COUNT_MILESTONE";
}

function isQuestCompleted(quest: QuestRow) {
  return quest.status === "COMPLETED" || quest.latestSubmissionStatus === "APPROVED";
}

function getQuestState(quest: QuestRow) {
  if (quest.status === "PENDING_VALIDATION") return "PENDING_VALIDATION" as const;
  if (quest.latestSubmissionStatus === "SUBMITTED") return "PENDING_REVIEW" as const;
  if (quest.latestSubmissionStatus === "REJECTED" || quest.status === "REJECTED") return "REJECTED" as const;
  if (isQuestCompleted(quest)) {
    if (quest.claimedAt) return "CLAIMED_SETTLED" as const;
    return "COMPLETED" as const;
  }
  if (quest.status === "IN_PROGRESS") return "IN_PROGRESS" as const;
  return "OPEN" as const;
}

function getGroupKey(quest: QuestRow) {
  if (quest.type === "SOCIAL_FOLLOW_X") return "follow";
  const action = quest.configSummary.socialAction ?? "";
  if (action === "RETWEET") return "repost";
  if (action === "LIKE") return "like";
  if (action === "COMMENT") return "comment";
  return "other";
}

function getGroupTitle(groupKey: string) {
  switch (groupKey) {
    case "follow": return "Follow";
    case "repost": return "Repost";
    case "like": return "Like";
    case "comment": return "Comment";
    default: return "Other";
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatPts(n: number) {
  return `+${n.toLocaleString()} pts`;
}

function formatReward(quest: Pick<QuestRow, "rewardPoints" | "rewardPackCode" | "rewardPackQuantity">) {
  const pts = quest.rewardPoints > 0 ? formatPts(quest.rewardPoints) : null;
  const pack = quest.rewardPackCode ? `🎁 ${quest.rewardPackQuantity ?? 1} pack` : null;
  if (pts && pack) return `${pts} + ${pack}`;
  if (pts) return pts;
  if (pack) return pack;
  return "—";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function QuestCard({
  quest,
  submittingId,
  proofUrlByQuest,
  noteByQuest,
  onProofUrlChange,
  onNoteChange,
  onAutoTrigger,
  onManualSubmit,
}: {
  quest: QuestRow;
  submittingId: string | null;
  proofUrlByQuest: Record<string, string>;
  noteByQuest: Record<string, string>;
  onProofUrlChange: (id: string, value: string) => void;
  onNoteChange: (id: string, value: string) => void;
  onAutoTrigger: (quest: QuestRow) => void;
  onManualSubmit: (quest: QuestRow) => void;
}) {
  const state = getQuestState(quest);
  const proofRequired = Boolean(quest.configSummary.proofRequired);
  const canAutoTrigger = quest.validationMode === "AUTO" && Boolean(quest.configSummary.targetUrl) && state !== "PENDING_REVIEW" && state !== "PENDING_VALIDATION";
  const canSubmitManually = quest.validationMode !== "AUTO";

  const statusBadge = (() => {
    if (state === "PENDING_VALIDATION") return { label: "VALIDATING", style: { background: "rgba(91,143,255,0.15)", color: "#5B8FFF", border: "1px solid rgba(91,143,255,0.3)" } };
    if (state === "PENDING_REVIEW") return { label: "PENDING", style: { background: "rgba(240,164,58,0.15)", color: "#F0A43A", border: "1px solid rgba(240,164,58,0.3)" } };
    if (state === "REJECTED") return { label: "REJECTED", style: { background: "rgba(214,58,50,0.15)", color: "#E05550", border: "1px solid rgba(214,58,50,0.3)" } };
    return { label: "OPEN", style: { background: "rgba(232,131,74,0.15)", color: "var(--color-accent-primary)", border: "1px solid rgba(232,131,74,0.3)" } };
  })();

  return (
    <article style={{
      background: "#1E1E24",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: "1rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.6rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: "0.2rem" }}>
            {quest.type === "SOCIAL_FOLLOW_X" ? "Follow" : (quest.configSummary.socialAction ?? "Engagement")}
          </p>
          <h4 style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1.3 }}>{quest.title}</h4>
        </div>
        <span style={{ ...statusBadge.style, fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap", flexShrink: 0 }}>
          {statusBadge.label}
        </span>
      </div>

      <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>
        {quest.description ?? quest.configSummary.instructions ?? "Complete this quest to earn points."}
      </p>

      <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-accent-primary)" }}>{formatReward(quest)}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {state === "PENDING_VALIDATION" && (
          <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)" }}>Validating... rewards will unlock automatically once the backend delay has elapsed.</p>
        )}

        {state === "PENDING_REVIEW" && (
          <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)" }}>Submission pending review.</p>
        )}

        {canAutoTrigger && (
          <button
            disabled={submittingId === quest.id}
            onClick={() => onAutoTrigger(quest)}
            style={{
              width: "100%",
              padding: "0.55rem 1rem",
              borderRadius: 8,
              border: "none",
              background: submittingId === quest.id ? "rgba(232,131,74,0.3)" : "#E8834A",
              color: "var(--color-text-primary)",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: submittingId === quest.id ? "not-allowed" : "pointer",
            }}
          >
            {resolveSocialCtaLabelForUserQuest(quest)}
          </button>
        )}

        {canSubmitManually && (
          <>
            <input
              style={{
                width: "100%",
                padding: "0.45rem 0.7rem",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
                color: "var(--color-text-primary)",
                fontSize: "0.8rem",
              }}
              placeholder={proofRequired ? "Proof URL (required)" : "Proof URL (optional)"}
              value={proofUrlByQuest[quest.id] ?? ""}
              onChange={(e) => onProofUrlChange(quest.id, e.target.value)}
            />
            <textarea
              style={{
                width: "100%",
                padding: "0.45rem 0.7rem",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
                color: "var(--color-text-primary)",
                fontSize: "0.8rem",
                resize: "vertical",
              }}
              rows={2}
              placeholder="Note for moderation (optional)"
              value={noteByQuest[quest.id] ?? ""}
              onChange={(e) => onNoteChange(quest.id, e.target.value)}
            />
            <button
              disabled={state === "PENDING_REVIEW" || submittingId === quest.id || (proofRequired && !(proofUrlByQuest[quest.id] ?? "").trim())}
              onClick={() => onManualSubmit(quest)}
              style={{
                width: "100%",
                padding: "0.55rem 1rem",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(148,163,184,0.08)",
                color: "var(--color-text-primary)",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Submit proof
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function CompletedQuestCard({ quest }: { quest: QuestRow }) {
  return (
    <article style={{
      background: "#1E1E24",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: "1rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
      opacity: 0.75,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: "0.15rem" }}>
            {quest.type === "SOCIAL_FOLLOW_X" ? "Follow" : (quest.configSummary.socialAction ?? "Engagement")}
          </p>
          <h4 style={{ fontSize: "0.88rem", fontWeight: 700, color: "rgba(255,255,255,0.8)", lineHeight: 1.3 }}>{quest.title}</h4>
        </div>
        <span style={{ background: "rgba(74,170,107,0.15)", color: "#4AAA6B", border: "1px solid rgba(74,170,107,0.3)", fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap", flexShrink: 0 }}>
          SETTLED
        </span>
      </div>
      <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>{quest.description ?? "Social quest"}</p>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-accent-primary)" }}>{formatReward(quest)}</span>
        <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>Completed {formatDate(quest.completedAt)}</span>
      </div>
    </article>
  );
}

function MilestoneBadge({ code, category, title, objective, rewardPoints, rewardPackCode, rewardPackQuantity, completedAt, tierIndex }: {
  code: string;
  category: string;
  title: string;
  objective: string;
  rewardPoints: number;
  rewardPackCode?: string;
  rewardPackQuantity?: number;
  completedAt: string | null;
  tierIndex: number;
}) {
  const unlocked = Boolean(completedAt);
  const tier = TIER_COLORS[Math.min(tierIndex, TIER_COLORS.length - 1)];
  const icon = SERIES_ICONS[category];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.45rem", flexShrink: 0 }}>
      {/* Badge circle */}
      <div style={{ position: "relative" }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: unlocked ? tier.bg : "#1E1E24",
          border: `2px solid ${unlocked ? tier.border : "rgba(255,255,255,0.1)"}`,
          boxShadow: unlocked && tier.shadow ? tier.shadow : undefined,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: unlocked ? tier.color : "rgba(255,255,255,0.3)",
          opacity: unlocked ? 1 : 0.85,
        }}>
          <span style={{ opacity: unlocked ? 1 : 0.3, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {icon}
          </span>
        </div>
        {/* Checkmark */}
        {unlocked && (
          <div style={{
            position: "absolute",
            bottom: -4,
            right: -4,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#4AAA6B",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.65rem",
            color: "var(--color-text-primary)",
            fontWeight: 700,
            border: "2px solid #1A1A1F",
          }}>
            ✓
          </div>
        )}
      </div>

      {/* Text below — only if unlocked */}
      {unlocked && (
        <div style={{ textAlign: "center", maxWidth: 88 }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1.2 }}>{title}</p>
          <p style={{ fontSize: "0.64rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.3, marginTop: "0.15rem" }}>{objective}</p>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-accent-primary)", marginTop: "0.15rem" }}>
            {formatReward({ rewardPoints, rewardPackCode: rewardPackCode ?? null, rewardPackQuantity: rewardPackQuantity ?? null })}
          </p>
          <p style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)", marginTop: "0.1rem" }}>{formatDate(completedAt)}</p>
        </div>
      )}
    </div>
  );
}

// ── Main page component ───────────────────────────────────────────────────────

type TabId = "quests" | "milestones" | "history";

type MilestoneToast = {
  key: string;
  title: string;
  rewardLabel: string | null;
};

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
  const [activeTab, setActiveTab] = useState<TabId>("quests");
  const [completedOpen, setCompletedOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(20);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [hasConfirmedSession, setHasConfirmedSession] = useState(false);
  const [stableSession, setStableSession] = useState(me);
  const [milestoneToast, setMilestoneToast] = useState<MilestoneToast | null>(null);

  const seenCompletionRef = useRef<Map<string, string>>(new Map());
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    setQuestsError("");
    setLedgerError("");

    try {
      const [questsResult, ledgerResult] = await Promise.allSettled([
        fetch("/api/quests", { cache: "no-store" }),
        fetch("/api/rewards/ledger", { cache: "no-store" }),
      ]);

      if (questsResult.status === "rejected") {
        setQuestsError("Cannot load quests data (network error)");
      } else if (!questsResult.value.ok) {
        setQuestsError(`Cannot load quests data (${questsResult.value.status})`);
      } else {
        const payload = (await questsResult.value.json()) as { quests?: QuestRow[] };
        const nextQuests = payload.quests ?? [];
        const nextCompletionMap = new Map<string, string>();
        const newlyCompletedMilestones: QuestRow[] = [];

        for (const quest of nextQuests) {
          const completionStamp = quest.completedAt ?? quest.claimedAt;
          if (!completionStamp) continue;
          nextCompletionMap.set(quest.id, completionStamp);

          if (!isMilestoneQuest(quest)) continue;

          const previousStamp = seenCompletionRef.current.get(quest.id);
          if (previousStamp === undefined) continue;
          if (previousStamp !== completionStamp) {
            newlyCompletedMilestones.push(quest);
          }
        }

        if (seenCompletionRef.current.size === 0) {
          seenCompletionRef.current = nextCompletionMap;
        } else {
          seenCompletionRef.current = nextCompletionMap;
          const newestMilestone = newlyCompletedMilestones
            .sort((a, b) => new Date(b.completedAt ?? b.claimedAt ?? 0).getTime() - new Date(a.completedAt ?? a.claimedAt ?? 0).getTime())[0];
          if (newestMilestone) {
            const rewardLabel = formatReward(newestMilestone);
            setMilestoneToast({
              key: `${newestMilestone.id}:${newestMilestone.completedAt ?? newestMilestone.claimedAt ?? "completed"}`,
              title: newestMilestone.title,
              rewardLabel: rewardLabel === "—" ? null : rewardLabel,
            });
          }
        }

        setQuests(nextQuests);
      }

      if (ledgerResult.status === "rejected") {
        setLedgerError("Cannot load rewards ledger (network error)");
      } else if (!ledgerResult.value.ok) {
        setLedgerError(`Cannot load rewards ledger (${ledgerResult.value.status})`);
      } else {
        const payload = (await ledgerResult.value.json()) as { entries?: LedgerRow[] };
        setLedger(payload.entries ?? []);
      }

      if (
        (questsResult.status === "fulfilled" && questsResult.value.ok) ||
        (ledgerResult.status === "fulfilled" && ledgerResult.value.ok)
      ) {
        setHasLoadedData(true);
      }
    } catch {
      setQuestsError("Cannot load quests data (unexpected error)");
      setLedgerError("Cannot load rewards ledger (unexpected error)");
    } finally {
      setLoadingData(false);
    }
  }, []);

  const submitQuest = async (quest: QuestRow, mode: "manual" | "auto") => {
    setSubmittingId(quest.id);
    setActionMsg("");

    const proofUrl = proofUrlByQuest[quest.id]?.trim();
    const note = noteByQuest[quest.id]?.trim();

    const response = await fetch(`/api/quests/${quest.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mode === "manual" ? { proofUrl: proofUrl || undefined, note: note || undefined } : {}),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setActionMsg(payload?.error ?? "Quest submission failed");
      setSubmittingId(null);
      return;
    }

    setActionMsg(mode === "auto" ? "Quest started. Backend validation is now in progress." : "Quest proof submitted for validation.");
    await loadData();
    setSubmittingId(null);
  };

  const startAutoSocialQuest = (quest: QuestRow) => {
    if (!quest.configSummary.targetUrl || submittingId === quest.id) return;
    window.open(quest.configSummary.targetUrl, "_blank", "noopener,noreferrer");
    void submitQuest(quest, "auto");
  };

  useEffect(() => {
    if (loading) return;

    setHasConfirmedSession(true);

    if (!me) {
      if (!hasLoadedData) {
        setLoadingData(false);
      }
      return;
    }

    void loadData();
  }, [hasLoadedData, loadData, loading, me]);


  useEffect(() => {
    if (me) {
      setStableSession(me);
    }
  }, [me]);

  useEffect(() => {
    if (!milestoneToast) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setMilestoneToast(null), 4200);
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [milestoneToast]);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  // ── View model ──────────────────────────────────────────────────────────────

  const viewModel = useMemo(() => {
    const socialQuests = quests.filter(isSocial);

    const activeGroups: Array<{ key: string; title: string; quests: QuestRow[] }> = [];
    const groupMap = new Map<string, QuestRow[]>();

    for (const quest of socialQuests) {
      const state = getQuestState(quest);
      if (state === "COMPLETED" || state === "CLAIMED_SETTLED") continue;
      const key = getGroupKey(quest);
      const arr = groupMap.get(key) ?? [];
      arr.push(quest);
      groupMap.set(key, arr);
    }

    // Preferred group order
    for (const key of ["comment", "like", "repost", "follow", "other"]) {
      const arr = groupMap.get(key);
      if (arr && arr.length > 0) {
        activeGroups.push({ key, title: getGroupTitle(key), quests: arr });
      }
    }

    const completedSocialQuests = socialQuests
      .filter((q) => { const s = getQuestState(q); return s === "COMPLETED" || s === "CLAIMED_SETTLED"; })
      .sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime());

    const openQuestCount = socialQuests.filter((q) => getQuestState(q) === "OPEN").length;

    // Milestones: build per-series rows
    const seedByCode = new Map(MILESTONE_SEED_DEFINITIONS.map((d) => [d.code, d] as const));

    const completedMilestoneByCode = new Map<string, { completedAt: string | null }>();
    for (const q of quests.filter(isMilestoneQuest)) {
      const state = getQuestState(q);
      if (state === "COMPLETED" || state === "CLAIMED_SETTLED") {
        completedMilestoneByCode.set(q.code, { completedAt: q.completedAt });
      }
    }

    // Group milestone definitions by category, in order
    const seriesOrder: string[] = [];
    const seriesMap = new Map<string, typeof MILESTONE_SEED_DEFINITIONS>();
    for (const def of MILESTONE_SEED_DEFINITIONS) {
      if (!seriesMap.has(def.category)) {
        seriesMap.set(def.category, []);
        seriesOrder.push(def.category);
      }
      seriesMap.get(def.category)!.push(def);
    }

    const milestoneSeries = seriesOrder.map((category) => {
      const defs = seriesMap.get(category) ?? [];
      return {
        category,
        badges: defs.map((def, idx) => {
          const completed = completedMilestoneByCode.get(def.code);
          return {
            code: def.code,
            category: def.category,
            title: def.title,
            objective: getMilestoneObjectiveText(def.metricKey, def.threshold),
            rewardPoints: def.rewardPoints,
            rewardPackCode: def.rewardPackDefinitionCode ?? undefined,
            rewardPackQuantity: def.rewardPackQuantity ?? undefined,
            completedAt: completed?.completedAt ?? null,
            tierIndex: idx,
          };
        }),
      };
    });

    // History
    const questById = new Map(quests.map((q) => [q.id, q] as const));
    const historyRows = new Map<string, HistoryRow>();

    for (const entry of ledger) {
      if (entry.entryType !== "CREDIT" || entry.reasonType !== "QUEST_REWARD") continue;
      const quest = entry.reasonRef ? questById.get(entry.reasonRef) : undefined;
      const row: HistoryRow = {
        id: `ledger-${entry.id}`,
        itemType: quest ? (isMilestoneQuest(quest) ? "Milestone" : "Quest") : "Reward",
        title: quest?.title ?? (entry.reasonRef ? `Quest ${entry.reasonRef}` : "Quest reward"),
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
      historyRows.set(`fallback:${quest.id}`, {
        id: `quest-${quest.id}`,
        itemType: isMilestoneQuest(quest) ? "Milestone" : "Quest",
        title: quest.title,
        points: quest.rewardPoints,
        happenedAt,
        dedupeKey: `fallback:${quest.id}`,
      });
    }

    return {
      activeGroups,
      completedSocialQuests,
      openQuestCount,
      milestoneSeries,
      historyRows: [...historyRows.values()].sort((a, b) => new Date(b.happenedAt).getTime() - new Date(a.happenedAt).getTime()),
    };
  }, [ledger, quests]);

  const totalCredits = ledger.filter((e) => e.entryType === "CREDIT").reduce((s, e) => s + e.amount, 0);
  const sessionUser = me ?? stableSession;
  const currentPoints = sessionUser?.user.points ?? 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  const TAB_BORDER = "var(--color-accent-primary)";
  const BG_CARD = "var(--color-surface-1)";
  const BORDER_COLOR = "var(--color-border-subtle)";
  const TEXT_MUTED = "var(--color-text-secondary)";
  const showInitialLoading = !hasConfirmedSession || (!hasLoadedData && loadingData);
  const showRefreshNotice = hasLoadedData && loadingData;

  function tabStyle(id: TabId) {
    const active = activeTab === id;
    return {
      display: "inline-flex",
      alignItems: "center",
      gap: "0.35rem",
      padding: "0.65rem 1rem",
      fontSize: "0.87rem",
      fontWeight: 600,
      color: active ? "#fff" : TEXT_MUTED,
      background: "none",
      border: "none",
      borderBottom: `2px solid ${active ? TAB_BORDER : "transparent"}`,
      cursor: "pointer",
      transition: "color 120ms, border-color 120ms",
      marginBottom: "-1px",
      whiteSpace: "nowrap" as const,
    };
  }

  return (
    <SiteShell>
      {milestoneToast ? (
        <div
          key={milestoneToast.key}
          aria-live="polite"
          role="status"
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            zIndex: 80,
            width: "min(340px, calc(100vw - 2rem))",
            padding: "0.9rem 1rem",
            borderRadius: 16,
            border: "1px solid rgba(232,131,74,0.24)",
            background: "linear-gradient(180deg, rgba(24,24,31,0.96) 0%, rgba(18,18,24,0.98) 100%)",
            boxShadow: "0 18px 44px rgba(0,0,0,0.36), 0 0 0 1px rgba(255,255,255,0.04) inset",
            backdropFilter: "blur(16px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(232,131,74,0.14)",
              border: "1px solid rgba(232,131,74,0.22)",
              color: "#E8834A",
              flexShrink: 0,
              fontSize: "1rem",
            }}
            >
              ✦
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#E8834A", marginBottom: "0.2rem" }}>
                Milestone unlocked
              </p>
              <p style={{ fontSize: "0.98rem", fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1.3 }}>
                {milestoneToast.title}
              </p>
              {milestoneToast.rewardLabel ? (
                <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.68)", marginTop: "0.2rem" }}>
                  {milestoneToast.rewardLabel}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setMilestoneToast(null)}
              aria-label="Dismiss milestone notification"
              style={{
                border: "none",
                background: "transparent",
                color: "rgba(255,255,255,0.52)",
                cursor: "pointer",
                fontSize: "1rem",
                lineHeight: 1,
                padding: 0,
              }}
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
      {showInitialLoading ? <EmptyState title="Loading rewards…" /> : null}
      {!showInitialLoading && !me ? (
        <div style={{ padding: "1.5rem 0", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ padding: "1.25rem", background: BG_CARD, border: `1px solid ${BORDER_COLOR}`, borderRadius: 12 }}>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "0.2rem" }}>Rewards</h1>
            <p style={{ fontSize: "0.9rem", color: TEXT_MUTED, marginBottom: "1rem" }}>Quests, milestones &amp; earning history stay organized here once you connect.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
              <div style={{ padding: "1rem", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_COLOR}`, display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                <div>
                  <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: TEXT_MUTED, marginBottom: "0.35rem" }}>Quests</p>
                  <strong style={{ color: "var(--color-text-primary)" }}>Follow, repost, like, comment</strong>
                  <p style={{ fontSize: "0.82rem", color: TEXT_MUTED, marginTop: "0.35rem" }}>Social quests appear here with direct CTAs and proof submission when needed.</p>
                </div>
                <ConnectXCallout layout="inline" title="Quest actions" description="Start social quests and submit proof from this section once your account is connected." ctaLabel="Connect X to start quests" />
              </div>
              <div style={{ padding: "1rem", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_COLOR}`, display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                <div>
                  <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: TEXT_MUTED, marginBottom: "0.35rem" }}>Milestones</p>
                  <strong style={{ color: "var(--color-text-primary)" }}>Pack, collection, and contest progression</strong>
                  <p style={{ fontSize: "0.82rem", color: TEXT_MUTED, marginTop: "0.35rem" }}>Long-term reward tracks unlock as your account grows.</p>
                </div>
                <ConnectXCallout layout="inline" title="Milestone rewards" description="Unlock progression-based rewards here as your account, collection, and contest record grow." ctaLabel="Connect X to unlock milestones" />
              </div>
              <div style={{ padding: "1rem", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER_COLOR}`, display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                <div>
                  <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: TEXT_MUTED, marginBottom: "0.35rem" }}>History</p>
                  <strong style={{ color: "var(--color-text-primary)" }}>Points and pack rewards ledger</strong>
                  <p style={{ fontSize: "0.82rem", color: TEXT_MUTED, marginTop: "0.35rem" }}>Your completed quests and credited rewards are listed in a single timeline.</p>
                </div>
                <ConnectXCallout layout="inline" title="Reward history" description="See your credited points, packs, and reward events here after you connect." ctaLabel="Connect X to view your reward history" />
              </div>
            </div>
          </div>
        </div>
      ) : !showInitialLoading && (me || hasLoadedData) ? (
        <div style={{ padding: "1.5rem 0" }}>

          {/* ── Page header ── */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "0.2rem" }}>Rewards</h1>
            <p style={{ fontSize: "0.9rem", color: TEXT_MUTED, marginBottom: "0.6rem" }}>Quests, milestones &amp; earning history</p>
            {showRefreshNotice ? (
              <p aria-live="polite" style={{ fontSize: "0.8rem", color: TEXT_MUTED }}>
                Refreshing rewards…
              </p>
            ) : null}
          </div>

          {/* ── Summary strip ── */}
          <div style={{
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
            marginBottom: "1.25rem",
            padding: "0.9rem 1.1rem",
            background: BG_CARD,
            border: `1px solid ${BORDER_COLOR}`,
            borderRadius: 12,
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem", minWidth: 120 }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: TEXT_MUTED }}>Current points</span>
              <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-accent-primary)" }}>{currentPoints.toLocaleString()}</span>
            </div>
            <div style={{ width: 1, background: BORDER_COLOR, alignSelf: "stretch" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem", minWidth: 120 }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: TEXT_MUTED }}>Total ever earned</span>
              <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text-primary)" }}>{totalCredits.toLocaleString()}</span>
            </div>
            <div style={{ width: 1, background: BORDER_COLOR, alignSelf: "stretch" }} />
          </div>

          {/* ── Error banners ── */}
          {questsError && <div style={{ padding: "0.6rem 0.9rem", background: "rgba(214,58,50,0.12)", border: "1px solid rgba(214,58,50,0.25)", borderRadius: 8, color: "#E05550", fontSize: "0.82rem", marginBottom: "0.75rem" }}>{questsError}</div>}
          {ledgerError && <div style={{ padding: "0.6rem 0.9rem", background: "rgba(214,58,50,0.12)", border: "1px solid rgba(214,58,50,0.25)", borderRadius: 8, color: "#E05550", fontSize: "0.82rem", marginBottom: "0.75rem" }}>{ledgerError}</div>}
          {actionMsg && <div style={{ padding: "0.6rem 0.9rem", background: "rgba(74,170,107,0.1)", border: "1px solid rgba(74,170,107,0.25)", borderRadius: 8, color: "#4AAA6B", fontSize: "0.82rem", marginBottom: "0.75rem" }}>{actionMsg}</div>}

          {/* ── Tab bar ── */}
          <div style={{ borderBottom: `1px solid ${BORDER_COLOR}`, marginBottom: "1.5rem", display: "flex", overflowX: "auto" }}>
            <button style={tabStyle("quests")} onClick={() => setActiveTab("quests")}>
              Quests
              {viewModel.openQuestCount > 0 && (
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999,
                  background: activeTab === "quests" ? "rgba(232,131,74,0.18)" : "rgba(255,255,255,0.08)",
                  color: activeTab === "quests" ? "#E8834A" : TEXT_MUTED,
                  fontSize: "0.65rem", fontWeight: 700,
                }}>
                  {viewModel.openQuestCount}
                </span>
              )}
            </button>
            <button style={tabStyle("milestones")} onClick={() => setActiveTab("milestones")}>Milestones</button>
            <button style={tabStyle("history")} onClick={() => setActiveTab("history")}>History</button>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              TAB 1 — Quests
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "quests" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

              {/* Active quest groups */}
              {viewModel.activeGroups.length === 0 && (
                <div style={{ textAlign: "center", padding: "2rem", color: TEXT_MUTED }}>
                  <p style={{ fontWeight: 600 }}>No open quests</p>
                  <p style={{ fontSize: "0.82rem", marginTop: "0.3rem" }}>All social quests are completed or settled.</p>
                </div>
              )}

              {viewModel.activeGroups.map((group) => (
                <div key={group.key}>
                  <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: TEXT_MUTED, marginBottom: "0.65rem" }}>
                    {group.title}
                  </p>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "0.75rem",
                  }}>
                    {group.quests.map((quest) => (
                      <QuestCard
                        key={quest.id}
                        quest={quest}
                        submittingId={submittingId}
                        proofUrlByQuest={proofUrlByQuest}
                        noteByQuest={noteByQuest}
                        onProofUrlChange={(id, v) => setProofUrlByQuest((p) => ({ ...p, [id]: v }))}
                        onNoteChange={(id, v) => setNoteByQuest((p) => ({ ...p, [id]: v }))}
                        onAutoTrigger={startAutoSocialQuest}
                        onManualSubmit={(q) => { void submitQuest(q, "manual"); }}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Completed accordion */}
              {viewModel.completedSocialQuests.length > 0 && (
                <div>
                  <button
                    onClick={() => setCompletedOpen((v) => !v)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.65rem 0.9rem",
                      width: "100%",
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${BORDER_COLOR}`,
                      borderRadius: completedOpen ? "12px 12px 0 0" : 12,
                      color: TEXT_MUTED,
                      fontSize: "0.84rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ flex: 1 }}>Completed quests ({viewModel.completedSocialQuests.length})</span>
                    <span style={{ fontSize: "0.75rem" }}>{completedOpen ? "▲" : "▼"}</span>
                  </button>

                  {completedOpen && (
                    <div style={{
                      border: `1px solid ${BORDER_COLOR}`,
                      borderTop: "none",
                      borderRadius: "0 0 12px 12px",
                      padding: "0.85rem",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                      gap: "0.65rem",
                    }}>
                      {viewModel.completedSocialQuests.map((quest) => (
                        <CompletedQuestCard key={quest.id} quest={quest} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2 — Milestones
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "milestones" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              {viewModel.milestoneSeries.map((series) => (
                <div key={series.category}>
                  {/* Badge row — horizontal scroll on mobile */}
                  <div style={{
                    overflowX: "auto",
                    paddingBottom: "0.5rem",
                  }}>
                    <div style={{
                      display: "flex",
                      gap: "1.25rem",
                      paddingBottom: "0.25rem",
                      minWidth: "max-content",
                    }}>
                      {series.badges.map((badge) => (
                        <MilestoneBadge
                          key={badge.code}
                          code={badge.code}
                          category={badge.category}
                          title={badge.title}
                          objective={badge.objective}
                          rewardPoints={badge.rewardPoints}
                          rewardPackCode={badge.rewardPackCode}
                          rewardPackQuantity={badge.rewardPackQuantity}
                          completedAt={badge.completedAt}
                          tierIndex={badge.tierIndex}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Row separator */}
                  <div style={{ height: 1, background: BORDER_COLOR, marginTop: "1rem" }} />
                </div>
              ))}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 3 — History
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "history" && (
            <div>
              {viewModel.historyRows.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2.5rem", color: TEXT_MUTED }}>
                  <p style={{ fontWeight: 600 }}>No history yet</p>
                  <p style={{ fontSize: "0.82rem", marginTop: "0.3rem" }}>Complete quests or milestones to populate your history.</p>
                </div>
              ) : (
                <>
                  <div style={{
                    background: BG_CARD,
                    border: `1px solid ${BORDER_COLOR}`,
                    borderRadius: 12,
                    overflow: "hidden",
                  }}>
                    {viewModel.historyRows.slice(0, historyPage).map((row, idx) => (
                      <div
                        key={row.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "auto 1fr auto auto",
                          gap: "0.75rem 1rem",
                          alignItems: "center",
                          padding: "0.75rem 1rem",
                          borderBottom: idx < Math.min(historyPage, viewModel.historyRows.length) - 1 ? `1px solid ${BORDER_COLOR}` : "none",
                        }}
                      >
                        {/* Type icon */}
                        <div style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: row.itemType === "Milestone" ? "rgba(46,107,255,0.15)" : "rgba(232,131,74,0.15)",
                          border: `1px solid ${row.itemType === "Milestone" ? "rgba(46,107,255,0.3)" : "rgba(232,131,74,0.3)"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.62rem",
                          fontWeight: 700,
                          color: row.itemType === "Milestone" ? "#5B8FFF" : "#E8834A",
                          flexShrink: 0,
                        }}>
                          {row.itemType === "Milestone" ? "M" : "Q"}
                        </div>

                        {/* Name */}
                        <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--color-text-primary)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.title}
                        </span>

                        {/* Points */}
                        <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--color-accent-primary)", whiteSpace: "nowrap" }}>
                          +{row.points.toLocaleString()}
                        </span>

                        {/* Date */}
                        <span style={{ fontSize: "0.75rem", color: TEXT_MUTED, whiteSpace: "nowrap" }}>
                          {formatDate(row.happenedAt)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {viewModel.historyRows.length > historyPage && (
                    <div style={{ textAlign: "center", marginTop: "1rem" }}>
                      <button
                        onClick={() => setHistoryPage((p) => p + 20)}
                        style={{
                          padding: "0.55rem 1.5rem",
                          borderRadius: 8,
                          border: `1px solid ${BORDER_COLOR}`,
                          background: "rgba(255,255,255,0.05)",
                          color: "var(--color-text-primary)",
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          cursor: "pointer",
                        }}
                      >
                        Load more
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      ) : null}
    </SiteShell>
  );
}
