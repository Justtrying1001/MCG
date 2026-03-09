export type CatalogIdentity = {
  tokenProjectSlug: string;
  cardSetCode: string;
  rarityCode: string;
  editionCode: string;
};

export type CardTemplateSeed = CatalogIdentity & {
  name: string;
  imageUrl?: string | null;
};
