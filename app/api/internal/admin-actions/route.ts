import { AdminActionStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "50");
    const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

    const statusRaw = request.nextUrl.searchParams.get("status");
    const parsedStatus = statusRaw && Object.values(AdminActionStatus).includes(statusRaw as AdminActionStatus)
      ? statusRaw as AdminActionStatus
      : undefined;

    const where = {
      ...(request.nextUrl.searchParams.get("module") ? { module: request.nextUrl.searchParams.get("module") ?? undefined } : {}),
      ...(request.nextUrl.searchParams.get("actionType") ? { actionType: request.nextUrl.searchParams.get("actionType") ?? undefined } : {}),
      ...(parsedStatus ? { status: parsedStatus } : {}),
      ...(request.nextUrl.searchParams.get("targetType") ? { targetType: request.nextUrl.searchParams.get("targetType") ?? undefined } : {}),
      ...(request.nextUrl.searchParams.get("targetId") ? { targetId: request.nextUrl.searchParams.get("targetId") ?? undefined } : {}),
    };

    const rows = await prisma.adminActionLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: limit,
    });

    return NextResponse.json({
      ok: true,
      items: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error, "Cannot load admin actions");
  }
}
