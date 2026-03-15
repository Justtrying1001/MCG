export type BuilderObjectiveType = "FOLLOW_X" | "SOCIAL_ENGAGEMENT" | "MILESTONE";
export type SocialAction = "LIKE" | "RETWEET" | "COMMENT" | "CUSTOM";
export type SocialUrlKind = "PROFILE" | "TWEET" | "UNKNOWN";
export type MilestoneType =
  | "PACK_OPEN_COUNT"
  | "TOTAL_CARDS_COLLECTED"
  | "UNIQUE_CARDS_COLLECTED"
  | "CONTESTS_JOINED"
  | "CONTESTS_WON"
  | "CONTESTS_TOP3"
  | "RARE_PLUS_CARDS_OWNED"
  | "EPIC_PLUS_CARDS_OWNED"
  | "LEGENDARY_CARDS_OWNED"
  | "REWARDS_CLAIMED"
  | "REWARD_POINTS_EARNED"
  | "ROSTER_SUBMISSIONS_COUNT"
  | "CONTESTS_SETTLED_COUNT"
  | "POINTS_BALANCE_REACHED"
  | "INVITED_FRIENDS";

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
    case "CUSTOM":
      return "Open task";
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

export function getMilestoneObjectiveText(milestoneType: MilestoneType | null | undefined, targetValue: number) {
  const target = Math.max(0, Number(targetValue));
  switch (milestoneType) {
    case "PACK_OPEN_COUNT":
      return `Open ${target} packs`;
    case "TOTAL_CARDS_COLLECTED":
      return `Collect ${target} total cards`;
    case "UNIQUE_CARDS_COLLECTED":
      return `Collect ${target} unique cards`;
    case "CONTESTS_JOINED":
      return `Join ${target} contests`;
    case "CONTESTS_WON":
      return `Win ${target} contests`;
    case "CONTESTS_TOP3":
      return `Reach top 3 in ${target} contests`;
    case "RARE_PLUS_CARDS_OWNED":
      return `Own ${target} Rare+ cards`;
    case "EPIC_PLUS_CARDS_OWNED":
      return `Own ${target} Epic+ cards`;
    case "LEGENDARY_CARDS_OWNED":
      return `Own ${target} Legendary cards`;
    case "REWARDS_CLAIMED":
      return `Claim ${target} quest rewards`;
    case "REWARD_POINTS_EARNED":
      return `Earn ${target} reward points`;
    case "ROSTER_SUBMISSIONS_COUNT":
      return `Submit ${target} contest rosters`;
    case "CONTESTS_SETTLED_COUNT":
      return `Settle ${target} contest entries`;
    case "POINTS_BALANCE_REACHED":
      return `Reach ${target} points balance`;
    case "INVITED_FRIENDS":
      return `Invite ${target} friends`;
    default:
      return `Reach milestone ${target}`;
  }
}

export function getQuestObjectiveText(input: {
  objectiveType: BuilderObjectiveType;
  socialAction?: SocialAction | null;
  milestoneType?: MilestoneType | null;
  milestoneTargetValue?: number | null;
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
      case "CUSTOM":
        return "Complete this social task";
      default:
        return "Complete this tweet action";
    }
  }

  return getMilestoneObjectiveText(input.milestoneType, Number(input.milestoneTargetValue ?? 0));
}
