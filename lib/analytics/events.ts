import { AnalyticsEventType, type Prisma } from "@prisma/client";
import { getPackSupplySummary } from "@/lib/domain/rewards/pack-supply";
import { prisma } from "@/lib/prisma";

export const INTERNAL_EVENT_TYPES = {
  pageView: AnalyticsEventType.PAGE_VIEW,
  clickOpenPack: AnalyticsEventType.CLICK_OPEN_PACK,
  login: AnalyticsEventType.LOGIN,
  packOpen: AnalyticsEventType.PACK_OPEN,
} as const;

export type InternalEventType = (typeof INTERNAL_EVENT_TYPES)[keyof typeof INTERNAL_EVENT_TYPES];
export type AnalyticsRange = "today" | "7d" | "all";

export async function recordInternalEvent(input: {
  type: InternalEventType;
  visitorId: string;
  userId?: string | null;
  isGuest?: boolean;
  createdAt?: Date;
}) {
  try {
    await prisma.event.create({
      data: {
        type: input.type,
        visitorId: input.visitorId,
        userId: input.userId ?? null,
        isGuest: input.isGuest ?? !input.userId,
        createdAt: input.createdAt,
      },
    });
  } catch {
    // Internal analytics must never block the main product flow.
  }
}

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function rangeWhere(range: AnalyticsRange): Prisma.EventWhereInput {
  if (range === "all") return {};
  const now = new Date();
  const start = startOfUtcDay(now);
  if (range === "today") {
    return { createdAt: { gte: start } };
  }

  const daysAgo = new Date(start);
  daysAgo.setUTCDate(daysAgo.getUTCDate() - 6);
  return { createdAt: { gte: daysAgo } };
}

function rangeStart(range: AnalyticsRange): Date | undefined {
  if (range === "all") return undefined;
  const now = new Date();
  const start = startOfUtcDay(now);
  if (range === "today") {
    return start;
  }

  const daysAgo = new Date(start);
  daysAgo.setUTCDate(daysAgo.getUTCDate() - 6);
  return daysAgo;
}

function ratio(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Number(((current / previous) * 100).toFixed(1));
}

async function countDistinctVisitors(where: Prisma.EventWhereInput) {
  const rows = await prisma.event.groupBy({
    by: ["visitorId"],
    where: {
      ...where,
      visitorId: { not: null },
    },
  });

  return rows.length;
}

export async function getAdminAnalytics(range: AnalyticsRange) {
  const selectedWhere = rangeWhere(range);
  const todayWhere = rangeWhere("today");
  const selectedPackOpeningStart = rangeStart(range);
  const todayPackOpeningStart = rangeStart("today");
  const selectedPackOpeningWhere = selectedPackOpeningStart ? { openedAt: { gte: selectedPackOpeningStart } } : {};
  const todayPackOpeningWhere = todayPackOpeningStart ? { openedAt: { gte: todayPackOpeningStart } } : {};

  const [
    visitorsInRange,
    visitorsToday,
    clickOpenPackInRange,
    loginsInRange,
    funnelPackOpensInRange,
    guestPackOpensInRange,
    guestPackOpensToday,
    loggedPackOpensInRange,
    loggedPackOpensToday,
    supply,
  ] = await Promise.all([
    countDistinctVisitors({ ...selectedWhere, type: AnalyticsEventType.PAGE_VIEW }),
    countDistinctVisitors({ ...todayWhere, type: AnalyticsEventType.PAGE_VIEW }),
    countDistinctVisitors({ ...selectedWhere, type: AnalyticsEventType.CLICK_OPEN_PACK }),
    countDistinctVisitors({ ...selectedWhere, type: AnalyticsEventType.LOGIN }),
    countDistinctVisitors({ ...selectedWhere, type: AnalyticsEventType.PACK_OPEN }),
    prisma.event.count({ where: { ...selectedWhere, type: AnalyticsEventType.PACK_OPEN, isGuest: true } }),
    prisma.event.count({ where: { ...todayWhere, type: AnalyticsEventType.PACK_OPEN, isGuest: true } }),
    prisma.packOpeningEvent.count({ where: selectedPackOpeningWhere }),
    prisma.packOpeningEvent.count({ where: todayPackOpeningWhere }),
    getPackSupplySummary(),
  ]);

  const packsOpenedInRange = guestPackOpensInRange + loggedPackOpensInRange;
  const packsOpenedToday = guestPackOpensToday + loggedPackOpensToday;
  const remainingSupply = supply.global.remaining;

  return {
    range,
    overview: {
      visitorsToday,
      visitorsTotal: visitorsInRange,
      packsOpenedToday,
      packsOpenedTotal: packsOpenedInRange,
      packsRemaining: remainingSupply,
    },
    funnel: {
      visitors: visitorsInRange,
      clickOpenPack: clickOpenPackInRange,
      login: loginsInRange,
      packOpen: funnelPackOpensInRange,
      conversion: {
        visitorToClickOpenPack: ratio(clickOpenPackInRange, visitorsInRange),
        clickOpenPackToLogin: ratio(loginsInRange, clickOpenPackInRange),
        loginToPackOpen: ratio(funnelPackOpensInRange, loginsInRange),
        visitorToPackOpen: ratio(funnelPackOpensInRange, visitorsInRange),
      },
    },
    packs: {
      totalOpened: packsOpenedInRange,
      guestOpened: guestPackOpensInRange,
      loggedOpened: loggedPackOpensInRange,
      remainingSupply,
    },
  };
}
