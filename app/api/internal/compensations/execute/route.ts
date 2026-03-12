import { NextRequest, NextResponse } from "next/server";

import { ADMIN_ROLES, claimIdempotencyKey, getAdminArtifact, requireAdminRole, safeLogAdminAction } from "@/lib/admin-ops";
import { handleApiError } from "@/lib/api-error";
import { grantManualPointsMvp, ManualGrantError } from "@/lib/domain/rewards/manual-grants";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function POST(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  const roleCheck = requireAdminRole(auth, [ADMIN_ROLES.ADMIN_FINANCE_OPS, ADMIN_ROLES.ADMIN_SUPERVISOR]);
  if (!roleCheck.ok) {
    return NextResponse.json({ ok: false, error: roleCheck.error }, { status: roleCheck.status });
  }
  const actor = roleCheck.actor;

  try {
    const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
    if (!idempotencyKey) {
      return NextResponse.json({ ok: false, error: "Idempotency-Key header is required" }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as { validationToken?: string; note?: string } | null;
    const validationToken = body?.validationToken?.trim() ?? "";
    if (!validationToken) {
      return NextResponse.json({ ok: false, error: "validationToken is required" }, { status: 400 });
    }

    const token = await getAdminArtifact(validationToken, "compensation_preview");
    if (!token) {
      return NextResponse.json({ ok: false, error: "Compensation token not found" }, { status: 404 });
    }

    if (token.createdBy !== actor.id) {
      return NextResponse.json({ ok: false, error: "validationToken was created by another actor" }, { status: 403 });
    }

    const idem = await claimIdempotencyKey({
      idempotencyKey,
      actionType: "COMPENSATION_EXECUTE",
      actorId: actor.id,
      targetType: "USER",
      targetId: token.targetId ?? undefined,
    });
    if (!idem.claimed) {
      return NextResponse.json({ ok: false, error: "Duplicate idempotency key", code: "IDEMPOTENCY_REPLAY" }, { status: 409 });
    }

    const payload = token.payload as { userId?: string; amount?: number; reasonLabel?: string; reasonCode?: string };

    const result = await grantManualPointsMvp({
      userId: payload.userId,
      amount: payload.amount,
      reasonLabel: payload.reasonLabel,
      reasonCode: payload.reasonCode,
      idempotencyKey,
      grantedByAdmin: actor.label,
      metadata: {
        validationToken,
        note: body?.note ?? null,
      },
    });

    await safeLogAdminAction({
      actionType: "COMPENSATION_EXECUTE",
      module: "REWARDS",
      status: "EXECUTED",
      actor: actor,
      targetType: "USER",
      targetId: payload.userId,
      requestSummary: { validationToken, amount: payload.amount, reasonCode: payload.reasonCode },
      effectSummary: { applied: result.applied, ledgerEntryId: result.entry.id },
    });

    return NextResponse.json({
      ok: true,
      receipt: {
        actionId: result.entry.id,
        actionType: "COMPENSATION_EXECUTE",
        status: "COMPLETED",
        idempotencyKey,
        idempotentReplay: result.applied === false,
        actor: actor,
        summary: {
          userId: payload.userId,
          pointsDelta: payload.amount,
          ledgerEntryId: result.entry.id,
        },
      },
    });
  } catch (error) {
    if (error instanceof ManualGrantError) {
      await safeLogAdminAction({
        actionType: "COMPENSATION_EXECUTE",
        module: "REWARDS",
        status: "FAILED",
        actor: actor,
        errorCode: "COMPENSATION_EXECUTE_FAILED",
        errorMessage: error.message,
      });
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    return handleApiError(error, "Cannot execute compensation");
  }
}
