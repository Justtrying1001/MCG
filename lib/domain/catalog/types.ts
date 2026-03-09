import type { EditionType, RarityTier } from "@prisma/client";

export type CatalogIdentity = {
  tokenProjectSlug: string;
  cardSetCode: string;
  rarityCode: RarityTier;
  editionCode: EditionType;
};

export type CardTemplateSeed = CatalogIdentity & {
  name: string;
  imageUrl?: string | null;
};
