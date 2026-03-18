import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  prismaMock,
  qstashMock,
} = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    contest: {
      findUnique: vi.fn(),
      update: vi.fn(),
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

import { publishContest } from "@/lib/domain/contests/config-runtime";

function buildPublishableContest() {
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
  };
}

describe("contest publish runtime", () => {
  const originalToken = process.env.QSTASH_TOKEN;
  const originalBaseUrl = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.QSTASH_TOKEN = "token";
    process.env.NEXT_PUBLIC_APP_URL = "https://example.test";

    const tx: any = {
      contest: {
        findUnique: vi.fn().mockResolvedValue(buildPublishableContest()),
        update: vi.fn().mockResolvedValue({ id: "c1" }),
      },
      contestRewardPolicy: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));
    prismaMock.contest.findUnique.mockResolvedValue({
      lockAt: new Date("2026-03-01T10:00:00.000Z"),
      liveAt: new Date("2026-03-01T11:00:00.000Z"),
      endsAt: new Date("2026-03-01T12:00:00.000Z"),
    });
    prismaMock.contest.update.mockResolvedValue({ id: "c1" });
    qstashMock.publishJSON
      .mockResolvedValueOnce({ messageId: "lock-job" })
      .mockResolvedValueOnce({ messageId: "live-job" })
      .mockResolvedValueOnce({ messageId: "settle-job" });
  });

  afterEach(() => {
    process.env.QSTASH_TOKEN = originalToken;
    process.env.NEXT_PUBLIC_APP_URL = originalBaseUrl;
  });

  it("schedules lock, live and settle jobs on publish", async () => {
    await publishContest("c1");

    expect(qstashMock.publishJSON).toHaveBeenCalledTimes(3);
    expect(qstashMock.publishJSON.mock.calls.map(([input]: any[]) => ({
      url: input.url,
      notBefore: input.notBefore,
    }))).toEqual([
      {
        url: "https://example.test/api/internal/jobs/contest-open",
        notBefore: Math.floor(new Date("2026-03-01T10:00:00.000Z").getTime() / 1000),
      },
      {
        url: "https://example.test/api/internal/jobs/contest-live",
        notBefore: Math.floor(new Date("2026-03-01T11:00:00.000Z").getTime() / 1000),
      },
      {
        url: "https://example.test/api/internal/jobs/contest-settle",
        notBefore: Math.floor(new Date("2026-03-01T12:00:00.000Z").getTime() / 1000),
      },
    ]);
    expect(prismaMock.contest.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { qstashOpenJobId: "lock-job", qstashLiveJobId: "live-job", qstashSettleJobId: "settle-job" },
    });
  });
});
