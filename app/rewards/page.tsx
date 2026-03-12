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
      <article key={quest.id} className="quests-v3-card">
        <div className="quests-v3-card-top">
          <p>{quest.code}</p>
          <span>{quest.status}</span>
        </div>
        <h3>{quest.title}</h3>
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
          <div className="quests-v3-submit">
            <input
              className="input"
              placeholder="proof URL (required for some quests)"
              value={proofUrlByQuestId[quest.id] ?? ""}
              onChange={(event) => setProofUrlByQuestId((prev) => ({ ...prev, [quest.id]: event.target.value }))}
            />
            <input
              className="input"
              placeholder="note (optional)"
              value={noteByQuestId[quest.id] ?? ""}
              onChange={(event) => setNoteByQuestId((prev) => ({ ...prev, [quest.id]: event.target.value }))}
            />
            <div className="quests-v3-submit-row">
              <Button onClick={() => void submitQuest(quest)} disabled={submittingQuestId === quest.id}>
                {submittingQuestId === quest.id ? "Submitting…" : "Submit proof"}
              </Button>
              {submitMessageByQuestId[quest.id] ? <span className="contest-inline-note">{submitMessageByQuestId[quest.id]}</span> : null}
            </div>
          </div>
        ) : null}
      </article>
    );
  };

  return (
    <SiteShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Quests</h1>
          <p className="page-subtitle">Quest board only. No points ledger here. Complete missions and track review status.</p>
        </div>
      </div>

      {loading ? <p className="contest-inline-note">Loading session…</p> : null}
      {!loading && !me ? <div className="empty-state"><p className="empty-state-title">Sign in with X to access quests.</p></div> : null}
      {me?.mode === "guest" ? <div className="empty-state"><p className="empty-state-title">Quests are available for authenticated accounts only.</p></div> : null}
      {error ? <p className="contest-error">{error}</p> : null}

      {me?.mode === "user" ? (
        <div className="quests-v3-layout">
          <section className="quests-v3-column available">
            <header>
              <h2>Available</h2>
              <span>{buckets.available.length}</span>
            </header>
            {buckets.available.length === 0 ? <p className="profile-empty-inline">No available quests right now.</p> : buckets.available.map((quest) => renderQuestCard(quest, true))}
          </section>

          <section className="quests-v3-column review">
            <header>
              <h2>Under review</h2>
              <span>{buckets.underReview.length}</span>
            </header>
            {buckets.underReview.length === 0 ? <p className="profile-empty-inline">No submissions under review.</p> : buckets.underReview.map((quest) => renderQuestCard(quest, false))}
          </section>

          <section className="quests-v3-column rejected">
            <header>
              <h2>Needs resubmission</h2>
              <span>{buckets.needsResubmission.length}</span>
            </header>
            {buckets.needsResubmission.length === 0 ? <p className="profile-empty-inline">No rejected quests.</p> : buckets.needsResubmission.map((quest) => renderQuestCard(quest, true))}
          </section>

          <section className="quests-v3-column completed">
            <header>
              <h2>Completed</h2>
              <span>{buckets.completed.length}</span>
            </header>
            {buckets.completed.length === 0 ? (
              <p className="profile-empty-inline">No completed quests yet.</p>
            ) : (
              buckets.completed.map((quest) => (
                <article key={quest.id} className="quests-v3-card">
                  <div className="quests-v3-card-top">
                    <p>{quest.code}</p>
                    <span>COMPLETED</span>
                  </div>
                  <h3>{quest.title}</h3>
                  <p className="contest-inline-note">Reward: {quest.rewardPoints} points</p>
                  <p className="contest-inline-note">Completed at: {quest.completedAt ? new Date(quest.completedAt).toLocaleString() : "Validated"}</p>
                </article>
              ))
            )}
          </section>
        </div>
      ) : null}
    </SiteShell>
  );
}
