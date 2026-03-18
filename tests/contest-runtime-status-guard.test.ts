import { describe, expect, it, vi } from "vitest";
import { ContestStatus } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/domain/quests/runtime", () => ({ applyContestEntryQuestProgressionTx: vi.fn() }));
vi.mock("@/lib/domain/rewards/ledger", () => ({ debitPointsWithLedger: vi.fn() }));
vi.mock("@/lib/domain/acquisition/open-pack", () => ({ grantRewardPackByDefinitionTx: vi.fn() }));

import { updateContestStatusMvp } from "@/lib/domain/contests/runtime";

describe("contest runtime status guard", () => {
  it("blocks brute-force lifecycle status updates", async () => {
    await expect(updateContestStatusMvp("c1", ContestStatus.SETTLED)).rejects.toThrow(/Direct contest status updates are disabled/i);
  });
});
