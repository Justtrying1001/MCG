import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { type ContestRewardConfig } from "@/lib/domain/contests/reward-distribution";
import { buildContestRewardPlanItems, type RewardPlanBundleLike, type RewardPlanRuleLike } from "@/lib/domain/contests/reward-plan";

type RewardTier = {
  label: string;
  bundleName: string;
  pointsAmount: number;
  xpAmount: number;
  packsCount: number;
  winnerLabel?: string | null;
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
        rankings: {
          orderBy: [{ rank: "asc" }],
          select: { rank: true, userId: true, user: { select: { displayName: true } } },
        },
        rewardPolicy: {
          select: {
            status: true,
            bundles: { include: { components: true } },
            distributionRules: { orderBy: [{ priority: "asc" }, { id: "asc" }] },
          },
        },
      },
    });

    if (!contest) {
      return NextResponse.json({ hasPolicyData: false, tiers: [] });
    }

    const participantCount = Math.max(0, contest._count.entries);
    const rewardConfig = parseRewardConfig((contest.rules[0]?.config as Record<string, unknown> | null)?.rewardConfig);
    const policy = contest.rewardPolicy;
    const rules = (policy?.distributionRules ?? []) as unknown as RewardPlanRuleLike[];
    const bundles = (policy?.bundles ?? []) as unknown as RewardPlanBundleLike[];

    if (!rewardConfig && (!policy || policy.status !== "PUBLISHED" || rules.length === 0 || bundles.length === 0)) {
      return NextResponse.json({ hasPolicyData: false, tiers: [] });
    }

    const rows = buildContestRewardPlanItems({
      participantCount,
      rankingRows: contest.rankings.map((row) => ({ userId: row.userId, rank: row.rank, displayName: row.user.displayName })),
      rewardConfig,
      rules,
      bundles,
      defaultPackDefinitionId: null,
    });

    const tiers: RewardTier[] = rows.map((row) => ({
      label: `Rank #${row.rank}`,
      bundleName: row.sourceBundleName ?? (rewardConfig ? "Simple pool" : "Reward tier"),
      pointsAmount: row.pointsTotal,
      xpAmount: row.xpTotal,
      packsCount: row.packsTotal,
      winnerLabel: row.displayName ?? null,
    }));

    return NextResponse.json({
      hasPolicyData: true,
      tiers,
      summary: rewardConfig
        ? {
            pointsPool: rewardConfig.pointsPool,
            packPool: rewardConfig.packPool,
            rewardedTopPercent: rewardConfig.rewardedTopPercent,
            rewardedWinners: tiers.length,
            participantCount,
          }
        : null,
    });
  } catch (error) {
    return handleApiError(error, "Cannot load reward preview");
  }
}
