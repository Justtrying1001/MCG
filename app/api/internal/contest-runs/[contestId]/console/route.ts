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
        _count: {
          select: {
            entries: true,
            rankings: true,
            scores: true,
            settlements: true,
          },
        },
        rules: {
          include: {
            cardSet: {
              select: { id: true, code: true, displayName: true },
            },
          },
          take: 1,
        },
      },
    });

    if (!contest) {
      return NextResponse.json({ ok: false, error: "Contest not found" }, { status: 404 });
    }

    const [entries, rankings, snapshots, tokenScores, breakdownRows] = await Promise.all([
      prisma.contestEntry.findMany({
        where: { contestId: params.contestId },
        orderBy: [{ submittedAt: "asc" }],
        include: {
          user: { select: { id: true, xUsername: true, displayName: true } },
          rosterLocks: {
            orderBy: [{ lockedAt: "asc" }],
            include: {
              ownedCardInstance: {
                select: {
                  id: true,
                  cardTemplate: {
                    select: {
                      id: true,
                      name: true,
                      imageUrl: true,
                      tokenProject: { select: { id: true, displayName: true, slug: true } },
                      rarity: { select: { code: true } },
                      edition: { select: { code: true } },
                    },
                  },
                },
              },
            },
          },
        },
        take: 250,
      }),
      prisma.contestRanking.findMany({
        where: { contestId: params.contestId },
        orderBy: [{ rank: "asc" }],
        include: {
          user: { select: { id: true, xUsername: true, displayName: true } },
        },
        take: 500,
      }),
      prisma.contestTokenSnapshot.findMany({
        where: { contestId: params.contestId },
        orderBy: [{ phase: "asc" }, { tokenProject: { displayName: "asc" } }],
        include: {
          tokenProject: { select: { id: true, displayName: true, slug: true } },
        },
      }),
      prisma.contestTokenScore.findMany({
        where: { contestId: params.contestId },
        orderBy: [{ score: "desc" }],
        include: {
          tokenProject: { select: { id: true, displayName: true, slug: true } },
        },
      }),
      prisma.contestEntryScoreBreakdown.findMany({
        where: {
          entry: { contestId: params.contestId },
        },
        include: {
          tokenProject: { select: { id: true, displayName: true, slug: true } },
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
        take: 1200,
      }),
    ]);

    const rankingByUser = new Map(rankings.map((row) => [row.userId, row]));

    const players = entries.map((entry) => {
      const ranking = rankingByUser.get(entry.userId);
      return {
        entryId: entry.id,
        userId: entry.user.id,
        username: entry.user.xUsername,
        displayName: entry.user.displayName,
        entryStatus: entry.status,
        submittedAt: entry.submittedAt,
        finalScore: ranking?.score ?? null,
        ranking: ranking?.rank ?? null,
        lineup: entry.rosterLocks.map((lock) => ({
          rosterLockId: lock.id,
          cardInstanceId: lock.ownedCardInstance.id,
          lockedAt: lock.lockedAt,
          card: {
            id: lock.ownedCardInstance.cardTemplate.id,
            name: lock.ownedCardInstance.cardTemplate.name,
            imageUrl: lock.ownedCardInstance.cardTemplate.imageUrl,
            tokenProjectId: lock.ownedCardInstance.cardTemplate.tokenProject.id,
            tokenProjectName: lock.ownedCardInstance.cardTemplate.tokenProject.displayName,
            tokenSlug: lock.ownedCardInstance.cardTemplate.tokenProject.slug,
            rarity: lock.ownedCardInstance.cardTemplate.rarity.code,
            edition: lock.ownedCardInstance.cardTemplate.edition.code,
          },
        })),
      };
    });

    const snapshotsByPhase = {
      START: snapshots.filter((row) => row.phase === "START"),
      END: snapshots.filter((row) => row.phase === "END"),
    };

    return NextResponse.json({
      ok: true,
      contest,
      players,
      rankings,
      snapshots: snapshotsByPhase,
      scoring: {
        tokenScores,
        breakdownRows,
        usersWithBreakdown: new Set(breakdownRows.map((row) => row.entry.userId)).size,
      },
      diagnostics: {
        hasStartSnapshot: snapshotsByPhase.START.length > 0,
        hasEndSnapshot: snapshotsByPhase.END.length > 0,
        scoringCalculated: tokenScores.length > 0 && breakdownRows.length >= players.reduce((sum, player) => sum + player.lineup.length, 0) && contest._count.scores >= contest._count.entries,
        rankingGenerated: contest._count.rankings > 0 && contest._count.rankings >= contest._count.scores,
        settlementDone: contest._count.settlements > 0,
      },
    });
  } catch (error) {
    return handleApiError(error, "Cannot load contest operator console data");
  }
}
