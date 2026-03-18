import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContestStatus } from "@prisma/client";

const {
  prismaMock,
  captureEndSnapshotMock,
  computeContestScoresFromSnapshotsMock,
  executeAutoSettlementForContestMock,
} = vi.hoisted(() => ({
  prismaMock: {
    contest: { findUnique: vi.fn() },
    contestEntry: { count: vi.fn() },
    rosterLock: { count: vi.fn() },
    contestTokenSnapshot: { count: vi.fn() },
    contestTokenScore: { count: vi.fn() },
    contestEntryScoreBreakdown: { count: vi.fn() },
    contestScore: { count: vi.fn() },
    contestRanking: { count: vi.fn() },
    contestSettlement: { count: vi.fn() },
  },
  captureEndSnapshotMock: vi.fn(),
  computeContestScoresFromSnapshotsMock: vi.fn(),
  executeAutoSettlementForContestMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/domain/contests/snapshot-runtime", () => ({ captureEndSnapshot: captureEndSnapshotMock }));
vi.mock("@/lib/domain/contests/scoring-engine-runtime", () => ({ computeContestScoresFromSnapshots: computeContestScoresFromSnapshotsMock }));
vi.mock("@/lib/domain/contests/settlement-plan-runtime", () => ({ executeAutoSettlementForContest: executeAutoSettlementForContestMock }));

import { deriveContestProgressFromCounts, finalizeContestFromEndSnapshotTrigger } from "@/lib/domain/contests/finalization-runtime";

describe("finalizeContestFromEndSnapshotTrigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.contest.findUnique.mockResolvedValue({ id: "c1", status: ContestStatus.LIVE });
    captureEndSnapshotMock.mockResolvedValue({});
    computeContestScoresFromSnapshotsMock.mockResolvedValue({});
    executeAutoSettlementForContestMock.mockResolvedValue({});
  });

  it("runs full pipeline when END/scoring/ranking/settlement are missing", async () => {
    prismaMock.contestEntry.count.mockResolvedValue(1);
    prismaMock.rosterLock.count.mockResolvedValue(1);
    prismaMock.contestTokenSnapshot.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    prismaMock.contestTokenScore.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    prismaMock.contestEntryScoreBreakdown.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    prismaMock.contestScore.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    prismaMock.contestRanking.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    prismaMock.contestSettlement.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    const result = await finalizeContestFromEndSnapshotTrigger("c1");

    expect(captureEndSnapshotMock).toHaveBeenCalledWith("c1");
    expect(computeContestScoresFromSnapshotsMock).toHaveBeenCalledWith("c1");
    expect(executeAutoSettlementForContestMock).toHaveBeenCalledWith("c1");
    expect(result.stepsExecuted).toEqual(["END_SNAPSHOT", "SCORING", "RANKING", "SETTLEMENT"]);
  });

  it("is idempotent when pipeline is already complete", async () => {
    prismaMock.contestEntry.count.mockResolvedValue(1);
    prismaMock.rosterLock.count.mockResolvedValue(1);
    prismaMock.contestTokenSnapshot.count.mockResolvedValue(1);
    prismaMock.contestTokenScore.count.mockResolvedValue(1);
    prismaMock.contestEntryScoreBreakdown.count.mockResolvedValue(1);
    prismaMock.contestScore.count.mockResolvedValue(1);
    prismaMock.contestRanking.count.mockResolvedValue(1);
    prismaMock.contestSettlement.count.mockResolvedValue(1);

    const result = await finalizeContestFromEndSnapshotTrigger("c1");

    expect(captureEndSnapshotMock).not.toHaveBeenCalled();
    expect(computeContestScoresFromSnapshotsMock).not.toHaveBeenCalled();
    expect(executeAutoSettlementForContestMock).not.toHaveBeenCalled();
    expect(result.stepsSkipped).toEqual(["END_SNAPSHOT", "SCORING", "RANKING", "SETTLEMENT"]);
  });

  it("finalizes zero-entry contests without forcing scoring or ranking", async () => {
    prismaMock.contestEntry.count.mockResolvedValue(0);
    prismaMock.rosterLock.count.mockResolvedValue(0);
    prismaMock.contestTokenSnapshot.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    prismaMock.contestTokenScore.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    prismaMock.contestEntryScoreBreakdown.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    prismaMock.contestScore.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    prismaMock.contestRanking.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    prismaMock.contestSettlement.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    const result = await finalizeContestFromEndSnapshotTrigger("c1");

    expect(captureEndSnapshotMock).toHaveBeenCalledWith("c1");
    expect(computeContestScoresFromSnapshotsMock).not.toHaveBeenCalled();
    expect(executeAutoSettlementForContestMock).toHaveBeenCalledWith("c1");
    expect(result.stepsExecuted).toEqual(["END_SNAPSHOT", "SETTLEMENT"]);
    expect(result.stepsSkipped).toEqual(["SCORING", "RANKING"]);
  });

  it("returns explicit step failure when scoring fails", async () => {
    prismaMock.contestEntry.count.mockResolvedValue(1);
    prismaMock.rosterLock.count.mockResolvedValue(1);
    prismaMock.contestTokenSnapshot.count.mockResolvedValue(1);
    prismaMock.contestTokenScore.count.mockResolvedValue(0);
    prismaMock.contestEntryScoreBreakdown.count.mockResolvedValue(0);
    prismaMock.contestScore.count.mockResolvedValue(0);
    prismaMock.contestRanking.count.mockResolvedValue(0);
    prismaMock.contestSettlement.count.mockResolvedValue(0);
    computeContestScoresFromSnapshotsMock.mockRejectedValue(new Error("broken compute"));

    await expect(finalizeContestFromEndSnapshotTrigger("c1")).rejects.toThrow(/\[RANKING\] broken compute/);
    expect(executeAutoSettlementForContestMock).not.toHaveBeenCalled();
  });
  it("derives scoring-ready when ranking + settlement exist even without breakdown rows", () => {
    expect(deriveContestProgressFromCounts({
      entries: 12,
      tokenScores: 12,
      breakdownRows: 0,
      scores: 12,
      rankings: 12,
      settlements: 1,
    })).toEqual({
      entries: 12,
      scoringReady: true,
      rankingGenerated: true,
      settlementDone: true,
    });
  });

});
