import { getMilestoneObjectiveText } from "@/lib/domain/quests/social";

import styles from "./QuestCards.module.css";

type MilestoneQuest = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  rewardPoints: number;
  status: string;
  progressValue: number;
  targetValue: number | null;
  configSummary: {
    milestoneType?: "PACK_OPEN_COUNT" | "CONTEST_PARTICIPATION_COUNT" | "CARD_COLLECTION_COUNT";
    targetValue?: number;
  };
};

export function MilestoneQuestCard({ quest }: { quest: MilestoneQuest }) {
  const target = quest.targetValue ?? quest.configSummary.targetValue ?? 0;
  const progress = Math.max(0, quest.progressValue ?? 0);
  const percent = target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : 0;

  return (
    <article className={`contest-card ${styles.card}`}>
      <div className="contest-card-top">
        <p className="contest-code">{quest.code}</p>
        <span className="contest-status status-open">{quest.status}</span>
      </div>
      <h3 className="contest-title">{quest.title}</h3>
      <p className="contest-inline-note">{quest.description ?? getMilestoneObjectiveText(quest.configSummary.milestoneType, target)}</p>
      <p className="contest-inline-note">Reward: <strong>{quest.rewardPoints} points</strong></p>
      <p className="contest-inline-note">Progress: {progress} / {target}</p>
      <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={target} aria-valuenow={progress}>
        <div className={styles.progressFill} style={{ width: `${percent}%` }} />
      </div>
    </article>
  );
}
