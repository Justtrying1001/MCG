export type BuilderObjectiveType = "FOLLOW_X" | "SOCIAL_ENGAGEMENT" | "CONTEST_MILESTONE";
export type SocialAction = "LIKE" | "RETWEET" | "COMMENT";
export type SocialUrlKind = "PROFILE" | "TWEET" | "UNKNOWN";

export type SocialValidationIssue = {
  field: "targetUrl";
  severity: "ERROR" | "WARN";
  message: string;
};

export function sanitizeOptionalText(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

export function parseSocialTargetUrl(raw: string | null | undefined): {
  normalized: string | null;
  isValidHttpUrl: boolean;
  isXDomain: boolean;
  kind: SocialUrlKind;
} {
  const normalized = sanitizeOptionalText(raw);
  if (!normalized) return { normalized: null, isValidHttpUrl: false, isXDomain: false, kind: "UNKNOWN" };

  try {
    const parsed = new URL(normalized);
    const isValidHttpUrl = parsed.protocol === "http:" || parsed.protocol === "https:";
    if (!isValidHttpUrl) return { normalized, isValidHttpUrl: false, isXDomain: false, kind: "UNKNOWN" };

    const host = parsed.hostname.toLowerCase();
    const isXDomain = host === "x.com" || host.endsWith(".x.com") || host === "twitter.com" || host.endsWith(".twitter.com");
    if (!isXDomain) return { normalized, isValidHttpUrl: true, isXDomain: false, kind: "UNKNOWN" };

    const path = parsed.pathname.replace(/\/+$/, "");
    const isTweet = /\/status\/\d+$/i.test(path);
    const isProfile = /^\/[A-Za-z0-9_]{1,15}$/i.test(path);

    return {
      normalized,
      isValidHttpUrl: true,
      isXDomain,
      kind: isTweet ? "TWEET" : isProfile ? "PROFILE" : "UNKNOWN",
    };
  } catch {
    return { normalized, isValidHttpUrl: false, isXDomain: false, kind: "UNKNOWN" };
  }
}

export function validateSocialTargetForBuilder(params: {
  objectiveType: BuilderObjectiveType | undefined;
  socialAction: SocialAction | undefined;
  targetUrl: string | null | undefined;
}): SocialValidationIssue[] {
  const { objectiveType, targetUrl } = params;
  if (objectiveType !== "FOLLOW_X" && objectiveType !== "SOCIAL_ENGAGEMENT") return [];

  const parsed = parseSocialTargetUrl(targetUrl);
  if (!parsed.normalized) return [{ field: "targetUrl", severity: "WARN", message: "target URL is recommended for social quests" }];
  if (!parsed.isValidHttpUrl) return [{ field: "targetUrl", severity: "ERROR", message: "targetUrl must be a valid http(s) URL" }];
  if (!parsed.isXDomain) return [{ field: "targetUrl", severity: "WARN", message: "targetUrl should point to x.com or twitter.com" }];

  if (objectiveType === "FOLLOW_X" && parsed.kind === "TWEET") {
    return [{ field: "targetUrl", severity: "WARN", message: "Follow quests usually expect a profile URL (not a tweet URL)" }];
  }

  if (objectiveType === "SOCIAL_ENGAGEMENT" && parsed.kind !== "TWEET") {
    return [{ field: "targetUrl", severity: "WARN", message: "Engagement quests usually expect a tweet URL (/status/...)" }];
  }

  return [];
}

export function resolveSocialCtaLabel(input: {
  objectiveType?: BuilderObjectiveType;
  socialAction?: SocialAction | null;
  ctaLabel?: string | null;
}) {
  const custom = sanitizeOptionalText(input.ctaLabel);
  if (custom) return custom;

  if (input.objectiveType === "FOLLOW_X") return "Open on X";

  switch (input.socialAction) {
    case "LIKE":
      return "View Tweet";
    case "RETWEET":
      return "Open Tweet";
    case "COMMENT":
      return "Reply on X";
    default:
      return "Open on X";
  }
}

export function resolveSocialCtaLabelForUserQuest(quest: {
  type: "SOCIAL_FOLLOW_X" | "SOCIAL_ENGAGEMENT_X" | string;
  configSummary: { socialAction?: string | null; ctaLabel?: string | null };
}) {
  const objectiveType: BuilderObjectiveType = quest.type === "SOCIAL_FOLLOW_X" ? "FOLLOW_X" : "SOCIAL_ENGAGEMENT";

  return resolveSocialCtaLabel({
    objectiveType,
    socialAction: (quest.configSummary.socialAction as SocialAction | null | undefined) ?? null,
    ctaLabel: quest.configSummary.ctaLabel ?? null,
  });
}

export function getQuestObjectiveText(input: {
  objectiveType: BuilderObjectiveType;
  socialAction?: SocialAction | null;
  milestoneThreshold?: number | null;
}) {
  if (input.objectiveType === "FOLLOW_X") return "Follow this account on X";
  if (input.objectiveType === "SOCIAL_ENGAGEMENT") {
    switch (input.socialAction) {
      case "LIKE":
        return "Like this tweet";
      case "RETWEET":
        return "RT this tweet";
      case "COMMENT":
        return "Comment this tweet";
      default:
        return "Complete this tweet action";
    }
  }

  return `Enter ${Math.max(0, Number(input.milestoneThreshold ?? 0))} contests`;
}
