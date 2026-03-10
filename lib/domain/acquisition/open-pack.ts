import { Prisma, type CardTemplate } from "@prisma/client";

import type { BaseCard } from "@/types/cards";
import { getCardsMap } from "@/lib/cards";
import { prisma } from "@/lib/prisma";
import { extractBaseCardIdFromTemplateMetadata } from "@/lib/domain/cards/template-metadata";

const MAX_DRAW_ATTEMPTS_PER_CARD = 20;
const SALE_PACK_CODE = "mvp_sale_pack";

type CardTemplateStockRow = CardTemplate;

function pickByRemainingSupply(candidates: CardTemplateStockRow[]): CardTemplateStockRow | null {
  const weighted = candidates
    .map((template) => {
      const remainingSupply = template.plannedSupply - template.issuedSupply;
      return { template, remainingSupply };
    })
    .filter((row) => row.remainingSupply > 0);

  if (weighted.length === 0) return null;

  const totalRemaining = weighted.reduce((sum, row) => sum + row.remainingSupply, 0);
  let roll = Math.random() * totalRemaining;

  for (const row of weighted) {
    roll -= row.remainingSupply;
    if (roll <= 0) return row.template;
  }

  return weighted[weighted.length - 1]?.template ?? null;
}

export class PackOpenRuntimeError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PackOpenRuntimeError";
    this.status = status;
  }
}

export async function openSalePackMvpDbNative(params: { userId: string; packCost: number }): Promise<{ pulledCards: BaseCard[] }> {
  const cardsMap = getCardsMap();

  return prisma.$transaction(async (tx) => {
    const pack = await tx.packDefinition.findUnique({
      where: { code: SALE_PACK_CODE },
      include: { cardSet: true },
    });

    if (!pack || !pack.isActive) {
      throw new PackOpenRuntimeError("MVP sale pack is not available", 503);
    }

    if (pack.cardsPerPack <= 0) {
      throw new PackOpenRuntimeError("Pack configuration is invalid", 500);
    }

    const spend = await tx.user.updateMany({
      where: {
        id: params.userId,
        points: { gte: params.packCost },
      },
      data: {
        points: { decrement: params.packCost },
        packsOpened: { increment: 1 },
      },
    });

    if (spend.count !== 1) {
      throw new PackOpenRuntimeError("Not enough points", 400);
    }

    const reservePack = await tx.packDefinition.updateMany({
      where: {
        id: pack.id,
        isActive: true,
        openedPackCount: { lt: pack.plannedPackCount },
      },
      data: { openedPackCount: { increment: 1 } },
    });

    if (reservePack.count !== 1) {
      throw new PackOpenRuntimeError("Pack stock exhausted", 409);
    }

    const openingEvent = await tx.packOpeningEvent.create({
      data: {
        userId: params.userId,
        packDefinitionId: pack.id,
      },
    });

    const pulledCards: BaseCard[] = [];
    const pulledBaseCardIds: string[] = [];

    for (let slotIndex = 0; slotIndex < pack.cardsPerPack; slotIndex += 1) {
      let slotAwarded = false;

      for (let attempt = 0; attempt < MAX_DRAW_ATTEMPTS_PER_CARD; attempt += 1) {
        const rawCandidates = await tx.cardTemplate.findMany({
          where: {
            cardSetId: pack.cardSetId,
            isActive: true,
            plannedSupply: { gt: 0 },
          },
        }) as CardTemplateStockRow[];

        const candidates = rawCandidates.filter((template) => template.issuedSupply < template.plannedSupply);

        if (candidates.length === 0) {
          throw new PackOpenRuntimeError("No remaining template supply for this pack", 409);
        }

        const selected = pickByRemainingSupply(candidates);
        if (!selected) {
          throw new PackOpenRuntimeError("No remaining template supply for this pack", 409);
        }

        const issue = await tx.cardTemplate.updateMany({
          where: {
            id: selected.id,
            issuedSupply: { lt: selected.plannedSupply },
          },
          data: { issuedSupply: { increment: 1 } },
        });

        if (issue.count !== 1) {
          continue;
        }

        await tx.ownedCardInstance.create({
          data: {
            userId: params.userId,
            cardTemplateId: selected.id,
            sourcePackOpeningEventId: openingEvent.id,
          },
        });

        const baseCardId = extractBaseCardIdFromTemplateMetadata(selected.metadata);
        if (!baseCardId) {
          throw new PackOpenRuntimeError("Selected card template is missing legacy baseCardId mapping", 500);
        }

        const card = cardsMap.get(baseCardId);
        if (!card) {
          throw new PackOpenRuntimeError(`Base card not found for template mapping: ${baseCardId}`, 500);
        }

        pulledCards.push(card);
        pulledBaseCardIds.push(baseCardId);

        await tx.userCard.upsert({
          where: { userId_baseCardId: { userId: params.userId, baseCardId } },
          create: { userId: params.userId, baseCardId, quantity: 1 },
          update: { quantity: { increment: 1 } },
        });

        slotAwarded = true;
        break;
      }

      if (!slotAwarded) {
        throw new PackOpenRuntimeError("Could not allocate card from remaining supply", 409);
      }
    }

    await tx.packOpening.create({
      data: {
        userId: params.userId,
        packType: pack.code,
        result: { cards: pulledBaseCardIds },
      },
    });

    return { pulledCards };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
