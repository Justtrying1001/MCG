import { PackSource, Prisma, RewardLedgerReasonType, RewardType } from "@prisma/client";

import type { MvpCardView } from "@/types/cards";
import { prisma } from "@/lib/prisma";
import { findTokenMasterBySlug, toMvpCardViewFromTokenMasterRow } from "@/lib/domain/cards/token-master";
import {
  MVP_CARD_SET_CODE,
  MVP_REWARD_PACK_CODE,
  MVP_SALE_PACK_CODE,
  MVP_SALE_PACK_DEFAULTS,
} from "@/lib/domain/acquisition/constants";
import { drawWeightForTemplate, slotTypeForIndex, type PackSlotType } from "@/lib/domain/acquisition/slot-weights";
import { LedgerConventions } from "@/lib/domain/rewards/conventions";
import { debitPointsWithLedger } from "@/lib/domain/rewards/ledger";
import { applyContestEntryQuestProgressionTx } from "@/lib/domain/quests/runtime";

const MAX_DRAW_ATTEMPTS_PER_CARD = 20;

type CardTemplateStockRow = {
  id: string;
  plannedSupply: number;
  issuedSupply: number;
  rarity: { code: string };
  edition: { code: string };
  tokenProject: { slug: string };
};

type RuntimePackDefinition = {
  id: string;
  code: string;
  cardSetId: string;
  source: PackSource;
  isActive: boolean;
  cardsPerPack: number;
  plannedPackCount: number;
  openedPackCount: number;
};

export type RewardPackDeliveryMode = "GRANT_ONLY" | "GRANT_AND_OPEN";

function pickBySlotWeight(candidates: CardTemplateStockRow[], slotType: PackSlotType): CardTemplateStockRow | null {
  const weighted = candidates
    .map((template) => {
      const remainingSupply = template.plannedSupply - template.issuedSupply;
      const weight = drawWeightForTemplate({
        slotType,
        remainingSupply,
        rarityCode: template.rarity.code,
        editionCode: template.edition.code,
      });
      return { template, weight, remainingSupply };
    })
    .filter((row) => row.remainingSupply > 0);

  if (weighted.length === 0) return null;

  const totalWeight = weighted.reduce((sum, row) => sum + row.weight, 0);
  const useFallback = totalWeight <= 0;

  const total = useFallback
    ? weighted.reduce((sum, row) => sum + row.remainingSupply, 0)
    : totalWeight;
  let roll = Math.random() * total;

  for (const row of weighted) {
    roll -= useFallback ? row.remainingSupply : row.weight;
    if (roll <= 0) return row.template;
  }

  return weighted[weighted.length - 1]?.template ?? null;
}

async function resolvePackDefinitionByCode(tx: Prisma.TransactionClient, packCode: string): Promise<RuntimePackDefinition> {
  const existingPack = await tx.packDefinition.findUnique({
    where: { code: packCode },
  });

  if (existingPack) return existingPack;

  if (packCode !== MVP_SALE_PACK_CODE) {
    throw new PackOpenRuntimeError(`Pack ${packCode} is not available (cloud bootstrap missing; run \`npm run seed:mvp:controlled-emission\`)`, 503);
  }

  const mvpCardSet = await tx.cardSet.findUnique({
    where: { code: MVP_CARD_SET_CODE },
    select: { id: true },
  });

  if (!mvpCardSet) {
    throw new PackOpenRuntimeError(
      "MVP sale pack is not available: missing MVP card set (cloud bootstrap missing; run `npm run seed:mvp:controlled-emission`)",
      503
    );
  }

  return tx.packDefinition.create({
    data: {
      code: MVP_SALE_PACK_CODE,
      displayName: MVP_SALE_PACK_DEFAULTS.displayName,
      cardSetId: mvpCardSet.id,
      source: PackSource.SALE,
      plannedPackCount: MVP_SALE_PACK_DEFAULTS.plannedPackCount,
      openedPackCount: 0,
      cardsPerPack: MVP_SALE_PACK_DEFAULTS.cardsPerPack,
      isActive: true,
    },
  });
}

