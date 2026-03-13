import { PrismaClient, QuestType, QuestValidationMode } from "@prisma/client";

const prisma = new PrismaClient();

const MILESTONES = [
  ["ms_open_packs_01", "MILESTONE_V1_OPEN_PACKS_1", "First pack opened", "OPEN_PACKS", "PACK_OPEN_COUNT", 1, 100, 10],
  ["ms_open_packs_05", "MILESTONE_V1_OPEN_PACKS_5", "Pack opener", "OPEN_PACKS", "PACK_OPEN_COUNT", 5, 250, 20],
  ["ms_open_packs_20", "MILESTONE_V1_OPEN_PACKS_20", "Pack veteran", "OPEN_PACKS", "PACK_OPEN_COUNT", 20, 800, 30],
  ["ms_total_cards_25", "MILESTONE_V1_TOTAL_CARDS_25", "Collector I", "TOTAL_CARDS_COLLECTED", "TOTAL_CARDS_COLLECTED", 25, 200, 40],
  ["ms_total_cards_100", "MILESTONE_V1_TOTAL_CARDS_100", "Collector II", "TOTAL_CARDS_COLLECTED", "TOTAL_CARDS_COLLECTED", 100, 750, 50],
  ["ms_unique_cards_10", "MILESTONE_V1_UNIQUE_CARDS_10", "Diversity I", "UNIQUE_CARDS_COLLECTED", "UNIQUE_CARDS_COLLECTED", 10, 220, 60],
  ["ms_unique_cards_25", "MILESTONE_V1_UNIQUE_CARDS_25", "Diversity II", "UNIQUE_CARDS_COLLECTED", "UNIQUE_CARDS_COLLECTED", 25, 700, 70],
  ["ms_contests_joined_1", "MILESTONE_V1_CONTESTS_JOINED_1", "First contest entry", "CONTESTS_JOINED", "CONTESTS_JOINED", 1, 150, 80],
  ["ms_contests_joined_10", "MILESTONE_V1_CONTESTS_JOINED_10", "Contest regular", "CONTESTS_JOINED", "CONTESTS_JOINED", 10, 900, 90],
  ["ms_contests_won_1", "MILESTONE_V1_CONTESTS_WON_1", "First victory", "CONTESTS_WON", "CONTESTS_WON", 1, 1200, 100],
  ["ms_rare_plus_10", "MILESTONE_V1_RARE_PLUS_10", "Rare hunter", "RARE_PLUS_CARDS_OWNED", "RARE_PLUS_CARDS_OWNED", 10, 500, 110],
  ["ms_epic_plus_5", "MILESTONE_V1_EPIC_PLUS_5", "Epic collector", "EPIC_PLUS_CARDS_OWNED", "EPIC_PLUS_CARDS_OWNED", 5, 900, 120],
  ["ms_legendary_1", "MILESTONE_V1_LEGENDARY_1", "Legend awakened", "LEGENDARY_CARDS_OWNED", "LEGENDARY_CARDS_OWNED", 1, 1500, 130],
  ["ms_rewards_claimed_5", "MILESTONE_V1_REWARDS_CLAIMED_5", "Quest closer", "REWARDS_CLAIMED", "REWARDS_CLAIMED", 5, 600, 140],
  ["ms_reward_points_5000", "MILESTONE_V1_REWARD_POINTS_5000", "Points powerhouse", "REWARD_POINTS_EARNED", "REWARD_POINTS_EARNED", 5000, 1200, 150],
];

async function run() {
  const created = [];
  const existing = [];

  for (const [code, seedKey, title, category, metricKey, threshold, rewardPoints, sortOrder] of MILESTONES) {
    const row = await prisma.questDefinition.findUnique({ where: { code } });
    if (row) {
      existing.push(code);
      continue;
    }

    await prisma.questDefinition.create({
      data: {
        code,
        type: QuestType.CONTEST_COUNT_MILESTONE,
        title,
        description: title,
        rewardPoints,
        validationMode: QuestValidationMode.AUTO,
        oneTime: true,
        isActive: true,
        config: {
          seedKey,
          category,
          metricKey,
          milestoneType: metricKey,
          targetValue: threshold,
          threshold,
          sortOrder,
          unique: true,
          repeatable: false,
          lifecycleStatus: "ACTIVE",
          source: "milestone_seed_v1",
        },
      },
    });
    created.push(code);
  }

  console.log(JSON.stringify({ expectedCount: MILESTONES.length, createdCount: created.length, existingCount: existing.length, created, existing }, null, 2));
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
