import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { reconcileDueContestsByTime } from "@/lib/domain/contests/lifecycle-reconciliation";
import { ContestRuntimeError, createContestMvp } from "@/lib/domain/contests/runtime";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";
import { ContestStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    await reconcileDueContestsByTime().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[api/internal/contests] lifecycle reconciliation failed: ${message}`);
    });

    const contests = await prisma.contest.findMany({
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        status: true,
        configPublishedAt: true,
        openAt: true,
        liveAt: true,
        lockAt: true,
        endsAt: true,
        rewardPolicy: {
          select: {
            bundles: {
              orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
              select: {
                id: true,
                name: true,
                components: {
                  select: {
                    type: true,
                    pointsAmount: true,
                    xpAmount: true,
                    packQuantity: true,
                  },
                },
              },
            },
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

    const safeContests = contests.map((contest) => ({
      id: contest.id,
      code: contest.code,
      title: contest.title,
      description: contest.description ?? null,
      status: contest.status,
      configPublishedAt: contest.configPublishedAt,
      openAt: contest.openAt,
      liveAt: contest.liveAt,
      lockAt: contest.lockAt,
      endsAt: contest.endsAt,
      rewardPolicy: contest.rewardPolicy
        ? {
            bundles: contest.rewardPolicy.bundles.map((bundle) => ({
              id: bundle.id,
              name: bundle.name,
              components: bundle.components.map((component) => ({
                type: component.type,
                pointsAmount: component.pointsAmount ?? null,
                xpAmount: component.xpAmount ?? null,
                packQuantity: component.packQuantity ?? null,
              })),
            })),
          }
        : null,
      _count: {
        entries: contest._count.entries,
        settlements: contest._count.settlements,
      },
    }));

    return NextResponse.json({ contests: safeContests });
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
