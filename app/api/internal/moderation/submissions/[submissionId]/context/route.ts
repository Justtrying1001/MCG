import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: { submissionId: string } }) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const submission = await prisma.questSubmission.findUnique({
      where: { id: params.submissionId },
      include: {
        user: { select: { id: true, displayName: true, xUsername: true } },
        quest: { select: { id: true, code: true, title: true, validationMode: true, rewardPoints: true } },
      },
    });

    if (!submission) {
      return NextResponse.json({ ok: false, error: "Submission not found" }, { status: 404 });
    }

    const recentByUser = await prisma.questSubmission.findMany({
      where: { userId: submission.userId },
      orderBy: [{ createdAt: "desc" }],
      take: 10,
      select: { id: true, status: true, createdAt: true },
    });

    return NextResponse.json({
      ok: true,
      submission: {
        ...submission,
        createdAt: submission.createdAt.toISOString(),
        reviewedAt: submission.reviewedAt?.toISOString() ?? null,
      },
      context: {
        userRecentSubmissions: recentByUser.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
        approvalImpactPreview: {
          pointsDelta: submission.quest.rewardPoints,
          ledgerEntryWouldBeCreated: submission.quest.rewardPoints > 0,
        },
      },
    });
  } catch (error) {
    return handleApiError(error, "Cannot load moderation context");
  }
}
