import { PackSource, RewardType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { MVP_REWARD_PACK_CODE, MVP_REWARD_PACK_TOTAL_SUPPLY } from "@/lib/domain/acquisition/constants";

const SALE_TOTAL_SUPPLY = 10_000;

export async function getPackSupplySummary() {
  const [saleDistributed, rewardPack, rewardSupply] = await Promise.all([
    prisma.rewardGrant.count({ where: { type: RewardType.PACK, packDefinition: { source: PackSource.SALE } } }),
    prisma.packDefinition.findUnique({ where: { code: MVP_REWARD_PACK_CODE }, select: { id: true } }),
    prisma.rewardPackSupply.findUnique({ where: { id: MVP_REWARD_PACK_CODE } }),
  ]);

  if (!rewardPack) {
    throw new Error("Reward pack definition not found");
  }

  const derivedDistributed = await prisma.rewardGrant.count({
    where: {
      type: RewardType.PACK,
      packDefinitionId: rewardPack.id,
    },
  });

  const cappedDistributed = Math.min(derivedDistributed, MVP_REWARD_PACK_TOTAL_SUPPLY);

  const syncedSupply = await prisma.rewardPackSupply.upsert({
    where: { id: MVP_REWARD_PACK_CODE },
    update: {
      totalSupply: MVP_REWARD_PACK_TOTAL_SUPPLY,
      distributed: cappedDistributed,
    },
    create: {
      id: MVP_REWARD_PACK_CODE,
      totalSupply: MVP_REWARD_PACK_TOTAL_SUPPLY,
      distributed: cappedDistributed,
    },
  });

  const rewardDistributed = Math.min(syncedSupply.distributed, MVP_REWARD_PACK_TOTAL_SUPPLY);
  const saleRemaining = Math.max(SALE_TOTAL_SUPPLY - saleDistributed, 0);
  const rewardRemaining = Math.max(MVP_REWARD_PACK_TOTAL_SUPPLY - rewardDistributed, 0);
  const totalDistributed = saleDistributed + rewardDistributed;

  return {
    sale: {
      total: SALE_TOTAL_SUPPLY,
      distributed: saleDistributed,
      remaining: saleRemaining,
    },
    reward: {
      total: MVP_REWARD_PACK_TOTAL_SUPPLY,
      distributed: rewardDistributed,
      remaining: rewardRemaining,
    },
    total: {
      total: SALE_TOTAL_SUPPLY + MVP_REWARD_PACK_TOTAL_SUPPLY,
      distributed: totalDistributed,
      remaining: Math.max(SALE_TOTAL_SUPPLY + MVP_REWARD_PACK_TOTAL_SUPPLY - totalDistributed, 0),
    },
    last_updated_at: syncedSupply.lastUpdatedAt.toISOString(),
  };
}
