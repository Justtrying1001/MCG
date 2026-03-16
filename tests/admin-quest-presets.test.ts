import { describe, expect, it } from "vitest";

import { QUEST_PRESETS } from "@/lib/admin/quest-presets";

describe("quest presets", () => {
  it("contains configured social presets", () => {
    const like = QUEST_PRESETS.find((preset) => preset.id === "LIKE_TWEET");
    const rt = QUEST_PRESETS.find((preset) => preset.id === "RT_TWEET");
    const comment = QUEST_PRESETS.find((preset) => preset.id === "COMMENT_TWEET");

    expect(like?.rewardPoints).toBe(100);
    expect(rt?.rewardPoints).toBe(200);
    expect(comment?.rewardPoints).toBe(200);
    expect(like?.validationMode).toBe("AUTO");
    expect(rt?.validationMode).toBe("AUTO");
    expect(comment?.validationMode).toBe("AUTO");
    expect(like?.codeSeed).toBe("SOCIAL LIKE TWEET");
  });
});
