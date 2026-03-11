import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    rewardLedgerEntry: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { grantManualPointsMvp, ManualGrantError } from "@/lib/domain/rewards/manual-grants";

type State = {
  user: { id: string; points: number; displayName: string; xUsername: string } | null;
  entries: Array<any>;
};

function createTx(state: State) {
  return {
    user: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (!state.user || where.id !== state.user.id) return null;
        return state.user;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        if (!state.user || where.id !== state.user.id) throw new Error("User not found");
        state.user.points += data.points.increment;
        return state.user;
      }),
    },
    rewardLedgerEntry: {
      findUnique: vi.fn(async ({ where }: any) => state.entries.find((row) => row.idempotencyKey === where.idempotencyKey) ?? null),
      create: vi.fn(async ({ data }: any) => {
        const created = { id: `led_${state.entries.length + 1}`, createdAt: new Date(), ...data };
        state.entries.push(created);
        return created;
      }),
    },
  };
}

describe("manual grant runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("credits points once with idempotency", async () => {
    const state: State = {
      user: { id: "u1", points: 100, displayName: "u", xUsername: "u" },
      entries: [],
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(createTx(state), {}));

    const first = await grantManualPointsMvp({
      userId: "u1",
      amount: 200,
      reasonLabel: "support-compensation",
      idempotencyKey: "manual:1",
      grantedByAdmin: "session",
    });

    const replay = await grantManualPointsMvp({
      userId: "u1",
      amount: 200,
      reasonLabel: "support-compensation",
      idempotencyKey: "manual:1",
      grantedByAdmin: "session",
    });

    expect(first.applied).toBe(true);
    expect(replay.applied).toBe(false);
    expect(state.user?.points).toBe(300);
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0].reasonType).toBe("ADMIN_GRANT");
    expect(state.entries[0].reasonRef).toBe("manual-grant:manual:1");
  });

  it("rejects invalid amount or missing user", async () => {
    const state: State = { user: null, entries: [] };
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(createTx(state), {}));

    await expect(grantManualPointsMvp({ userId: "u1", amount: 0, reasonLabel: "x" })).rejects.toBeInstanceOf(ManualGrantError);
    await expect(grantManualPointsMvp({ userId: "u1", amount: 50, reasonLabel: "x" })).rejects.toBeInstanceOf(ManualGrantError);
  });
});
