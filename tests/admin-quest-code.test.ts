import { describe, expect, it } from "vitest";

import { buildQuestCodeBase } from "@/lib/admin/quest-code";

describe("buildQuestCodeBase", () => {
  it("builds normalized code from labels", () => {
    expect(buildQuestCodeBase("SOCIAL LIKE TWEET")).toBe("Q_SOCIAL_LIKE_TWEET");
    expect(buildQuestCodeBase("SOCIAL RT TWEET")).toBe("Q_SOCIAL_RT_TWEET");
    expect(buildQuestCodeBase("SOCIAL COMMENT TWEET")).toBe("Q_SOCIAL_COMMENT_TWEET");
  });
});
