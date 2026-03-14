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

  const inviteQuestCode = "quest_invite_friend_1";
  const inviteQuest = await prisma.questDefinition.findUnique({ where: { code: inviteQuestCode } });
  if (inviteQuest) {
    existing.push(inviteQuestCode);
  } else {
    await prisma.questDefinition.create({
      data: {
        code: inviteQuestCode,
        type: QuestType.CONTEST_COUNT_MILESTONE,
        title: "Invite 1 friend",
        description: "Invite 1 friend and unlock 1000 points.",
        rewardPoints: 1000,
        validationMode: QuestValidationMode.AUTO,
        oneTime: true,
        isActive: true,
        config: {
          seedKey: "INVITE_QUEST_V1_INVITE_1_FRIEND",
          slug: "invite-1-friend",
          adminTitle: "Quest · Invite 1 friend",
          category: "INVITED_FRIENDS",
          adminDescription: "Entry referral quest rewarding first successful invite.",
          metricKey: "INVITED_FRIENDS",
          milestoneType: "INVITED_FRIENDS",
          targetValue: 1,
          threshold: 1,
          sortOrder: 155,
          unique: true,
          repeatable: false,
          lifecycleStatus: "ACTIVE",
          source: "invite_program_seed_v1",
        },
      },
    });
    created.push(inviteQuestCode);
  }

  return {
    expectedCount: MILESTONE_SEED_DEFINITIONS.length + 1,
    createdCount: created.length,
    existingCount: existing.length,
    created,
    existing,
  };
}
