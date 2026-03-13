"use client";

import type { MilestoneType } from "@/lib/domain/quests/social";

import { useEffect, useMemo, useRef, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { useSession } from "@/components/useSession";
import { getMilestoneObjectiveText, resolveSocialCtaLabelForUserQuest } from "@/lib/domain/quests/social";

/* ── Types ── */
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
type MilestoneTemplate = { type: MilestoneType; title: string; targetValue: number; icon: string };

const milestoneCatalog: MilestoneTemplate[] = [
  { type: "PACK_OPEN_COUNT", title: "Pack Explorer", targetValue: 5, icon: "📦" },
  { type: "TOTAL_CARDS_COLLECTED", title: "Collection Starter", targetValue: 50, icon: "🃏" },
  { type: "UNIQUE_CARDS_COLLECTED", title: "Unique Hunter", targetValue: 20, icon: "🧩" },
  { type: "CONTESTS_JOINED", title: "Arena Challenger", targetValue: 3, icon: "⚔️" },
  { type: "CONTESTS_TOP3", title: "Top 3 Finisher", targetValue: 2, icon: "🥉" },
  { type: "REWARD_POINTS_EARNED", title: "Points Grinder", targetValue: 5000, icon: "✨" },
];

function isSocial(q: QuestRow) { return q.type === "SOCIAL_FOLLOW_X" || q.type === "SOCIAL_ENGAGEMENT_X"; }
function isMilestone(q: QuestRow) { return q.type === "CONTEST_COUNT_MILESTONE"; }

function questStatusBadgeClass(q: QuestRow): string {
  if (q.latestSubmissionStatus === "SUBMITTED") return "mission-status-badge msb-submitted";
  if (q.latestSubmissionStatus === "REJECTED") return "mission-status-badge msb-rejected";
  switch (q.status) {
    case "AVAILABLE": return "mission-status-badge msb-available";
    case "IN_PROGRESS": return "mission-status-badge msb-in-progress";
    case "CLAIMABLE": return "mission-status-badge msb-claimable";
    case "COMPLETED": return "mission-status-badge msb-completed";
    case "REJECTED": return "mission-status-badge msb-rejected";
    default: return "mission-status-badge msb-available";
  }
}
function questStatusLabel(q: QuestRow): string {
  if (q.latestSubmissionStatus === "SUBMITTED") return "Under review";
  if (q.latestSubmissionStatus === "REJECTED") return "Rejected";
  switch (q.status) {
    case "AVAILABLE": return "Available";
    case "IN_PROGRESS": return "In progress";
    case "CLAIMABLE": return "Claimable";
    case "COMPLETED": return "Completed";
    case "REJECTED": return "Rejected";
    default: return q.status;
  }
}
function questIcon(q: QuestRow): string {
  if (isSocial(q)) return "✦";
  if (isMilestone(q)) return "🏆";
  return "◈";
}
function missionCardClass(q: QuestRow): string {
  if (q.status === "COMPLETED") return "mission-card is-completed";
  if (q.status === "CLAIMABLE") return "mission-card is-claimable";
  return "mission-card";
}
function progressFillClass(q: QuestRow): string {
  if (q.status === "COMPLETED" || q.latestSubmissionStatus === "APPROVED") return "mission-progress-fill done";
  if (q.status === "CLAIMABLE") return "mission-progress-fill claimable";
  return "mission-progress-fill";
}

export default function RewardsPage() {
  const { me, loading } = useSession();
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<RewardsTab>("social");
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [autoPendingByQuest, setAutoPendingByQuest] = useState<Record<string, number>>({});
  const [milestoneInfoOpen, setMilestoneInfoOpen] = useState<MilestoneType | null>(null);
  const [actionMsg, setActionMsg] = useState("");
  const [clock, setClock] = useState(() => Date.now());
  const autoTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const loadData = async () => {
    const [lRes, qRes] = await Promise.all([
      fetch("/api/rewards/ledger", { cache: "no-store" }),
      fetch("/api/quests", { cache: "no-store" }),
    ]);
    if (!lRes.ok || !qRes.ok) { setError("Cannot load rewards data"); return; }
    const lp = (await lRes.json()) as { entries: LedgerRow[] };
    const qp = (await qRes.json()) as { quests: QuestRow[] };
    setLedger(lp.entries ?? []);
    setQuests(qp.quests ?? []);
  };

  const submitQuest = async (questId: string, source: "manual" | "auto" = "manual") => {
    setSubmittingId(questId); setActionMsg("");
    const res = await fetch(`/api/quests/${questId}/submit`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const p = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setActionMsg(p?.error ?? "Quest submission failed");
      setSubmittingId(null); return;
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
      void submitQuest(quest.id, "auto");
    }, 60_000);

    autoTimerRef.current.set(quest.id, timeout);
  };

  useEffect(() => {
    if (loading || !me || me.mode === "guest") return;
    setError("");
    void loadData();
  }, [loading, me]);

  useEffect(() => () => {
    autoTimerRef.current.forEach((timer) => clearTimeout(timer));
    autoTimerRef.current.clear();
  }, []);

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

    const milestoneByType = new Map<MilestoneType, QuestRow>();
    milestones.forEach((milestoneQuest) => {
      const type = milestoneQuest.configSummary.milestoneType;
      if (!type) return;
      const existing = milestoneByType.get(type);
      if (!existing || (milestoneQuest.targetValue ?? 0) > (existing.targetValue ?? 0)) {
        milestoneByType.set(type, milestoneQuest);
      }
    });

    return { social, milestones, completed, milestoneByType };
  }, [quests]);

  const currentPoints = me?.mode === "user" ? me.user.points : 0;
  const totalCredits = ledger.filter((e) => e.entryType === "CREDIT").reduce((s, e) => s + e.amount, 0);
  const now = clock;

  return (
    <SiteShell>
      <div className="hub-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Rewards & Quests</h1>
            <p className="page-subtitle">
              Complete missions and hit milestones to earn points and exclusive drops.
            </p>
          </div>
        </div>

        {loading ? <div className="empty-state"><p className="empty-state-title">Loading rewards…</p></div> : null}
        {!loading && me?.mode === "guest" ? (
          <div className="warning-banner">Sign in with X to access your rewards and quests.</div>
        ) : null}
        {!loading && me?.mode === "user" && error ? (
          <div className="warning-banner">{error}</div>
        ) : null}

        {!loading && me?.mode === "user" && !error && (
          <>
            <section className="points-hero">
              <div>
                <p className="ph-label">Your points balance</p>
                <p className="ph-value">{currentPoints.toLocaleString()}</p>
                <p className="ph-sub">{totalCredits.toLocaleString()} total earned across all quests</p>
              </div>
              <div className="ph-icon">✦</div>
            </section>

            {actionMsg ? <div className="contest-inline-note" style={{ marginTop: "0.8rem" }}>{actionMsg}</div> : null}

            <div className="rewards-tabs">
              <button
                type="button"
                className={`rewards-tab${tab === "social" ? " active" : ""}`}
                onClick={() => setTab("social")}
              >
                Social Quests
                {vm.social.length > 0 && <span className="rt-count">{vm.social.length}</span>}
              </button>
              <button
                type="button"
                className={`rewards-tab${tab === "milestones" ? " active" : ""}`}
                onClick={() => setTab("milestones")}
              >
                Milestones
                {milestoneCatalog.length > 0 && <span className="rt-count">{milestoneCatalog.length}</span>}
              </button>
              <button
                type="button"
                className={`rewards-tab${tab === "history" ? " active" : ""}`}
                onClick={() => setTab("history")}
              >
                Quest History
                {vm.completed.length > 0 && <span className="rt-count">{vm.completed.length}</span>}
              </button>
            </div>

            {tab === "social" && (
              <div className="mission-grid">
                {vm.social.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">✦</div>
                    <p className="empty-state-title">No social quests available</p>
                    <p className="empty-state-desc">Check back soon for new social missions.</p>
                  </div>
                ) : vm.social.map((quest) => {
                  const progress = quest.targetValue
                    ? Math.min(quest.progressValue / quest.targetValue, 1)
                    : quest.status === "COMPLETED" ? 1 : 0;
                  const canSubmit = (quest.status === "AVAILABLE" || quest.status === "IN_PROGRESS") && quest.validationMode === "SUBMIT";
                  const canAutoStart = (quest.status === "AVAILABLE" || quest.status === "IN_PROGRESS") && quest.validationMode === "AUTO";
                  const startedAt = autoPendingByQuest[quest.id] ?? null;
                  const countdown = startedAt ? Math.max(0, 60 - Math.floor((now - startedAt) / 1000)) : 0;
                  const ctaLabel = resolveSocialCtaLabelForUserQuest(quest);

                  return (
                    <div key={quest.id} className={missionCardClass(quest)}>
                      <div className="mission-icon-wrap">{questIcon(quest)}</div>
                      <div className="mission-body">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexWrap: "wrap" }}>
                          <span className="mission-title">{quest.title}</span>
                          <span className={questStatusBadgeClass(quest)}>{questStatusLabel(quest)}</span>
                        </div>
                        {quest.description && <div className="mission-desc">{quest.description}</div>}
                        {quest.targetValue !== null && (
                          <div className="mission-progress-row">
                            <div className="mission-progress-track">
                              <div
                                className={progressFillClass(quest)}
                                style={{ width: `${progress * 100}%` }}
                              />
                            </div>
                            <span className="mission-progress-text">
                              {quest.progressValue} / {quest.targetValue}
                            </span>
                          </div>
                        )}
                        {canAutoStart && quest.configSummary.targetUrl && (
                          <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => startAutoSocialQuest(quest)}
                              disabled={Boolean(startedAt) || submittingId === quest.id}
                            >
                              {startedAt ? `Checking… ${countdown}s` : ctaLabel}
                            </button>
                            <span className="contest-inline-note">Auto-validated 60s after action.</span>
                          </div>
                        )}
                        {canSubmit && (
                          <div style={{ marginTop: "0.5rem" }}>
                            {quest.configSummary.targetUrl && (
                              <a
                                href={quest.configSummary.targetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-ghost btn-sm"
                                style={{ marginRight: "0.4rem" }}
                              >
                                {ctaLabel}
                              </a>
                            )}
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => void submitQuest(quest.id)}
                              disabled={submittingId === quest.id}
                            >
                              {submittingId === quest.id ? "Submitting…" : "Submit proof"}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="mission-reward">
                        <div className="mission-reward-value">+{quest.rewardPoints}</div>
                        <div className="mission-reward-label">Points</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {tab === "milestones" && (
              <div className="milestone-overview-grid">
                {milestoneCatalog.map((milestone) => {
                  const linkedQuest = vm.milestoneByType.get(milestone.type);
                  const progressValue = linkedQuest?.progressValue ?? 0;
                  const targetValue = linkedQuest?.targetValue ?? milestone.targetValue;
                  const progress = targetValue > 0 ? Math.min(progressValue / targetValue, 1) : 0;
                  const completed = linkedQuest?.status === "COMPLETED" || progress >= 1;

                  return (
                    <div key={milestone.type} className={`milestone-showcase-card${completed ? " done" : " locked"}`}>
                      <div className="milestone-showcase-top">
                        <span className="milestone-showcase-icon">{milestone.icon}</span>
                        <button type="button" className="milestone-help" onClick={() => setMilestoneInfoOpen(milestone.type)} aria-label={`How to unlock ${milestone.title}`}>
                          ?
                        </button>
                      </div>
                      <p className="milestone-showcase-title">{milestone.title}</p>
                      <p className="milestone-showcase-desc">{getMilestoneObjectiveText(milestone.type, targetValue)}</p>
                      <div className="mission-progress-row">
                        <div className="mission-progress-track">
                          <div className={`mission-progress-fill${completed ? " done" : ""}`} style={{ width: `${progress * 100}%` }} />
                        </div>
                        <span className="mission-progress-text">{progressValue} / {targetValue}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {tab === "history" && (
              <div style={{
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                background: "linear-gradient(158deg, rgba(22,24,29,0.95), rgba(11,11,13,0.99))",
                padding: "1rem 1.2rem",
              }}>
                {vm.completed.length === 0 ? (
                  <div className="empty-state" style={{ padding: "2rem" }}>
                    <div className="empty-state-icon">◈</div>
                    <p className="empty-state-title">No completed quests yet</p>
                    <p className="empty-state-desc">Complete quests and milestones to build your history.</p>
                  </div>
                ) : (
                  <div className="history-list">
                    {vm.completed.map((entry) => (
                      <div key={entry.id} className="history-entry">
                        <div className="he-dot credit" />
                        <div className="he-reason">{entry.title}</div>
                        <div className="he-date">
                          {new Date(entry.completedAt ?? Date.now()).toLocaleDateString(undefined, {
                            month: "short", day: "numeric",
                          })}
                        </div>
                        <div className="he-amount credit">+{entry.rewardPoints}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {milestoneInfoOpen && (
          <div className="milestone-modal-backdrop" onClick={() => setMilestoneInfoOpen(null)}>
            <div className="milestone-modal" onClick={(event) => event.stopPropagation()}>
              <h3>Milestone objective</h3>
              <p>
                {getMilestoneObjectiveText(
                  milestoneInfoOpen,
                  vm.milestoneByType.get(milestoneInfoOpen)?.targetValue
                  ?? milestoneCatalog.find((item) => item.type === milestoneInfoOpen)?.targetValue
                  ?? 0,
                )}
              </p>
              <p className="contest-inline-note">Complete this objective to unlock the reward and turn the card to full color.</p>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setMilestoneInfoOpen(null)}>Got it</button>
            </div>
          </div>
        )}
      </div>
    </SiteShell>
  );
}
