import { NextRequest, NextResponse } from "next/server";

import { getAllowedContestTransitions, getContestOverviewProgress } from "@/lib/admin/contest-workbench";
import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: { contestId: string } }) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const contest = await prisma.contest.findUnique({
      where: { id: params.contestId },
      select: {
        id: true,
        code: true,
        title: true,
        status: true,
        liveAt: true,
        lockAt: true,
        endsAt: true,
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

    const allowedTransitions = getAllowedContestTransitions(contest.status);
    const blockers: string[] = [];
    if (allowedTransitions.includes("SETTLED") && contest._count.rankings === 0) {
      blockers.push("Cannot move to SETTLED without ranking rows.");
    }
    if (contest._count.settlements > 0) {
      blockers.push("Contest already has at least one settlement execution.");
    }

    return NextResponse.json({
      ok: true,
      contest,
      progress: getContestOverviewProgress({
        entries: contest._count.entries,
        rankings: contest._count.rankings,
        settlements: contest._count.settlements,
      }),
      allowedTransitions,
      blockers,
    });
  } catch (error) {
    return handleApiError(error, "Cannot load contest overview summary");
  }
}
