import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
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
        scores: contest._count.scores,
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

  return NextResponse.json(
    {
      ok: false,
      error:
        "Legacy contest creation via /api/internal/contests is deprecated. Use the canonical draft flow at /api/internal/contest-configs and publish via /api/internal/contest-configs/[contestId]/publish.",
    },
    { status: 410 },
  );
}
