import { describe, expect, it } from "vitest";

import { creditPointsWithLedger } from "@/lib/domain/rewards/ledger";

function createTx() {
  const state = {
    user: { id: "u1", points: 0 },
    entries: [] as Array<any>,
  };

  const tx = {
    rewardLedgerEntry: {
      findUnique: async ({ where }: any) => state.entries.find((row) => row.idempotencyKey === where.idempotencyKey) ?? null,
      create: async ({ data }: any) => {
        const created = { id: `led_${state.entries.length + 1}`, ...data };
        state.entries.push(created);
        return created;
      },
    },
    user: {
      update: async ({ where, data }: any) => {
        if (where.id !== state.user.id) throw new Error("User not found");
        state.user.points += data.points.increment;
        return state.user;
      },
    },
  };

  return { state, tx };
}

describe("creditPointsWithLedger", () => {
  it("creates a welcome credit ledger entry with idempotency key", async () => {
    const { state, tx } = createTx();

    const result = await creditPointsWithLedger(tx as any, {
      userId: state.user.id,
      amount: 500,
      reasonType: "WELCOME_REWARD",
      idempotencyKey: "welcome:u1",
    });

    expect(result.applied).toBe(true);
    expect(state.user.points).toBe(500);
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0].amount).toBe(500);
    expect(state.entries[0].reasonType).toBe("WELCOME_REWARD");
    expect(state.entries[0].idempotencyKey).toBe("welcome:u1");
  });

  it("is idempotent when same idempotency key is replayed", async () => {
    const { state, tx } = createTx();

    await creditPointsWithLedger(tx as any, {
      userId: state.user.id,
      amount: 500,
      reasonType: "WELCOME_REWARD",
      idempotencyKey: "welcome:u1",
    });

    const replay = await creditPointsWithLedger(tx as any, {
      userId: state.user.id,
      amount: 500,
      reasonType: "WELCOME_REWARD",
      idempotencyKey: "welcome:u1",
    });

    expect(replay.applied).toBe(false);
    expect(state.user.points).toBe(500);
    expect(state.entries).toHaveLength(1);
  });
});
