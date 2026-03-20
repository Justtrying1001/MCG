import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  QuestRuntimeError,
  listUserQuestsMvp,
  reviewQuestSubmissionMvp,
  submitSocialQuestMvp,
} from "@/lib/domain/quests/runtime";

type Submission = {
  id: string;
  userId: string;
  questId: string;
  status: "SUBMITTED" | "APPROVED" | "REJECTED";
  proofUrl: string | null;
  note: string | null;
  reviewedByAdmin: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type Progress = {
  id: string;
  userId: string;
  questId: string;
  status: string;
  startedAt?: Date | null;
  progressValue: number;
  completedAt: Date | null;
  claimedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type State = {
  user: { id: string; points: number };
  quest: {
    id: string;
    code: string;
    type: "SOCIAL_FOLLOW_X";
    title: string;
    description: string | null;
    rewardPoints: number;
    validationMode: "MANUAL_REVIEW" | "AUTO";
    oneTime: boolean;
    isActive: boolean;
    startAt: Date | null;
    endAt: Date | null;
    config: { proofRequired: boolean; targetUrl: string | null; instructions: string | null };
  };
  submissions: Submission[];
  progress: Progress | null;
  ledgerEntries: Array<{ id: string; idempotencyKey: string; reasonType: string; amount: number }>;
};

function createState(): State {
  return {
    user: { id: "u1", points: 0 },
    quest: {
      id: "q_social",
      code: "follow_x_campaign",
      type: "SOCIAL_FOLLOW_X",
      title: "Follow our X account",
      description: null,
      rewardPoints: 200,
      validationMode: "MANUAL_REVIEW",
      oneTime: true,
      isActive: true,
      startAt: null,
      endAt: null,
      config: { proofRequired: true, targetUrl: "https://x.com/mcg", instructions: "Follow and share profile URL" },
    },
    submissions: [],
    progress: null,
    ledgerEntries: [],
  };
}

function createTx(state: State) {
  return {
    questDefinition: {
      findUnique: vi.fn(async ({ where }: any) => (where.id === state.quest.id ? state.quest : null)),
      findMany: vi.fn(async () => [state.quest]),
    },
    contestEntry: {
      count: vi.fn(async () => 0),
    },
    questSubmission: {
      findFirst: vi.fn(async () => state.submissions[0] ?? null),
      create: vi.fn(async ({ data }: any) => {
        const created: Submission = {
          id: `s_${state.submissions.length + 1}`,
          status: "SUBMITTED",
          reviewedByAdmin: null,
          reviewedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        state.submissions.unshift(created);
        return created;
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        const row = state.submissions.find((submission) => submission.id === where.id) ?? null;
        return row ? { ...row, quest: state.quest } : null;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const index = state.submissions.findIndex((submission) => submission.id === where.id);
        if (index < 0) throw new Error("submission not found");
        const updated = {
          ...state.submissions[index],
          ...data,
          updatedAt: new Date(),
        };
        state.submissions[index] = updated;
        return updated;
      }),
      findMany: vi.fn(async () => state.submissions),
    },
    userQuestProgress: {
      findUnique: vi.fn(async () => state.progress),
      create: vi.fn(async ({ data }: any) => {
        const created: Progress = {
          id: "p1",
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: null,
          claimedAt: null,
          ...data,
        };
        state.progress = created;
        return created;
      }),
      update: vi.fn(async ({ data }: any) => {
        if (!state.progress) throw new Error("progress not found");
        state.progress = { ...state.progress, ...data, updatedAt: new Date() };
        return state.progress;
      }),
      findMany: vi.fn(async ({ where }: any) => {
        if (!state.progress || state.progress.userId !== where.userId) return [];
        if (where?.status && state.progress.status !== where.status) return [];
        return [{ ...state.progress, quest: state.quest }];
      }),
    },
    rewardLedgerEntry: {
      findUnique: vi.fn(async ({ where }: any) => state.ledgerEntries.find((row) => row.idempotencyKey === where.idempotencyKey) ?? null),
      create: vi.fn(async ({ data }: any) => {
        const created = { id: `led_${state.ledgerEntries.length + 1}`, ...data };
        state.ledgerEntries.push(created);
        return created;
      }),
    },
    user: {
      update: vi.fn(async ({ where, data }: any) => {
        if (where.id !== state.user.id) throw new Error("user not found");
        state.user.points += data.points.increment;
        return state.user;
      }),
    },
  };
}

describe("social submit runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates submission and blocks second pending submission", async () => {
    const state = createState();
    prismaMock.$transaction.mockImplementation(async (arg: any) => {
      if (typeof arg === "function") return arg(createTx(state), {});
      return [];
    });

    const created = await submitSocialQuestMvp({
      questId: state.quest.id,
      userId: state.user.id,
      proofUrl: "https://x.com/user",
      note: "done",
    });

    expect(created.status).toBe("SUBMITTED");
    expect(state.progress?.status).toBe("IN_PROGRESS");

    await expect(
      submitSocialQuestMvp({
        questId: state.quest.id,
        userId: state.user.id,
        proofUrl: "https://x.com/user2",
      })
    ).rejects.toBeInstanceOf(QuestRuntimeError);
  });

  it("approves once with exactly one ledger credit and supports reject/resubmit", async () => {
    const state = createState();
    prismaMock.$transaction.mockImplementation(async (arg: any) => {
      if (typeof arg === "function") return arg(createTx(state), {});
      if (Array.isArray(arg)) {
        const [q, p, s] = arg;
        return await Promise.all([q, p, s]);
      }
      return null;
    });

    await submitSocialQuestMvp({ questId: state.quest.id, userId: state.user.id, proofUrl: "https://x.com/user" });

    const approve1 = await reviewQuestSubmissionMvp({
      submissionId: state.submissions[0].id,
      action: "APPROVE",
      reviewedByAdmin: "session",
    });

    expect(approve1.alreadyReviewed).toBe(false);
    expect(state.user.points).toBe(200);
    expect(state.ledgerEntries).toHaveLength(1);
    expect(state.ledgerEntries[0].idempotencyKey).toBe(`quest-approval:${state.quest.id}:user:${state.user.id}`);
    expect(state.progress?.status).toBe("COMPLETED");

    const approve2 = await reviewQuestSubmissionMvp({
      submissionId: state.submissions[0].id,
      action: "APPROVE",
      reviewedByAdmin: "session",
    });

    expect(approve2.alreadyReviewed).toBe(true);
    expect(state.user.points).toBe(200);
    expect(state.ledgerEntries).toHaveLength(1);

    state.progress = { ...state.progress!, status: "REJECTED", completedAt: null, claimedAt: null };
    state.submissions.unshift({
      id: "s_rejected",
      userId: state.user.id,
      questId: state.quest.id,
      status: "REJECTED",
      proofUrl: null,
      note: null,
      reviewedByAdmin: "session",
      reviewedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const resubmit = await submitSocialQuestMvp({
      questId: state.quest.id,
      userId: state.user.id,
      proofUrl: "https://x.com/user3",
    });

    expect(resubmit.status).toBe("SUBMITTED");

    expect(state.submissions[0].status).toBe("SUBMITTED");
  });

  it("auto validation mode approves and credits on submit", async () => {
    const state = createState();
    state.quest.validationMode = "AUTO";
    state.quest.config.proofRequired = false;

    prismaMock.$transaction.mockImplementation(async (arg: any) => {
      if (typeof arg === "function") return arg(createTx(state), {});
      if (Array.isArray(arg)) return [ [state.quest], state.progress ? [state.progress] : [], state.submissions ];
      return null;
    });

    const result = await submitSocialQuestMvp({
      questId: state.quest.id,
      userId: state.user.id,
      note: "done",
    });

    expect(state.progress?.status).toBe("PENDING_VALIDATION");
    expect(state.progress?.startedAt).toBeInstanceOf(Date);
    expect(state.ledgerEntries).toHaveLength(0);
    expect(state.user.points).toBe(0);
  });


  it("lazy-validates elapsed auto quests during reads", async () => {
    const state = createState();
    state.quest.validationMode = "AUTO";
    state.quest.config.proofRequired = false;
    state.progress = {
      id: "p1",
      userId: state.user.id,
      questId: state.quest.id,
      status: "PENDING_VALIDATION",
      startedAt: new Date(Date.now() - 61_000),
      progressValue: 0,
      completedAt: null,
      claimedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.$transaction.mockImplementation(async (arg: any) => {
      if (typeof arg === "function") return arg(createTx(state), {});
      if (Array.isArray(arg)) return [ [state.quest], state.progress ? [state.progress] : [], state.submissions ];
      return null;
    });

    const result = await listUserQuestsMvp(state.user.id);

    expect(state.progress?.status).toBe("COMPLETED");
    expect(state.ledgerEntries).toHaveLength(1);
    expect(state.user.points).toBe(200);
    expect(state.submissions[0]?.status).toBe("APPROVED");
    expect(result.quests[0]?.status).toBe("COMPLETED");
  });

});
