import { Prisma, RewardLedgerReasonType } from "@prisma/client";

import type { BaseCard } from "@/types/cards";
import type { MvpCardView } from "@/types/cards";
import { prisma } from "@/lib/prisma";
import { findTokenMasterByBaseCardId, toLegacyBaseCardFromTokenMaster, toMvpCardViewFromTokenMasterRow } from "@/lib/domain/cards/token-master";
import { extractBaseCardIdFromTemplateMetadata } from "@/lib/domain/cards/template-metadata";
import { MVP_SALE_PACK_CODE } from "@/lib/domain/acquisition/constants";
import { LedgerConventions } from "@/lib/domain/rewards/conventions";
import { debitPointsWithLedger } from "@/lib/domain/rewards/ledger";

const MAX_DRAW_ATTEMPTS_PER_CARD = 20;

type CardTemplateStockRow = {
  id: string;
  plannedSupply: number;
  issuedSupply: number;
  metadata: Prisma.JsonValue | null;
  rarity: { code: string };
  edition: { code: string };
};

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

export async function openSalePackMvpDbNative(params: { userId: string; packCost: number }): Promise<{ pulledCards: BaseCard[]; pulledCardsMvp: MvpCardView[] }> {

  return prisma.$transaction(async (tx) => {
    const pack = await tx.packDefinition.findUnique({
      where: { code: MVP_SALE_PACK_CODE },
    });

    if (!pack || !pack.isActive) {
      throw new PackOpenRuntimeError("MVP sale pack is not available", 503);
    }

    if (pack.cardsPerPack <= 0) {
      throw new PackOpenRuntimeError("Pack configuration is invalid", 500);
    }

    try {
      await debitPointsWithLedger(tx, {
        userId: params.userId,
        amount: params.packCost,
        reasonType: RewardLedgerReasonType.PACK_OPEN,
        reasonRef: LedgerConventions.packOpen.reasonRef(pack.code),
        metadata: {
          packCode: pack.code,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Not enough points") {
        throw new PackOpenRuntimeError("Not enough points", 400);
      }
      throw error;
    }

    await tx.user.update({
      where: { id: params.userId },
      data: { packsOpened: { increment: 1 } },
    });

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
    const pulledCardsMvp: MvpCardView[] = [];
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
          select: {
            id: true,
            plannedSupply: true,
            issuedSupply: true,
            metadata: true,
            rarity: { select: { code: true } },
            edition: { select: { code: true } },
          },
        });

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

        const token = findTokenMasterByBaseCardId(baseCardId);
        if (!token) {
          throw new PackOpenRuntimeError(`Token master row not found for template mapping: ${baseCardId}`, 500);
        }

        pulledCards.push(toLegacyBaseCardFromTokenMaster(token));
        pulledCardsMvp.push(
          toMvpCardViewFromTokenMasterRow({
            token,
            templateId: selected.id,
            rarityCode: selected.rarity.code,
            editionCode: selected.edition.code,
            plannedSupply: selected.plannedSupply,
            issuedSupply: selected.issuedSupply + 1,
            instanceCount: 1,
          })
        );
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

    return { pulledCards, pulledCardsMvp };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
