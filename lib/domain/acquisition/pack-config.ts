import { prisma } from "@/lib/prisma";
import { MVP_SALE_PACK_CODE } from "@/lib/domain/acquisition/constants";
import { drawWeightForTemplate, slotLabel, slotTypeForIndex } from "@/lib/domain/acquisition/slot-weights";

export async function getSalePackRuntimeConfig() {
  const pack = await prisma.packDefinition.findUnique({
    where: { code: MVP_SALE_PACK_CODE },
    select: {
      id: true,
      code: true,
      displayName: true,
      cardsPerPack: true,
      plannedPackCount: true,
      openedPackCount: true,
      isActive: true,
      cardSetId: true,
    },
  });

  if (!pack) {
    return {
      exists: false as const,
      pack: null,
      slots: [],
    };
  }

  const templates = await prisma.cardTemplate.findMany({
    where: {
      cardSetId: pack.cardSetId,
      isActive: true,
      plannedSupply: { gt: 0 },
    },
    select: {
      plannedSupply: true,
      issuedSupply: true,
      rarity: { select: { code: true } },
      edition: { select: { code: true } },
    },
  });

  const slots = Array.from({ length: pack.cardsPerPack }).map((_, index) => {
    const slotType = slotTypeForIndex(index, pack.cardsPerPack);
    const byRarity = new Map<string, number>();
    const byRarityEdition = new Map<string, number>();
    let total = 0;

    for (const template of templates) {
      const remainingSupply = template.plannedSupply - template.issuedSupply;
      const weight = drawWeightForTemplate({
        slotType,
        remainingSupply,
        rarityCode: template.rarity.code,
        editionCode: template.edition.code,
      });

      if (weight <= 0) continue;
      total += weight;
      byRarity.set(template.rarity.code, (byRarity.get(template.rarity.code) ?? 0) + weight);
      const key = `${template.rarity.code}__${template.edition.code}`;
      byRarityEdition.set(key, (byRarityEdition.get(key) ?? 0) + weight);
    }

    const rarityOdds = Array.from(byRarity.entries())
      .map(([rarityCode, weight]) => ({
        rarityCode,
        pct: total > 0 ? Number(((weight / total) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.pct - a.pct);

    const rarityEditionOdds = Array.from(byRarityEdition.entries())
      .map(([key, weight]) => {
        const [rarityCode, editionCode] = key.split("__");
        return {
          rarityCode,
          editionCode,
          pct: total > 0 ? Number(((weight / total) * 100).toFixed(2)) : 0,
        };
      })
      .sort((a, b) => b.pct - a.pct);

    return {
      index,
      type: slotType,
      label: slotLabel(slotType),
      rarityOdds,
      rarityEditionOdds,
    };
  });

  return {
    exists: true as const,
    pack: {
      code: pack.code,
      displayName: pack.displayName,
      cardsPerPack: pack.cardsPerPack,
      plannedPackCount: pack.plannedPackCount,
      openedPackCount: pack.openedPackCount,
      remainingPackCount: Math.max(pack.plannedPackCount - pack.openedPackCount, 0),
      isActive: pack.isActive,
    },
    slots,
  };
}
