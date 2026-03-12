"use client";

import { useEffect, useMemo, useState } from "react";

import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/components/useSession";

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
    proofRequired?: boolean;
    targetUrl?: string | null;
    instructions?: string | null;
  };
};

function isSocialQuest(quest: QuestRow) {
  return quest.type === "SOCIAL_FOLLOW_X" || quest.type === "SOCIAL_ENGAGEMENT_X";
}

export default function RewardsPage() {
  const { me, loading } = useSession();
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [error, setError] = useState("");
  const [submitMessageByQuestId, setSubmitMessageByQuestId] = useState<Record<string, string>>({});
  const [submittingQuestId, setSubmittingQuestId] = useState<string | null>(null);
  const [proofUrlByQuestId, setProofUrlByQuestId] = useState<Record<string, string>>({});
  const [noteByQuestId, setNoteByQuestId] = useState<Record<string, string>>({});

  const loadData = async () => {
    const questsRes = await fetch("/api/quests", { cache: "no-store" });

    if (!questsRes.ok) {
      setError("Cannot load quests right now.");
      return;
    }

    const questsPayload = (await questsRes.json()) as { quests: QuestRow[] };
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

    return (
      <div key={quest.id} className="contest-card quest-card-premium">
        <div className="contest-card-top">
          <p className="contest-code">{quest.code}</p>
          <span className="contest-status status-open">{quest.status}</span>
        </div>
        <h3 className="contest-title">{quest.title}</h3>
        <p className="contest-inline-note">{quest.description ?? "Complete this objective to unlock points."}</p>
        <p className="contest-inline-note">Reward: {quest.rewardPoints} points</p>

        {quest.targetValue ? <p className="contest-inline-note">Progress: {quest.progressValue} / {quest.targetValue}</p> : null}

        {isSocialQuest(quest) ? (
          <>
            <p className="contest-inline-note">Validation: {quest.validationMode}</p>
            {quest.configSummary.targetUrl ? (
              <p className="contest-inline-note">Target URL: <a href={quest.configSummary.targetUrl} target="_blank" rel="noreferrer">{quest.configSummary.targetUrl}</a></p>
            ) : null}
            {quest.configSummary.instructions ? <p className="contest-inline-note">Instructions: {quest.configSummary.instructions}</p> : null}
          </>
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
            <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
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
          <h1 className="page-title">Quests</h1>
          <p className="page-subtitle">Complete missions, submit proof, and track validation status.</p>
        </div>
      </div>

      {loading ? <p className="contest-inline-note">Loading session…</p> : null}
      {!loading && !me ? <div className="empty-state"><p className="empty-state-title">Sign in with X to access quests.</p></div> : null}
      {me?.mode === "guest" ? <div className="empty-state"><p className="empty-state-title">Quests are available for authenticated accounts only.</p></div> : null}
      {error ? <p className="contest-error">{error}</p> : null}

      {me?.mode === "user" ? (
        <div className="quest-board-grid">
          <section className="contest-section quest-board-section">
            <h2 className="contest-section-title">Available quests</h2>
            {buckets.available.length === 0 ? <p className="profile-empty-inline">No available quests right now.</p> : <div style={{ display: "grid", gap: "0.6rem" }}>{buckets.available.map((quest) => renderQuestCard(quest, true))}</div>}
          </section>

          <section className="contest-section quest-board-section">
            <h2 className="contest-section-title">Under review</h2>
            {buckets.underReview.length === 0 ? <p className="profile-empty-inline">No submissions under review.</p> : <div style={{ display: "grid", gap: "0.6rem" }}>{buckets.underReview.map((quest) => renderQuestCard(quest, false))}</div>}
          </section>

          <section className="contest-section quest-board-section">
            <h2 className="contest-section-title">Needs resubmission</h2>
            {buckets.needsResubmission.length === 0 ? <p className="profile-empty-inline">No rejected quests.</p> : <div style={{ display: "grid", gap: "0.6rem" }}>{buckets.needsResubmission.map((quest) => renderQuestCard(quest, true))}</div>}
          </section>

          <section className="contest-section quest-board-section">
            <h2 className="contest-section-title">Completed quests</h2>
            {buckets.completed.length === 0 ? <p className="profile-empty-inline">No completed quests yet.</p> : (
              <div style={{ display: "grid", gap: "0.6rem" }}>
                {buckets.completed.map((quest) => (
                  <div key={quest.id} className="contest-card quest-card-premium">
                    <div className="contest-card-top">
                      <p className="contest-code">{quest.code}</p>
                      <span className="contest-status status-settled">COMPLETED</span>
                    </div>
                    <h3 className="contest-title">{quest.title}</h3>
                    <p className="contest-inline-note">Reward: {quest.rewardPoints} points</p>
                    <p className="contest-inline-note">Completed at: {quest.completedAt ? new Date(quest.completedAt).toLocaleString() : "Validated"}</p>
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
