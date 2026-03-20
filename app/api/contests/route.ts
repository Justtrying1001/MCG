import type { ContestListItem } from "@/components/contests/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getSessionUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { listContestsMvp } from "@/lib/domain/contests/runtime";

type RewardPreviewModel = {
  label: string;
  amount: number | null;
};

function buildRewardPreview(input: {
  pointsPool: number;
  packPool: number;
  rewardedTopPercent: number;
}): RewardPreviewModel {
  const hasPoints = input.pointsPool > 0;
  const hasPacks = input.packPool > 0;

  if (hasPoints && hasPacks) {
    return {
      label: `Top ${input.rewardedTopPercent}% earn ${input.pointsPool.toLocaleString()} pts + packs`,
      amount: input.pointsPool,
    };
  }

  if (hasPoints) {
    return {
      label: `Points pool: ${input.pointsPool.toLocaleString()} pts`,
      amount: input.pointsPool,
    };
  }

  if (hasPacks) {
    return {
      label: `Top ${input.rewardedTopPercent}% earn pack rewards`,
      amount: null,
    };
  }

  return { label: "Rewards configured", amount: null };
}

export async function GET() {
  try {
    const user = await getSessionUser();

    const contests = await listContestsMvp();

    const userEntries = user
      ? await prisma.contestEntry.findMany({
          where: { userId: user.id, contestId: { in: contests.map((contest) => contest.id) } },
          select: { id: true, contestId: true, status: true },
        })
      : [];
    const entryByContestId = new Map(userEntries.map((entry) => [entry.contestId, entry]));

    const meta = await prisma.contest.findMany({
      where: { id: { in: contests.map((contest) => contest.id) } },
      select: {
        id: true,
        season: { select: { name: true } },
        rewardPolicy: {
          select: {
            status: true,
            bundles: {
              select: {
                components: {
                  select: { type: true, pointsAmount: true, packQuantity: true },
                },
              },
            },
          },
        },
        rules: {
          orderBy: { id: "asc" },
          take: 1,
          select: { config: true },
        },
      },
    });

    const seasonByContestId = new Map(meta.map((row) => [row.id, row.season?.name ?? null]));
    const ruleConfigByContestId = new Map(meta.map((row) => [row.id, (row.rules[0]?.config ?? null) as Record<string, unknown> | null]));
    const rewardByContestId = new Map<string, RewardPreviewModel>();

    for (const row of meta) {
      const rawConfig = ruleConfigByContestId.get(row.id) ?? null;
      const rewardConfig = rawConfig?.rewardConfig as Record<string, unknown> | undefined;
      const pointsPool = Math.max(0, Number(rewardConfig?.pointsPool ?? 0) || 0);
      const packPool = Math.max(0, Number(rewardConfig?.packPool ?? 0) || 0);
      const rewardedTopPercent = Math.max(1, Math.min(100, Number(rewardConfig?.rewardedTopPercent ?? 25) || 25));

      if (pointsPool > 0 || packPool > 0) {
        rewardByContestId.set(row.id, buildRewardPreview({ pointsPool, packPool, rewardedTopPercent }));
        continue;
      }

      if (row.rewardPolicy?.status === "PUBLISHED") {
        const components = row.rewardPolicy.bundles.flatMap((bundle) => bundle.components);
        const points = components.reduce((sum, component) => sum + (component.type === "POINTS" ? component.pointsAmount ?? 0 : 0), 0);
        const packs = components.reduce((sum, component) => sum + (component.type === "PACK" ? component.packQuantity ?? 0 : 0), 0);

        rewardByContestId.set(
          row.id,
          points > 0
            ? { label: `Top rewards include ${points.toLocaleString()} pts`, amount: points }
            : packs > 0
              ? { label: "Pack rewards configured", amount: null }
              : { label: "Rewards configured", amount: null }
        );
      }
    }

    const safeContests = contests.map((contest) => {
      const userEntry = entryByContestId.get(contest.id);
      return {
        id: contest.id,
        code: contest.code,
        title: contest.title,
        status: contest.status,
        liveAt: contest.liveAt,
        lockAt: contest.lockAt,
        endsAt: contest.endsAt,
        rules: Array.isArray(contest.rules)
          ? contest.rules.map((rule, index) => ({
              id: rule.id,
              cardSetId: rule.cardSetId ?? null,
              maxRosterSize: rule.maxRosterSize ?? null,
              entryFeeEnabled: rule.entryFeeEnabled ?? false,
              entryFeeAmount: rule.entryFeeAmount ?? null,
              config: index === 0 ? (ruleConfigByContestId.get(contest.id) as ContestListItem["rules"][number]["config"] ?? null) : null,
            }))
          : [],
        _count: { entries: contest._count.entries },
        leagueTierRequired: contest.leagueTierRequired ?? null,
        seasonName: seasonByContestId.get(contest.id) ?? null,
        rewardPreview: rewardByContestId.get(contest.id) ?? { label: "Rewards configured", amount: null },
        userEntry: userEntry
          ? {
              id: userEntry.id,
              status: userEntry.status,
            }
          : null,
      };
    });

    return NextResponse.json({ contests: safeContests });
  } catch (error) {
    return handleApiError(error, "Cannot load contests");
  }
}
