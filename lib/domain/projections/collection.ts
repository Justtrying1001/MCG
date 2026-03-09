import { getBaseCards } from "@/lib/cards";
import { prisma } from "@/lib/prisma";
import type { CollectionProjectionV2 } from "@/lib/domain/projections/contracts";

export async function buildCollectionProjectionV2(userId: string): Promise<CollectionProjectionV2> {
  const ownedInstances = await prisma.ownedCardInstance.findMany({
    where: { userId },
    include: {
      cardTemplate: {
        include: {
          rarity: true,
          edition: true,
        },
      },
    },
  });

  const ownedByBaseCardId = new Map<string, number>();
  const byRarity = new Map<string, number>();
  const byEdition = new Map<string, number>();

  for (const instance of ownedInstances) {
    const metadata = instance.cardTemplate.metadata as { baseCardId?: string } | null;
    const baseCardId = metadata?.baseCardId;
    if (!baseCardId) continue;

    ownedByBaseCardId.set(baseCardId, (ownedByBaseCardId.get(baseCardId) ?? 0) + 1);
    byRarity.set(instance.cardTemplate.rarity.code, (byRarity.get(instance.cardTemplate.rarity.code) ?? 0) + 1);
    byEdition.set(instance.cardTemplate.edition.code, (byEdition.get(instance.cardTemplate.edition.code) ?? 0) + 1);
  }

  const catalogBaseCards = getBaseCards();
  const catalogSize = catalogBaseCards.length;
  const ownedTemplateCount = ownedByBaseCardId.size;

  return {
    totalOwnedInstances: ownedInstances.length,
    ownedTemplateCount,
    missingTemplateCount: Math.max(catalogSize - ownedTemplateCount, 0),
    completionPct: catalogSize > 0 ? Number(((ownedTemplateCount / catalogSize) * 100).toFixed(2)) : 0,
    byBaseCard: catalogBaseCards.map((card) => ({
      baseCardId: card.baseCardId,
      ownedCount: ownedByBaseCardId.get(card.baseCardId) ?? 0,
      owned: ownedByBaseCardId.has(card.baseCardId),
    })),
    byRarity: Array.from(byRarity.entries()).map(([rarityCode, count]) => ({ rarityCode, count })),
    byEdition: Array.from(byEdition.entries()).map(([editionCode, count]) => ({ editionCode, count })),
  };
}
