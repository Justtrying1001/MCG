import { prisma } from "@/lib/prisma";
import type { CollectionProjectionV2 } from "@/lib/domain/projections/contracts";
import { extractBaseCardIdFromTemplateMetadata } from "@/lib/domain/cards/template-metadata";

const MVP_SALE_PACK_CODE = "mvp_sale_pack";

export async function buildCollectionProjectionV2(userId: string): Promise<CollectionProjectionV2> {
  const mvpSalePack = await prisma.packDefinition.findUnique({
    where: { code: MVP_SALE_PACK_CODE },
    select: { cardSetId: true },
  });

  const targetCardSetId = mvpSalePack?.cardSetId ?? null;

  const [ownedInstances, catalogTemplates] = await Promise.all([
    prisma.ownedCardInstance.findMany({
      where: {
        userId,
        ...(targetCardSetId ? { cardTemplate: { cardSetId: targetCardSetId } } : {}),
      },
      include: {
        cardTemplate: {
          include: {
            rarity: true,
            edition: true,
          },
        },
      },
    }),
    prisma.cardTemplate.findMany({
      where: {
        isActive: true,
        ...(targetCardSetId ? { cardSetId: targetCardSetId } : {}),
      },
      select: {
        id: true,
        metadata: true,
      },
    }),
  ]);

  const ownedByBaseCardId = new Map<string, number>();
  const byRarity = new Map<string, number>();
  const byEdition = new Map<string, number>();
  const ownedTemplateIds = new Set<string>();

  for (const instance of ownedInstances) {
    ownedTemplateIds.add(instance.cardTemplateId);

    const baseCardId = extractBaseCardIdFromTemplateMetadata(instance.cardTemplate.metadata);
    if (baseCardId) {
      ownedByBaseCardId.set(baseCardId, (ownedByBaseCardId.get(baseCardId) ?? 0) + 1);
    }

    byRarity.set(instance.cardTemplate.rarity.code, (byRarity.get(instance.cardTemplate.rarity.code) ?? 0) + 1);
    byEdition.set(instance.cardTemplate.edition.code, (byEdition.get(instance.cardTemplate.edition.code) ?? 0) + 1);
  }

  const catalogBaseCardIds = new Set<string>();
  for (const template of catalogTemplates) {
    const baseCardId = extractBaseCardIdFromTemplateMetadata(template.metadata);
    if (baseCardId) catalogBaseCardIds.add(baseCardId);
  }

  const catalogSize = catalogTemplates.length;
  const ownedTemplateCount = ownedTemplateIds.size;

  return {
    totalOwnedInstances: ownedInstances.length,
    ownedTemplateCount,
    missingTemplateCount: Math.max(catalogSize - ownedTemplateCount, 0),
    completionPct: catalogSize > 0 ? Number(((ownedTemplateCount / catalogSize) * 100).toFixed(2)) : 0,
    byBaseCard: Array.from(catalogBaseCardIds)
      .sort((a, b) => a.localeCompare(b))
      .map((baseCardId) => ({
        baseCardId,
        ownedCount: ownedByBaseCardId.get(baseCardId) ?? 0,
        owned: ownedByBaseCardId.has(baseCardId),
      })),
    byRarity: Array.from(byRarity.entries()).map(([rarityCode, count]) => ({ rarityCode, count })),
    byEdition: Array.from(byEdition.entries()).map(([editionCode, count]) => ({ editionCode, count })),
  };
}
