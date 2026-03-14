import { PrismaClient, PackSource, RarityTier, EditionType } from "@prisma/client";

const allowExhausted = process.argv.includes("--allow-exhausted");

const EXPECTED = {
  cardSetCode: "MVP_SET_V1",
  salePackCode: "mvp_sale_pack",
  rewardPackCode: "mvp_reward_pack",
  cardsPerPack: 5,
  salePlannedPackCount: 10_000,
  rewardPlannedPackCount: 6_000,
  tokenProjects: 50,
  templates: 1_250,
  rarities: Object.values(RarityTier),
  editions: Object.values(EditionType),
};

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env ${name}. Configure cloud DATABASE_URL before running bootstrap check.`);
  }

  return value;
}

async function run() {
  requiredEnv("DATABASE_URL");

  const prisma = new PrismaClient();

  try {
    const [
      cardSet,
      salePack,
      rewardPack,
      tokenProjectCount,
      rarityRows,
      editionRows,
      templateRows,
    ] = await Promise.all([
      prisma.cardSet.findUnique({ where: { code: EXPECTED.cardSetCode } }),
      prisma.packDefinition.findUnique({ where: { code: EXPECTED.salePackCode } }),
      prisma.packDefinition.findUnique({ where: { code: EXPECTED.rewardPackCode } }),
      prisma.tokenProject.count({ where: { isActive: true } }),
      prisma.rarity.findMany({ select: { code: true } }),
      prisma.edition.findMany({ select: { code: true } }),
      prisma.cardTemplate.findMany({
        where: { isActive: true, plannedSupply: { gt: 0 } },
        select: {
          cardSetId: true,
          tokenProjectId: true,
          plannedSupply: true,
          issuedSupply: true,
          rarity: { select: { code: true } },
          edition: { select: { code: true } },
        },
      }),
    ]);

    const failures = [];

    if (!cardSet) failures.push(`Missing CardSet code=${EXPECTED.cardSetCode}`);
    if (cardSet && !cardSet.isActive) failures.push(`CardSet ${EXPECTED.cardSetCode} is inactive`);

    if (!salePack) {
      failures.push(`Missing SALE pack definition code=${EXPECTED.salePackCode}`);
    } else {
      if (!salePack.isActive) failures.push(`${salePack.code} is inactive`);
      if (salePack.source !== PackSource.SALE) failures.push(`${salePack.code} has source=${salePack.source} expected=SALE`);
      if (salePack.cardsPerPack !== EXPECTED.cardsPerPack) failures.push(`${salePack.code} cardsPerPack=${salePack.cardsPerPack} expected=${EXPECTED.cardsPerPack}`);
      if (salePack.plannedPackCount !== EXPECTED.salePlannedPackCount) {
        failures.push(`${salePack.code} plannedPackCount=${salePack.plannedPackCount} expected=${EXPECTED.salePlannedPackCount}`);
      }
      if (salePack.openedPackCount > salePack.plannedPackCount) {
        failures.push(`${salePack.code} openedPackCount=${salePack.openedPackCount} exceeds plannedPackCount=${salePack.plannedPackCount}`);
      }
    }

    if (!rewardPack) {
      failures.push(`Missing REWARD pack definition code=${EXPECTED.rewardPackCode}`);
    } else {
      if (!rewardPack.isActive) failures.push(`${rewardPack.code} is inactive`);
      if (rewardPack.source !== PackSource.REWARD) failures.push(`${rewardPack.code} has source=${rewardPack.source} expected=REWARD`);
      if (rewardPack.cardsPerPack !== EXPECTED.cardsPerPack) failures.push(`${rewardPack.code} cardsPerPack=${rewardPack.cardsPerPack} expected=${EXPECTED.cardsPerPack}`);
      if (rewardPack.plannedPackCount !== EXPECTED.rewardPlannedPackCount) {
        failures.push(`${rewardPack.code} plannedPackCount=${rewardPack.plannedPackCount} expected=${EXPECTED.rewardPlannedPackCount}`);
      }
      if (rewardPack.openedPackCount > rewardPack.plannedPackCount) {
        failures.push(`${rewardPack.code} openedPackCount=${rewardPack.openedPackCount} exceeds plannedPackCount=${rewardPack.plannedPackCount}`);
      }
    }

    if (cardSet && salePack && salePack.cardSetId !== cardSet.id) {
      failures.push(`${salePack.code} points to unexpected cardSetId=${salePack.cardSetId}`);
    }
    if (cardSet && rewardPack && rewardPack.cardSetId !== cardSet.id) {
      failures.push(`${rewardPack.code} points to unexpected cardSetId=${rewardPack.cardSetId}`);
    }

    if (tokenProjectCount < EXPECTED.tokenProjects) {
      failures.push(`Active token projects=${tokenProjectCount}; expected at least ${EXPECTED.tokenProjects}`);
    }

    const rarityCodes = new Set(rarityRows.map((r) => r.code));
    for (const expected of EXPECTED.rarities) {
      if (!rarityCodes.has(expected)) failures.push(`Missing rarity code=${expected}`);
    }

    const editionCodes = new Set(editionRows.map((e) => e.code));
    for (const expected of EXPECTED.editions) {
      if (!editionCodes.has(expected)) failures.push(`Missing edition code=${expected}`);
    }

    const cardSetTemplates = cardSet ? templateRows.filter((row) => row.cardSetId === cardSet.id) : [];
    if (cardSetTemplates.length !== EXPECTED.templates) {
      failures.push(`CardSet ${EXPECTED.cardSetCode} active templates=${cardSetTemplates.length} expected=${EXPECTED.templates}`);
    }

    const tokenTemplateMatrix = new Map();
    let hasRemainingSupply = false;

    for (const row of cardSetTemplates) {
      if (row.issuedSupply < 0) failures.push(`Template has negative issuedSupply=${row.issuedSupply}`);
      if (row.plannedSupply <= 0) failures.push(`Template has plannedSupply<=0`);
      if (row.issuedSupply > row.plannedSupply) {
        failures.push(`Template has issuedSupply=${row.issuedSupply} > plannedSupply=${row.plannedSupply}`);
      }
      if (row.issuedSupply < row.plannedSupply) hasRemainingSupply = true;

      const key = row.tokenProjectId;
      tokenTemplateMatrix.set(key, (tokenTemplateMatrix.get(key) ?? 0) + 1);
    }

    if (!hasRemainingSupply && !allowExhausted) {
      failures.push(`No remaining template supply for ${EXPECTED.cardSetCode}`);
    }

    for (const [tokenProjectId, count] of tokenTemplateMatrix.entries()) {
      if (count !== EXPECTED.rarities.length * EXPECTED.editions.length) {
        failures.push(`Token project ${tokenProjectId} has templates=${count}; expected ${EXPECTED.rarities.length * EXPECTED.editions.length}`);
      }
    }

    if (failures.length > 0) {
      console.error("MVP bootstrap check FAILED");
      for (const reason of failures) {
        console.error(`- ${reason}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log("MVP bootstrap check OK");
    console.log(`- cardSet=${EXPECTED.cardSetCode} active=${cardSet.isActive}`);
    console.log(`- salePack=${salePack.code} source=${salePack.source} opened=${salePack.openedPackCount}/${salePack.plannedPackCount}`);
    console.log(`- rewardPack=${rewardPack.code} source=${rewardPack.source} opened=${rewardPack.openedPackCount}/${rewardPack.plannedPackCount}`);
    console.log(`- activeTokenProjects=${tokenProjectCount}`);
    console.log(`- activeTemplatesWithSupply=${cardSetTemplates.length}`);
    console.log(`- hasRemainingSupply=${hasRemainingSupply}`);
    console.log(`- allowExhausted=${allowExhausted}`);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error(error?.message ?? error);
  process.exitCode = 1;
});
