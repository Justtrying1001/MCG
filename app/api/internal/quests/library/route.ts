import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { listInternalQuestsMvp } from "@/lib/domain/quests/runtime";
import { requireInternalAdminAccess } from "@/lib/internal-auth";

export async function GET(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const quests = await listInternalQuestsMvp();

    return NextResponse.json({
      ok: true,
      quests: quests.map((quest) => ({
        id: quest.id,
        code: quest.code,
        title: quest.title,
        type: quest.type,
        validationMode: quest.validationMode,
        rewardPoints: quest.rewardPoints,
        rewardPackDefinitionId: quest.rewardPackDefinitionId,
        rewardPackQuantity: quest.rewardPackQuantity,
        rewardPackDefinitionCode: (quest as { rewardPackDefinitionCode?: string | null }).rewardPackDefinitionCode ?? null,
        isActive: quest.isActive,
        startAt: quest.startAt?.toISOString() ?? null,
        endAt: quest.endAt?.toISOString() ?? null,
        lifecycleStatus:
          quest.config && typeof quest.config === "object" && !Array.isArray(quest.config)
            ? ((quest.config as Record<string, unknown>).lifecycleStatus ?? "ACTIVE")
            : "ACTIVE",
        analytics: quest.analytics,
        config: quest.config,
      })),
    });
  } catch (error) {
    return handleApiError(error, "Cannot load quest library");
  }
}
