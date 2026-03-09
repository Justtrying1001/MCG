export type CollectionProjectionFoundation = {
  userId: string;
  totalOwnedInstances: number;
  byRarity: Array<{ rarityCode: string; count: number }>;
};

export type ProfileProjectionFoundation = {
  userId: string;
  points: number;
  collectionCompletionPct?: number;
  competitiveRating?: number;
};
