import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  prismaMock,
  qstashMock,
} = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    contest: {
      findUnique: vi.fn(),
    },
  },
  qstashMock: {
    publishJSON: vi.fn(),
    messages: {
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/qstash", () => ({ qstash: qstashMock }));
vi.mock("@/lib/domain/contests/runtime", () => ({
  ContestRuntimeError: class ContestRuntimeError extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  },
}));

import { publishContest } from "@/lib/domain/contests/config-runtime";

function buildPublishableContest(overrides: Partial<any> = {}) {
  return {
    id: "c1",
    status: "DRAFT",
    code: "W1",
    title: "Week 1",
    description: null,
    configPublishedAt: null,
    openAt: new Date("2026-03-01T09:00:00.000Z"),
    lockAt: new Date("2026-03-01T10:00:00.000Z"),
    liveAt: new Date("2026-03-01T11:00:00.000Z"),
    endsAt: new Date("2026-03-01T12:00:00.000Z"),
    qstashOpenJobId: null,
    qstashLiveJobId: null,
    qstashSettleJobId: null,
    rules: [
      {
        id: "r1",
        teamSizeMode: "EXACT",
        maxRosterSize: 5,
        entryFeeEnabled: false,
        entryFeeCurrency: "POINTS",
        entryFeeAmount: null,
        eligibilityMode: "ANY",
        cardSetId: null,
        config: {
          rewardConfig: {
            pointsPool: 1000,
            packPool: 20,
            rewardedTopPercent: 25,
            distributionProfile: "balanced",
          },
        },
      },
    ],
    rewardPolicy: {
      id: "rp1",
      status: "DRAFT",
      bundles: [],
      distributionRules: [],
    },
    ...overrides,
  };
}

describe("contest publish runtime", () => {
  const originalToken = process.env.QSTASH_TOKEN;
  const originalBaseUrl = process.env.NEXT_PUBLIC_APP_URL;

  let tx: any;

  function primeContestReads(contest: any) {
    prismaMock.contest.findUnique.mockReset();
    prismaMock.contest.findUnique
      .mockResolvedValueOnce(contest)
      .mockResolvedValueOnce({ ...contest, status: "OPEN", configPublishedAt: new Date("2026-03-01T09:00:00.000Z") });
    tx.contest.findUnique.mockReset();
    tx.contest.findUnique.mockResolvedValue(contest);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.QSTASH_TOKEN = "token";
    process.env.NEXT_PUBLIC_APP_URL = "https://example.test";

    tx = {
      contest: {
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: "c1" }),
      },
      contestRewardPolicy: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));
    qstashMock.publishJSON.mockReset();
    qstashMock.messages.delete.mockReset();
    qstashMock.messages.delete.mockResolvedValue(undefined);

    primeContestReads(buildPublishableContest());
  });

  afterEach(() => {
    process.env.QSTASH_TOKEN = originalToken;
    process.env.NEXT_PUBLIC_APP_URL = originalBaseUrl;
  });

  it("publish with lockAt/liveAt/endsAt creates all lifecycle jobs and persists ids", async () => {
    qstashMock.publishJSON
      .mockResolvedValueOnce({ messageId: "lock-job" })
      .mockResolvedValueOnce({ messageId: "live-job" })
      .mockResolvedValueOnce({ messageId: "settle-job" });

    await publishContest("c1");

    expect(qstashMock.publishJSON).toHaveBeenCalledTimes(3);
    expect(qstashMock.publishJSON.mock.calls.map(([input]: any[]) => input.url)).toEqual([
      "https://example.test/api/internal/jobs/contest-open",
      "https://example.test/api/internal/jobs/contest-live",
      "https://example.test/api/internal/jobs/contest-settle",
    ]);
    expect(tx.contest.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: {
        configPublishedAt: expect.any(Date),
        status: "OPEN",
        qstashOpenJobId: "lock-job",
        qstashLiveJobId: "live-job",
        qstashSettleJobId: "settle-job",
      },
    });
  });

  it("publish without lockAt still creates LIVE and SETTLE jobs and persists ids", async () => {
    const noLockContest = buildPublishableContest({ lockAt: null });
    primeContestReads(noLockContest);
    qstashMock.publishJSON
      .mockResolvedValueOnce({ messageId: "live-job" })
      .mockResolvedValueOnce({ messageId: "settle-job" });

    await publishContest("c1");

    expect(qstashMock.publishJSON).toHaveBeenCalledTimes(2);
    expect(qstashMock.publishJSON.mock.calls.map(([input]: any[]) => input.url)).toEqual([
      "https://example.test/api/internal/jobs/contest-live",
      "https://example.test/api/internal/jobs/contest-settle",
    ]);
    expect(tx.contest.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: {
        configPublishedAt: expect.any(Date),
        status: "OPEN",
        qstashOpenJobId: null,
        qstashLiveJobId: "live-job",
        qstashSettleJobId: "settle-job",
      },
    });
  });

  it("fails publish visibly when lifecycle scheduling fails", async () => {
    qstashMock.publishJSON.mockRejectedValueOnce(new Error("qstash down"));

    await expect(publishContest("c1")).rejects.toThrow(/lifecycle job scheduling failed: qstash down/i);
    expect(tx.contest.update).not.toHaveBeenCalled();
  });

  it("cleans up prepared jobs if publish transaction fails after scheduling", async () => {
    qstashMock.publishJSON
      .mockResolvedValueOnce({ messageId: "lock-job" })
      .mockResolvedValueOnce({ messageId: "live-job" })
      .mockResolvedValueOnce({ messageId: "settle-job" });
    tx.contest.update.mockRejectedValueOnce(new Error("write failed"));

    await expect(publishContest("c1")).rejects.toThrow(/write failed/i);

    expect(qstashMock.messages.delete).toHaveBeenCalledTimes(3);
    expect(qstashMock.messages.delete.mock.calls.map(([jobId]: any[]) => jobId)).toEqual(["lock-job", "live-job", "settle-job"]);
  });
});
