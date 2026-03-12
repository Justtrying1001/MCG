import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import {
  grantRewardPackMvp,
  listRecentRewardPackGrantsMvp,
  RewardPackGrantError,
} from "@/lib/domain/rewards/reward-pack-grants";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function GET(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const rows = await listRecentRewardPackGrantsMvp(100);
    return NextResponse.json({
      grants: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        user: row.user,
        packDefinition: row.packDefinition,
        openingEventId: row.sourcePackOpeningEvent?.id ?? null,
        openedAt: row.sourcePackOpeningEvent?.openedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error, "Cannot load reward pack grants");
  }
}

export async function POST(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => null);
    const result = await grantRewardPackMvp({
      ...(body ?? {}),
    });

    return NextResponse.json({
      mode: result.mode,
      packCode: result.packCode,
      rewardGrantId: result.rewardGrantId,
      openingEventId: result.openingEventId,
      pulledCardsMvp: result.pulledCardsMvp,
      user: result.user,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof RewardPackGrantError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot grant reward pack");
  }
}
