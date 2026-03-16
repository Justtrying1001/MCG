import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, debitPointsWithLedgerMock, applyContestEntryQuestProgressionTxMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
  },
  debitPointsWithLedgerMock: vi.fn(),
  applyContestEntryQuestProgressionTxMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/domain/rewards/ledger", () => ({ debitPointsWithLedger: debitPointsWithLedgerMock }));
vi.mock("@/lib/domain/quests/runtime", () => ({ applyContestEntryQuestProgressionTx: applyContestEntryQuestProgressionTxMock }));

import { ContestStatus } from "@prisma/client";

import { enterContestMvp, recordContestScoresMvp, settleContestMvp } from "@/lib/domain/contests/runtime";

function createStatefulTx() {
  const state = {
    contest: {
      id: "contest_1",
      status: ContestStatus.OPEN as ContestStatus,
      lockAt: null as Date | null,
    },
    rule: {
      teamSizeMode: "EXACT",
      teamSizeValue: 5,
      maxRosterSize: 5,
      entryFeeEnabled: false,
      entryFeeAmount: null as number | null,
      eligibilityMode: "ANY",
      cardSetId: null as string | null,
    },
    ownedCardInstances: [
      { id: "i1", userId: "u1", cardTemplateId: "t1", tokenProjectId: "p1" },
      { id: "i2", userId: "u1", cardTemplateId: "t2", tokenProjectId: "p2" },
      { id: "i3", userId: "u1", cardTemplateId: "t3", tokenProjectId: "p3" },
      { id: "i4", userId: "u1", cardTemplateId: "t4", tokenProjectId: "p4" },
      { id: "i5", userId: "u1", cardTemplateId: "t5", tokenProjectId: "p5" },
      { id: "j1", userId: "u2", cardTemplateId: "t1", tokenProjectId: "p1" },
      { id: "j2", userId: "u2", cardTemplateId: "t2", tokenProjectId: "p2" },
      { id: "j3", userId: "u2", cardTemplateId: "t3", tokenProjectId: "p3" },
      { id: "j4", userId: "u2", cardTemplateId: "t4", tokenProjectId: "p4" },
      { id: "j5", userId: "u2", cardTemplateId: "t5", tokenProjectId: "p5" },
    ],
    entries: [] as Array<{ id: string; contestId: string; userId: string; status: string }>,
    rosterLocks: [] as Array<{ contestEntryId: string; ownedCardInstanceId: string; contestId: string }>,
    scores: new Map<string, number>(),
    rankings: [] as Array<{ contestId: string; userId: string; rank: number; score: number }>,
    settlement: null as null | { id: string; contestId: string },
    rewardGrants: [] as Array<{ userId: string; type: string; amount?: number }>,
    users: new Map<string, { id: string; points: number }>([
      ["u1", { id: "u1", points: 100 }],
      ["u2", { id: "u2", points: 100 }],
    ]),
  };

  const tx: any = {
    contest: {
      findUnique: vi.fn(async ({ where }: any) => (where.id === state.contest.id ? { ...state.contest } : null)),
      update: vi.fn(async ({ where, data }: any) => {
        if (where.id !== state.contest.id) throw new Error("contest not found");
        state.contest = { ...state.contest, ...data };
        return { ...state.contest };
      }),
    },
    contestRule: {
      findFirst: vi.fn(async () => ({ ...state.rule })),
    },
    contestEntry: {
      findUnique: vi.fn(async ({ where }: any) => {
        const key = where.contestId_userId;
        return state.entries.find((entry) => entry.contestId === key.contestId && entry.userId === key.userId) ?? null;
      }),
      create: vi.fn(async ({ data }: any) => {
        const id = `entry_${state.entries.length + 1}`;
        const entry = { id, contestId: data.contestId, userId: data.userId, status: data.status };
        state.entries.push(entry);
        for (const row of data.rosterLocks.createMany.data) {
          state.rosterLocks.push({ contestEntryId: id, ownedCardInstanceId: row.ownedCardInstanceId, contestId: data.contestId });
        }
        return { ...entry, rosterLocks: state.rosterLocks.filter((row) => row.contestEntryId === id) };
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const entry = state.entries.find((row) => row.id === where.id);
        if (!entry) throw new Error("entry not found");
        entry.status = data.status;
        state.rosterLocks = state.rosterLocks.filter((row) => row.contestEntryId !== where.id);
        for (const row of data.rosterLocks.createMany.data) {
          state.rosterLocks.push({ contestEntryId: where.id, ownedCardInstanceId: row.ownedCardInstanceId, contestId: entry.contestId });
        }
        return { ...entry, rosterLocks: state.rosterLocks.filter((row) => row.contestEntryId === where.id) };
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const entry of state.entries) {
          if (entry.contestId !== where.contestId) continue;
          if (where.userId?.in && !where.userId.in.includes(entry.userId)) continue;
          entry.status = data.status;
          count += 1;
        }
        return { count };
      }),
    },
    ownedCardInstance: {
      findMany: vi.fn(async ({ where }: any) => {
        return state.ownedCardInstances
          .filter((row) => where.id.in.includes(row.id) && row.userId === where.userId)
          .map((row) => ({ id: row.id, cardTemplateId: row.cardTemplateId, cardTemplate: { tokenProjectId: row.tokenProjectId } }));
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const entry = state.entries.find((row) => row.id === where.id);
        if (!entry) throw new Error("entry not found");
        entry.status = data.status;
        state.rosterLocks = state.rosterLocks.filter((row) => row.contestEntryId !== where.id);
        for (const row of data.rosterLocks.createMany.data) {
          state.rosterLocks.push({ contestEntryId: where.id, ownedCardInstanceId: row.ownedCardInstanceId, contestId: entry.contestId });
        }
        return { ...entry, rosterLocks: state.rosterLocks.filter((row) => row.contestEntryId === where.id) };
      }),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    rosterLock: {
      findMany: vi.fn(async ({ where }: any) => {
        const rows = state.rosterLocks.filter((row) => where.ownedCardInstanceId.in.includes(row.ownedCardInstanceId));
        return rows.map((row) => ({
          ownedCardInstanceId: row.ownedCardInstanceId,
          contestEntry: { contestId: row.contestId },
        }));
      }),
    },
    cardTemplate: {
      findMany: vi.fn(async () => []),
    },
    contestScore: {
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const key = `${where.contestId_userId.contestId}:${where.contestId_userId.userId}`;
        if (state.scores.has(key)) {
          state.scores.set(key, update.score);
          return { ...update };
        }
        state.scores.set(key, create.score);
        return { ...create };
      }),
      findMany: vi.fn(async () => {
        const rows = [...state.scores.entries()].map(([key, score]) => {
          const [, userId] = key.split(":");
          return { userId, score };
        });
        rows.sort((a, b) => b.score - a.score || a.userId.localeCompare(b.userId));
        return rows;
      }),
    },
    contestRanking: {
      deleteMany: vi.fn(async () => {
        state.rankings = [];
        return { count: 0 };
      }),
      createMany: vi.fn(async ({ data }: any) => {
        state.rankings = data;
        return { count: data.length };
      }),
    },
    contestSettlement: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (!state.settlement) return null;
        return state.settlement.contestId === where.contestId ? state.settlement : null;
      }),
      create: vi.fn(async ({ data }: any) => {
        const settlement = { id: "settlement_1", contestId: data.contestId };
        state.settlement = settlement;
        return settlement;
      }),
    },
    rewardGrant: {
      create: vi.fn(async ({ data }: any) => {
        state.rewardGrants.push({ userId: data.userId, type: data.type, amount: data.amount });
        return data;
      }),
    },
    user: {
      update: vi.fn(async ({ where, data }: any) => {
        const user = state.users.get(where.id);
        if (!user) throw new Error("user missing");
        user.points += data.points.increment;
        return user;
      }),
    },
  };

  return { tx, state };
}

