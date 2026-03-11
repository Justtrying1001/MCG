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
};

export type MvpCollectionItem = {
  templateId: string;
  instanceCount: number;
  card: MvpCardView;
};
