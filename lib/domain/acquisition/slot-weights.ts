export type PackSlotType = "STANDARD" | "EDITION_BOOST" | "RARITY_HIT";

const RARITY_MULTIPLIERS: Record<PackSlotType, Record<string, number>> = {
  STANDARD: {
    COMMON: 1.4,
    UNCOMMON: 1.1,
    RARE: 0.6,
    EPIC: 0.25,
    LEGENDARY: 0.1,
  },
  EDITION_BOOST: {
    COMMON: 1,
    UNCOMMON: 1,
    RARE: 1.1,
    EPIC: 1.2,
    LEGENDARY: 1.3,
  },
  RARITY_HIT: {
    COMMON: 0.1,
    UNCOMMON: 0.35,
    RARE: 1.4,
    EPIC: 2.4,
    LEGENDARY: 3.6,
  },
};

const EDITION_MULTIPLIERS: Record<PackSlotType, Record<string, number>> = {
  STANDARD: {
    BASE: 1.3,
    REVERSE: 1,
    BRILLANTE: 0.8,
    HOLO: 0.6,
    FULL_ART: 0.4,
  },
  EDITION_BOOST: {
    BASE: 0.3,
    REVERSE: 1.1,
    BRILLANTE: 1.3,
    HOLO: 1.6,
    FULL_ART: 2,
  },
  RARITY_HIT: {
    BASE: 1,
    REVERSE: 1.1,
    BRILLANTE: 1.2,
    HOLO: 1.3,
    FULL_ART: 1.4,
  },
};

export function slotTypeForIndex(index: number, cardsPerPack: number): PackSlotType {
  if (index === cardsPerPack - 1) return "RARITY_HIT";
  if (index === cardsPerPack - 2) return "EDITION_BOOST";
  return "STANDARD";
}

export function drawWeightForTemplate(input: {
  slotType: PackSlotType;
  remainingSupply: number;
  rarityCode: string;
  editionCode: string;
}) {
  if (input.remainingSupply <= 0) return 0;

  const rarityMultiplier = RARITY_MULTIPLIERS[input.slotType][input.rarityCode] ?? 1;
  const editionMultiplier = EDITION_MULTIPLIERS[input.slotType][input.editionCode] ?? 1;
  return input.remainingSupply * rarityMultiplier * editionMultiplier;
}

export function slotLabel(slotType: PackSlotType) {
  if (slotType === "STANDARD") return "Standard slot";
  if (slotType === "EDITION_BOOST") return "Premium edition slot";
  return "Hit slot";
}