describe("contest runtime stateful flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    debitPointsWithLedgerMock.mockResolvedValue({ applied: true });
    applyContestEntryQuestProgressionTxMock.mockResolvedValue(undefined);
  });

  it("creates entry, roster locks and blocks re-entry / lock conflicts", async () => {
    const { tx, state } = createStatefulTx();
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const result = await enterContestMvp({
      contestId: "contest_1",
      userId: "u1",
      lineupInstanceIds: ["i1", "i2", "i3", "i4", "i5"],
    });

    expect(result.entry.status).toBe("SUBMITTED");
    expect(state.entries).toHaveLength(1);
    expect(state.rosterLocks).toHaveLength(5);

    const updated = await enterContestMvp({
      contestId: "contest_1",
      userId: "u1",
      lineupInstanceIds: ["i1", "i2", "i3", "i4", "i5"],
    });
    expect(updated.entry.status).toBe("SUBMITTED");

    await expect(
      enterContestMvp({
        contestId: "contest_1",
        userId: "u2",
        lineupInstanceIds: ["i1", "j2", "j3", "j4", "j5"],
      })
    ).rejects.toThrow(/not owned by the user/i);

    expect(state.entries).toHaveLength(1);
  });


  it("rejects duplicate logical tokens across owned copies", async () => {
    const { tx, state } = createStatefulTx();
    state.ownedCardInstances.push({ id: "i1_copy", userId: "u1", cardTemplateId: "t1_alt", tokenProjectId: "p1" });
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await expect(
      enterContestMvp({
        contestId: "contest_1",
        userId: "u1",
        lineupInstanceIds: ["i1", "i1_copy", "i2", "i3", "i4"],
      })
    ).rejects.toThrow(/same token twice/i);
  });

  it("regenerates ranking on score re-import and enforces status checks", async () => {
    const { tx, state } = createStatefulTx();
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await enterContestMvp({ contestId: "contest_1", userId: "u1", lineupInstanceIds: ["i1", "i2", "i3", "i4", "i5"] });
    await enterContestMvp({ contestId: "contest_1", userId: "u2", lineupInstanceIds: ["j1", "j2", "j3", "j4", "j5"] });

    state.contest.status = ContestStatus.LOCKED;

    const first = await recordContestScoresMvp({
      contestId: "contest_1",
      scores: [
        { userId: "u1", score: 10 },
        { userId: "u2", score: 8 },
      ],
    });

    expect(first.rankingsCount).toBe(2);
    expect(state.rankings.map((row) => `${row.rank}:${row.userId}:${row.score}`)).toEqual(["1:u1:10", "2:u2:8"]);

    const second = await recordContestScoresMvp({
      contestId: "contest_1",
      scores: [
        { userId: "u1", score: 5 },
        { userId: "u2", score: 15 },
      ],
    });

    expect(second.rankingsCount).toBe(2);
    expect(state.rankings.map((row) => `${row.rank}:${row.userId}:${row.score}`)).toEqual(["1:u2:15", "2:u1:5"]);
    expect(state.entries.every((entry) => entry.status === "SCORED")).toBe(true);

    state.contest.status = ContestStatus.OPEN;
    await expect(
      recordContestScoresMvp({ contestId: "contest_1", scores: [{ userId: "u1", score: 1 }] })
    ).rejects.toThrow(/must be LOCKED or LIVE/i);
  });

  it("settles once, creates grants, updates points and blocks second settlement", async () => {
    const { tx, state } = createStatefulTx();
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await enterContestMvp({ contestId: "contest_1", userId: "u1", lineupInstanceIds: ["i1", "i2", "i3", "i4", "i5"] });
    state.contest.status = ContestStatus.LIVE;

    const result = await settleContestMvp({
      contestId: "contest_1",
      rewards: [{ userId: "u1", type: "POINTS", amount: 25 }],
    });

    expect(result.rewardCount).toBe(1);
    expect(state.settlement?.contestId).toBe("contest_1");
    expect(state.rewardGrants).toHaveLength(1);
    expect(state.users.get("u1")?.points).toBe(125);
    expect(state.contest.status).toBe(ContestStatus.SETTLED);
    expect(state.entries[0]?.status).toBe("SETTLED");

    await expect(
      settleContestMvp({
        contestId: "contest_1",
        rewards: [{ userId: "u1", type: "POINTS", amount: 10 }],
      })
    ).rejects.toThrow(/already settled|already exists/i);
  });
});
