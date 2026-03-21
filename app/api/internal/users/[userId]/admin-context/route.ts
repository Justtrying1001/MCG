import { QuestSubmissionStatus, RewardLedgerReasonType } from "@prisma/client";
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
      select: { id: true, displayName: true, handle: true, createdAt: true, points: true },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    const [
      rewardsAgg,
      questPending,
      questApproved,
      questRejected,
      questCompleted,
      entriesCount,
      scoredEntriesCount,
      settlementsCount,
      completedMilestones,
      packOpenEvents,
      contestEntries,
      questSubmissions,
      rewardLedger,
      adminActions,
    ] = await prisma.$transaction([
      prisma.rewardLedgerEntry.aggregate({
        where: { userId: params.userId, entryType: "CREDIT", reasonType: RewardLedgerReasonType.ADMIN_GRANT },
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.questSubmission.count({ where: { userId: params.userId, status: QuestSubmissionStatus.SUBMITTED } }),
      prisma.questSubmission.count({ where: { userId: params.userId, status: QuestSubmissionStatus.APPROVED } }),
      prisma.questSubmission.count({ where: { userId: params.userId, status: QuestSubmissionStatus.REJECTED } }),
      prisma.userQuestProgress.count({ where: { userId: params.userId, status: "COMPLETED" } }),
      prisma.contestEntry.count({ where: { userId: params.userId } }),
      prisma.contestScore.count({ where: { userId: params.userId } }),
      prisma.contestEntry.count({ where: { userId: params.userId, status: "SETTLED" } }),
      prisma.userQuestProgress.findMany({
        where: { userId: params.userId, status: "COMPLETED", quest: { type: "CONTEST_COUNT_MILESTONE" } },
        orderBy: [{ completedAt: "desc" }],
        take: 20,
        select: {
          questId: true,
          completedAt: true,
          quest: { select: { title: true, code: true } },
        },
      }),
      prisma.packOpeningEvent.findMany({ where: { userId: params.userId }, orderBy: [{ openedAt: "desc" }], take: 20, select: { id: true, openedAt: true } }),
      prisma.contestEntry.findMany({ where: { userId: params.userId }, orderBy: [{ submittedAt: "desc" }], take: 20, select: { id: true, contestId: true, status: true, submittedAt: true } }),
      prisma.questSubmission.findMany({ where: { userId: params.userId }, orderBy: [{ createdAt: "desc" }], take: 20, select: { id: true, questId: true, status: true, createdAt: true } }),
      prisma.rewardLedgerEntry.findMany({ where: { userId: params.userId }, orderBy: [{ createdAt: "desc" }], take: 20, select: { id: true, reasonType: true, amount: true, entryType: true, createdAt: true } }),
      prisma.adminActionLog.findMany({
        where: { targetType: "USER", targetId: params.userId },
        orderBy: [{ createdAt: "desc" }],
        take: 20,
        select: { id: true, actionType: true, actorLabel: true, status: true, createdAt: true },
      }),
    ]);

    const activity = [
      ...packOpenEvents.map((item) => ({ type: "PACK_OPEN", label: "Opened pack", at: item.openedAt.toISOString(), ref: item.id })),
      ...contestEntries.map((item) => ({ type: "CONTEST_ENTRY", label: `Contest entry ${item.status}`, at: item.submittedAt.toISOString(), ref: item.id })),
      ...questSubmissions.map((item) => ({ type: "QUEST_SUBMISSION", label: `Quest submission ${item.status}`, at: item.createdAt.toISOString(), ref: item.id })),
      ...rewardLedger.map((item) => ({ type: "REWARD_LEDGER", label: `${item.entryType} ${item.amount} (${item.reasonType})`, at: item.createdAt.toISOString(), ref: item.id })),
      ...adminActions.map((item) => ({ type: "ADMIN_ACTION", label: `${item.actionType} by ${item.actorLabel} (${item.status})`, at: item.createdAt.toISOString(), ref: item.id })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 40);

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        displayName: user.displayName,
        handle: user.handle,
        createdAt: user.createdAt.toISOString(),
        points: user.points,
      },
      rewards: {
        grantsCount: rewardsAgg._count ?? 0,
        totalManualGranted: rewardsAgg._sum?.amount ?? 0,
      },
      quests: {
        pendingSubmissions: questPending,
        approvedSubmissions: questApproved,
        rejectedSubmissions: questRejected,
        completedProgress: questCompleted,
      },
      contests: {
        entriesCount,
        scoredEntriesCount,
        settlementsCount,
      },
      milestones: completedMilestones.map((row) => ({
        questId: row.questId,
        title: row.quest.title,
        code: row.quest.code,
        completedAt: row.completedAt?.toISOString() ?? null,
      })),
      activity,
    });
  } catch (error) {
    return handleApiError(error, "Cannot load user admin context");
  }
}
