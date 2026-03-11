import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EXPECTED = {
  cardSetCode: "MVP_SET_V1",
  salePackCode: "mvp_sale_pack",
  rewardPackCode: "mvp_reward_pack",
  cardsPerPack: 5,
};

async function run() {
  const [cardSet, salePack, rewardPack, templateCounts] = await Promise.all([
    prisma.cardSet.findUnique({ where: { code: EXPECTED.cardSetCode } }),
    prisma.packDefinition.findUnique({ where: { code: EXPECTED.salePackCode } }),
    prisma.packDefinition.findUnique({ where: { code: EXPECTED.rewardPackCode } }),
    prisma.cardTemplate.groupBy({
      by: ["cardSetId"],
      _count: { _all: true },
      where: { isActive: true, plannedSupply: { gt: 0 } },
    }),
  ]);

  const failures = [];

  if (!cardSet) failures.push(`Missing CardSet code=${EXPECTED.cardSetCode}`);
  if (cardSet && !cardSet.isActive) failures.push(`CardSet ${EXPECTED.cardSetCode} is inactive`);

  for (const [label, pack] of [["SALE", salePack], ["REWARD", rewardPack]]) {
    if (!pack) {
      failures.push(`Missing ${label} pack definition`);
      continue;
    }
    if (!pack.isActive) failures.push(`${pack.code} is inactive`);
    if (pack.cardsPerPack !== EXPECTED.cardsPerPack) {
      failures.push(`${pack.code} cardsPerPack=${pack.cardsPerPack} (expected ${EXPECTED.cardsPerPack})`);
    }
  }

  if (cardSet && salePack && salePack.cardSetId !== cardSet.id) {
    failures.push(`Sale pack points to unexpected cardSetId=${salePack.cardSetId}`);
  }

  const setTemplateCount = cardSet
    ? templateCounts.find((row) => row.cardSetId === cardSet.id)?._count._all ?? 0
    : 0;

  if (setTemplateCount === 0) {
    failures.push(`No active card templates with planned supply for ${EXPECTED.cardSetCode}`);
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
  console.log(`- cardSet=${EXPECTED.cardSetCode}`);
  console.log(`- salePack=${salePack.code} active=${salePack.isActive} cardsPerPack=${salePack.cardsPerPack}`);
  console.log(`- rewardPack=${rewardPack.code} active=${rewardPack.isActive} cardsPerPack=${rewardPack.cardsPerPack}`);
  console.log(`- activeTemplatesWithSupply=${setTemplateCount}`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
