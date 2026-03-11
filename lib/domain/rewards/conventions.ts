export const LedgerConventions = {
  welcome: {
    reasonRef(userId: string) {
      return userId;
    },
    idempotencyKey(userId: string) {
      return `welcome:${userId}`;
    },
  },
  packOpen: {
    reasonRef(packCode: string) {
      return packCode;
    },
  },
  questReward: {
    reasonRef(questId: string) {
      return questId;
    },
    autoMilestoneIdempotencyKey(questId: string, userId: string) {
      return `quest:${questId}:user:${userId}`;
    },
    approvalIdempotencyKey(questId: string, userId: string) {
      return `quest-approval:${questId}:user:${userId}`;
    },
  },
  adminGrant: {
    reasonRef(idempotencyKey: string) {
      return `manual-grant:${idempotencyKey}`;
    },
  },
} as const;

export type LedgerConventionsType = typeof LedgerConventions;
