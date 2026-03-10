import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { ContestRuntimeError, getContestDetailMvp } from "@/lib/domain/contests/runtime";
import { prisma } from "@/lib/prisma";

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
          },
        },
      },
      orderBy: { acquiredAt: "desc" },
      take: 150,
    });

    const options = instances
      .filter((instance) => !rule?.cardSetId || instance.cardTemplate.cardSetId === rule.cardSetId)
      .map((instance) => {
        const metadata = instance.cardTemplate.metadata as { baseCardId?: string } | null;

        return {
          instanceId: instance.id,
          cardTemplateId: instance.cardTemplateId,
          lockState: instance.lockState,
          cardSetId: instance.cardTemplate.cardSetId,
          cardSetCode: instance.cardTemplate.cardSet.code,
          cardSetName: instance.cardTemplate.cardSet.displayName,
          rarityCode: instance.cardTemplate.rarity.code,
          editionCode: instance.cardTemplate.edition.code,
          baseCardId: metadata?.baseCardId ?? null,
          name: instance.cardTemplate.name,
        };
      });

    return NextResponse.json({ options });
  } catch (error) {
    if (error instanceof ContestRuntimeError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot load lineup options");
  }
}
