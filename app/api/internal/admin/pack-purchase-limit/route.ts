import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AdminActionStatus } from "@prisma/client";

import { ADMIN_ROLES, requireAdminRole, safeLogAdminAction } from "@/lib/admin-ops";
import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { getPackPurchaseLimitAdminSummary, updatePackPurchaseLimitAdminSummary } from "@/lib/domain/acquisition/purchase-limit-admin";

export async function GET(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  const roleCheck = requireAdminRole(auth, [ADMIN_ROLES.ADMIN_OPS, ADMIN_ROLES.ADMIN_SUPERVISOR]);
  if (!roleCheck.ok) {
    return NextResponse.json({ ok: false, error: roleCheck.error }, { status: roleCheck.status });
  }

  try {
    const summary = await getPackPurchaseLimitAdminSummary();
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    return handleApiError(error, "Cannot load pack purchase limit settings");
  }
}

export async function PATCH(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  const roleCheck = requireAdminRole(auth, [ADMIN_ROLES.ADMIN_OPS, ADMIN_ROLES.ADMIN_SUPERVISOR]);
  if (!roleCheck.ok) {
    return NextResponse.json({ ok: false, error: roleCheck.error }, { status: roleCheck.status });
  }

  let body: unknown = null;
  try {
    body = await request.json().catch(() => null);
    const summary = await updatePackPurchaseLimitAdminSummary(body);
    await safeLogAdminAction({
      actionType: "pack_purchase_limit.update",
      module: "economy",
      status: AdminActionStatus.EXECUTED,
      actor: roleCheck.actor,
      targetType: "runtime_config",
      targetId: "pack_purchase_limit",
      requestSummary: (body ?? {}) as import("@prisma/client").Prisma.InputJsonValue,
      effectSummary: summary.config as import("@prisma/client").Prisma.InputJsonValue,
    });
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    await safeLogAdminAction({
      actionType: "pack_purchase_limit.update",
      module: "economy",
      status: AdminActionStatus.FAILED,
      actor: roleCheck.actor,
      targetType: "runtime_config",
      targetId: "pack_purchase_limit",
      requestSummary: (body && typeof body === "object" && !Array.isArray(body) ? body : {}) as import("@prisma/client").Prisma.InputJsonValue,
      errorCode: error instanceof ZodError ? "VALIDATION_ERROR" : "UPDATE_FAILED",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    if (error instanceof ZodError) {
      return NextResponse.json({ ok: false, error: error.issues[0]?.message ?? "Invalid settings payload" }, { status: 400 });
    }

    return handleApiError(error, "Cannot update pack purchase limit settings");
  }
}
