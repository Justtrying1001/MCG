"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { useSession } from "@/components/useSession";
import { resolveSocialCtaLabelForUserQuest } from "@/lib/domain/quests/social";

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
    milestoneType?: "PACK_OPEN_COUNT" | "CONTEST_PARTICIPATION_COUNT" | "CARD_COLLECTION_COUNT";
    targetValue?: number;
    proofRequired?: boolean;
    targetUrl?: string | null;
    ctaLabel?: string | null;
    instructions?: string | null;
    socialAction?: string | null;
  };
};

type RewardsTab = "social" | "milestones" | "history";

function isSocial(q: QuestRow)    { return q.type === "SOCIAL_FOLLOW_X" || q.type === "SOCIAL_ENGAGEMENT_X"; }
function isMilestone(q: QuestRow) { return q.type === "CONTEST_COUNT_MILESTONE"; }

function questStatusBadgeClass(q: QuestRow): string {
  if (q.latestSubmissionStatus === "SUBMITTED") return "mission-status-badge msb-submitted";
  if (q.latestSubmissionStatus === "REJECTED")  return "mission-status-badge msb-rejected";
  switch (q.status) {
    case "AVAILABLE":   return "mission-status-badge msb-available";
    case "IN_PROGRESS": return "mission-status-badge msb-in-progress";
    case "CLAIMABLE":   return "mission-status-badge msb-claimable";
    case "COMPLETED":   return "mission-status-badge msb-completed";
    case "REJECTED":    return "mission-status-badge msb-rejected";
    default:            return "mission-status-badge msb-available";
  }
}
function questStatusLabel(q: QuestRow): string {
  if (q.latestSubmissionStatus === "SUBMITTED") return "Under review";
  if (q.latestSubmissionStatus === "REJECTED")  return "Rejected";
  switch (q.status) {
    case "AVAILABLE":   return "Available";
    case "IN_PROGRESS": return "In progress";
    case "CLAIMABLE":   return "Claimable";
    case "COMPLETED":   return "Completed";
    case "REJECTED":    return "Rejected";
    default:            return q.status;
  }
}
function questIcon(q: QuestRow): string {
  if (isSocial(q))    return "✦";
  if (isMilestone(q)) return "🏆";
  return "◈";
}
function missionCardClass(q: QuestRow): string {
  if (q.status === "COMPLETED")   return "mission-card is-completed";
  if (q.status === "CLAIMABLE")   return "mission-card is-claimable";
  return "mission-card";
}
function progressFillClass(q: QuestRow): string {
  if (q.status === "COMPLETED" || q.latestSubmissionStatus === "APPROVED") return "mission-progress-fill done";
  if (q.status === "CLAIMABLE") return "mission-progress-fill claimable";
  return "mission-progress-fill";
}

