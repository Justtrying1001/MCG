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
    const packDefinitions = await prisma.packDefinition.findMany({
      where: { source: "REWARD" },
      select: { id: true, code: true, source: true, plannedPackCount: true },
      orderBy: [{ code: "asc" }],
      take: 200,
    });

    return NextResponse.json({ ok: true, packDefinitions });
  } catch (error) {
    return handleApiError(error, "Cannot load pack definitions");
  }
}
