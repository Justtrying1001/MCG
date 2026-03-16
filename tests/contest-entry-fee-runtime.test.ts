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

import { enterContestMvp } from "@/lib/domain/contests/runtime";

function makeTx() {
  return {
    contest: { findUnique: vi.fn().mockResolvedValue({ id: "c1", status: "OPEN", lockAt: null }) },
    contestEntry: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "entry_1", rosterLocks: [] }),
    },
    contestRule: {
      findFirst: vi.fn().mockResolvedValue({
        teamSizeMode: "EXACT",
        teamSizeValue: 5,
        maxRosterSize: 5,
        entryFeeEnabled: true,
        entryFeeAmount: 120,
        eligibilityMode: "ANY",
        cardSetId: null,
      }),
    },
    ownedCardInstance: {
      findMany: vi.fn().mockResolvedValue([
        { id: "i1", cardTemplateId: "t1", cardTemplate: { tokenProjectId: "token_1" } },
        { id: "i2", cardTemplateId: "t2", cardTemplate: { tokenProjectId: "token_2" } },
        { id: "i3", cardTemplateId: "t3", cardTemplate: { tokenProjectId: "token_3" } },
        { id: "i4", cardTemplateId: "t4", cardTemplate: { tokenProjectId: "token_4" } },
        { id: "i5", cardTemplateId: "t5", cardTemplate: { tokenProjectId: "token_5" } },
      ]),
      updateMany: vi.fn().mockResolvedValue({ count: 5 }),
    },
    rosterLock: { findMany: vi.fn().mockResolvedValue([]) },
  };
}

describe("contest entry fee integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debits points with ledger when entry fee is enabled", async () => {
    const tx = makeTx();
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));
    debitPointsWithLedgerMock.mockResolvedValue({ applied: true });

    await enterContestMvp({
      contestId: "c1",
      userId: "u1",
      lineupInstanceIds: ["i1", "i2", "i3", "i4", "i5"],
    });

    expect(debitPointsWithLedgerMock).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ amount: 120, reasonRef: "c1", userId: "u1" })
    );
  });

  it("rejects entry when user has insufficient points", async () => {
    const tx = makeTx();
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));
    debitPointsWithLedgerMock.mockRejectedValue(new Error("Not enough points"));

    await expect(
      enterContestMvp({
        contestId: "c1",
        userId: "u1",
        lineupInstanceIds: ["i1", "i2", "i3", "i4", "i5"],
      })
    ).rejects.toMatchObject({ status: 409, message: "Insufficient points for contest entry fee" });
  });

  it("rejects lineup containing duplicate token projects across different owned copies", async () => {
    const tx = makeTx();
    tx.ownedCardInstance.findMany.mockResolvedValue([
      { id: "i1", cardTemplateId: "t1", cardTemplate: { tokenProjectId: "token_a" } },
      { id: "i2", cardTemplateId: "t2", cardTemplate: { tokenProjectId: "token_a" } },
      { id: "i3", cardTemplateId: "t3", cardTemplate: { tokenProjectId: "token_b" } },
      { id: "i4", cardTemplateId: "t4", cardTemplate: { tokenProjectId: "token_c" } },
      { id: "i5", cardTemplateId: "t5", cardTemplate: { tokenProjectId: "token_d" } },
    ]);
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await expect(
      enterContestMvp({
        contestId: "c1",
        userId: "u1",
        lineupInstanceIds: ["i1", "i2", "i3", "i4", "i5"],
      })
    ).rejects.toMatchObject({ status: 400, message: "Lineup cannot contain duplicate tokens" });
  });
});
