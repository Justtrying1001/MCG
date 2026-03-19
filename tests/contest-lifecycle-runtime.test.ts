import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContestStatus } from "@prisma/client";

const {
  prismaMock,
  captureStartSnapshotMock,
  finalizeContestFromEndSnapshotTriggerMock,
} = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    contest: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  captureStartSnapshotMock: vi.fn(),
  finalizeContestFromEndSnapshotTriggerMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/domain/contests/runtime", () => ({
  ContestRuntimeError: class ContestRuntimeError extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  },
}));
vi.mock("@/lib/domain/contests/snapshot-runtime", () => ({
  captureStartSnapshot: captureStartSnapshotMock,
}));
vi.mock("@/lib/domain/contests/finalization-runtime", () => ({
  finalizeContestFromEndSnapshotTrigger: finalizeContestFromEndSnapshotTriggerMock,
}));

import { executeContestTransition, validateContestTransitionState } from "@/lib/domain/contests/contest-lifecycle-runtime";

describe("contest lifecycle runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.contest.updateMany.mockResolvedValue({ count: 1 });
    captureStartSnapshotMock.mockResolvedValue({ tokenCount: 3, capturedCount: 3 });
    finalizeContestFromEndSnapshotTriggerMock.mockResolvedValue({});
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn({
      contest: { findUnique: prismaMock.contest.findUnique },
      packDefinition: { findFirst: vi.fn().mockResolvedValue({ id: "pack-1" }) },
      contestRewardPolicy: { create: vi.fn().mockResolvedValue({ id: "rp1", status: "PUBLISHED" }) },
      contestRewardDistributionRule: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn().mockResolvedValue({}) },
      contestRewardComponent: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn().mockResolvedValue({}) },
      contestRewardBundle: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn().mockImplementation(async ({ data }: any) => ({ id: data.name, ...data })) },
    }));
  });

  it("manual validation and execution share the same allowed transition rules", async () => {
    const contest = {
      id: "c1",
      status: ContestStatus.OPEN,
      configPublishedAt: new Date("2026-03-12T00:00:00.000Z"),
      openAt: null,
      liveAt: null,
      lockAt: null,
      endsAt: null,
      _count: { entries: 0, rankings: 0, settlements: 0 },
    };

    const validation = validateContestTransitionState(contest, ContestStatus.SETTLED, "manual");
    prismaMock.contest.findUnique.mockResolvedValue(contest);

    expect(validation.blocking).toBe(true);
    await expect(executeContestTransition("c1", ContestStatus.SETTLED, "manual")).rejects.toThrow(/not allowed/i);
  });

  it("manual and auto OPEN -> LIVE use the same strict START snapshot path", async () => {
    const contest = {
      id: "c1",
      status: ContestStatus.OPEN,
      configPublishedAt: new Date("2026-03-12T00:00:00.000Z"),
      openAt: null,
      liveAt: null,
      lockAt: null,
      endsAt: null,
      _count: { entries: 2, rankings: 0, settlements: 0 },
    };

    prismaMock.contest.findUnique
      .mockResolvedValueOnce(contest)
      .mockResolvedValueOnce({
        id: "c1",
        _count: { entries: 2 },
        rules: [{ config: { rewardConfig: { pointsPool: 100, packPool: 1, rewardedTopPercent: 50, distributionProfile: "balanced" } } }],
        rewardPolicy: { id: "rp1", status: "PUBLISHED", bundles: [], distributionRules: [] },
      })
      .mockResolvedValueOnce(contest)
      .mockResolvedValueOnce({
        id: "c1",
        _count: { entries: 2 },
        rules: [{ config: { rewardConfig: { pointsPool: 100, packPool: 1, rewardedTopPercent: 50, distributionProfile: "balanced" } } }],
        rewardPolicy: { id: "rp1", status: "PUBLISHED", bundles: [], distributionRules: [] },
      });
    await executeContestTransition("c1", ContestStatus.LIVE, "manual");
    await executeContestTransition("c1", ContestStatus.LIVE, "auto");

    expect(captureStartSnapshotMock).toHaveBeenCalledTimes(2);
    expect(finalizeContestFromEndSnapshotTriggerMock).not.toHaveBeenCalled();
  });

  it("keeps the contest out of LIVE when the START snapshot fails in auto mode", async () => {
    const contest = {
      id: "c-start",
      status: ContestStatus.OPEN,
      configPublishedAt: new Date("2026-03-12T00:00:00.000Z"),
      openAt: null,
      liveAt: null,
      lockAt: null,
      endsAt: null,
      _count: { entries: 2, rankings: 0, settlements: 0 },
    };

    prismaMock.contest.findUnique
      .mockResolvedValueOnce(contest)
      .mockResolvedValueOnce({
        id: "c-start",
        _count: { entries: 2 },
        rules: [{ config: { rewardConfig: { pointsPool: 100, packPool: 1, rewardedTopPercent: 50, distributionProfile: "balanced" } } }],
        rewardPolicy: { id: "rp1", status: "PUBLISHED", bundles: [], distributionRules: [] },
      });
    captureStartSnapshotMock.mockReset();
    captureStartSnapshotMock.mockRejectedValueOnce(new Error("snapshot down"));

    await expect(executeContestTransition("c-start", ContestStatus.LIVE, "auto")).rejects.toThrow(/snapshot down/i);
    expect(prismaMock.contest.updateMany).not.toHaveBeenCalled();
  });

  it("supports LIVE -> SETTLED for zero-entry contests through the centralized runtime", async () => {
    const contest = {
      id: "c-zero",
      status: ContestStatus.LIVE,
      configPublishedAt: new Date("2026-03-12T00:00:00.000Z"),
      openAt: null,
      liveAt: null,
      lockAt: null,
      endsAt: null,
      _count: { entries: 0, rankings: 0, settlements: 0 },
    };

    prismaMock.contest.findUnique.mockResolvedValue(contest);

    const result = await executeContestTransition("c-zero", ContestStatus.SETTLED, "manual");

    expect(result.executed).toBe(true);
    expect(finalizeContestFromEndSnapshotTriggerMock).toHaveBeenCalledWith("c-zero");
    expect(result.automation.finalizationTriggered).toBe(true);
  });

  it("keeps entrant contests on the finalization path instead of a blind status update", async () => {
    const contest = {
      id: "c2",
      status: ContestStatus.LIVE,
      configPublishedAt: new Date("2026-03-12T00:00:00.000Z"),
      openAt: null,
      liveAt: null,
      lockAt: null,
      endsAt: null,
      _count: { entries: 4, rankings: 0, settlements: 0 },
    };

    const validation = validateContestTransitionState(contest, ContestStatus.SETTLED, "manual");
    prismaMock.contest.findUnique.mockResolvedValue(contest);

    expect(validation.blocking).toBe(false);
    expect(validation.issues).toEqual([
      expect.objectContaining({ code: "CONTEST_FINALIZATION_REQUIRED", severity: "WARN" }),
    ]);

    await executeContestTransition("c2", ContestStatus.SETTLED, "manual");

    expect(finalizeContestFromEndSnapshotTriggerMock).toHaveBeenCalledWith("c2");
    expect(prismaMock.contest.updateMany).toHaveBeenCalledWith({
      where: { id: "c2", status: ContestStatus.LIVE },
      data: { status: ContestStatus.SETTLED },
    });
  });

  it("does not mark the contest SETTLED when finalization fails", async () => {
    const contest = {
      id: "c3",
      status: ContestStatus.LIVE,
      configPublishedAt: new Date("2026-03-12T00:00:00.000Z"),
      openAt: null,
      liveAt: null,
      lockAt: null,
      endsAt: null,
      _count: { entries: 4, rankings: 0, settlements: 0 },
    };

    prismaMock.contest.findUnique.mockResolvedValue(contest);
    finalizeContestFromEndSnapshotTriggerMock.mockRejectedValueOnce(new Error("rewards failed"));

    await expect(executeContestTransition("c3", ContestStatus.SETTLED, "auto")).rejects.toThrow(/rewards failed/i);
    expect(prismaMock.contest.updateMany).not.toHaveBeenCalled();
  });


  it("materializes reward config into a fixed LIVE reward policy before entering live", async () => {
    const contest = {
      id: "c-mat",
      status: ContestStatus.OPEN,
      configPublishedAt: new Date("2026-03-12T00:00:00.000Z"),
      openAt: null,
      liveAt: null,
      lockAt: null,
      endsAt: null,
      _count: { entries: 4, rankings: 0, settlements: 0 },
    };

    prismaMock.contest.findUnique
      .mockResolvedValueOnce(contest)
      .mockResolvedValueOnce({
        id: "c-mat",
        _count: { entries: 4 },
        rules: [{ config: { rewardConfig: { pointsPool: 100, packPool: 0, rewardedTopPercent: 50, distributionProfile: "balanced" } } }],
        rewardPolicy: { id: "rp1", status: "PUBLISHED", bundles: [], distributionRules: [] },
      });
    captureStartSnapshotMock.mockReset();
    captureStartSnapshotMock.mockResolvedValue({ tokenCount: 3, capturedCount: 3 });

    await executeContestTransition("c-mat", ContestStatus.LIVE, "manual");

    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(captureStartSnapshotMock).toHaveBeenCalledWith("c-mat");
  });
});