import { AnalyticsEventType, type Prisma } from "@prisma/client";
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
  userId?: string | null;
  isGuest?: boolean;
  createdAt?: Date;
}) {
  try {
    await prisma.event.create({
      data: {
        type: input.type,
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

function ratio(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Number(((current / previous) * 100).toFixed(1));
}

export async function getAdminAnalytics(range: AnalyticsRange) {
  const selectedWhere = rangeWhere(range);
  const todayWhere = rangeWhere("today");

  const [
    visitorsInRange,
    visitorsToday,
    packsOpenedInRange,
    packsOpenedToday,
    clickOpenPackInRange,
    loginsInRange,
    guestPackOpensInRange,
    loggedPackOpensInRange,
    supply,
  ] = await Promise.all([
    prisma.event.count({ where: { ...selectedWhere, type: AnalyticsEventType.PAGE_VIEW } }),
    prisma.event.count({ where: { ...todayWhere, type: AnalyticsEventType.PAGE_VIEW } }),
    prisma.event.count({ where: { ...selectedWhere, type: AnalyticsEventType.PACK_OPEN } }),
    prisma.event.count({ where: { ...todayWhere, type: AnalyticsEventType.PACK_OPEN } }),
    prisma.event.count({ where: { ...selectedWhere, type: AnalyticsEventType.CLICK_OPEN_PACK } }),
    prisma.event.count({ where: { ...selectedWhere, type: AnalyticsEventType.LOGIN } }),
    prisma.event.count({ where: { ...selectedWhere, type: AnalyticsEventType.PACK_OPEN, isGuest: true } }),
    prisma.event.count({ where: { ...selectedWhere, type: AnalyticsEventType.PACK_OPEN, isGuest: false } }),
    prisma.packDefinition.aggregate({ _sum: { plannedPackCount: true, openedPackCount: true } }),
  ]);

  const remainingSupply = Math.max((supply._sum.plannedPackCount ?? 0) - (supply._sum.openedPackCount ?? 0), 0);

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
      packOpen: packsOpenedInRange,
      conversion: {
        visitorToClickOpenPack: ratio(clickOpenPackInRange, visitorsInRange),
        clickOpenPackToLogin: ratio(loginsInRange, clickOpenPackInRange),
        loginToPackOpen: ratio(packsOpenedInRange, loginsInRange),
        visitorToPackOpen: ratio(packsOpenedInRange, visitorsInRange),
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
