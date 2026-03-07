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
