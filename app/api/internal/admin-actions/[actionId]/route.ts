import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: { actionId: string } }) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const action = await prisma.adminActionLog.findUnique({ where: { id: params.actionId } });
    if (!action) {
      return NextResponse.json({ ok: false, error: "Admin action not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      action: {
        ...action,
        createdAt: action.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return handleApiError(error, "Cannot load admin action");
  }
}
