"use client";

import { useEffect, useMemo, useState } from "react";

import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/components/useSession";
import { resolveSocialCtaLabelForUserQuest } from "@/lib/domain/quests/social";

type LedgerRow = {
  id: string;
  entryType: "CREDIT" | "DEBIT";
  amount: number;
  reasonType: string;
  reasonRef: string | null;
  createdAt: string;
};

type QuestRow = {
  id: string;
  code: string;
  type: "WELCOME" | "SOCIAL_FOLLOW_X" | "SOCIAL_ENGAGEMENT_X" | "CONTEST_COUNT_MILESTONE" | "MANUAL";
  title: string;
  description: string | null;
  rewardPoints: number;
  status: "AVAILABLE" | "IN_PROGRESS" | "CLAIMABLE" | "COMPLETED" | "REJECTED";
  progressValue: number;
  targetValue: number | null;
  isActive: boolean;
  completedAt: string | null;
  validationMode: "AUTO" | "SUBMIT" | "MANUAL_REVIEW";
  latestSubmissionStatus: "SUBMITTED" | "APPROVED" | "REJECTED" | null;
  latestSubmission: {
    id: string;
    status: "SUBMITTED" | "APPROVED" | "REJECTED";
    proofUrl: string | null;
    note: string | null;
    createdAt: string;
    reviewedAt: string | null;
  } | null;
  configSummary: {
    threshold?: number;
    proofRequired?: boolean;
    targetUrl?: string | null;
    ctaLabel?: string | null;
    instructions?: string | null;
    socialAction?: string | null;
  };
};

function isSocialQuest(quest: QuestRow) {
  return quest.type === "SOCIAL_FOLLOW_X" || quest.type === "SOCIAL_ENGAGEMENT_X";
}


