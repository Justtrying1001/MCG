import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    questDefinition: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    userQuestProgress: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    questSubmission: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    rewardLedgerEntry: {
      groupBy: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  createQuestDefinitionMvp,
  getInternalQuestDetailMvp,
  listInternalQuestsMvp,
  syncContestEntryQuestProgression,
  updateQuestDefinitionMvp,
} from "@/lib/domain/quests/runtime";

type State = {
  user: { id: string; points: number };
  contestEntriesCount: number;
  packOpenCount: number;
  collectionCardCount: number;
  quests: Array<any>;
  progressByUserQuest: Map<string, any>;
  progressById: Map<string, any>;
  ledgerEntries: Array<any>;
};

function key(userId: string, questId: string) {
  return `${userId}:${questId}`;
}

function createTx(state: State) {
  return {
    contestEntry: {
      count: vi.fn(async () => state.contestEntriesCount),
    },
    packOpening: {
      count: vi.fn(async () => state.packOpenCount),
    },
    userCard: {
      aggregate: vi.fn(async () => ({ _sum: { quantity: state.collectionCardCount } })),
    },
    questDefinition: {
      findMany: vi.fn(async () => state.quests),
    },
    userQuestProgress: {
      findUnique: vi.fn(async ({ where }: any) => state.progressByUserQuest.get(key(where.userId_questId.userId, where.userId_questId.questId)) ?? null),
      create: vi.fn(async ({ data }: any) => {
        const created = { id: `p_${state.progressByUserQuest.size + 1}`, ...data };
        state.progressByUserQuest.set(key(data.userId, data.questId), created);
        state.progressById.set(created.id, created);
        return created;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const existing = state.progressById.get(where.id);
        if (!existing) throw new Error("Progress not found");

        const next = { ...existing, ...data };
        state.progressById.set(where.id, next);
        state.progressByUserQuest.set(key(existing.userId, existing.questId), next);
        return next;
      }),
    },
    rewardLedgerEntry: {
      findUnique: vi.fn(async ({ where }: any) => state.ledgerEntries.find((entry) => entry.idempotencyKey === where.idempotencyKey) ?? null),
      create: vi.fn(async ({ data }: any) => {
        const created = { id: `led_${state.ledgerEntries.length + 1}`, ...data };
        state.ledgerEntries.push(created);
        return created;
      }),
    },
    user: {
      update: vi.fn(async ({ where, data }: any) => {
        if (where.id !== state.user.id) throw new Error("User not found");
        state.user.points += data.points.increment;
        return state.user;
      }),
    },
  };
}

