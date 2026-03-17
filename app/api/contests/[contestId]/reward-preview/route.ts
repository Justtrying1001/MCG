import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { computeRewards, type ContestRewardConfig } from "@/lib/domain/contests/reward-distribution";

type RewardTier = {
  label: string;
  bundleName: string;
  pointsAmount: number;
  xpAmount: number;
  packsCount: number;
};

function parseRewardConfig(value: unknown): ContestRewardConfig | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const pointsPool = Number(raw.pointsPool);
  const packPool = Number(raw.packPool);
  const rewardedTopPercent = Number(raw.rewardedTopPercent);
  const distributionProfile = raw.distributionProfile;

  if (!Number.isFinite(pointsPool) || !Number.isFinite(packPool) || !Number.isFinite(rewardedTopPercent)) return null;
  if (distributionProfile !== "balanced" && distributionProfile !== "top-heavy" && distributionProfile !== "very-top-heavy") return null;

  return {
    pointsPool: Math.max(0, Math.floor(pointsPool)),
    packPool: Math.max(0, Math.floor(packPool)),
    rewardedTopPercent: Math.max(1, Math.min(100, Math.floor(rewardedTopPercent))),
    distributionProfile,
  };
}

export async function GET(_request: Request, { params }: { params: { contestId: string } }) {
  try {
    const contest = await prisma.contest.findUnique({
      where: { id: params.contestId },
      select: {
        id: true,
        _count: { select: { entries: true } },
        rules: { orderBy: { id: "asc" }, take: 1, select: { config: true } },
      },
    });

    if (!contest) {
      return NextResponse.json({ hasPolicyData: false, tiers: [] });
    }

    const rewardConfig = parseRewardConfig((contest.rules[0]?.config as Record<string, unknown> | null)?.rewardConfig);
    if (rewardConfig) {
      const participantsCount = Math.max(0, contest._count.entries);
      const ranking = Array.from({ length: participantsCount }, (_, index) => `rank-${index + 1}`);
      const computed = computeRewards({ participantsCount, ranking, config: rewardConfig });

      const tiers: RewardTier[] = computed.map((reward) => ({
        label: `Rank #${reward.rank}`,
        bundleName: "Simple pool",
        pointsAmount: reward.pointsReward,
        xpAmount: 0,
        packsCount: reward.packsReward,
      }));

      return NextResponse.json({
        hasPolicyData: true,
        tiers,
        summary: {
          pointsPool: rewardConfig.pointsPool,
          packPool: rewardConfig.packPool,
          rewardedTopPercent: rewardConfig.rewardedTopPercent,
          rewardedWinners: tiers.length,
          participantCount: participantsCount,
        },
      });
    }

    const policy = await prisma.contestRewardPolicy.findUnique({
      where: { contestId: params.contestId },
      include: {
        bundles: { include: { components: true } },
        distributionRules: { orderBy: [{ priority: "asc" }, { id: "asc" }] },
      },
    });

    if (!policy || policy.status !== "PUBLISHED") {
      return NextResponse.json({ hasPolicyData: false, tiers: [] });
    }

    const bundleById = new Map(policy.bundles.map((b) => [b.id, b]));

    const tiers: RewardTier[] = policy.distributionRules.map((rule) => {
      const bundle = bundleById.get(rule.bundleId);
      const components = bundle?.components ?? [];

      let label = "";
      if (rule.ruleType === "FIXED_RANKS") {
        label = rule.rankFrom === rule.rankTo ? `Rank #${rule.rankFrom}` : `Ranks #${rule.rankFrom}–#${rule.rankTo}`;
      } else if (rule.ruleType === "TOP_N") {
        label = `Top ${rule.topN}`;
      } else if (rule.ruleType === "TOP_PERCENT") {
        label = `Top ${rule.topPercent}%`;
      }

      const pointsAmount = components.filter((c) => c.type === "POINTS").reduce((sum, c) => sum + (c.pointsAmount ?? 0), 0);
      const xpAmount = components.filter((c) => c.type === "XP").reduce((sum, c) => sum + (c.xpAmount ?? 0), 0);
      const packsCount = components.filter((c) => c.type === "PACK").reduce((sum, c) => sum + (c.packQuantity ?? 0), 0);

      return { label, bundleName: bundle?.name ?? "", pointsAmount, xpAmount, packsCount };
    });

    return NextResponse.json({ hasPolicyData: true, tiers });
  } catch (error) {
    return handleApiError(error, "Cannot load reward preview");
  }
}