export default function RewardsPage() {
  const { me, loading } = useSession();
  const [ledger,            setLedger]           = useState<LedgerRow[]>([]);
  const [quests,            setQuests]            = useState<QuestRow[]>([]);
  const [error,             setError]             = useState("");
  const [tab,               setTab]               = useState<RewardsTab>("social");
  const [submittingId,      setSubmittingId]      = useState<string | null>(null);
  const [actionMsg,         setActionMsg]         = useState("");

  const loadData = async () => {
    const [lRes, qRes] = await Promise.all([
      fetch("/api/rewards/ledger", { cache: "no-store" }),
      fetch("/api/quests",          { cache: "no-store" }),
    ]);
    if (!lRes.ok || !qRes.ok) { setError("Cannot load rewards data"); return; }
    const lp = (await lRes.json()) as { entries: LedgerRow[] };
    const qp = (await qRes.json()) as { quests: QuestRow[] };
    setLedger(lp.entries ?? []);
    setQuests(qp.quests ?? []);
  };

  const submitQuest = async (questId: string) => {
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

  useEffect(() => {
    if (loading || !me || me.mode === "guest") return;
    setError("");
    void loadData();
  }, [loading, me]);

  const vm = useMemo(() => {
    const social     = quests.filter(isSocial);
    const milestones = quests.filter(isMilestone);
    return { social, milestones };
  }, [quests]);

  const totalCredits = ledger.filter((e) => e.entryType === "CREDIT").reduce((s, e) => s + e.amount, 0);
  const currentPoints = me?.mode === "user" ? me.user.points : 0;

  return (
    <SiteShell>
      <div className="hub-page">

        {/* ── Page Header ── */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Rewards & Quests</h1>
            <p className="page-subtitle">
              Complete missions and hit milestones to earn points and exclusive drops.
            </p>
          </div>
        </div>

        {/* ── Auth Gates ── */}
        {loading ? null : !me ? (
          <div className="warning-banner">Sign in with X to access your rewards and quests.</div>
        ) : me.mode === "guest" ? (
          <div className="info-banner">
            Rewards and quests are available for authenticated accounts only.
            Connect with X to unlock quests and earn points.
          </div>
        ) : null}

        {error && <div className="contest-error">{error}</div>}
        {actionMsg && <div className="success-banner">{actionMsg}</div>}

        {me?.mode === "user" && (
          <>
            {/* ── Points Hero ── */}
            <div className="points-hero">
              <div>
                <div className="ph-label">Your Points Balance</div>
                <div className="ph-value">{currentPoints.toLocaleString()}</div>
                <div className="ph-sub">
                  {totalCredits > 0
                    ? `${totalCredits.toLocaleString()} total earned across all quests`
                    : "Complete quests below to start earning points"}
                </div>
              </div>
              <div className="ph-icon">✦</div>
            </div>

            {/* ── Tab Navigation ── */}
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
                {vm.milestones.length > 0 && <span className="rt-count">{vm.milestones.length}</span>}
              </button>
              <button
                type="button"
                className={`rewards-tab${tab === "history" ? " active" : ""}`}
                onClick={() => setTab("history")}
              >
                Points History
                {ledger.length > 0 && <span className="rt-count">{ledger.length}</span>}
              </button>
            </div>

            {/* ── Social Quests ── */}
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
                  const ctaLabel = resolveSocialCtaLabelForUserQuest(quest) ?? "Mark as done";
                  const canSubmit =
                    quest.status !== "COMPLETED" &&
                    quest.latestSubmissionStatus !== "SUBMITTED" &&
                    quest.latestSubmissionStatus !== "APPROVED";

                  return (
                    <div key={quest.id} className={missionCardClass(quest)}>
                      <div className="mission-icon-wrap">{questIcon(quest)}</div>
                      <div className="mission-body">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexWrap: "wrap" }}>
                          <span className="mission-title">{quest.title}</span>
                          <span className={questStatusBadgeClass(quest)}>{questStatusLabel(quest)}</span>
                        </div>
                        {quest.description && (
                          <div className="mission-desc">{quest.description}</div>
                        )}
                        {quest.configSummary.instructions && (
                          <div className="mission-desc" style={{ color: "var(--text-3)", fontStyle: "italic" }}>
                            {quest.configSummary.instructions}
                          </div>
                        )}
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
                              {submittingId === quest.id ? "Submitting…" : "Mark as done"}
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

            {/* ── Milestones ── */}
            {tab === "milestones" && (
              <div className="mission-grid">
                {vm.milestones.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🏆</div>
                    <p className="empty-state-title">No milestones configured</p>
                    <p className="empty-state-desc">Milestones unlock as you play and collect.</p>
                  </div>
                ) : vm.milestones.map((quest) => {
                  const progress = quest.targetValue
                    ? Math.min(quest.progressValue / quest.targetValue, 1)
                    : quest.status === "COMPLETED" ? 1 : 0;

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

            {/* ── Points History ── */}
            {tab === "history" && (
              <div style={{
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                background: "linear-gradient(158deg, rgba(22,24,29,0.95), rgba(11,11,13,0.99))",
                padding: "1rem 1.2rem",
              }}>
                {ledger.length === 0 ? (
                  <div className="empty-state" style={{ padding: "2rem" }}>
                    <div className="empty-state-icon">◈</div>
                    <p className="empty-state-title">No point activity yet</p>
                    <p className="empty-state-desc">Complete quests and milestones to start earning.</p>
                  </div>
                ) : (
                  <div className="history-list">
                    {ledger.map((entry) => (
                      <div key={entry.id} className="history-entry">
                        <div className={`he-dot ${entry.entryType === "CREDIT" ? "credit" : "debit"}`} />
                        <div className="he-reason">{entry.reasonType}</div>
                        <div className="he-date">
                          {new Date(entry.createdAt).toLocaleDateString(undefined, {
                            month: "short", day: "numeric",
                          })}
                        </div>
                        <div className={`he-amount ${entry.entryType === "CREDIT" ? "credit" : "debit"}`}>
                          {entry.entryType === "CREDIT" ? "+" : "−"}{entry.amount}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </div>
    </SiteShell>
  );
}
