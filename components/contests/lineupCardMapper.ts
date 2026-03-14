import type { LineupOption } from "@/components/contests/types";
import type { MvpCardView } from "@/types/cards";

export function toMvpCardView(option: LineupOption): MvpCardView {
  return {
    templateId: option.cardTemplateId,
    tokenId: option.cardTemplateId,
    displayName: option.name,
    symbol: option.tokenProjectName.slice(0, 8).toUpperCase(),
    slug: option.name.toLowerCase().replace(/\s+/g, "-"),
    imageUrl: option.imageUrl,
    primaryChain: null,
    faction: null,
    rarity: option.rarityCode,
    edition: option.editionCode,
    plannedSupply: 0,
    issuedSupply: 0,
    remainingSupply: 0,
    owned: true,
    instanceCount: 1,
    cardText: `${option.rarityCode} • ${option.editionCode}`,
    flavorText: `${option.tokenProjectName} · ${option.cardSetCode}`,
    cardNumber: option.instanceId.slice(-8).toUpperCase(),
    setCode: option.cardSetCode,
    setEditionLabel: option.cardSetName,
  };
}
