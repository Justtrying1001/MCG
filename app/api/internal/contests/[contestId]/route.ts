import { NextRequest, NextResponse } from "next/server";

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