export default function RewardsPage() {
  const { me, loading } = useSession();
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [error, setError] = useState("");
  const [submitMessageByQuestId, setSubmitMessageByQuestId] = useState<Record<string, string>>({});
  const [submittingQuestId, setSubmittingQuestId] = useState<string | null>(null);
  const [proofUrlByQuestId, setProofUrlByQuestId] = useState<Record<string, string>>({});
  const [noteByQuestId, setNoteByQuestId] = useState<Record<string, string>>({});

  const loadData = async () => {
    const [ledgerRes, questsRes] = await Promise.all([
      fetch("/api/rewards/ledger", { cache: "no-store" }),
      fetch("/api/quests", { cache: "no-store" }),
    ]);

    if (!ledgerRes.ok || !questsRes.ok) {
      setError("Cannot load rewards data");
      return;
    }

    const ledgerPayload = (await ledgerRes.json()) as { entries: LedgerRow[] };
    const questsPayload = (await questsRes.json()) as { quests: QuestRow[] };

    setLedger(ledgerPayload.entries ?? []);
    setQuests(questsPayload.quests ?? []);
  };

  useEffect(() => {
    if (loading || !me || me.mode === "guest") return;

    setError("");
    void loadData();
  }, [loading, me]);

  const submitQuest = async (quest: QuestRow) => {
    setSubmitMessageByQuestId((prev) => ({ ...prev, [quest.id]: "" }));
    setSubmittingQuestId(quest.id);

    const response = await fetch(`/api/quests/${quest.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proofUrl: proofUrlByQuestId[quest.id] ?? "",
        note: noteByQuestId[quest.id] ?? "",
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setSubmitMessageByQuestId((prev) => ({ ...prev, [quest.id]: payload?.error ?? "Submission failed" }));
      setSubmittingQuestId(null);
      return;
    }

    setSubmitMessageByQuestId((prev) => ({ ...prev, [quest.id]: "Submission sent for review." }));
    setSubmittingQuestId(null);
    setProofUrlByQuestId((prev) => ({ ...prev, [quest.id]: "" }));
    setNoteByQuestId((prev) => ({ ...prev, [quest.id]: "" }));
    await loadData();
  };

  const buckets = useMemo(() => {
    const available: QuestRow[] = [];
    const underReview: QuestRow[] = [];
    const needsResubmission: QuestRow[] = [];
    const completed: QuestRow[] = [];

    for (const quest of quests) {
      if (quest.status === "COMPLETED" || quest.latestSubmissionStatus === "APPROVED") {
        completed.push(quest);
      } else if (quest.latestSubmissionStatus === "SUBMITTED") {
        underReview.push(quest);
      } else if (quest.latestSubmissionStatus === "REJECTED" || quest.status === "REJECTED") {
        needsResubmission.push(quest);
      } else {
        available.push(quest);
      }
    }

    return { available, underReview, needsResubmission, completed };
  }, [quests]);

  const renderQuestCard = (quest: QuestRow, allowSubmit: boolean) => {
    const canSubmit = allowSubmit && isSocialQuest(quest);
    const hasTarget = Boolean(String(quest.configSummary.targetUrl ?? "").trim());

    return (
      <div key={quest.id} className="contest-card quest-user-card">
        <div className="contest-card-top">
          <p className="contest-code">{quest.code}</p>
          <span className="contest-status status-open">{quest.status}</span>
        </div>

        <h3 className="contest-title">{quest.title}</h3>
        <p className="contest-inline-note">{quest.description ?? "No description provided."}</p>

        <div className="quest-meta-grid">
          <p className="contest-inline-note">Reward: <strong>{quest.rewardPoints} points</strong></p>
          {quest.targetValue ? <p className="contest-inline-note">Progress: {quest.progressValue} / {quest.targetValue}</p> : null}
          {isSocialQuest(quest) ? <p className="contest-inline-note">Validation: {quest.validationMode}</p> : null}
          {isSocialQuest(quest) ? <p className="contest-inline-note">Proof required: {quest.configSummary.proofRequired ? "Yes" : "No"}</p> : null}
        </div>

        {isSocialQuest(quest) ? (
          <div className="quest-social-action-row">
            {hasTarget ? (
              <a href={quest.configSummary.targetUrl ?? "#"} target="_blank" rel="noreferrer" className="btn btn-gold btn-sm">
                {resolveSocialCtaLabelForUserQuest(quest)}
              </a>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm" disabled title="No URL configured for this quest yet.">
                Link unavailable
              </button>
            )}
            {quest.configSummary.instructions ? <p className="contest-inline-note">{quest.configSummary.instructions}</p> : null}
          </div>
        ) : null}

        {canSubmit ? (
          <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.6rem" }}>
            <input
              className="input"
              placeholder="proof URL (optional unless required)"
              value={proofUrlByQuestId[quest.id] ?? ""}
              onChange={(event) => setProofUrlByQuestId((prev) => ({ ...prev, [quest.id]: event.target.value }))}
            />
            <input
              className="input"
              placeholder="note (optional)"
              value={noteByQuestId[quest.id] ?? ""}
              onChange={(event) => setNoteByQuestId((prev) => ({ ...prev, [quest.id]: event.target.value }))}
            />
            <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
              <Button onClick={() => void submitQuest(quest)} disabled={submittingQuestId === quest.id}>
                {submittingQuestId === quest.id ? "Submitting…" : "Submit proof"}
              </Button>
              {submitMessageByQuestId[quest.id] ? <span className="contest-inline-note">{submitMessageByQuestId[quest.id]}</span> : null}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <SiteShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Rewards & Quests</h1>
          <p className="page-subtitle">Complete quests, open actions on X instantly, and track your reward ledger.</p>
        </div>
      </div>

      {loading ? <p className="contest-inline-note">Loading session…</p> : null}
      {!loading && !me ? <div className="empty-state"><p className="empty-state-title">Sign in with X to access rewards.</p></div> : null}
      {me?.mode === "guest" ? <div className="empty-state"><p className="empty-state-title">Rewards and quests are available for authenticated accounts only.</p></div> : null}
      {error ? <p className="contest-error">{error}</p> : null}

      {me?.mode === "user" ? (
        <div style={{ display: "grid", gap: "1rem" }}>
          <section className="contest-section">
            <h2 className="contest-section-title">Available quests</h2>
            {buckets.available.length === 0 ? <p className="contest-inline-note">No available quests right now.</p> : <div style={{ display: "grid", gap: "0.6rem" }}>{buckets.available.map((quest) => renderQuestCard(quest, true))}</div>}
          </section>

          <section className="contest-section">
            <h2 className="contest-section-title">Under review</h2>
            {buckets.underReview.length === 0 ? <p className="contest-inline-note">No submissions under review.</p> : <div style={{ display: "grid", gap: "0.6rem" }}>{buckets.underReview.map((quest) => renderQuestCard(quest, false))}</div>}
          </section>

          <section className="contest-section">
            <h2 className="contest-section-title">Needs resubmission</h2>
            {buckets.needsResubmission.length === 0 ? <p className="contest-inline-note">No rejected quests.</p> : <div style={{ display: "grid", gap: "0.6rem" }}>{buckets.needsResubmission.map((quest) => renderQuestCard(quest, true))}</div>}
          </section>

          <section className="contest-section">
            <h2 className="contest-section-title">Completed quests</h2>
            {buckets.completed.length === 0 ? <p className="contest-inline-note">No completed quests yet.</p> : (
              <div style={{ display: "grid", gap: "0.6rem" }}>
                {buckets.completed.map((quest) => (
                  <div key={quest.id} className="contest-card">
                    <div className="contest-card-top">
                      <p className="contest-code">{quest.code}</p>
                      <span className="contest-status status-settled">COMPLETED</span>
                    </div>
                    <h3 className="contest-title">{quest.title}</h3>
                    <p className="contest-inline-note">Reward: {quest.rewardPoints} points</p>
                    <p className="contest-inline-note">Completed at: {quest.completedAt ? new Date(quest.completedAt).toLocaleString() : "-"}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="contest-section">
            <h2 className="contest-section-title">Points history</h2>
            {ledger.length === 0 ? (
              <p className="contest-inline-note">No point movements yet.</p>
            ) : (
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {ledger.map((entry) => (
                  <div key={entry.id} className="contest-ranking-row" style={{ gridTemplateColumns: "1fr auto auto" }}>
                    <span>{entry.reasonType}</span>
                    <span style={{ color: entry.entryType === "CREDIT" ? "var(--emerald)" : "var(--red)" }}>
                      {entry.entryType === "CREDIT" ? "+" : "-"}{entry.amount}
                    </span>
                    <span>{new Date(entry.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </SiteShell>
  );
}
