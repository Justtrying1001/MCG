import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { buildContestRewardPreview, parseRewardConfig, type RewardPreviewTier } from "@/lib/domain/contests/reward-preview";

export async function GET(_request: Request, { params }: { params: { contestId: string } }) {
  try {
    const contest = await prisma.contest.findUnique({
      where: { id: params.contestId },
      select: {
        id: true,
        status: true,
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
      return NextResponse.json({ hasPolicyData: false, tiers: [] as RewardPreviewTier[], summary: null });
    }

    const participantCount = Math.max(0, contest._count.entries);
    const rewardConfig = parseRewardConfig((contest.rules[0]?.config as Record<string, unknown> | null)?.rewardConfig);
    const policy = contest.rewardPolicy;

    return NextResponse.json(buildContestRewardPreview({
      status: contest.status,
      participantCount,
      rankingRows: contest.rankings.map((row) => ({ userId: row.userId, rank: row.rank, displayName: row.user.displayName })),
      rewardConfig,
      rewardPolicyStatus: policy?.status ?? null,
      rules: (policy?.distributionRules ?? []),
      bundles: (policy?.bundles ?? []),
    }));
  } catch (error) {
    return handleApiError(error, "Cannot load reward preview");
  }
}