async function assertMvpPackReadiness(tx: Prisma.TransactionClient, pack: RuntimePackDefinition) {
  const [cardSet, candidateTemplates] = await Promise.all([
    tx.cardSet.findUnique({
      where: { id: pack.cardSetId },
      select: { id: true, isActive: true, code: true },
    }),
    tx.cardTemplate.findMany({
      where: {
        cardSetId: pack.cardSetId,
        isActive: true,
        plannedSupply: { gt: 0 },
      },
      select: { plannedSupply: true, issuedSupply: true },
      take: 2000,
    }),
  ]);

  if (!cardSet || !cardSet.isActive) {
    throw new PackOpenRuntimeError(
      `Pack ${pack.code} is not available: card set ${cardSet?.code ?? "<missing>"} inactive or missing (cloud bootstrap drift)`,
      503
    );
  }

  const hasRemainingSupply = candidateTemplates.some((template) => template.issuedSupply < template.plannedSupply);

  if (!hasRemainingSupply) {
    throw new PackOpenRuntimeError(
      `Pack ${pack.code} is not available: no active template supply remaining (cloud bootstrap missing or exhausted)`,
      503
    );
  }
}

async function reservePackStock(tx: Prisma.TransactionClient, pack: RuntimePackDefinition) {
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
}

async function allocatePackCards(tx: Prisma.TransactionClient, params: {
  userId: string;
  pack: RuntimePackDefinition;
  openingEventId: string;
}): Promise<MvpCardView[]> {
  const pulledCardsMvp: MvpCardView[] = [];

  for (let slotIndex = 0; slotIndex < params.pack.cardsPerPack; slotIndex += 1) {
    const slotType = slotTypeForIndex(slotIndex, params.pack.cardsPerPack);
    let slotAwarded = false;

    for (let attempt = 0; attempt < MAX_DRAW_ATTEMPTS_PER_CARD; attempt += 1) {
      const rawCandidates = await tx.cardTemplate.findMany({
        where: {
          cardSetId: params.pack.cardSetId,
          isActive: true,
          plannedSupply: { gt: 0 },
        },
        select: {
          id: true,
          plannedSupply: true,
          issuedSupply: true,
          rarity: { select: { code: true } },
          edition: { select: { code: true } },
          tokenProject: { select: { slug: true } },
        },
      });

      const candidates = rawCandidates.filter((template) => template.issuedSupply < template.plannedSupply);

      if (candidates.length === 0) {
        throw new PackOpenRuntimeError("No remaining template supply for this pack", 409);
      }

      const selected = pickBySlotWeight(candidates, slotType);
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
          sourcePackOpeningEventId: params.openingEventId,
        },
      });

      const token = findTokenMasterBySlug(selected.tokenProject.slug);
      if (!token) {
        throw new PackOpenRuntimeError(`Token master row not found for slug mapping: ${selected.tokenProject.slug}`, 500);
      }

      pulledCardsMvp.push(
        toMvpCardViewFromTokenMasterRow({
          token,
          templateId: selected.id,
          rarityCode: selected.rarity.code,
          editionCode: selected.edition.code,
          plannedSupply: selected.plannedSupply,
          issuedSupply: selected.issuedSupply + 1,
          instanceCount: 1,
          editionNumber: selected.issuedSupply + 1,
        })
      );

      slotAwarded = true;
      break;
    }

    if (!slotAwarded) {
      throw new PackOpenRuntimeError("Could not allocate card from remaining supply", 409);
    }
  }

  return pulledCardsMvp;
}

export class PackOpenRuntimeError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PackOpenRuntimeError";
    this.status = status;
  }
}

