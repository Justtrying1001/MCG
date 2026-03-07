export type BaseCard = {
  baseCardId: string;
  name: string;
  symbol: string;
  image: string;
  faction: string | null;
  projectTier: "S" | "A" | "B" | "C" | "D" | string;
  marketCapRank: number | null;
  ATK: number;
  DEF: number;
  SPD: number;
  CTRL: number;
  isEligible?: boolean;
};

export type OwnedCard = {
  baseCardId: string;
  quantity: number;
  card: BaseCard;
};
