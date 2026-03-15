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

    const safeContests = contests.map((contest) => ({
      id: contest.id,
      code: contest.code,
      title: contest.title,
      status: contest.status,
      liveAt: contest.liveAt,
      lockAt: contest.lockAt,
      endsAt: contest.endsAt,
      rules: Array.isArray(contest.rules)
        ? contest.rules.map((rule) => ({
            id: rule.id,
            cardSetId: rule.cardSetId ?? null,
            maxRosterSize: rule.maxRosterSize ?? null,
            entryFeeEnabled: rule.entryFeeEnabled ?? false,
            entryFeeAmount: rule.entryFeeAmount ?? null,
          }))
        : [],
      _count: { entries: contest._count.entries },
      leagueTierRequired: contest.leagueTierRequired ?? null,
      seasonName: seasonByContestId.get(contest.id) ?? null,
      rewardPreview: {
        label: "POINTS",
        amount: Math.max(120, (contest.rules?.[0]?.maxRosterSize ?? 5) * 45),
      },
    }));

    return NextResponse.json({ contests: safeContests });
  } catch (error) {
    return handleApiError(error, "Cannot load contests");
  }
}
