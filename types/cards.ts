export type BaseCardRarity = "common" | "rare" | "epic" | "legendary";

export type BaseCardFinish = "standard" | "holo" | "full_art" | "glitch" | "gold";

export type BaseCardArchetype = "bruiser" | "striker" | "controller" | "tempo" | "balanced";

export type BaseCard = {
  baseCardId: string;
  projectId?: string;
  coingeckoId?: string;
  name: string;
  symbol: string;
  slug?: string;
  image: string;
  primaryChain?: string;
  faction: string | null;
  subtitle?: string;
  projectTier: "S" | "A" | "B" | "C" | "D" | string;
  marketCapRank: number | null;
  ATK: number;
  DEF: number;
  SPD: number;
  CTRL: number;
  powerScore?: number;
  /** Canonical rarity layer introduced in redesign Lot 1 (legacy tier still kept for compatibility). */
  baseRarity?: BaseCardRarity;
  /** Canonical finish layer introduced in redesign Lot 1 (mapped from legacy variantType for now). */
  finish?: BaseCardFinish;
  /** Canonical gameplay score introduced in redesign Lot 1. */
  combatScore?: number;
  /** Canonical archetype introduced in redesign Lot 1. */
  archetype?: BaseCardArchetype;
  /** Stable collector-facing id introduced in redesign Lot 1. */
  collectorId?: string;
  variantId?: string;
  variantType?: "standard" | "holo" | "full_art" | "glitch" | "gold" | string;
  variantRarity?: "common" | "rare" | "epic" | "legendary" | string;
  frameStyle?: string;
  variantLabel?: string;
  chainColor?: string;
  chainGlow?: string;
  chainArt?: string;
  isEligible?: boolean;
};

export type OwnedCard = {
  baseCardId: string;
  quantity: number;
  card: BaseCard;
};
