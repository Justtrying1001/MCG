export type CollectionProjectionFoundation = {
  userId: string;
  totalOwnedInstances: number;
  byRarity: Array<{ rarityCode: string; count: number }>;
};

export type CollectionProjectionV2 = {
  totalOwnedInstances: number;
  ownedTemplateCount: number;
  missingTemplateCount: number;
  completionPct: number;
  byBaseCard: Array<{
    baseCardId: string;
    ownedCount: number;
    owned: boolean;
  }>;
  byRarity: Array<{ rarityCode: string; count: number }>;
  byEdition: Array<{ editionCode: string; count: number }>;
};

export type ProfileProjectionFoundation = {
  userId: string;
  points: number;
  collectionCompletionPct?: number;
  competitiveRating?: number;
};
