import { RewardType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { ADMIN_ROLES, getAdminArtifact, requireAdminRole } from "@/lib/admin-ops";
import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: { contestId: string; planId: string } }) {
  const auth = requireInternalAdminAccess(request);
  const roleCheck = requireAdminRole(auth, [ADMIN_ROLES.ADMIN_OPS, ADMIN_ROLES.ADMIN_SUPERVISOR]);
  if (!roleCheck.ok) {
    return NextResponse.json({ ok: false, error: roleCheck.error }, { status: roleCheck.status });
  }
  const actor = roleCheck.actor;

  try {
    const artifact = await getAdminArtifact(params.planId, "contest_settlement_plan");
    if (!artifact || artifact.targetId !== params.contestId) {
      return NextResponse.json({ ok: false, error: "Settlement plan not found" }, { status: 404 });
    }

    const payload = artifact.payload as { rewards?: Array<{ userId: string; type: RewardType; amount?: number; packDefinitionId?: string }> };
    const rewards = Array.isArray(payload?.rewards) ? payload.rewards : [];

    const userIds = [...new Set(rewards.map((row) => row.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true, handle: true, points: true },
    });
    const userMap = new Map(users.map((user) => [user.id, user]));

    const perUser = rewards.map((row) => {
      const user = userMap.get(row.userId);
      return {
        userId: row.userId,
        displayName: user?.displayName ?? row.userId,
        rewardComponents: [
          {
            type: row.type,
            ...(row.amount !== undefined ? { amount: row.amount } : {}),
            ...(row.packDefinitionId ? { packDefinitionId: row.packDefinitionId } : {}),
          },
        ],
        pointsDelta: row.type === RewardType.POINTS ? (row.amount ?? 0) : 0,
      };
    });

    return NextResponse.json({
      ok: true,
      contestId: params.contestId,
      planId: params.planId,
      preview: {
        perUser,
        totals: {
          usersCount: userIds.length,
          pointsCreditTotal: perUser.reduce((sum, row) => sum + row.pointsDelta, 0),
          rewardActionsCount: rewards.length,
        },
        accounting: {
          ledgerCreditsToCreate: rewards.filter((row) => row.type === RewardType.POINTS).length,
          grantRowsToCreate: rewards.length,
        },
        warnings: [],
      },
    });
  } catch (error) {
    return handleApiError(error, "Cannot load settlement preview");
  }
}
