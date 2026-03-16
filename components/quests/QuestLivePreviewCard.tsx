import {
  getQuestObjectiveText,
  resolveSocialCtaLabel,
  sanitizeOptionalText,
  type BuilderObjectiveType,
  type MilestoneType,
  type SocialAction,
} from "@/lib/domain/quests/social";

import styles from "./QuestLivePreviewCard.module.css";

type Props = {
  title: string;
  description: string;
  objectiveType: BuilderObjectiveType;
  socialAction?: SocialAction;
  rewardPoints: number;
  statusLabel?: string;
  targetUrl?: string | null;
  ctaLabel?: string | null;
  milestoneType?: MilestoneType;
  milestoneTargetValue?: number;
  progressValue?: number;
};

export function QuestLivePreviewCard({
  title,
  description,
  objectiveType,
  socialAction,
  rewardPoints,
  statusLabel = "AVAILABLE",
  targetUrl,
  ctaLabel,
  milestoneType,
  milestoneTargetValue,
  progressValue = 0,
}: Props) {
  const resolvedTitle = title.trim() || "Untitled quest";
  const resolvedDescription = description.trim() || "No description provided.";
  const objectiveText = getQuestObjectiveText({
    objectiveType,
    socialAction,
    milestoneType,
    milestoneTargetValue,
  });

  const hasTarget = Boolean(sanitizeOptionalText(targetUrl));
  const socialQuest = objectiveType === "FOLLOW_X" || objectiveType === "SOCIAL_ENGAGEMENT";
  const ctaText = resolveSocialCtaLabel({ objectiveType, socialAction, ctaLabel });

  return (
    <aside className={styles.previewWrap} aria-live="polite">
      <p className={styles.previewTitle}>Live user preview</p>
      <article className={`contest-card ${styles.previewCard}`}>
        <div className={`contest-card-top ${styles.previewMeta}`}>
          <p className="contest-code">PREVIEW</p>
          <span className="contest-status status-open">{statusLabel}</span>
        </div>

        <h3 className="contest-title">{resolvedTitle}</h3>
        <p className="contest-inline-note">{resolvedDescription}</p>

        <p className={styles.previewObjective}>{objectiveText}</p>
        <p className="contest-inline-note">Reward: <strong>{rewardPoints} points</strong></p>

        {objectiveType === "MILESTONE" ? (
          <p className="contest-inline-note">Progress: {Math.max(0, progressValue)} / {Math.max(0, Number(milestoneTargetValue ?? 0))}</p>
        ) : null}

        {socialQuest ? (
          <div className={styles.previewCtaRow}>
            {hasTarget ? (
              <button type="button" className="btn btn-gold btn-sm">{ctaText}</button>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm" disabled>Link unavailable</button>
            )}
            <span className={styles.previewHint}>{hasTarget ? "CTA visible to users" : "Add target_url to enable the CTA"}</span>
          </div>
        ) : null}
      </article>
    </aside>
  );
}
