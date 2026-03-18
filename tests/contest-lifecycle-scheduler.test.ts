import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { reconcileDueContestsByTimeMock } = vi.hoisted(() => ({
  reconcileDueContestsByTimeMock: vi.fn(),
}));

vi.mock("@/lib/domain/contests/lifecycle-reconciliation", () => ({
  reconcileDueContestsByTime: reconcileDueContestsByTimeMock,
}));

import { ensureContestLifecycleSchedulerStarted } from "@/lib/domain/contests/lifecycle-scheduler";

describe("contest lifecycle scheduler", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSchedulerFlag = process.env.ENABLE_CONTEST_LIFECYCLE_SCHEDULER;
  const originalQStashToken = process.env.QSTASH_TOKEN;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.__mcgContestLifecycleSchedulerStarted = undefined;
    delete process.env.QSTASH_TOKEN;
    delete process.env.ENABLE_CONTEST_LIFECYCLE_SCHEDULER;
  });

  it("does not start when env flag is disabled", () => {
    process.env.ENABLE_CONTEST_LIFECYCLE_SCHEDULER = "0";
    ensureContestLifecycleSchedulerStarted();
    expect(reconcileDueContestsByTimeMock).not.toHaveBeenCalled();
  });

  it("starts fallback automatically when QStash is absent", () => {
    (process.env as any).NODE_ENV = "development";
    const intervalSpy = vi.spyOn(global, "setInterval").mockImplementation((() => 1) as any);

    ensureContestLifecycleSchedulerStarted();
    ensureContestLifecycleSchedulerStarted();

    expect(intervalSpy).toHaveBeenCalledTimes(1);
    expect(reconcileDueContestsByTimeMock).toHaveBeenCalledTimes(1);

    intervalSpy.mockRestore();
  });

  it("can still be explicitly enabled alongside QStash", () => {
    (process.env as any).NODE_ENV = "development";
    process.env.QSTASH_TOKEN = "token";
    process.env.ENABLE_CONTEST_LIFECYCLE_SCHEDULER = "1";
    const intervalSpy = vi.spyOn(global, "setInterval").mockImplementation((() => 1) as any);

    ensureContestLifecycleSchedulerStarted();

    expect(intervalSpy).toHaveBeenCalledTimes(1);
    expect(reconcileDueContestsByTimeMock).toHaveBeenCalledTimes(1);

    intervalSpy.mockRestore();
  });

  afterEach(() => {
    (process.env as any).NODE_ENV = originalNodeEnv;
    process.env.ENABLE_CONTEST_LIFECYCLE_SCHEDULER = originalSchedulerFlag;
    process.env.QSTASH_TOKEN = originalQStashToken;
  });
});
