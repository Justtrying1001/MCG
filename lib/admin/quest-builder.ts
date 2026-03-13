import {
  getQuestObjectiveText,
  resolveSocialCtaLabel,
  sanitizeOptionalText,
  validateSocialTargetForBuilder,
  type BuilderObjectiveType,
  type MilestoneType,
  type SocialAction,
} from "@/lib/domain/quests/social";

export type QuestObjectiveType = BuilderObjectiveType;
export type SocialEngagementAction = SocialAction;

export type QuestBuilderInput = {
  code?: string;
  title?: string;
  description?: string | null;
  objectiveType?: QuestObjectiveType;
  socialAction?: SocialEngagementAction;
  milestoneType?: MilestoneType;
  targetValue?: number;
  targetUrl?: string | null;
  ctaLabel?: string | null;
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

  if (objectiveType === "MILESTONE") {
    const targetValue = Number(input.targetValue ?? input.milestoneThreshold ?? 0);
    if (!Number.isInteger(targetValue) || targetValue <= 0) {
      issues.push({ field: "targetValue", severity: "ERROR", message: "target value must be a positive integer" });
    }

    if (!input.milestoneType) {
      issues.push({ field: "milestoneType", severity: "ERROR", message: "milestone type is required" });
    }
  }

  if (objectiveType === "SOCIAL_ENGAGEMENT" && !input.socialAction) {
    issues.push({ field: "socialAction", severity: "ERROR", message: "social action is required for engagement quests" });
  }

  issues.push(...validateSocialTargetForBuilder({
    objectiveType,
    socialAction: input.socialAction,
    targetUrl: input.targetUrl,
  }));

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

  const validationMode = input.validationMode ?? (objectiveType === "MILESTONE" ? "AUTO" : "MANUAL_REVIEW");

  const base = {
    code: String(input.code ?? "").trim(),
    title: String(input.title ?? "").trim(),
    description: sanitizeOptionalText(input.description),
    type,
    validationMode,
    rewardPoints: Number(input.rewardPoints ?? 0),
    oneTime: input.oneTime ?? true,
    isActive: input.isActive ?? true,
    startAt: input.startAt || null,
    endAt: input.endAt || null,
  } as const;

  if (type === "CONTEST_COUNT_MILESTONE") {
    const targetValue = Number(input.targetValue ?? input.milestoneThreshold ?? 0);

    return {
      ...base,
      config: {
        milestoneType: input.milestoneType ?? "CONTESTS_JOINED",
        targetValue,
        threshold: targetValue,
      },
    };
  }

  return {
    ...base,
    config: {
      proofRequired: input.proofRequired ?? true,
      targetUrl: sanitizeOptionalText(input.targetUrl),
      ctaLabel: sanitizeOptionalText(input.ctaLabel),
      instructions: sanitizeOptionalText(input.instructions),
      socialAction: input.socialAction ?? null,
    },
  };
}

export function buildQuestUserPreview(input: QuestBuilderInput) {
  const objectiveType = input.objectiveType ?? "FOLLOW_X";
  const hasTarget = Boolean(sanitizeOptionalText(input.targetUrl));

  return {
    title: String(input.title ?? "").trim() || "Untitled quest",
    description: String(input.description ?? "").trim() || "",
    objective: getQuestObjectiveText({
      objectiveType,
      socialAction: input.socialAction,
      milestoneType: input.milestoneType,
      milestoneTargetValue: Number(input.targetValue ?? input.milestoneThreshold ?? 0),
    }),
    rewardCopy: `Reward: ${Number(input.rewardPoints ?? 0)} points`,
    proofCopy: (objectiveType === "FOLLOW_X" || objectiveType === "SOCIAL_ENGAGEMENT")
      ? `Proof required: ${input.proofRequired ?? true ? "Yes" : "No"}`
      : "Proof required: No",
    ctaCopy: (objectiveType === "FOLLOW_X" || objectiveType === "SOCIAL_ENGAGEMENT")
      ? `${hasTarget ? "CTA" : "CTA (disabled)"}: ${hasTarget ? resolveSocialCtaLabel({ objectiveType, socialAction: input.socialAction, ctaLabel: input.ctaLabel }) : "Link unavailable"}`
      : "CTA: none",
  };
}
