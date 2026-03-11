import { ContestStatus, QuestSubmissionStatus } from "@prisma/client";
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
    const [contestCounts, pendingSubmissions, manualGrants24h, failedActions24h, recentActions] = await Promise.all([
      prisma.contest.groupBy({ by: ["status"], _count: { status: true } }),
      prisma.questSubmission.count({ where: { status: QuestSubmissionStatus.SUBMITTED } }),
      prisma.rewardLedgerEntry.count({
        where: {
          reasonType: "ADMIN_GRANT",
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.adminActionLog.count({
        where: {
          status: "FAILED",
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.adminActionLog.findMany({
        orderBy: [{ createdAt: "desc" }],
        take: 8,
        select: {
          id: true,
          actionType: true,
          module: true,
          status: true,
          actorLabel: true,
          targetType: true,
          targetId: true,
          createdAt: true,
          errorCode: true,
        },
      }),
    ]);

    const byStatus = Object.values(ContestStatus).reduce<Record<ContestStatus, number>>((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<ContestStatus, number>);

    for (const row of contestCounts) {
      byStatus[row.status] = row._count.status;
    }

    return NextResponse.json({
      ok: true,
      summary: {
        contestsByStatus: byStatus,
        pendingModerationCount: pendingSubmissions,
        manualGrantsLast24h: manualGrants24h,
        failedAdminActionsLast24h: failedActions24h,
      },
      recentCriticalEvents: recentActions.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error, "Cannot load admin dashboard summary");
  }
}
