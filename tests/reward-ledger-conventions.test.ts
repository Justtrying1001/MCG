import { describe, expect, it } from "vitest";

import { LedgerConventions } from "@/lib/domain/rewards/conventions";

describe("ledger conventions", () => {
  it("builds stable welcome and quest keys", () => {
    expect(LedgerConventions.welcome.idempotencyKey("u1")).toBe("welcome:u1");
    expect(LedgerConventions.welcome.reasonRef("u1")).toBe("u1");
    expect(LedgerConventions.questReward.reasonRef("q1")).toBe("q1");
    expect(LedgerConventions.questReward.autoMilestoneIdempotencyKey("q1", "u1")).toBe("quest:q1:user:u1");
    expect(LedgerConventions.questReward.approvalIdempotencyKey("q1", "u1")).toBe("quest-approval:q1:user:u1");
  });

  it("builds stable admin grant reasonRef", () => {
    expect(LedgerConventions.adminGrant.reasonRef("manual:abc")).toBe("manual-grant:manual:abc");
  });
});
