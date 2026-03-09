import { EditionType, RarityTier } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { CardTemplateSeed } from "./types";

export async function createCardTemplateFoundation(input: CardTemplateSeed) {
  return prisma.cardTemplate.create({
    data: {
      name: input.name,
      imageUrl: input.imageUrl ?? null,
      tokenProject: {
        connect: { slug: input.tokenProjectSlug },
      },
      cardSet: {
        connect: { code: input.cardSetCode },
      },
      rarity: {
        connect: { code: input.rarityCode as RarityTier },
      },
      edition: {
        connect: { code: input.editionCode as EditionType },
      },
    },
  });
}
