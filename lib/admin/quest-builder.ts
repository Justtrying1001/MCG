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
  rewardType?: "points" | "pack" | "both";
  rewardPoints?: number;
  rewardPackDefinitionId?: string;
  rewardPackQuantity?: number;
  milestoneThreshold?: number;
  validationMode?: "AUTO" | "SUBMIT" | "MANUAL_REVIEW";
  isActive?: boolean;
  oneTime?: boolean;
  startAt?: string | null;
  endAt?: string | null;
};

function resolveRewardType(input: QuestBuilderInput): "points" | "pack" | "both" {
  if (input.rewardType === "points" || input.rewardType === "pack" || input.rewardType === "both") {
    return input.rewardType;
  }

  return "points";
}

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

  const rewardType = resolveRewardType(input);
  if (rewardType === "points" || rewardType === "both") {
    if (input.rewardPoints === undefined) {
      issues.push({ field: "rewardPoints", severity: "ERROR", message: "rewardPoints is required for points rewards" });
    } else {
      const rewardPoints = Number(input.rewardPoints);
      if (!Number.isInteger(rewardPoints) || rewardPoints < 0) {
        issues.push({ field: "rewardPoints", severity: "ERROR", message: "rewardPoints must be a non-negative integer" });
      }
    }
  }

  if (rewardType === "pack" || rewardType === "both") {
    if (!String(input.rewardPackDefinitionId ?? "").trim()) {
      issues.push({ field: "rewardPackDefinitionId", severity: "ERROR", message: "rewardPackDefinitionId is required for pack rewards" });
    }

    const rewardPackQuantity = input.rewardPackQuantity ?? 1;
    const normalizedPackQuantity = Number(rewardPackQuantity);
    if (!Number.isInteger(normalizedPackQuantity) || normalizedPackQuantity <= 0) {
      issues.push({ field: "rewardPackQuantity", severity: "ERROR", message: "rewardPackQuantity must be a positive integer" });
    }
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

  const rewardType = resolveRewardType(input);
  const includesPointsReward = rewardType === "points" || rewardType === "both";
  const includesPackReward = rewardType === "pack" || rewardType === "both";

  const base = {
    code: String(input.code ?? "").trim(),
    title: String(input.title ?? "").trim(),
    description: sanitizeOptionalText(input.description),
    type,
    validationMode,
    ...(includesPointsReward ? { rewardPoints: Number(input.rewardPoints ?? 0) } : {}),
    ...(includesPackReward
      ? {
          rewardPackDefinitionId: String(input.rewardPackDefinitionId ?? "").trim(),
          rewardPackQuantity: Number(input.rewardPackQuantity ?? 1),
        }
      : {}),
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
  const rewardType = resolveRewardType(input);
  const rewardParts: string[] = [];

  if (rewardType === "points" || rewardType === "both") {
    rewardParts.push(`${Number(input.rewardPoints ?? 0)} points`);
  }

  if (rewardType === "pack" || rewardType === "both") {
    const quantity = Number(input.rewardPackQuantity ?? 1);
    const packLabel = String(input.rewardPackDefinitionId ?? "").trim() || "reward pack";
    rewardParts.push(`${quantity} ${packLabel}`);
  }

  return {
    title: String(input.title ?? "").trim() || "Untitled quest",
    description: String(input.description ?? "").trim() || "",
    objective: getQuestObjectiveText({
      objectiveType,
      socialAction: input.socialAction,
      milestoneType: input.milestoneType,
      milestoneTargetValue: Number(input.targetValue ?? input.milestoneThreshold ?? 0),
    }),
    rewardCopy: `Reward: ${rewardParts.join(" + ") || "none"}`,
    proofCopy: (objectiveType === "FOLLOW_X" || objectiveType === "SOCIAL_ENGAGEMENT")
      ? `Proof required: ${input.proofRequired ?? true ? "Yes" : "No"}`
      : "Proof required: No",
    ctaCopy: (objectiveType === "FOLLOW_X" || objectiveType === "SOCIAL_ENGAGEMENT")
      ? `${hasTarget ? "CTA" : "CTA (disabled)"}: ${hasTarget ? resolveSocialCtaLabel({ objectiveType, socialAction: input.socialAction, ctaLabel: input.ctaLabel }) : "Link unavailable"}`
      : "CTA: none",
  };
}
