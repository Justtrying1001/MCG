import { QuestType, QuestValidationMode, type PrismaClient } from "@prisma/client";

import { MILESTONE_SEED_DEFINITIONS } from "@/lib/domain/quests/milestone-definitions";

type PrismaLike = Pick<PrismaClient, "questDefinition">;

export async function seedMilestoneQuests(prisma: PrismaLike) {
  const created: string[] = [];
  const existing: string[] = [];

  for (const milestone of MILESTONE_SEED_DEFINITIONS) {
    const row = await prisma.questDefinition.findUnique({ where: { code: milestone.code } });
    if (row) {
      existing.push(milestone.code);
      continue;
    }

    await prisma.questDefinition.create({
      data: {
        code: milestone.code,
        type: QuestType.CONTEST_COUNT_MILESTONE,
        title: milestone.title,
        description: milestone.userDescription,
        rewardPoints: milestone.rewardPoints,
        validationMode: QuestValidationMode.AUTO,
        oneTime: true,
        isActive: milestone.active,
        config: {
          seedKey: milestone.seedKey,
          slug: milestone.slug,
          adminTitle: milestone.adminTitle,
          category: milestone.category,
          adminDescription: milestone.adminDescription,
          metricKey: milestone.metricKey,
          milestoneType: milestone.metricKey,
          targetValue: milestone.threshold,
          threshold: milestone.threshold,
          sortOrder: milestone.sortOrder,
          unique: milestone.unique,
          repeatable: milestone.repeatable,
          lifecycleStatus: "ACTIVE",
          source: "milestone_seed_v1",
        },
      },
    });

    created.push(milestone.code);
  }

  return {
    expectedCount: MILESTONE_SEED_DEFINITIONS.length,
    createdCount: created.length,
    existingCount: existing.length,
    created,
    existing,
  };
}
