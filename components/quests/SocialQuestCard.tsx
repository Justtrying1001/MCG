import { resolveSocialCtaLabelForUserQuest } from "@/lib/domain/quests/social";

import styles from "./QuestCards.module.css";

type SocialQuest = {
  id: string;
  type: "SOCIAL_FOLLOW_X" | "SOCIAL_ENGAGEMENT_X" | string;
  code: string;
  title: string;
  description: string | null;
  rewardPoints: number;
  status: string;
  validationMode?: "AUTO" | "SUBMIT" | "MANUAL_REVIEW";
  configSummary: {
    targetUrl?: string | null;
    ctaLabel?: string | null;
    socialAction?: string | null;
  };
};

export function SocialQuestCard({
  quest,
  onMarkDone,
  markingDone,
  feedback,
}: {
  quest: SocialQuest;
  onMarkDone?: (questId: string) => void;
  markingDone?: boolean;
  feedback?: string;
}) {
  const hasTarget = Boolean(String(quest.configSummary.targetUrl ?? "").trim());
  const isCompleted = quest.status === "COMPLETED";

  return (
    <article className={`contest-card ${styles.card}`}>
      <div className="contest-card-top">
        <p className="contest-code">{quest.code}</p>
        <span className="contest-status status-open">{quest.status}</span>
      </div>
      <h3 className="contest-title">{quest.title}</h3>
      <p className="contest-inline-note">{quest.description ?? ""}</p>
      <p className="contest-inline-note">Reward: <strong>{quest.rewardPoints} points</strong></p>
      <div className={styles.socialActionRow}>
        {hasTarget ? (
          <a href={quest.configSummary.targetUrl ?? "#"} target="_blank" rel="noreferrer" className="btn btn-gold btn-sm">
            {resolveSocialCtaLabelForUserQuest(quest)}
          </a>
        ) : (
          <button type="button" className="btn btn-ghost btn-sm" disabled>Link unavailable</button>
        )}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={isCompleted || markingDone}
          onClick={() => onMarkDone?.(quest.id)}
        >
          {isCompleted ? "Completed" : markingDone ? "Saving…" : "Mark as done"}
        </button>
      </div>
      {feedback ? <p className="contest-inline-note">{feedback}</p> : null}
    </article>
  );
}
