import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getSessionUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { listContestsMvp } from "@/lib/domain/contests/runtime";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const contests = await listContestsMvp();

    let seasonByContestId = new Map<string, string | null>();
    try {
      const ids = contests.map((contest) => contest.id);
      if (ids.length > 0) {
        const meta = await prisma.contest.findMany({
          where: { id: { in: ids } },
          select: { id: true, season: { select: { name: true } } },
        });
        seasonByContestId = new Map(meta.map((row) => [row.id, row.season?.name ?? null]));
      }
    } catch {
      seasonByContestId = new Map();
    }

    return NextResponse.json({
      contests: contests.map((contest) => ({
        ...contest,
        seasonName: seasonByContestId.get(contest.id) ?? null,
      })),
    });
  } catch (error) {
    return handleApiError(error, "Cannot load contests");
  }
}
