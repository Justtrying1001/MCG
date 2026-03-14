import { PackSource, QuestType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const [packsOpened, packPlan, packsInRewards, packsOnSale, packRows, contestsTotal, contestsLive, questsSocial, milestonesTotal] = await prisma.$transaction([
      prisma.packOpeningEvent.count(),
      prisma.packDefinition.aggregate({ _sum: { plannedPackCount: true, openedPackCount: true } }),
      prisma.rewardGrant.count({ where: { type: "PACK" } }),
      prisma.packDefinition.count({ where: { source: PackSource.SALE, isActive: true } }),
      prisma.packDefinition.findMany({
        orderBy: [{ openedPackCount: "desc" }],
        take: 8,
        select: { id: true, code: true, displayName: true, plannedPackCount: true, openedPackCount: true, source: true },
      }),
      prisma.contest.count(),
      prisma.contest.count({ where: { status: "LIVE" } }),
      prisma.questDefinition.count({ where: { type: { in: [QuestType.SOCIAL_FOLLOW_X, QuestType.SOCIAL_ENGAGEMENT_X] } } }),
      prisma.questDefinition.count({ where: { type: QuestType.CONTEST_COUNT_MILESTONE } }),
    ]);

    return NextResponse.json({
      ok: true,
      packs: {
        opened: packsOpened,
        planned: packPlan._sum.plannedPackCount ?? 0,
        openedByPlan: packPlan._sum.openedPackCount ?? 0,
        inRewards: packsInRewards,
        onSale: packsOnSale,
        rows: packRows,
      },
      contests: { total: contestsTotal, live: contestsLive },
      quests: { totalSocial: questsSocial },
      milestones: { total: milestonesTotal },
    });
  } catch (error) {
    return handleApiError(error, "Cannot load essentials summary");
  }
}
