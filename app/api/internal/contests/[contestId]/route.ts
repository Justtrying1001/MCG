import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api-error";
import { archiveContest, deleteContestDraft, unpublishContest } from "@/lib/domain/contests/config-runtime";
import { ContestRuntimeError } from "@/lib/domain/contests/runtime";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

const actionSchema = z.object({
  action: z.enum(["ARCHIVE", "UNPUBLISH"]),
});

export async function GET(request: NextRequest, { params }: { params: { contestId: string } }) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const contest = await prisma.contest.findUnique({
      where: { id: params.contestId },
      include: {
        rules: true,
        _count: {
          select: {
            entries: true,
            scores: true,
            rankings: true,
            settlements: true,
          },
        },
      },
    });

    if (!contest) {
      return NextResponse.json({ ok: false, error: "Contest not found" }, { status: 404 });
    }

    const rankings = await prisma.contestRanking.findMany({
      where: { contestId: params.contestId },
      orderBy: { rank: "asc" },
      take: 25,
    });

    const recentScores = await prisma.contestScore.findMany({
      where: { contestId: params.contestId },
      orderBy: [{ scoredAt: "desc" }],
      take: 25,
    });

    return NextResponse.json({ contest, rankings, recentScores });
  } catch (error) {
    return handleApiError(error, "Cannot load internal contest detail");
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { contestId: string } }) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid action", issues: parsed.error.issues }, { status: 400 });
    }

    const result = parsed.data.action === "ARCHIVE"
      ? await archiveContest(params.contestId)
      : await unpublishContest(params.contestId);

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ContestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return handleApiError(error, "Cannot execute admin action");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { contestId: string } }) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const result = await deleteContestDraft(params.contestId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ContestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return handleApiError(error, "Cannot delete contest");
  }
}
