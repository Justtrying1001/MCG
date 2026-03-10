import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

const MVP_CARD_SET = {
  code: "MVP_SET_V1",
  displayName: "MCG MVP Set v1",
};

const MVP_PACKS = [
  { code: "mvp_sale_pack", displayName: "MCG MVP Sale Pack", source: "SALE", plannedPackCount: 11000 },
  { code: "mvp_reward_pack", displayName: "MCG MVP Reward Pack", source: "REWARD", plannedPackCount: 5000 },
];

const CARDS_PER_PACK = 5;
const MVP_TOKEN_COUNT = 50;

const SUPPLY_MATRIX = {
  COMMON: { BASE: 520, REVERSE: 160, BRILLANTE: 60, HOLO: 20, FULL_ART: 6 },
  UNCOMMON: { BASE: 260, REVERSE: 95, BRILLANTE: 42, HOLO: 16, FULL_ART: 5 },
  RARE: { BASE: 130, REVERSE: 52, BRILLANTE: 24, HOLO: 10, FULL_ART: 4 },
  EPIC: { BASE: 60, REVERSE: 24, BRILLANTE: 12, HOLO: 6, FULL_ART: 3 },
  LEGENDARY: { BASE: 26, REVERSE: 11, BRILLANTE: 6, HOLO: 4, FULL_ART: 2 },
};

const RARITY_SEED = [
  { code: "COMMON", weight: 40 },
  { code: "UNCOMMON", weight: 30 },
  { code: "RARE", weight: 20 },
  { code: "EPIC", weight: 8 },
  { code: "LEGENDARY", weight: 2 },
];

const EDITION_SEED = [
  { code: "BASE", weight: 70 },
  { code: "REVERSE", weight: 10 },
  { code: "BRILLANTE", weight: 8 },
  { code: "HOLO", weight: 7 },
  { code: "FULL_ART", weight: 5 },
];

function loadMvpTokens() {
  const jsonPath = path.join(process.cwd(), "mcg_base_cards.json");
  const cards = JSON.parse(readFileSync(jsonPath, "utf8"));

  const eligible = cards.filter((card) => card?.isEligible !== false);

  const sorted = eligible.sort((a, b) => {
    const rankA = Number.isFinite(a.marketCapRank) ? a.marketCapRank : Number.MAX_SAFE_INTEGER;
    const rankB = Number.isFinite(b.marketCapRank) ? b.marketCapRank : Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    return String(a.slug ?? a.name).localeCompare(String(b.slug ?? b.name));
  });

  return sorted.slice(0, MVP_TOKEN_COUNT).map((card) => ({
    slug: card.slug ?? card.coingeckoId ?? card.baseCardId,
    displayName: card.name,
    imageUrl: card.image ?? null,
    baseCardId: card.baseCardId,
    projectId: card.projectId ?? null,
    coingeckoId: card.coingeckoId ?? null,
    symbol: card.symbol ?? null,
    marketCapRank: Number.isFinite(card.marketCapRank) ? card.marketCapRank : null,
    projectTier: card.projectTier ?? null,
    primaryChain: card.primaryChain ?? null,
    faction: card.faction ?? null,
  }));
}

function supplyPerToken() {
  return Object.values(SUPPLY_MATRIX)
    .flatMap((byEdition) => Object.values(byEdition))
    .reduce((sum, v) => sum + v, 0);
}

