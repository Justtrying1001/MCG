import { PrismaClient, QuestType } from "@prisma/client";

const SEEDED_CODES = [
  "ms_open_packs_01",
  "ms_open_packs_05",
  "ms_open_packs_20",
  "ms_total_cards_25",
  "ms_total_cards_100",
  "ms_unique_cards_10",
  "ms_unique_cards_25",
  "ms_contests_joined_1",
  "ms_contests_joined_10",
  "ms_contests_won_1",
  "ms_rare_plus_10",
  "ms_epic_plus_5",
  "ms_legendary_1",
  "ms_rewards_claimed_5",
  "ms_reward_points_5000",
];

function staticAudit() {
  return {
    source: "code-only",
    milestoneModelExists: true,
    questTypeUsed: QuestType.CONTEST_COUNT_MILESTONE,
    seededDefinitionsInCode: SEEDED_CODES.length,
    idempotenceStrategy: "create-if-missing-by-unique-code",
    supportsAdminLifecycle: true,
  };
}

async function dbAudit() {
  const prisma = new PrismaClient();
  try {
    const allMilestones = await prisma.questDefinition.findMany({
      where: { type: QuestType.CONTEST_COUNT_MILESTONE },
      select: { code: true, isActive: true, config: true },
      orderBy: [{ code: "asc" }],
    });

    const seededRows = allMilestones.filter((row) => SEEDED_CODES.includes(row.code));

    return {
      source: "database",
      milestoneModelExists: true,
      questTypeUsed: QuestType.CONTEST_COUNT_MILESTONE,
      seededDefinitionsInCode: SEEDED_CODES.length,
      dbMilestonesTotal: allMilestones.length,
      dbSeededMilestonesFound: seededRows.length,
      missingSeededCodes: SEEDED_CODES.filter((code) => !seededRows.find((row) => row.code === code)),
      idempotenceStrategy: "create-if-missing-by-unique-code",
      supportsAdminLifecycle: true,
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  const payload = process.env.DATABASE_URL ? await dbAudit() : staticAudit();
  console.log(JSON.stringify(payload, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
