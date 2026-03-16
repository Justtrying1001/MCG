import { QuestType, QuestValidationMode, type PrismaClient } from "@prisma/client";

import { MILESTONE_SEED_DEFINITIONS } from "@/lib/domain/quests/milestone-definitions";

type PrismaLike = Pick<PrismaClient, "questDefinition" | "packDefinition">;

export async function seedMilestoneQuests(prisma: PrismaLike) {
  const created: string[] = [];
  const existing: string[] = [];
  const updated: string[] = [];

  // Pre-resolve pack definition codes to IDs
  const packCodes = [...new Set(MILESTONE_SEED_DEFINITIONS.flatMap((m) => m.rewardPackDefinitionCode ? [m.rewardPackDefinitionCode] : []))];
  const packCodeToId = new Map<string, string>();
  if (packCodes.length > 0) {
    const packs = await prisma.packDefinition.findMany({
      where: { code: { in: packCodes } },
      select: { id: true, code: true },
    });
    for (const pack of packs) {
      packCodeToId.set(pack.code, pack.id);
    }
  }

  for (const milestone of MILESTONE_SEED_DEFINITIONS) {
    const rewardPackDefinitionId = milestone.rewardPackDefinitionCode
      ? (packCodeToId.get(milestone.rewardPackDefinitionCode) ?? null)
      : null;
    const rewardPackQuantity = milestone.rewardPackQuantity ?? 1;

    const row = await prisma.questDefinition.findUnique({ where: { code: milestone.code } });
    if (row) {
      // Update pack reward fields if they differ from stored values
      const needsPackUpdate = rewardPackDefinitionId !== null
        && (row.rewardPackDefinitionId !== rewardPackDefinitionId || row.rewardPackQuantity !== rewardPackQuantity);
      if (needsPackUpdate) {
        await prisma.questDefinition.update({
          where: { id: row.id },
          data: { rewardPackDefinitionId, rewardPackQuantity },
        });
        updated.push(milestone.code);
      } else {
        existing.push(milestone.code);
      }
      continue;
    }

    await prisma.questDefinition.create({
      data: {
        code: milestone.code,
        type: QuestType.CONTEST_COUNT_MILESTONE,
        title: milestone.title,
        description: milestone.userDescription,
        rewardPoints: milestone.rewardPoints,
        rewardPackDefinitionId,
        rewardPackQuantity,
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
    updatedCount: updated.length,
    created,
    existing,
    updated,
  };
}