async function run() {
  const dryRun = process.argv.includes("--dry-run");
  const mvpTokens = loadMvpTokens();

  if (mvpTokens.length !== MVP_TOKEN_COUNT) {
    throw new Error(`Expected ${MVP_TOKEN_COUNT} tokens, found ${mvpTokens.length}`);
  }

  const perToken = supplyPerToken();
  const expectedTemplates = MVP_TOKEN_COUNT * RARITY_SEED.length * EDITION_SEED.length;

  if (dryRun) {
    console.log("[dry-run] tokens:", mvpTokens.length);
    console.log("[dry-run] templates:", expectedTemplates);
    console.log("[dry-run] planned supply per token:", perToken);
    console.log("[dry-run] total planned supply:", perToken * MVP_TOKEN_COUNT);
    console.log("[dry-run] first 5 tokens:", mvpTokens.slice(0, 5).map((x) => x.slug));
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const row of RARITY_SEED) {
      await tx.rarity.upsert({
        where: { code: row.code },
        update: { weight: row.weight },
        create: row,
      });
    }

    for (const row of EDITION_SEED) {
      await tx.edition.upsert({
        where: { code: row.code },
        update: { weight: row.weight },
        create: row,
      });
    }

    const cardSet = await tx.cardSet.upsert({
      where: { code: MVP_CARD_SET.code },
      update: { displayName: MVP_CARD_SET.displayName, isActive: true },
      create: { code: MVP_CARD_SET.code, displayName: MVP_CARD_SET.displayName, isActive: true },
    });

    const rarities = await tx.rarity.findMany({ where: { code: { in: RARITY_SEED.map((r) => r.code) } } });
    const editions = await tx.edition.findMany({ where: { code: { in: EDITION_SEED.map((e) => e.code) } } });

    const rarityByCode = new Map(rarities.map((r) => [r.code, r]));
    const editionByCode = new Map(editions.map((e) => [e.code, e]));

    for (const token of mvpTokens) {
      const tokenProject = await tx.tokenProject.upsert({
        where: { slug: token.slug },
        update: { displayName: token.displayName, isActive: true },
        create: { slug: token.slug, displayName: token.displayName, isActive: true },
      });

      for (const rarity of RARITY_SEED) {
        const rarityRow = rarityByCode.get(rarity.code);
        if (!rarityRow) throw new Error(`Missing rarity ${rarity.code}`);

        for (const edition of EDITION_SEED) {
          const editionRow = editionByCode.get(edition.code);
          if (!editionRow) throw new Error(`Missing edition ${edition.code}`);

          const plannedSupply = SUPPLY_MATRIX[rarity.code][edition.code];

          await tx.cardTemplate.upsert({
            where: {
              tokenProjectId_cardSetId_rarityId_editionId: {
                tokenProjectId: tokenProject.id,
                cardSetId: cardSet.id,
                rarityId: rarityRow.id,
                editionId: editionRow.id,
              },
            },
            update: {
              name: token.displayName,
              imageUrl: token.imageUrl,
              isActive: true,
              plannedSupply,
              issuedSupply: 0,
              metadata: {
                source: "phase_c_mvp_controlled_emission_seed",
                legacy: {
                  baseCardId: token.baseCardId,
                  projectId: token.projectId,
                  coingeckoId: token.coingeckoId,
                },
                token: {
                  symbol: token.symbol,
                  marketCapRank: token.marketCapRank,
                  projectTier: token.projectTier,
                  primaryChain: token.primaryChain,
                  faction: token.faction,
                },
              },
            },
            create: {
              tokenProjectId: tokenProject.id,
              cardSetId: cardSet.id,
              rarityId: rarityRow.id,
              editionId: editionRow.id,
              name: token.displayName,
              imageUrl: token.imageUrl,
              isActive: true,
              plannedSupply,
              issuedSupply: 0,
              metadata: {
                source: "phase_c_mvp_controlled_emission_seed",
                legacy: {
                  baseCardId: token.baseCardId,
                  projectId: token.projectId,
                  coingeckoId: token.coingeckoId,
                },
                token: {
                  symbol: token.symbol,
                  marketCapRank: token.marketCapRank,
                  projectTier: token.projectTier,
                  primaryChain: token.primaryChain,
                  faction: token.faction,
                },
              },
            },
          });
        }
      }
    }

    for (const pack of MVP_PACKS) {
      await tx.packDefinition.upsert({
        where: { code: pack.code },
        update: {
          displayName: pack.displayName,
          cardSetId: cardSet.id,
          source: pack.source,
          plannedPackCount: pack.plannedPackCount,
          openedPackCount: 0,
          cardsPerPack: CARDS_PER_PACK,
          isActive: true,
        },
        create: {
          code: pack.code,
          displayName: pack.displayName,
          cardSetId: cardSet.id,
          source: pack.source,
          plannedPackCount: pack.plannedPackCount,
          openedPackCount: 0,
          cardsPerPack: CARDS_PER_PACK,
          isActive: true,
        },
      });
    }
  });

  console.log("MVP controlled-emission bootstrap completed.");
  console.log(`Tokens: ${mvpTokens.length}`);
  console.log(`Templates: ${expectedTemplates}`);
  console.log(`Planned card supply: ${perToken * MVP_TOKEN_COUNT}`);
  console.log(`Packs: sale=11000 reward=5000 cardsPerPack=${CARDS_PER_PACK}`);
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
