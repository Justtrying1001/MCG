import { describe, expect, it } from "vitest";

import {
  getMilestoneObjectiveText,
  getQuestObjectiveText,
  parseSocialTargetUrl,
  resolveSocialCtaLabel,
  validateSocialTargetForBuilder,
} from "@/lib/domain/quests/social";

describe("quests social helpers", () => {
  it("parses x profile and tweet urls", () => {
    const profile = parseSocialTargetUrl("https://x.com/memecardgame");
    expect(profile.isValidHttpUrl).toBe(true);
    expect(profile.kind).toBe("PROFILE");

    const tweet = parseSocialTargetUrl("https://x.com/memecardgame/status/123456789");
    expect(tweet.isXDomain).toBe(true);
    expect(tweet.kind).toBe("TWEET");
  });

  it("resolves cta labels with proper fallbacks", () => {
    expect(resolveSocialCtaLabel({ objectiveType: "FOLLOW_X", ctaLabel: null })).toBe("Open on X");
    expect(resolveSocialCtaLabel({ objectiveType: "SOCIAL_ENGAGEMENT", socialAction: "COMMENT", ctaLabel: null })).toBe("Reply on X");
    expect(resolveSocialCtaLabel({ objectiveType: "SOCIAL_ENGAGEMENT", socialAction: "CUSTOM", ctaLabel: null })).toBe("Open task");
    expect(resolveSocialCtaLabel({ objectiveType: "SOCIAL_ENGAGEMENT", socialAction: "LIKE", ctaLabel: "Open now" })).toBe("Open now");
  });

  it("provides business warnings for objective-url mismatch", () => {
    const followMismatch = validateSocialTargetForBuilder({
      objectiveType: "FOLLOW_X",
      socialAction: undefined,
      targetUrl: "https://x.com/user/status/123",
    });

    const engageMismatch = validateSocialTargetForBuilder({
      objectiveType: "SOCIAL_ENGAGEMENT",
      socialAction: "RETWEET",
      targetUrl: "https://x.com/user",
    });

    expect(followMismatch[0]?.severity).toBe("WARN");
    expect(engageMismatch[0]?.message).toContain("tweet URL");
  });

  it("creates objective text by quest type", () => {
    expect(getQuestObjectiveText({ objectiveType: "FOLLOW_X" })).toContain("Follow");
    expect(getQuestObjectiveText({ objectiveType: "SOCIAL_ENGAGEMENT", socialAction: "RETWEET" })).toContain("RT");
    expect(getQuestObjectiveText({ objectiveType: "SOCIAL_ENGAGEMENT", socialAction: "CUSTOM" })).toContain("social task");
    expect(getQuestObjectiveText({ objectiveType: "MILESTONE", milestoneType: "PACK_OPEN_COUNT", milestoneTargetValue: 4 })).toContain("Open 4 packs");
    expect(getMilestoneObjectiveText("INVITED_FRIENDS", 10)).toContain("Invite 10 friends");
    expect(getMilestoneObjectiveText("TOTAL_CARDS_COLLECTED", 50)).toContain("50 total cards");
  });
});