describe("quests runtime phase 3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("supports internal quest CRUD primitives", async () => {
    prismaMock.questDefinition.create.mockResolvedValue({ id: "q1", code: "contest_2" });
    prismaMock.questDefinition.findMany.mockResolvedValue([{ id: "q1", code: "contest_2" }]);
    prismaMock.userQuestProgress.groupBy.mockResolvedValue([
      { questId: "q1", status: "COMPLETED", _count: { questId: 2 } },
      { questId: "q1", status: "IN_PROGRESS", _count: { questId: 1 } },
    ]);
    prismaMock.questSubmission.groupBy.mockResolvedValue([
      { questId: "q1", status: "SUBMITTED", _count: { questId: 3 } },
      { questId: "q1", status: "APPROVED", _count: { questId: 4 } },
      { questId: "q1", status: "REJECTED", _count: { questId: 1 } },
    ]);
    prismaMock.rewardLedgerEntry.groupBy.mockResolvedValue([
      { reasonRef: "q1", _sum: { amount: 1500 } },
    ]);
    prismaMock.$transaction.mockImplementation(async (arg: any) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      throw new Error("unexpected transaction usage");
    });
    prismaMock.questDefinition.findUnique.mockResolvedValue({
      id: "q1",
      code: "contest_2",
      type: "CONTEST_COUNT_MILESTONE",
      title: "Play 2 contests",
      description: null,
      rewardPoints: 500,
      validationMode: "AUTO",
      oneTime: true,
      isActive: true,
      startAt: null,
      endAt: null,
      config: { threshold: 2 },
    });
    prismaMock.questDefinition.update.mockResolvedValue({ id: "q1", rewardPoints: 700 });

    const created = await createQuestDefinitionMvp({
      code: "contest_2",
      title: "Play 2 contests",
      type: "CONTEST_COUNT_MILESTONE",
      validationMode: "AUTO",
      rewardPoints: 500,
      config: { threshold: 2 },
    });

    const listed = await listInternalQuestsMvp();
    const updated = await updateQuestDefinitionMvp("q1", { rewardPoints: 700, config: { threshold: 3 } });

    expect(created.id).toBe("q1");
    expect(listed).toHaveLength(1);
    expect(listed[0].analytics.totalPointsDistributed).toBe(1500);
    expect(listed[0].analytics.completedCount).toBe(2);
    expect(updated.rewardPoints).toBe(700);
  });


  it("returns quest detail with analytics and linked recent rows", async () => {
    prismaMock.questDefinition.findUnique.mockResolvedValue({
      id: "q1",
      code: "contest_2",
      type: "CONTEST_COUNT_MILESTONE",
      title: "Play 2 contests",
      description: null,
      rewardPoints: 500,
      validationMode: "AUTO",
      oneTime: true,
      isActive: true,
      startAt: null,
      endAt: null,
      config: { threshold: 2 },
      createdAt: new Date("2026-03-01T10:00:00.000Z"),
      updatedAt: new Date("2026-03-01T10:00:00.000Z"),
    });
    prismaMock.userQuestProgress.groupBy.mockResolvedValue([
      { status: "IN_PROGRESS", _count: { status: 1 } },
      { status: "COMPLETED", _count: { status: 2 } },
    ]);
    prismaMock.questSubmission.groupBy.mockResolvedValue([
      { status: "SUBMITTED", _count: { status: 3 } },
      { status: "APPROVED", _count: { status: 4 } },
      { status: "REJECTED", _count: { status: 1 } },
    ]);
    prismaMock.rewardLedgerEntry.aggregate.mockResolvedValue({ _sum: { amount: 1500 } });
    prismaMock.questSubmission.findMany.mockResolvedValue([
      {
        id: "s1",
        status: "SUBMITTED",
        proofUrl: null,
        note: "x",
        reviewedByAdmin: null,
        reviewedAt: null,
        createdAt: new Date("2026-03-01T10:00:00.000Z"),
        user: { id: "u1", xUsername: "alice", displayName: "Alice" },
      },
    ]);
    prismaMock.userQuestProgress.findMany.mockResolvedValue([
      {
        userId: "u1",
        progressValue: 2,
        completedAt: new Date("2026-03-02T10:00:00.000Z"),
        updatedAt: new Date("2026-03-02T10:00:00.000Z"),
        user: { id: "u1", xUsername: "alice", displayName: "Alice" },
      },
    ]);
    prismaMock.rewardLedgerEntry.findMany.mockResolvedValue([
      {
        id: "l1",
        userId: "u1",
        amount: 500,
        idempotencyKey: "quest:q1:user:u1",
        createdAt: new Date("2026-03-02T10:00:00.000Z"),
        metadata: null,
        user: { id: "u1", xUsername: "alice", displayName: "Alice" },
      },
    ]);
    prismaMock.$transaction.mockImplementation(async (arg: any) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      throw new Error("unexpected transaction usage");
    });

    const detail = await getInternalQuestDetailMvp("q1");

    expect(detail.quest.id).toBe("q1");
    expect(detail.analytics.completedCount).toBe(2);
    expect(detail.analytics.totalPointsDistributed).toBe(1500);
    expect(detail.latestSubmissions).toHaveLength(1);
    expect(detail.recentlyCompletedUsers).toHaveLength(1);
    expect(detail.latestLedgerCredits[0].id).toBe("l1");
  });

  it("auto-completes and auto-credits contest milestone only once", async () => {
    const state: State = {
      user: { id: "u1", points: 0 },
      contestEntriesCount: 1,
      packOpenCount: 0,
      collectionCardCount: 0,
      quests: [
        {
          id: "q1",
          code: "contest_2",
          type: "CONTEST_COUNT_MILESTONE",
          title: "Play 2 contests",
          description: null,
          rewardPoints: 500,
          validationMode: "AUTO",
          oneTime: true,
          isActive: true,
          startAt: null,
          endAt: null,
          config: { threshold: 2 },
        },
      ],
      progressByUserQuest: new Map(),
      progressById: new Map(),
      ledgerEntries: [],
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(createTx(state), {}));

    await syncContestEntryQuestProgression(state.user.id);
    expect(state.user.points).toBe(0);
    expect(state.ledgerEntries).toHaveLength(0);

    state.contestEntriesCount = 2;
    await syncContestEntryQuestProgression(state.user.id);

    expect(state.user.points).toBe(500);
    expect(state.ledgerEntries).toHaveLength(1);
    expect(state.ledgerEntries[0].reasonType).toBe("QUEST_REWARD");
    expect(state.ledgerEntries[0].idempotencyKey).toBe("quest:q1:user:u1");

    state.contestEntriesCount = 3;
    await syncContestEntryQuestProgression(state.user.id);

    expect(state.user.points).toBe(500);
    expect(state.ledgerEntries).toHaveLength(1);

    const progress = state.progressByUserQuest.get("u1:q1");
    expect(progress.status).toBe("COMPLETED");
    expect(progress.progressValue).toBe(3);
  });

  it("auto-completes PACK_OPEN_COUNT milestone from pack openings", async () => {
    const state: State = {
      user: { id: "u1", points: 0 },
      contestEntriesCount: 0,
      packOpenCount: 2,
      collectionCardCount: 0,
      quests: [
        {
          id: "q_pack",
          code: "pack_3",
          type: "CONTEST_COUNT_MILESTONE",
          title: "Open 3 packs",
          description: null,
          rewardPoints: 150,
          validationMode: "AUTO",
          oneTime: true,
          isActive: true,
          startAt: null,
          endAt: null,
          config: { milestoneType: "PACK_OPEN_COUNT", targetValue: 3, threshold: 3 },
        },
      ],
      progressByUserQuest: new Map(),
      progressById: new Map(),
      ledgerEntries: [],
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(createTx(state), {}));

    await syncContestEntryQuestProgression(state.user.id);
    expect(state.user.points).toBe(0);

    state.packOpenCount = 3;
    await syncContestEntryQuestProgression(state.user.id);

    expect(state.user.points).toBe(150);
    expect(state.ledgerEntries).toHaveLength(1);
    expect(state.progressByUserQuest.get("u1:q_pack").status).toBe("COMPLETED");
  });

  it("auto-completes CARD_COLLECTION_COUNT milestone from user cards", async () => {
    const state: State = {
      user: { id: "u1", points: 0 },
      contestEntriesCount: 0,
      packOpenCount: 0,
      collectionCardCount: 49,
      quests: [
        {
          id: "q_col",
          code: "collect_50",
          type: "CONTEST_COUNT_MILESTONE",
          title: "Collect 50 cards",
          description: null,
          rewardPoints: 500,
          validationMode: "AUTO",
          oneTime: true,
          isActive: true,
          startAt: null,
          endAt: null,
          config: { milestoneType: "CARD_COLLECTION_COUNT", targetValue: 50, threshold: 50 },
        },
      ],
      progressByUserQuest: new Map(),
      progressById: new Map(),
      ledgerEntries: [],
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(createTx(state), {}));

    await syncContestEntryQuestProgression(state.user.id);
    expect(state.user.points).toBe(0);

    state.collectionCardCount = 50;
    await syncContestEntryQuestProgression(state.user.id);

    expect(state.user.points).toBe(500);
    expect(state.ledgerEntries).toHaveLength(1);
    expect(state.progressByUserQuest.get("u1:q_col").status).toBe("COMPLETED");
  });

});
