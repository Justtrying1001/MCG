import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { ContestEntryStatus, ContestStatus } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { ContestRuntimeError, getContestDetailMvp } from "@/lib/domain/contests/runtime";
import { prisma } from "@/lib/prisma";

const ACTIVE_LOCK_STATUSES: ContestStatus[] = [ContestStatus.OPEN, ContestStatus.LOCKED, ContestStatus.LIVE];

export async function GET(_request: Request, { params }: { params: { contestId: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const detail = await getContestDetailMvp(params.contestId, user.id);
    const rule = detail.contest.rules[0];

    const instances = await prisma.ownedCardInstance.findMany({
      where: { userId: user.id },
      include: {
        cardTemplate: {
          include: {
            cardSet: true,
            rarity: true,
            edition: true,
            tokenProject: true,
          },
        },
        contestRosterLocks: {
          where: {
            contestEntry: {
              contestId: { not: params.contestId },
              contest: { status: { in: ACTIVE_LOCK_STATUSES } },
              status: { in: [ContestEntryStatus.SUBMITTED, ContestEntryStatus.SCORED] },
            },
          },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { acquiredAt: "desc" },
      take: 150,
    });

    const options = instances
      .filter((instance) => !rule?.cardSetId || instance.cardTemplate.cardSetId === rule.cardSetId)
      .map((instance) => ({
          instanceId: instance.id,
          cardTemplateId: instance.cardTemplateId,
          isLockedInOtherContest: instance.contestRosterLocks.length > 0,
          cardSetId: instance.cardTemplate.cardSetId,
          cardSetCode: instance.cardTemplate.cardSet.code,
          cardSetName: instance.cardTemplate.cardSet.displayName,
          rarityCode: instance.cardTemplate.rarity.code,
          editionCode: instance.cardTemplate.edition.code,
          name: instance.cardTemplate.name,
          imageUrl: instance.cardTemplate.imageUrl,
          tokenProjectName: instance.cardTemplate.tokenProject?.displayName ?? "Unknown project",
          tokenProjectId: instance.cardTemplate.tokenProject?.id ?? null,
      }));

    return NextResponse.json({ options });
  } catch (error) {
    if (error instanceof ContestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot load lineup options");
  }
}
