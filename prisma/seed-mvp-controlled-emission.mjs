import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

const MVP_CARD_SET = {
  code: "GENESIS_SET_V1",
  displayName: "MCG MVP Genesis",
};

const MVP_PACKS = [
  { code: "genesis_sale_pack", displayName: "MCG Genesis Sale Pack", source: "SALE", plannedPackCount: 10000 },
  { code: "genesis_reward_pack", displayName: "MCG Genesis Reward Pack", source: "REWARD", plannedPackCount: 6000 },
];

const CARDS_PER_PACK = 5;
const MVP_TOKEN_COUNT = 25;
const TOKEN_MASTER_PATH = path.join(process.cwd(), "data", "token-master-25.json");

const SUPPLY_MATRIX = {
  COMMON: { BASE: 1460, REVERSE: 260, BRILLANTE: 90, HOLO: 40, FULL_ART: 10 },
  UNCOMMON: { BASE: 480, REVERSE: 100, BRILLANTE: 40, HOLO: 16, FULL_ART: 4 },
  RARE: { BASE: 260, REVERSE: 60, BRILLANTE: 24, HOLO: 12, FULL_ART: 4 },
  EPIC: { BASE: 160, REVERSE: 36, BRILLANTE: 14, HOLO: 8, FULL_ART: 2 },
  LEGENDARY: { BASE: 90, REVERSE: 16, BRILLANTE: 6, HOLO: 6, FULL_ART: 2 },
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
    tokenId: row.tokenId ?? null,
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

  // IMPORTANT: keep seeding out of a single long interactive transaction.
  // Vercel/Neon can close long-lived transaction IDs and trigger Prisma P2028.
  for (const row of RARITY_SEED) {
    await prisma.rarity.upsert({
      where: { code: row.code },
      update: { weight: row.weight },
      create: row,
    });
  }

  for (const row of EDITION_SEED) {
    await prisma.edition.upsert({
      where: { code: row.code },
      update: { weight: row.weight },
      create: row,
    });
  }

  const cardSet = await prisma.cardSet.upsert({
    where: { code: MVP_CARD_SET.code },
    update: { displayName: MVP_CARD_SET.displayName, isActive: true },
    create: { code: MVP_CARD_SET.code, displayName: MVP_CARD_SET.displayName, isActive: true },
  });

  const rarities = await prisma.rarity.findMany({ where: { code: { in: RARITY_SEED.map((r) => r.code) } } });
  const editions = await prisma.edition.findMany({ where: { code: { in: EDITION_SEED.map((e) => e.code) } } });

  const rarityByCode = new Map(rarities.map((r) => [r.code, r]));
  const editionByCode = new Map(editions.map((e) => [e.code, e]));
  const mvpTokenProjectIds = [];

  for (const token of mvpTokens) {
    const tokenProject = await prisma.tokenProject.upsert({
      where: { slug: token.slug },
      update: { displayName: token.displayName, isActive: true, coingeckoId: token.coingeckoId ?? null },
      create: { slug: token.slug, displayName: token.displayName, isActive: true, coingeckoId: token.coingeckoId ?? null },
    });
    mvpTokenProjectIds.push(tokenProject.id);

    for (const rarity of RARITY_SEED) {
      const rarityRow = rarityByCode.get(rarity.code);
      if (!rarityRow) throw new Error(`Missing rarity ${rarity.code}`);

      for (const edition of EDITION_SEED) {
        const editionRow = editionByCode.get(edition.code);
        if (!editionRow) throw new Error(`Missing edition ${edition.code}`);

        const plannedSupply = SUPPLY_MATRIX[rarity.code][edition.code];

        await prisma.cardTemplate.upsert({
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

  const obsoleteTemplates = await prisma.cardTemplate.updateMany({
    where: {
      cardSetId: cardSet.id,
      isActive: true,
      tokenProjectId: { notIn: mvpTokenProjectIds },
    },
    data: { isActive: false },
  });
  if (obsoleteTemplates.count > 0) {
    console.log(`[seed] Deactivated ${obsoleteTemplates.count} obsolete templates outside MVP token list`);
  }

  const tokenProjectsWithoutGecko = await prisma.tokenProject.findMany({
    where: { coingeckoId: null },
    select: {
      id: true,
      cardTemplates: {
        select: { metadata: true },
        take: 1,
      },
    },
  });

  for (const project of tokenProjectsWithoutGecko) {
    const metadata = project.cardTemplates[0]?.metadata;
    const value = metadata?.tokenIdentity?.coingeckoId;
    if (typeof value === "string" && value.trim().length > 0) {
      await prisma.tokenProject.update({
        where: { id: project.id },
        data: { coingeckoId: value.trim().toLowerCase() },
      });
    }
  }

  // PATCH DE SÉCURITÉ — re-appliquer les coingeckoId depuis le master (idempotent)
  // Couvre le cas où les TokenProject existent déjà en DB mais ont coingeckoId null
  // (ex: seed précédent sans coingeckoId, ou migration depuis un ancien schéma)
  console.log("[seed] Patching coingeckoId on existing TokenProjects from master...");
  let patchCount = 0;
  for (const token of mvpTokens) {
    if (!token.coingeckoId) continue;
    const result = await prisma.tokenProject.updateMany({
      where: { slug: token.slug, coingeckoId: null },
      data: { coingeckoId: token.coingeckoId },
    });
    if (result.count > 0) {
      console.log(`[seed] Patched coingeckoId for slug=${token.slug} → ${token.coingeckoId}`);
      patchCount += result.count;
    }
  }
  console.log(`[seed] coingeckoId patch done — ${patchCount} rows updated`);

  // PROTECTION ANTI-PARASITES — désactiver tout TokenProject actif hors master MVP
  // Couvre les tokens créés via tests, imports parasites ou anciens seeds hors-MVP.
  const masterSlugsForCleanup = mvpTokens.map((t) => t.slug);
  const deactivated = await prisma.tokenProject.updateMany({
    where: {
      isActive: true,
      slug: { notIn: masterSlugsForCleanup },
    },
    data: { isActive: false },
  });
  if (deactivated.count > 0) {
    console.log(`[seed] Deactivated ${deactivated.count} non-MVP token projects (parasites)`);
  } else {
    console.log(`[seed] No non-MVP token projects to deactivate — DB is clean`);
  }

  for (const pack of MVP_PACKS) {
    await prisma.packDefinition.upsert({
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

  console.log("MVP controlled-emission bootstrap completed.");
  console.log(`Tokens: ${mvpTokens.length}`);
  console.log(`Templates: ${expectedTemplates}`);
  console.log(`Planned card supply: ${perToken * MVP_TOKEN_COUNT}`);
  console.log(`Packs: sale=10000 reward=6000 cardsPerPack=${CARDS_PER_PACK}`);
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
