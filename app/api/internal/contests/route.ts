import { ContestStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { reconcileDueContestsByTime } from "@/lib/domain/contests/lifecycle-reconciliation";
import { ContestRuntimeError, createContestMvp } from "@/lib/domain/contests/runtime";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    await reconcileDueContestsByTime();

    const contests = await prisma.contest.findMany({
      include: {
        rules: true,
        rewardPolicy: {
          include: {
            bundles: {
              include: { components: true },
              orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
            },
            distributionRules: { orderBy: [{ priority: "asc" }] },
          },
        },
        _count: {
          select: {
            entries: true,
            rankings: true,
            settlements: true,
            scores: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 200,
    });

    return NextResponse.json({ contests });
  } catch (error) {
    return handleApiError(error, "Cannot load internal contests");
  }
}

export async function POST(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();

    const contest = await createContestMvp({
      code: body?.code,
      title: body?.title,
      liveAt: body?.liveAt,
      lockAt: body?.lockAt,
      endsAt: body?.endsAt,
      status: body?.status as ContestStatus | undefined,
      maxRosterSize: body?.maxRosterSize,
      cardSetId: body?.cardSetId,
      config: body?.config,
    });

    return NextResponse.json({ contest }, { status: 201 });
  } catch (error) {
    if (error instanceof ContestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot create contest");
  }
}
