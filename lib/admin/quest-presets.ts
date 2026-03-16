import type { BuilderObjectiveType, SocialAction } from "@/lib/domain/quests/social";

export type QuestPreset = {
  id: "LIKE_TWEET" | "RT_TWEET" | "COMMENT_TWEET";
  label: string;
  title: string;
  objectiveType: BuilderObjectiveType;
  socialAction: SocialAction;
  rewardPoints: number;
  validationMode: "AUTO";
  ctaLabel: string;
  codeSeed: string;
};

export const QUEST_PRESETS: QuestPreset[] = [
  {
    id: "LIKE_TWEET",
    label: "Like tweet",
    title: "Like tweet",
    objectiveType: "SOCIAL_ENGAGEMENT",
    socialAction: "LIKE",
    rewardPoints: 100,
    validationMode: "AUTO",
    ctaLabel: "Like tweet",
    codeSeed: "SOCIAL LIKE TWEET",
  },
  {
    id: "RT_TWEET",
    label: "RT tweet",
    title: "RT tweet",
    objectiveType: "SOCIAL_ENGAGEMENT",
    socialAction: "RETWEET",
    rewardPoints: 200,
    validationMode: "AUTO",
    ctaLabel: "RT tweet",
    codeSeed: "SOCIAL RT TWEET",
  },
  {
    id: "COMMENT_TWEET",
    label: "Comment tweet",
    title: "Comment tweet",
    objectiveType: "SOCIAL_ENGAGEMENT",
    socialAction: "COMMENT",
    rewardPoints: 200,
    validationMode: "AUTO",
    ctaLabel: "Comment tweet",
    codeSeed: "SOCIAL COMMENT TWEET",
  },
];
