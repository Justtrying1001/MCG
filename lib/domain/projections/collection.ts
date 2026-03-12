import { prisma } from "@/lib/prisma";
import type { CollectionProjectionV2 } from "@/lib/domain/projections/contracts";
import { findTokenMasterBySlug } from "@/lib/domain/cards/token-master";
import { MVP_SALE_PACK_CODE } from "@/lib/domain/acquisition/constants";

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
            tokenProject: { select: { slug: true } },
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
        tokenProject: { select: { slug: true } },
      },
    }),
  ]);

  const ownedByTokenId = new Map<string, number>();
  const byRarity = new Map<string, number>();
  const byEdition = new Map<string, number>();
  const ownedTemplateIds = new Set<string>();

  for (const instance of ownedInstances) {
    ownedTemplateIds.add(instance.cardTemplateId);

    const token = findTokenMasterBySlug(instance.cardTemplate.tokenProject.slug);
    if (token) {
      ownedByTokenId.set(token.tokenId, (ownedByTokenId.get(token.tokenId) ?? 0) + 1);
    }

    byRarity.set(instance.cardTemplate.rarity.code, (byRarity.get(instance.cardTemplate.rarity.code) ?? 0) + 1);
    byEdition.set(instance.cardTemplate.edition.code, (byEdition.get(instance.cardTemplate.edition.code) ?? 0) + 1);
  }

  const catalogTokenIds = new Set<string>();
  for (const template of catalogTemplates) {
    const token = findTokenMasterBySlug(template.tokenProject.slug);
    if (token) catalogTokenIds.add(token.tokenId);
  }

  const catalogSize = catalogTemplates.length;
  const ownedTemplateCount = ownedTemplateIds.size;

  return {
    totalOwnedInstances: ownedInstances.length,
    ownedTemplateCount,
    missingTemplateCount: Math.max(catalogSize - ownedTemplateCount, 0),
    completionPct: catalogSize > 0 ? Number(((ownedTemplateCount / catalogSize) * 100).toFixed(2)) : 0,
    byTokenId: Array.from(catalogTokenIds)
      .sort((a, b) => a.localeCompare(b))
      .map((tokenId) => ({
        tokenId,
        ownedCount: ownedByTokenId.get(tokenId) ?? 0,
        owned: ownedByTokenId.has(tokenId),
      })),
    byRarity: Array.from(byRarity.entries()).map(([rarityCode, count]) => ({ rarityCode, count })),
    byEdition: Array.from(byEdition.entries()).map(([editionCode, count]) => ({ editionCode, count })),
  };
}
