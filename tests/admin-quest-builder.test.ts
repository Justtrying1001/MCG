import { describe, expect, it } from "vitest";

import { buildQuestUserPreview, toQuestRuntimePayload, validateQuestBuilderInput } from "@/lib/admin/quest-builder";

describe("quest builder", () => {
  it("validates and maps FOLLOW_X quest", () => {
    const input = {
      code: "CAMPAIGN1_FOLLOW",
      title: "Follow MCG",
      objectiveType: "FOLLOW_X" as const,
      targetUrl: "https://x.com/memecardgame",
      instructions: "Follow account",
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

  it("requires positive threshold for CONTEST_MILESTONE", () => {
    const invalid = validateQuestBuilderInput({
      code: "C1_MILESTONE",
      title: "Enter contests",
      objectiveType: "CONTEST_MILESTONE",
      milestoneThreshold: 0,
      rewardPoints: 50,
    });

    expect(invalid.blocking).toBe(true);
    expect(invalid.issues.some((issue) => issue.field === "milestoneThreshold")).toBe(true);

    const payload = toQuestRuntimePayload({
      code: "C1_MILESTONE",
      title: "Enter contests",
      objectiveType: "CONTEST_MILESTONE",
      milestoneThreshold: 3,
      rewardPoints: 50,
    });

    expect(payload.type).toBe("CONTEST_COUNT_MILESTONE");
    expect(payload.config.threshold).toBe(3);
  });
});
