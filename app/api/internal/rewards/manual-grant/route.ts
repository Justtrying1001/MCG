import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import {
  grantManualPointsMvp,
  listRecentManualGrantsMvp,
  ManualGrantError,
} from "@/lib/domain/rewards/manual-grants";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function GET(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const rows = await listRecentManualGrantsMvp(100);
    return NextResponse.json({
      grants: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        user: row.user,
        amount: row.amount,
        reasonRef: row.reasonRef,
        metadata: row.metadata,
        idempotencyKey: row.idempotencyKey,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error, "Cannot load manual grants");
  }
}

export async function POST(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => null);
    const result = await grantManualPointsMvp({
      ...(body ?? {}),
      grantedByAdmin: auth.mode,
    });

    return NextResponse.json({
      applied: result.applied,
      user: result.user,
      entry: {
        ...result.entry,
        createdAt: result.entry.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ManualGrantError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot apply manual grant");
  }
}
