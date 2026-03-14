import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { seedMilestoneQuests } from "@/lib/domain/quests/milestone-seed";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const result = await seedMilestoneQuests(prisma);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return handleApiError(error, "Cannot seed milestones");
  }
}
