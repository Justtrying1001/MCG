import { NextRequest, NextResponse } from "next/server";

import { ADMIN_ROLES, requireAdminRole, safeLogAdminAction } from "@/lib/admin-ops";
import { handleApiError } from "@/lib/api-error";
import {
  grantManualPointsMvp,
  listRecentManualGrantsMvp,
  ManualGrantError,
} from "@/lib/domain/rewards/manual-grants";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function GET(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  const roleCheck = requireAdminRole(auth, [ADMIN_ROLES.ADMIN_FINANCE_OPS, ADMIN_ROLES.ADMIN_SUPERVISOR]);
  if (!roleCheck.ok) {
    return NextResponse.json({ ok: false, error: roleCheck.error }, { status: roleCheck.status });
  }
  const actor = roleCheck.actor;


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
  const roleCheck = requireAdminRole(auth, [ADMIN_ROLES.ADMIN_FINANCE_OPS, ADMIN_ROLES.ADMIN_SUPERVISOR]);
  if (!roleCheck.ok) {
    return NextResponse.json({ ok: false, error: roleCheck.error }, { status: roleCheck.status });
  }
  const actor = roleCheck.actor;


  try {
    const body = await request.json().catch(() => null);
    const result = await grantManualPointsMvp({
      ...(body ?? {}),
      grantedByAdmin: actor.label,
    });

    await safeLogAdminAction({
      actionType: "MANUAL_GRANT_EXECUTE",
      module: "REWARDS",
      status: "EXECUTED",
      actor: actor,
      targetType: "USER",
      targetId: String((body as { userId?: unknown } | null)?.userId ?? ""),
      requestSummary: {
        amount: (body as { amount?: unknown } | null)?.amount ?? null,
        reasonCode: (body as { reasonCode?: unknown } | null)?.reasonCode ?? null,
      },
      effectSummary: { applied: result.applied, ledgerEntryId: result.entry.id },
    });

    return NextResponse.json({
      applied: result.applied,
      user: result.user,
      entry: {
        ...result.entry,
        createdAt: result.entry.createdAt.toISOString(),
      },
      actor: actor,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ManualGrantError) {
      await safeLogAdminAction({
        actionType: "MANUAL_GRANT_EXECUTE",
        module: "REWARDS",
        status: "FAILED",
        actor: actor,
        errorCode: "MANUAL_GRANT_FAILED",
        errorMessage: error.message,
      });
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot apply manual grant");
  }
}
