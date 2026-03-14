import { NextResponse } from "next/server";
import { ContestStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

import { getSessionUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { ContestRuntimeError, getContestDetailMvp } from "@/lib/domain/contests/runtime";
import { prisma } from "@/lib/prisma";

const ACTIVE_CONTEST_STATUSES: ContestStatus[] = [ContestStatus.OPEN, ContestStatus.LOCKED, ContestStatus.LIVE];

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
      },
      orderBy: { acquiredAt: "desc" },
      take: 150,
    });

    const activeLocks = await prisma.rosterLock.findMany({
      where: {
        ownedCardInstanceId: { in: instances.map((instance) => instance.id) },
        contestEntry: {
          contest: { status: { in: ACTIVE_CONTEST_STATUSES } },
        },
      },
      select: {
        ownedCardInstanceId: true,
        contestEntry: { select: { contestId: true } },
      },
    });

    const activeLockByInstance = new Map<string, string>();
    for (const row of activeLocks) {
      activeLockByInstance.set(row.ownedCardInstanceId, row.contestEntry.contestId);
    }

    const options = instances
      .filter((instance) => !rule?.cardSetId || instance.cardTemplate.cardSetId === rule.cardSetId)
      .map((instance) => ({
          instanceId: instance.id,
          cardTemplateId: instance.cardTemplateId,
          lockState: instance.lockState,
          isLockedByActiveContest: Boolean(activeLockByInstance.get(instance.id) && activeLockByInstance.get(instance.id) !== params.contestId),
          cardSetId: instance.cardTemplate.cardSetId,
          cardSetCode: instance.cardTemplate.cardSet.code,
          cardSetName: instance.cardTemplate.cardSet.displayName,
          rarityCode: instance.cardTemplate.rarity.code,
          editionCode: instance.cardTemplate.edition.code,
          name: instance.cardTemplate.name,
          imageUrl: instance.cardTemplate.imageUrl,
          tokenProjectName: instance.cardTemplate.tokenProject?.displayName ?? "Unknown project",
      }));

    return NextResponse.json({ options });
  } catch (error) {
    if (error instanceof ContestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot load lineup options");
  }
}