async function openPackByCodeDbNative(params: {
  userId: string;
  packCode: string;
  expectedSource: PackSource;
  chargePointsAmount?: number;
  createRewardGrant?: boolean;
}): Promise<{ pulledCardsMvp: MvpCardView[]; packCode: string; openingEventId: string; rewardGrantId: string | null }> {
  return prisma.$transaction(async (tx) => {
    const pack = await resolvePackDefinitionByCode(tx, params.packCode);

    if (pack.source !== params.expectedSource) {
      throw new PackOpenRuntimeError(`Pack ${pack.code} source mismatch`, 409);
    }

    if (!pack.isActive) {
      throw new PackOpenRuntimeError(`Pack ${pack.code} is not available: inactive pack definition`, 503);
    }

    await assertMvpPackReadiness(tx, pack);

    if (pack.cardsPerPack <= 0) {
      throw new PackOpenRuntimeError("Pack configuration is invalid", 500);
    }

    if (params.chargePointsAmount) {
      try {
        await debitPointsWithLedger(tx, {
          userId: params.userId,
          amount: params.chargePointsAmount,
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
    }

    await reservePackStock(tx, pack);

    await tx.user.update({
      where: { id: params.userId },
      data: { packsOpened: { increment: 1 } },
    });

    const openingEvent = await tx.packOpeningEvent.create({
      data: {
        userId: params.userId,
        packDefinitionId: pack.id,
      },
    });

    const pulledCardsMvp = await allocatePackCards(tx, {
      userId: params.userId,
      pack,
      openingEventId: openingEvent.id,
    });

    let rewardGrantId: string | null = null;
    if (params.createRewardGrant) {
      const grant = await tx.rewardGrant.create({
        data: {
          userId: params.userId,
          type: RewardType.PACK,
          packDefinitionId: pack.id,
          sourcePackOpeningEventId: openingEvent.id,
        },
      });
      rewardGrantId = grant.id;
    }

    await applyContestEntryQuestProgressionTx(tx, params.userId);

    return {
      pulledCardsMvp,
      packCode: pack.code,
      openingEventId: openingEvent.id,
      rewardGrantId,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function openSalePackMvpDbNative(params: { userId: string; packCost: number }): Promise<{ pulledCardsMvp: MvpCardView[] }> {
  const result = await openPackByCodeDbNative({
    userId: params.userId,
    packCode: MVP_SALE_PACK_CODE,
    expectedSource: PackSource.SALE,
    chargePointsAmount: params.packCost,
  });

  return { pulledCardsMvp: result.pulledCardsMvp };
}

export async function grantRewardPackMvpDbNative(params: {
  userId: string;
  deliveryMode: RewardPackDeliveryMode;
}): Promise<{ mode: RewardPackDeliveryMode; packCode: string; pulledCardsMvp: MvpCardView[]; rewardGrantId: string; openingEventId: string | null }> {
  if (params.deliveryMode === "GRANT_AND_OPEN") {
    const opened = await openPackByCodeDbNative({
      userId: params.userId,
      packCode: MVP_REWARD_PACK_CODE,
      expectedSource: PackSource.REWARD,
      createRewardGrant: true,
    });

    return {
      mode: "GRANT_AND_OPEN",
      packCode: opened.packCode,
      pulledCardsMvp: opened.pulledCardsMvp,
      rewardGrantId: opened.rewardGrantId as string,
      openingEventId: opened.openingEventId,
    };
  }

  return prisma.$transaction(async (tx) => {
    const pack = await resolvePackDefinitionByCode(tx, MVP_REWARD_PACK_CODE);

    if (pack.source !== PackSource.REWARD) {
      throw new PackOpenRuntimeError(`Pack ${pack.code} source mismatch`, 409);
    }

    if (!pack.isActive) {
      throw new PackOpenRuntimeError(`Pack ${pack.code} is not available: inactive pack definition`, 503);
    }

    await assertMvpPackReadiness(tx, pack);
    await reservePackStock(tx, pack);

    const rewardGrant = await tx.rewardGrant.create({
      data: {
        userId: params.userId,
        type: RewardType.PACK,
        packDefinitionId: pack.id,
        sourcePackOpeningEventId: null,
      },
    });

    return {
      mode: "GRANT_ONLY" as const,
      packCode: pack.code,
      pulledCardsMvp: [],
      rewardGrantId: rewardGrant.id,
      openingEventId: null,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
