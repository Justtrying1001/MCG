import { describe, expect, it } from "vitest";

import { buildQuestUserPreview, toQuestRuntimePayload, validateQuestBuilderInput } from "@/lib/admin/quest-builder";

describe("quest builder", () => {
  it("validates and maps FOLLOW_X quest", () => {
    const input = {
      code: "CAMPAIGN1_FOLLOW",
      title: "Follow MCG",
      objectiveType: "FOLLOW_X" as const,
      targetUrl: "https://x.com/memecardgame",
      proofRequired: true,
      rewardPoints: 100,
    };

    const validation = validateQuestBuilderInput(input);
    expect(validation.blocking).toBe(false);

    const payload = toQuestRuntimePayload(input);
    expect(payload.type).toBe("SOCIAL_FOLLOW_X");
    expect(payload.config.targetUrl).toContain("x.com");

    const preview = buildQuestUserPreview(input);
    expect(preview.objective).toContain("Follow");
  });

  it("requires social action for SOCIAL_ENGAGEMENT", () => {
    const invalid = validateQuestBuilderInput({
      code: "C1_ENGAGE",
      title: "Like post",
      objectiveType: "SOCIAL_ENGAGEMENT",
      rewardPoints: 20,
    });

    expect(invalid.blocking).toBe(true);
    expect(invalid.issues.some((issue) => issue.field === "socialAction")).toBe(true);

    const validPayload = toQuestRuntimePayload({
      code: "C1_ENGAGE",
      title: "Like post",
      objectiveType: "SOCIAL_ENGAGEMENT",
      socialAction: "LIKE",
      rewardPoints: 20,
    });
    expect(validPayload.type).toBe("SOCIAL_ENGAGEMENT_X");
    expect(validPayload.config.socialAction).toBe("LIKE");
  });

  it("requires milestone type and target for MILESTONE", () => {
    const invalid = validateQuestBuilderInput({
      code: "C1_MILESTONE",
      title: "Enter contests",
      objectiveType: "MILESTONE",
      targetValue: 0,
      rewardPoints: 50,
    });

    expect(invalid.blocking).toBe(true);
    expect(invalid.issues.some((issue) => issue.field === "targetValue")).toBe(true);

    const payload = toQuestRuntimePayload({
      code: "C1_MILESTONE",
      title: "Open packs",
      objectiveType: "MILESTONE",
      milestoneType: "PACK_OPEN_COUNT",
      targetValue: 3,
      rewardPoints: 50,
    });

    expect(payload.type).toBe("CONTEST_COUNT_MILESTONE");
    expect(payload.config.targetValue).toBe(3);
    expect(payload.config.milestoneType).toBe("PACK_OPEN_COUNT");
  });

  it("enforces valid url scheme and warns for objective/url mismatch", () => {
    const invalidScheme = validateQuestBuilderInput({
      code: "X",
      title: "Y",
      objectiveType: "FOLLOW_X",
      targetUrl: "ftp://x.com/memecardgame",
      rewardPoints: 5,
    });

    expect(invalidScheme.blocking).toBe(true);
    expect(invalidScheme.issues.some((issue) => issue.field === "targetUrl" && issue.severity === "ERROR")).toBe(true);

    const mismatch = validateQuestBuilderInput({
      code: "X2",
      title: "Y2",
      objectiveType: "SOCIAL_ENGAGEMENT",
      socialAction: "LIKE",
      targetUrl: "https://x.com/memecardgame",
      rewardPoints: 5,
    });

    expect(mismatch.blocking).toBe(false);
    expect(mismatch.issues.some((issue) => issue.message.includes("tweet URL"))).toBe(true);
  });


  it("does not require operator instructions", () => {
    const validation = validateQuestBuilderInput({
      code: "Q_SOCIAL_LIKE",
      title: "Like tweet",
      objectiveType: "SOCIAL_ENGAGEMENT",
      socialAction: "LIKE",
      targetUrl: "https://x.com/memecardgame/status/1",
      rewardPoints: 100,
    });

    expect(validation.issues.some((issue) => issue.field === "instructions")).toBe(false);

    const payload = toQuestRuntimePayload({
      code: "Q_SOCIAL_LIKE",
      title: "Like tweet",
      objectiveType: "SOCIAL_ENGAGEMENT",
      socialAction: "LIKE",
      targetUrl: "https://x.com/memecardgame/status/1",
      rewardPoints: 100,
    });

    expect(payload.config.instructions).toBeNull();
  });

  it("builds CTA fallback preview when no custom label", () => {
    const preview = buildQuestUserPreview({
      code: "Q",
      title: "Like this tweet",
      objectiveType: "SOCIAL_ENGAGEMENT",
      socialAction: "LIKE",
      targetUrl: null,
      rewardPoints: 10,
    });

    expect(preview.ctaCopy).toContain("disabled");
    expect(preview.ctaCopy).toContain("Link unavailable");
  });
});
