import { PackSource, RewardType } from "@prisma/client";

import { MVP_REWARD_PACK_CODE, MVP_REWARD_PACK_TOTAL_SUPPLY } from "@/lib/domain/acquisition/constants";
import { prisma } from "@/lib/prisma";

type SalePoolRow = {
  packDefinitionId: string;
  packCode: string;
  displayName: string;
  totalSupply: number;
  opened: number;
  remaining: number;
  isActive: boolean;
};

type RewardPoolRow = {
  packDefinitionId: string;
  packCode: string;
  displayName: string;
  totalSupply: number;
  attributed: number;
  claimed: number;
  reserved: number;
  remaining: number;
  isActive: boolean;
  poolStatus: "TRACKED" | "MISSING_POOL";
};

export async function getPackSupplySummary() {
  const [saleDefinitions, rewardDefinitions, attributedRows, claimedRows, trackedPools] = await Promise.all([
    prisma.packDefinition.findMany({
      where: { source: PackSource.SALE },
      orderBy: [{ code: "asc" }],
      select: {
        id: true,
        code: true,
        displayName: true,
        plannedPackCount: true,
        openedPackCount: true,
        isActive: true,
      },
    }),
    prisma.packDefinition.findMany({
      where: { source: PackSource.REWARD },
      orderBy: [{ code: "asc" }],
      select: {
        id: true,
        code: true,
        displayName: true,
        plannedPackCount: true,
        isActive: true,
      },
    }),
    prisma.rewardGrant.groupBy({
      by: ["packDefinitionId"],
      where: {
        type: RewardType.PACK,
        packDefinition: { source: PackSource.REWARD },
        packDefinitionId: { not: null },
      },
      _count: { _all: true },
    }),
    prisma.rewardGrant.groupBy({
      by: ["packDefinitionId"],
      where: {
        type: RewardType.PACK,
        packDefinition: { source: PackSource.REWARD },
        packDefinitionId: { not: null },
        OR: [{ claimedAt: { not: null } }, { sourcePackOpeningEventId: { not: null } }],
      },
      _count: { _all: true },
    }),
    prisma.rewardPackSupply.findMany({
      select: {
        id: true,
        totalSupply: true,
      },
    }),
  ]);

  const attributedByPack = new Map<string, number>(
    attributedRows
      .filter((row): row is typeof row & { packDefinitionId: string } => Boolean(row.packDefinitionId))
      .map((row) => [row.packDefinitionId, row._count._all]),
  );
  const claimedByPack = new Map<string, number>(
    claimedRows
      .filter((row): row is typeof row & { packDefinitionId: string } => Boolean(row.packDefinitionId))
      .map((row) => [row.packDefinitionId, row._count._all]),
  );
  const trackedPoolByCode = new Map(trackedPools.map((pool) => [pool.id, pool]));

  const salePools: SalePoolRow[] = saleDefinitions.map((definition) => {
    const totalSupply = Math.max(definition.plannedPackCount, 0);
    const opened = Math.max(Math.min(definition.openedPackCount, totalSupply), 0);

    return {
      packDefinitionId: definition.id,
      packCode: definition.code,
      displayName: definition.displayName,
      totalSupply,
      opened,
      remaining: Math.max(totalSupply - opened, 0),
      isActive: definition.isActive,
    };
  });

  const rewardPools: RewardPoolRow[] = rewardDefinitions.map((definition) => {
    const tracked = trackedPoolByCode.get(definition.code);
    const fallbackTotal = definition.code === MVP_REWARD_PACK_CODE ? MVP_REWARD_PACK_TOTAL_SUPPLY : Math.max(definition.plannedPackCount, 0);
    const totalSupply = tracked?.totalSupply ?? fallbackTotal;
    const attributed = Math.min(attributedByPack.get(definition.id) ?? 0, totalSupply);
    const claimed = Math.min(claimedByPack.get(definition.id) ?? 0, attributed);
    const reserved = Math.max(attributed - claimed, 0);

    return {
      packDefinitionId: definition.id,
      packCode: definition.code,
      displayName: definition.displayName,
      totalSupply,
      attributed,
      claimed,
      reserved,
      remaining: Math.max(totalSupply - attributed, 0),
      isActive: definition.isActive,
      poolStatus: tracked ? "TRACKED" : "MISSING_POOL",
    };
  });

  const saleAggregate = salePools.reduce(
    (acc, row) => ({
      totalSupply: acc.totalSupply + row.totalSupply,
      opened: acc.opened + row.opened,
      remaining: acc.remaining + row.remaining,
    }),
    { totalSupply: 0, opened: 0, remaining: 0 },
  );

  const rewardAggregate = rewardPools.reduce(
    (acc, row) => ({
      totalSupply: acc.totalSupply + row.totalSupply,
      attributed: acc.attributed + row.attributed,
      claimed: acc.claimed + row.claimed,
      reserved: acc.reserved + row.reserved,
      remaining: acc.remaining + row.remaining,
    }),
    { totalSupply: 0, attributed: 0, claimed: 0, reserved: 0, remaining: 0 },
  );

  return {
    sale: {
      totalSupply: saleAggregate.totalSupply,
      opened: saleAggregate.opened,
      remaining: saleAggregate.remaining,
      pools: salePools,
    },
    reward: {
      totalSupply: rewardAggregate.totalSupply,
      attributed: rewardAggregate.attributed,
      claimed: rewardAggregate.claimed,
      reserved: rewardAggregate.reserved,
      remaining: rewardAggregate.remaining,
      pools: rewardPools,
    },
    global: {
      totalSupply: saleAggregate.totalSupply + rewardAggregate.totalSupply,
      saleOpened: saleAggregate.opened,
      rewardAttributed: rewardAggregate.attributed,
      rewardClaimed: rewardAggregate.claimed,
      rewardReserved: rewardAggregate.reserved,
      remaining: saleAggregate.remaining + rewardAggregate.remaining,
    },
    lastUpdatedAt: new Date().toISOString(),
  };
}
