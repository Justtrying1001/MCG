import { Prisma, RewardLedgerReasonType } from "@prisma/client";

import { LedgerConventions } from "@/lib/domain/rewards/conventions";
import { creditPointsWithLedger } from "@/lib/domain/rewards/ledger";

export const WELCOME_REWARD_POINTS = 500;

export async function grantWelcomeReward(tx: Prisma.TransactionClient, userId: string) {
  return creditPointsWithLedger(tx, {
    userId,
    amount: WELCOME_REWARD_POINTS,
    reasonType: RewardLedgerReasonType.WELCOME_REWARD,
    reasonRef: LedgerConventions.welcome.reasonRef(userId),
    idempotencyKey: LedgerConventions.welcome.idempotencyKey(userId),
    metadata: {
      source: "privy_signup",
    },
  });
}
