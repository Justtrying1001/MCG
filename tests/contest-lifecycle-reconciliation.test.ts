import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContestStatus } from "@prisma/client";

const {
  prismaMock,
  captureStartSnapshotMock,
  finalizeContestFromEndSnapshotTriggerMock,
} = vi.hoisted(() => ({
  prismaMock: {
    contest: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  captureStartSnapshotMock: vi.fn(),
  finalizeContestFromEndSnapshotTriggerMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/domain/contests/snapshot-runtime", () => ({
  captureStartSnapshot: captureStartSnapshotMock,
}));
vi.mock("@/lib/domain/contests/finalization-runtime", () => ({
  finalizeContestFromEndSnapshotTrigger: finalizeContestFromEndSnapshotTriggerMock,
}));

import { reconcileContestLifecycleByTime, reconcileDueContestsByTime } from "@/lib/domain/contests/lifecycle-reconciliation";

describe("contest lifecycle reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captureStartSnapshotMock.mockResolvedValue({});
    finalizeContestFromEndSnapshotTriggerMock.mockResolvedValue({});
    prismaMock.contest.updateMany.mockResolvedValue({ count: 1 });
  });

  it("keeps OPEN before lockAt", async () => {
    prismaMock.contest.findUnique.mockResolvedValue({
      id: "c1",
      status: ContestStatus.OPEN,
      liveAt: new Date("2026-03-14T13:30:00.000Z"),
      lockAt: new Date("2026-03-14T13:00:00.000Z"),
      endsAt: new Date("2026-03-14T14:00:00.000Z"),
    });

    const result = await reconcileContestLifecycleByTime("c1", new Date("2026-03-14T12:30:00.000Z"));

    expect(result?.initialStatus).toBe(ContestStatus.OPEN);
    expect(result?.finalStatus).toBe(ContestStatus.OPEN);
    expect(result?.steps).toEqual([]);
  });

  it("moves OPEN to LOCKED after lockAt", async () => {
    prismaMock.contest.findUnique.mockResolvedValue({
      id: "c1",
      status: ContestStatus.OPEN,
      liveAt: new Date("2026-03-14T13:30:00.000Z"),
      lockAt: new Date("2026-03-14T13:00:00.000Z"),
      endsAt: new Date("2026-03-14T14:00:00.000Z"),
    });

    const result = await reconcileContestLifecycleByTime("c1", new Date("2026-03-14T13:01:00.000Z"));

    expect(result?.finalStatus).toBe(ContestStatus.LOCKED);
    expect(result?.steps.map((s) => s.to)).toEqual([ContestStatus.LOCKED]);
    expect(captureStartSnapshotMock).not.toHaveBeenCalled();
    expect(finalizeContestFromEndSnapshotTriggerMock).not.toHaveBeenCalled();
  });

  it("moves LIVE to SETTLED after endsAt with full finalization automation", async () => {
    prismaMock.contest.findUnique.mockResolvedValue({
      id: "c1",
      status: ContestStatus.LIVE,
      liveAt: new Date("2026-03-14T12:00:00.000Z"),
      lockAt: new Date("2026-03-14T13:00:00.000Z"),
      endsAt: new Date("2026-03-14T14:00:00.000Z"),
    });

    const result = await reconcileContestLifecycleByTime("c1", new Date("2026-03-14T15:00:00.000Z"));

    expect(result?.finalStatus).toBe(ContestStatus.SETTLED);
    expect(result?.steps.map((s) => s.to)).toEqual([ContestStatus.SETTLED]);
    expect(finalizeContestFromEndSnapshotTriggerMock).toHaveBeenCalledWith("c1");
  });

  it("catches up OPEN directly to SETTLED step-by-step", async () => {
    prismaMock.contest.findUnique.mockResolvedValue({
      id: "c1",
      status: ContestStatus.OPEN,
      liveAt: new Date("2026-03-14T12:00:00.000Z"),
      lockAt: new Date("2026-03-14T13:00:00.000Z"),
      endsAt: new Date("2026-03-14T14:00:00.000Z"),
    });

    const result = await reconcileContestLifecycleByTime("c1", new Date("2026-03-14T15:00:00.000Z"));

    expect(result?.steps.map((s) => `${s.from}->${s.to}`)).toEqual([
      "OPEN->LOCKED",
      "LOCKED->LIVE",
      "LIVE->SETTLED",
    ]);
    expect(captureStartSnapshotMock).toHaveBeenCalledTimes(1);
    expect(finalizeContestFromEndSnapshotTriggerMock).toHaveBeenCalledTimes(1);
  });

  it("reconciles due contests in batch", async () => {
    prismaMock.contest.findMany.mockResolvedValue([{ id: "c1" }]);
    prismaMock.contest.findUnique.mockResolvedValue({
      id: "c1",
      status: ContestStatus.OPEN,
      liveAt: new Date("2026-03-14T13:30:00.000Z"),
      lockAt: new Date("2026-03-14T13:00:00.000Z"),
      endsAt: new Date("2026-03-14T14:00:00.000Z"),
    });

    const result = await reconcileDueContestsByTime(new Date("2026-03-14T13:01:00.000Z"));

    expect(prismaMock.contest.findMany).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0]?.finalStatus).toBe(ContestStatus.LOCKED);
  });
});
