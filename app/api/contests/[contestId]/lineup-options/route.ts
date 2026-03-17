import { ContestStatus } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { ContestRuntimeError, getContestDetailMvp } from "@/lib/domain/contests/runtime";
import { prisma } from "@/lib/prisma";
import { findTokenMasterBySlug, toMvpCardViewFromTokenMasterRow } from "@/lib/domain/cards/token-master";
import { validateCanonicalCardView } from "@/lib/domain/cards/canonical-card-view";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ACTIVE_LOCK_STATUSES: ContestStatus[] = [ContestStatus.OPEN, ContestStatus.LOCKED, ContestStatus.LIVE];

function assertTemplateFields(instance: {
  id: string;
  cardTemplateId: string;
  cardTemplate: {
    name: string;
    cardSet: { code: string; displayName: string };
    rarity?: { code?: string | null } | null;
    edition?: { code?: string | null } | null;
    tokenProject?: { id: string; slug: string; displayName: string } | null;
    plannedSupply: number;
    issuedSupply: number;
  };
}) {
  const missing: string[] = [];
  if (!instance.cardTemplate.tokenProject?.slug) missing.push("tokenProject.slug");
  if (!instance.cardTemplate.tokenProject?.id) missing.push("tokenProject.id");
  if (!instance.cardTemplate.rarity?.code) missing.push("rarity.code");
  if (!instance.cardTemplate.edition?.code) missing.push("edition.code");
  if (!Number.isFinite(instance.cardTemplate.plannedSupply)) missing.push("plannedSupply");
  if (!Number.isFinite(instance.cardTemplate.issuedSupply)) missing.push("issuedSupply");

  if (missing.length > 0) {
    throw new ContestRuntimeError(
      `Lineup option is missing canonical card dependencies for instance=${instance.id}, template=${instance.cardTemplateId}: ${missing.join(", ")}`,
      500,
    );
  }
}

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
          contest: { status: { in: ACTIVE_LOCK_STATUSES } },
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
      .map((instance) => {
        assertTemplateFields(instance);

        const lockedInContestId = activeLockByInstance.get(instance.id);
        const token = findTokenMasterBySlug(instance.cardTemplate.tokenProject!.slug);

        if (!token) {
          throw new ContestRuntimeError(
            `Token master row not found for slug='${instance.cardTemplate.tokenProject!.slug}' (instance=${instance.id}, template=${instance.cardTemplateId}).`,
            500,
          );
        }

        const cardView = toMvpCardViewFromTokenMasterRow({
          token,
          templateId: instance.cardTemplateId,
          rarityCode: instance.cardTemplate.rarity!.code,
          editionCode: instance.cardTemplate.edition!.code,
          plannedSupply: instance.cardTemplate.plannedSupply,
          issuedSupply: instance.cardTemplate.issuedSupply,
          instanceCount: 1,
        });

        const validCardView = validateCanonicalCardView(cardView);
        if (!validCardView.ok) {
          throw new ContestRuntimeError(
            `Invalid canonical cardView for instance=${instance.id}, template=${instance.cardTemplateId}: ${validCardView.issues.join("; ")}`,
            500,
          );
        }

        return {
          instanceId: instance.id,
          cardTemplateId: instance.cardTemplateId,
          isLockedByActiveContest: lockedInContestId !== undefined && lockedInContestId !== params.contestId,
          cardSetId: instance.cardTemplate.cardSetId,
          cardSetCode: instance.cardTemplate.cardSet.code,
          cardSetName: instance.cardTemplate.cardSet.displayName,
          rarityCode: instance.cardTemplate.rarity!.code,
          editionCode: instance.cardTemplate.edition!.code,
          name: instance.cardTemplate.name,
          imageUrl: instance.cardTemplate.imageUrl,
          tokenProjectName: instance.cardTemplate.tokenProject!.displayName,
          tokenProjectId: instance.cardTemplate.tokenProject!.id,
          cardView: validCardView.cardView,
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
