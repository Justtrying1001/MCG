// LEGACY TRANSITION MODULE (Phase F):
// This helper remains for historical continuity/migration tooling only.
// Authenticated pack opening runtime now uses `lib/domain/acquisition/open-pack.ts` with DB-native controlled emission.

import type { EditionType, Prisma, RarityTier } from "@prisma/client";
import type { BaseCard } from "@/types/cards";

const ACTIVE_CARD_SET_CODE = "BASE_SET_V1";
const ACTIVE_PACK_DEFINITION_CODE = "BASE_PACK_V1";
const DEFAULT_CARDS_PER_PACK = 5;

const RARITY_BY_TIER: Record<string, RarityTier> = {
  S: "LEGENDARY",
  A: "EPIC",
  B: "RARE",
  C: "UNCOMMON",
  D: "COMMON",
};

const EDITION_BY_VARIANT: Record<string, EditionType> = {
  standard: "BASE",
  holo: "HOLO",
  full_art: "FULL_ART",
};

function getTokenProjectSlug(card: BaseCard) {
  return card.slug ?? card.projectId ?? card.baseCardId;
}

function mapCardToCatalogCodes(card: BaseCard): { rarityCode: RarityTier; editionCode: EditionType } {
  return {
    rarityCode: RARITY_BY_TIER[card.projectTier] ?? "COMMON",
    editionCode: EDITION_BY_VARIANT[card.variantType ?? "standard"] ?? "BASE",
  };
}

async function ensureRarityAndEditionSeed(tx: Prisma.TransactionClient) {
  const raritySeed: Array<{ code: RarityTier; weight: number }> = [
    { code: "COMMON", weight: 40 },
    { code: "UNCOMMON", weight: 30 },
    { code: "RARE", weight: 20 },
    { code: "EPIC", weight: 8 },
    { code: "LEGENDARY", weight: 2 },
  ];

  const editionSeed: Array<{ code: EditionType; weight: number }> = [
    { code: "BASE", weight: 70 },
    { code: "REVERSE", weight: 10 },
    { code: "BRILLANTE", weight: 8 },
    { code: "HOLO", weight: 7 },
    { code: "FULL_ART", weight: 5 },
  ];

  await Promise.all([
    ...raritySeed.map((row) =>
      tx.rarity.upsert({
        where: { code: row.code },
        update: { weight: row.weight },
        create: row,
      })
    ),
    ...editionSeed.map((row) =>
      tx.edition.upsert({
        where: { code: row.code },
        update: { weight: row.weight },
        create: row,
      })
    ),
  ]);
}

/**
 * @deprecated Legacy transition helper.
 * Authenticated pack opening runtime uses DB-native controlled emission in `open-pack.ts`.
 */
export async function ensurePackFoundations(
  tx: Prisma.TransactionClient,
  pulledCards: BaseCard[]
): Promise<{ packDefinitionId: string; cardTemplateIdByBaseCardId: Map<string, string> }> {
  await ensureRarityAndEditionSeed(tx);

  const cardSet = await tx.cardSet.upsert({
    where: { code: ACTIVE_CARD_SET_CODE },
    update: { isActive: true, displayName: "Base Set v1" },
    create: { code: ACTIVE_CARD_SET_CODE, displayName: "Base Set v1", isActive: true },
  });

  const packDefinition = await tx.packDefinition.upsert({
    where: { code: ACTIVE_PACK_DEFINITION_CODE },
    // Phase B compatibility note:
    // supply counters remain at zero until controlled-emission bootstrap (Phase C) initializes them.
    update: {
      isActive: true,
      displayName: "Genesis Booster Base Pack v1",
      cardSetId: cardSet.id,
      cardsPerPack: DEFAULT_CARDS_PER_PACK,
    },
    create: {
      code: ACTIVE_PACK_DEFINITION_CODE,
      displayName: "Genesis Booster Base Pack v1",
      cardSetId: cardSet.id,
      cardsPerPack: DEFAULT_CARDS_PER_PACK,
      isActive: true,
    },
  });

  const cardTemplateIdByBaseCardId = new Map<string, string>();

  for (const card of pulledCards) {
    const slug = getTokenProjectSlug(card);
    const { rarityCode, editionCode } = mapCardToCatalogCodes(card);

    const tokenProject = await tx.tokenProject.upsert({
      where: { slug },
      update: { isActive: true, displayName: card.name },
      create: { slug, displayName: card.name, isActive: true },
    });

    const rarity = await tx.rarity.findUniqueOrThrow({ where: { code: rarityCode } });
    const edition = await tx.edition.findUniqueOrThrow({ where: { code: editionCode } });

    const cardTemplate = await tx.cardTemplate.upsert({
      where: {
        tokenProjectId_cardSetId_rarityId_editionId: {
          tokenProjectId: tokenProject.id,
          cardSetId: cardSet.id,
          rarityId: rarity.id,
          editionId: edition.id,
        },
      },
      update: {
        isActive: true,
        name: card.name,
        imageUrl: card.image,
        metadata: {
          baseCardId: card.baseCardId,
          projectTier: card.projectTier,
          legacySource: "pack_dual_write",
        },
      },
      create: {
        tokenProjectId: tokenProject.id,
        cardSetId: cardSet.id,
        rarityId: rarity.id,
        editionId: edition.id,
        name: card.name,
        imageUrl: card.image,
        isActive: true,
        metadata: {
          baseCardId: card.baseCardId,
          projectTier: card.projectTier,
          legacySource: "pack_dual_write",
        },
      },
    });

    cardTemplateIdByBaseCardId.set(card.baseCardId, cardTemplate.id);
  }

  return {
    packDefinitionId: packDefinition.id,
    cardTemplateIdByBaseCardId,
  };
}
