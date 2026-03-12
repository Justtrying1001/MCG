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
const TOKEN_MASTER_PATH = path.join(process.cwd(), "data", "token-master-50.json");

const SUPPLY_MATRIX = {
  COMMON: { BASE: 730, REVERSE: 130, BRILLANTE: 45, HOLO: 20, FULL_ART: 5 },
  UNCOMMON: { BASE: 240, REVERSE: 50, BRILLANTE: 20, HOLO: 8, FULL_ART: 2 },
  RARE: { BASE: 130, REVERSE: 30, BRILLANTE: 12, HOLO: 6, FULL_ART: 2 },
  EPIC: { BASE: 80, REVERSE: 18, BRILLANTE: 7, HOLO: 4, FULL_ART: 1 },
  LEGENDARY: { BASE: 45, REVERSE: 8, BRILLANTE: 3, HOLO: 3, FULL_ART: 1 },
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

function loadMvpTokensFromMaster() {
  const payload = JSON.parse(readFileSync(TOKEN_MASTER_PATH, "utf8"));
  const rows = Array.isArray(payload?.tokens) ? payload.tokens : [];

  if (rows.length !== MVP_TOKEN_COUNT) {
    throw new Error(`Expected ${MVP_TOKEN_COUNT} tokens in token master, found ${rows.length}`);
  }

  const reviewRequired = rows.filter((row) => row?.manualReviewRequired);
  if (reviewRequired.length > 0) {
    throw new Error(`Token master contains ${reviewRequired.length} manual-review rows; resolve before seeding.`);
  }

  return rows.map((row) => ({
    slug: row.slug ?? row.coingeckoId ?? row.baseCardId,
    displayName: row.displayName,
    imageUrl: row.imageUrl ?? null,
    baseCardId: row.baseCardId,
    projectId: row.projectId ?? null,
    coingeckoId: row.coingeckoId ?? null,
    symbol: row.symbol ?? null,
    marketCapRank: Number.isFinite(row.marketCapRank) ? row.marketCapRank : null,
    projectTier: row.projectTier ?? null,
    primaryChain: row.primaryChain ?? null,
    faction: row.faction ?? null,
    isMvpEligible: row.isMvpEligible !== false,
  }));
}

function supplyPerToken() {
  return Object.values(SUPPLY_MATRIX)
    .flatMap((byEdition) => Object.values(byEdition))
    .reduce((sum, v) => sum + v, 0);
}

async function run() {
  const dryRun = process.argv.includes("--dry-run");
  const mvpTokens = loadMvpTokensFromMaster();

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
    console.log("[dry-run] source:", TOKEN_MASTER_PATH);
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
              metadata: {
                source: "phase_c_mvp_controlled_emission_seed",
                tokenIdentity: {
                  tokenId: token.tokenId,
                  slug: token.slug,
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
              metadata: {
                source: "phase_c_mvp_controlled_emission_seed",
                tokenIdentity: {
                  tokenId: token.tokenId,
                  slug: token.slug,
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
          cardsPerPack: CARDS_PER_PACK,
          isActive: true,
        },
        create: {
          code: pack.code,
          displayName: pack.displayName,
          cardSetId: cardSet.id,
          source: pack.source,
          plannedPackCount: pack.plannedPackCount,
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
