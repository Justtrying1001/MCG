import { QuestSubmissionStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true, displayName: true, xUsername: true, createdAt: true, points: true },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    const [recentRewards, recentContestParticipation, recentQuestStatus, moderationSignals] = await prisma.$transaction([
      prisma.rewardLedgerEntry.findMany({
        where: { userId: params.userId },
        orderBy: [{ createdAt: "desc" }],
        take: 10,
        select: { id: true, reasonType: true, amount: true, createdAt: true, entryType: true },
      }),
      prisma.contestEntry.findMany({
        where: { userId: params.userId },
        orderBy: [{ submittedAt: "desc" }],
        take: 10,
        select: { contestId: true, status: true },
      }),
      prisma.userQuestProgress.findMany({
        where: { userId: params.userId },
        orderBy: [{ updatedAt: "desc" }],
        take: 10,
        select: { questId: true, status: true },
      }),
      prisma.questSubmission.count({
        where: { userId: params.userId, status: QuestSubmissionStatus.REJECTED },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        displayName: user.displayName,
        xUsername: user.xUsername,
        createdAt: user.createdAt.toISOString(),
      },
      context: {
        balances: {
          points: user.points,
        },
        recentRewards: recentRewards.map((row) => ({
          type: row.entryType,
          reasonType: row.reasonType,
          amount: row.amount,
          createdAt: row.createdAt.toISOString(),
        })),
        recentContestParticipation,
        recentQuestStatus,
        moderationSignals: {
          rejectionsLast30d: moderationSignals,
        },
      },
    });
  } catch (error) {
    return handleApiError(error, "Cannot load user admin context");
  }
}
