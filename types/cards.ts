export type MvpCardView = {
  templateId: string;
  tokenId: string;
  displayName: string;
  symbol: string;
  slug: string;
  imageUrl: string | null;
  primaryChain: string | null;
  faction: string | null;
  rarity: string;
  edition: string;
  plannedSupply: number;
  issuedSupply: number;
  remainingSupply: number;
  owned: boolean;
  instanceCount: number;
  cardText?: string | null;
  flavorText?: string | null;
  cardNumber?: string | null;
  setCode?: string | null;
  setEditionLabel?: string | null;
  setOrder?: number | null;
  editionNumber?: number | null;
};

export type MvpCollectionItem = {
  templateId: string;
  instanceCount: number;
  card: MvpCardView;
};
