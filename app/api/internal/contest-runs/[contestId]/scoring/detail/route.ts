import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";
import {
  computeTokenScore,
  marketCapScoreFromChange,
  priceScoreFromChange,
  rankMultiplierFromChange,
  rankScoreFromChange,
  volumeScoreFromChange,
} from "@/lib/domain/contests/scoring-engine-runtime";

export async function GET(request: NextRequest, { params }: { params: { contestId: string } }) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const contest = await prisma.contest.findUnique({ where: { id: params.contestId }, select: { id: true } });
    if (!contest) return NextResponse.json({ ok: false, error: "Contest not found" }, { status: 404 });

    const [tokenScores, breakdownRows] = await Promise.all([
      prisma.contestTokenScore.findMany({
        where: { contestId: params.contestId },
        orderBy: [{ score: "desc" }],
        include: {
          tokenProject: { select: { displayName: true, slug: true } },
        },
      }),
      prisma.contestEntryScoreBreakdown.findMany({
        where: { entry: { contestId: params.contestId } },
        include: {
          tokenProject: { select: { displayName: true, slug: true } },
          entry: {
            select: {
              id: true,
              userId: true,
              user: { select: { xUsername: true, displayName: true } },
            },
          },
          cardInstance: {
            select: {
              id: true,
              cardTemplate: {
                select: {
                  name: true,
                  imageUrl: true,
                  rarity: { select: { code: true } },
                  edition: { select: { code: true } },
                },
              },
            },
          },
        },
        orderBy: [{ finalScore: "desc" }],
        take: 1500,
      }),
    ]);

    return NextResponse.json({
      ok: true,
      tokenScores: tokenScores.map((row) => {
        const baseScore = (0.45 * priceScoreFromChange(row.priceChange))
          + (0.25 * volumeScoreFromChange(row.volumeChange))
          + (0.20 * marketCapScoreFromChange(row.marketCapChange))
          + (0.10 * rankScoreFromChange(row.rankChange));
        const rankMultiplier = rankMultiplierFromChange(row.rankChange);

        return {
          id: row.id,
          tokenProject: row.tokenProject,
          priceChange: row.priceChange,
          marketCapChange: row.marketCapChange,
          volumeChange: row.volumeChange,
          rankChange: row.rankChange,
          baseScore,
          rankMultiplier,
          finalScore: row.score,
          score: computeTokenScore({
            priceChange: row.priceChange,
            marketCapChange: row.marketCapChange,
            volumeChange: row.volumeChange,
            rankChange: row.rankChange,
          }),
        };
      }),
      breakdownRows,
    });
  } catch (error) {
    return handleApiError(error, "Cannot load contest scoring details");
  }
}
