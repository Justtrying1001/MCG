import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContestStatus } from "@prisma/client";

const {
  prismaMock,
  executeContestTransitionMock,
} = vi.hoisted(() => ({
  prismaMock: {
    contest: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
  executeContestTransitionMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/domain/contests/contest-lifecycle-runtime", () => ({
  executeContestTransition: executeContestTransitionMock,
}));

import { reconcileContestLifecycleByTime, reconcileDueContestsByTime } from "@/lib/domain/contests/lifecycle-reconciliation";

describe("contest lifecycle reconciliation", () => {
  function mockContestState(initial: { id: string; status: ContestStatus; liveAt: Date; lockAt: Date; endsAt: Date }) {
    const state = { ...initial };
    prismaMock.contest.findUnique.mockImplementation(async () => ({ ...state }));
    executeContestTransitionMock.mockImplementation(async (_contestId: string, target: ContestStatus) => {
      state.status = target;
      return { contest: { id: state.id, status: state.status } };
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    executeContestTransitionMock.mockResolvedValue({});
  });

  it("keeps OPEN before lockAt", async () => {
    mockContestState({
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

  it("moves OPEN directly to LIVE after the OPEN phase ends", async () => {
    mockContestState({
      id: "c1",
      status: ContestStatus.OPEN,
      liveAt: new Date("2026-03-14T13:30:00.000Z"),
      lockAt: new Date("2026-03-14T13:00:00.000Z"),
      endsAt: new Date("2026-03-14T14:00:00.000Z"),
    });

    const result = await reconcileContestLifecycleByTime("c1", new Date("2026-03-14T13:01:00.000Z"));

    expect(result?.finalStatus).toBe(ContestStatus.LIVE);
    expect(result?.steps).toEqual([
      { from: ContestStatus.OPEN, to: ContestStatus.LIVE, reason: "OPEN_PHASE_ENDED" },
    ]);
    expect(executeContestTransitionMock).toHaveBeenCalledWith("c1", ContestStatus.LIVE, "auto");
  });

  it("moves LIVE to SETTLED after endsAt with full finalization automation", async () => {
    mockContestState({
      id: "c1",
      status: ContestStatus.LIVE,
      liveAt: new Date("2026-03-14T12:00:00.000Z"),
      lockAt: new Date("2026-03-14T13:00:00.000Z"),
      endsAt: new Date("2026-03-14T14:00:00.000Z"),
    });

    const result = await reconcileContestLifecycleByTime("c1", new Date("2026-03-14T15:00:00.000Z"));

    expect(result?.finalStatus).toBe(ContestStatus.SETTLED);
    expect(result?.steps.map((s) => s.to)).toEqual([ContestStatus.SETTLED]);
    expect(executeContestTransitionMock).toHaveBeenCalledWith("c1", ContestStatus.SETTLED, "auto");
  });

  it("catches up OPEN directly to LIVE then SETTLED", async () => {
    mockContestState({
      id: "c1",
      status: ContestStatus.OPEN,
      liveAt: new Date("2026-03-14T12:00:00.000Z"),
      lockAt: new Date("2026-03-14T13:00:00.000Z"),
      endsAt: new Date("2026-03-14T14:00:00.000Z"),
    });

    const result = await reconcileContestLifecycleByTime("c1", new Date("2026-03-14T15:00:00.000Z"));

    expect(result?.steps.map((s) => `${s.from}->${s.to}`)).toEqual([
      "OPEN->LIVE",
      "LIVE->SETTLED",
    ]);
    expect(executeContestTransitionMock.mock.calls).toEqual([
      ["c1", ContestStatus.LIVE, "auto"],
      ["c1", ContestStatus.SETTLED, "auto"],
    ]);
  });

  it("reconciles due contests in batch", async () => {
    prismaMock.contest.findMany.mockResolvedValue([{ id: "c1" }]);
    mockContestState({
      id: "c1",
      status: ContestStatus.OPEN,
      liveAt: new Date("2026-03-14T13:30:00.000Z"),
      lockAt: new Date("2026-03-14T13:00:00.000Z"),
      endsAt: new Date("2026-03-14T14:00:00.000Z"),
    });

    const result = await reconcileDueContestsByTime(new Date("2026-03-14T13:01:00.000Z"));

    expect(prismaMock.contest.findMany).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0]?.finalStatus).toBe(ContestStatus.LIVE);
  });
});
