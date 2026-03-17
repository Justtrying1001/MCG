import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getSessionUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { ContestRuntimeError, getContestDetailMvp } from "@/lib/domain/contests/runtime";

export async function GET(_request: Request, { params }: { params: { contestId: string } }) {
  try {
    const user = await getSessionUser();

    const detail = await getContestDetailMvp(params.contestId, user?.id);
    const contestMeta = await prisma.contest.findUnique({
      where: { id: params.contestId },
      select: { leagueTierRequired: true, season: { select: { name: true, id: true } } },
    });
    return NextResponse.json({
      ...detail,
      contest: {
        ...detail.contest,
        seasonName: contestMeta?.season?.name ?? null,
        seasonId: contestMeta?.season?.id ?? null,
        leagueTierRequired: contestMeta?.leagueTierRequired ?? null,
      },
    });
  } catch (error) {
    if (error instanceof ContestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot load contest detail");
  }
}
