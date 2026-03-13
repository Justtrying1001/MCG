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
    const cardSets = await prisma.cardSet.findMany({
      select: { id: true, code: true, displayName: true, isActive: true },
      orderBy: [{ isActive: "desc" }, { displayName: "asc" }],
      take: 100,
    });
    return NextResponse.json({ ok: true, cardSets });
  } catch (error) {
    return handleApiError(error, "Cannot load card sets");
  }
}
