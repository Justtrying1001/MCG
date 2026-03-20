import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsEventType } from "@prisma/client";

vi.mock("@prisma/client", async () => {
  const actual = await vi.importActual<typeof import("@prisma/client")>("@prisma/client");
  return {
    ...actual,
    AnalyticsEventType: {
      PAGE_VIEW: "PAGE_VIEW",
      CLICK_OPEN_PACK: "CLICK_OPEN_PACK",
      LOGIN: "LOGIN",
      PACK_OPEN: "PACK_OPEN",
    },
  };
});

const {
  createMock,
  eventCountMock,
  groupByMock,
  packOpeningEventCountMock,
  getPackSupplySummaryMock,
} = vi.hoisted(() => ({
  createMock: vi.fn(),
  eventCountMock: vi.fn(),
  groupByMock: vi.fn(),
  packOpeningEventCountMock: vi.fn(),
  getPackSupplySummaryMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      create: createMock,
      count: eventCountMock,
      groupBy: groupByMock,
    },
    packOpeningEvent: {
      count: packOpeningEventCountMock,
    },
  },
}));

vi.mock("@/lib/domain/rewards/pack-supply", () => ({
  getPackSupplySummary: getPackSupplySummaryMock,
}));

import { getAdminAnalytics, recordInternalEvent, INTERNAL_EVENT_TYPES } from "@/lib/analytics/events";

describe("analytics events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists visitorId for recorded events", async () => {
    await recordInternalEvent({
      type: INTERNAL_EVENT_TYPES.pageView,
      visitorId: "visitor-1",
      userId: null,
      isGuest: true,
    });

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: AnalyticsEventType.PAGE_VIEW,
        visitorId: "visitor-1",
        userId: null,
        isGuest: true,
      }),
    });
  });

  it("uses distinct visitorId counts for visitor funnel analytics", async () => {
    groupByMock
      .mockResolvedValueOnce([{ visitorId: "v1" }, { visitorId: "v2" }])
      .mockResolvedValueOnce([{ visitorId: "v2" }])
      .mockResolvedValueOnce([{ visitorId: "v1" }, { visitorId: "v2" }])
      .mockResolvedValueOnce([{ visitorId: "v2" }])
      .mockResolvedValueOnce([{ visitorId: "v2" }]);
    eventCountMock
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    packOpeningEventCountMock
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2);
    getPackSupplySummaryMock.mockResolvedValue({
      global: {
        remaining: 15,
      },
    });

    const analytics = await getAdminAnalytics("today");

    expect(groupByMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      by: ["visitorId"],
      where: expect.objectContaining({ type: AnalyticsEventType.PAGE_VIEW, visitorId: { not: null } }),
    }));
    expect(groupByMock).toHaveBeenNthCalledWith(3, expect.objectContaining({
      where: expect.objectContaining({ type: AnalyticsEventType.CLICK_OPEN_PACK, visitorId: { not: null } }),
    }));
    expect(analytics.overview.visitorsToday).toBe(1);
    expect(analytics.overview.visitorsTotal).toBe(2);
    expect(analytics.funnel).toEqual({
      visitors: 2,
      clickOpenPack: 2,
      login: 1,
      packOpen: 1,
      conversion: {
        visitorToClickOpenPack: 100,
        clickOpenPackToLogin: 50,
        loginToPackOpen: 100,
        visitorToPackOpen: 50,
      },
    });
    expect(analytics.packs.totalOpened).toBe(4);
    expect(analytics.packs.guestOpened).toBe(1);
    expect(analytics.packs.loggedOpened).toBe(3);
    expect(analytics.packs.remainingSupply).toBe(15);
  });
});
