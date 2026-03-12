export type QuestObjectiveType = "FOLLOW_X" | "SOCIAL_ENGAGEMENT" | "CONTEST_MILESTONE";
export type SocialEngagementAction = "LIKE" | "RETWEET" | "COMMENT";

export type QuestBuilderInput = {
  code?: string;
  title?: string;
  description?: string | null;
  objectiveType?: QuestObjectiveType;
  socialAction?: SocialEngagementAction;
  targetUrl?: string | null;
  instructions?: string | null;
  proofRequired?: boolean;
  rewardPoints?: number;
  milestoneThreshold?: number;
  validationMode?: "AUTO" | "SUBMIT" | "MANUAL_REVIEW";
  isActive?: boolean;
  oneTime?: boolean;
  startAt?: string | null;
  endAt?: string | null;
};

export function validateQuestBuilderInput(input: QuestBuilderInput) {
  const issues: Array<{ field: string; severity: "ERROR" | "WARN"; message: string }> = [];
  const code = String(input.code ?? "").trim();
  const title = String(input.title ?? "").trim();

  if (!code) issues.push({ field: "code", severity: "ERROR", message: "code is required" });
  if (!title) issues.push({ field: "title", severity: "ERROR", message: "title is required" });

  const objectiveType = input.objectiveType;
  if (!objectiveType) {
    issues.push({ field: "objectiveType", severity: "ERROR", message: "objective type is required" });
  }

  const rewardPoints = Number(input.rewardPoints ?? 0);
  if (!Number.isInteger(rewardPoints) || rewardPoints < 0) {
    issues.push({ field: "rewardPoints", severity: "ERROR", message: "rewardPoints must be a non-negative integer" });
  }

  if (objectiveType === "CONTEST_MILESTONE") {
    const threshold = Number(input.milestoneThreshold ?? 0);
    if (!Number.isInteger(threshold) || threshold <= 0) {
      issues.push({ field: "milestoneThreshold", severity: "ERROR", message: "milestone threshold must be a positive integer" });
    }
  }

  if (objectiveType === "SOCIAL_ENGAGEMENT" && !input.socialAction) {
    issues.push({ field: "socialAction", severity: "ERROR", message: "social action is required for engagement quests" });
  }

  if ((objectiveType === "FOLLOW_X" || objectiveType === "SOCIAL_ENGAGEMENT") && !String(input.targetUrl ?? "").trim()) {
    issues.push({ field: "targetUrl", severity: "WARN", message: "target URL is recommended for social quests" });
  }

  if ((objectiveType === "FOLLOW_X" || objectiveType === "SOCIAL_ENGAGEMENT") && !String(input.instructions ?? "").trim()) {
    issues.push({ field: "instructions", severity: "WARN", message: "operator instructions are recommended" });
  }

  return {
    blocking: issues.some((issue) => issue.severity === "ERROR"),
    issues,
  };
}

export function toQuestRuntimePayload(input: QuestBuilderInput) {
  const objectiveType = input.objectiveType;
  const type = objectiveType === "FOLLOW_X"
    ? "SOCIAL_FOLLOW_X"
    : objectiveType === "SOCIAL_ENGAGEMENT"
      ? "SOCIAL_ENGAGEMENT_X"
      : "CONTEST_COUNT_MILESTONE";

  const validationMode = input.validationMode ?? (objectiveType === "CONTEST_MILESTONE" ? "AUTO" : "MANUAL_REVIEW");

  const base = {
    code: String(input.code ?? "").trim(),
    title: String(input.title ?? "").trim(),
    description: input.description?.trim() || null,
    type,
    validationMode,
    rewardPoints: Number(input.rewardPoints ?? 0),
    oneTime: input.oneTime ?? true,
    isActive: input.isActive ?? true,
    startAt: input.startAt || null,
    endAt: input.endAt || null,
  } as const;

  if (type === "CONTEST_COUNT_MILESTONE") {
    return {
      ...base,
      config: {
        threshold: Number(input.milestoneThreshold ?? 0),
      },
    };
  }

  return {
    ...base,
    config: {
      proofRequired: input.proofRequired ?? true,
      targetUrl: input.targetUrl?.trim() || null,
      instructions: input.instructions?.trim() || null,
      socialAction: input.socialAction ?? null,
    },
  };
}

export function buildQuestUserPreview(input: QuestBuilderInput) {
  const objective = input.objectiveType === "FOLLOW_X"
    ? "Follow the target account"
    : input.objectiveType === "SOCIAL_ENGAGEMENT"
      ? `Perform social action: ${input.socialAction ?? "(choose action)"}`
      : `Enter ${input.milestoneThreshold ?? 0} contests`;

  return {
    title: String(input.title ?? "").trim() || "Untitled quest",
    description: String(input.description ?? "").trim() || "",
    objective,
    rewardCopy: `Reward: ${Number(input.rewardPoints ?? 0)} points`,
    proofCopy: (input.objectiveType === "FOLLOW_X" || input.objectiveType === "SOCIAL_ENGAGEMENT")
      ? `Proof required: ${input.proofRequired ?? true ? "Yes" : "No"}`
      : "Proof required: No",
  };
}
