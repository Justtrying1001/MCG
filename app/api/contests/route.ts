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
    const ids = contests.map((c) => c.id);
    const meta = ids.length > 0
      ? await prisma.contest.findMany({
          where: { id: { in: ids } },
          select: { id: true, leagueTierRequired: true, season: { select: { name: true } } },
        })
      : [];
    const byId = new Map(meta.map((row) => [row.id, row]));

    return NextResponse.json({
      contests: contests.map((contest) => ({
        ...contest,
        seasonName: byId.get(contest.id)?.season?.name ?? null,
        leagueTierRequired: byId.get(contest.id)?.leagueTierRequired ?? null,
      })),
    });
  } catch (error) {
    return handleApiError(error, "Cannot load contests");
  }
}
