import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

function campaignKeyFromQuestCode(code: string) {
  if (code.includes(":")) return code.split(":")[0];
  if (code.includes("_")) return code.split("_")[0];
  return "GENERAL";
}

export async function GET(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const quests = await prisma.questDefinition.findMany({
      select: {
        id: true,
        code: true,
        title: true,
        isActive: true,
        startAt: true,
        endAt: true,
      },
      orderBy: [{ createdAt: "desc" }],
      take: 500,
    });

    const grouped = new Map<string, {
      code: string;
      name: string;
      startAt: Date | null;
      endAt: Date | null;
      activeQuests: number;
      questCount: number;
      questIds: string[];
    }>();

    for (const quest of quests) {
      const key = campaignKeyFromQuestCode(quest.code);
      const existing = grouped.get(key) ?? {
        code: key,
        name: key.replace(/[_-]/g, " "),
        startAt: null,
        endAt: null,
        activeQuests: 0,
        questCount: 0,
        questIds: [],
      };

      existing.questCount += 1;
      existing.questIds.push(quest.id);
      if (quest.isActive) existing.activeQuests += 1;
      if (!existing.startAt || (quest.startAt && quest.startAt < existing.startAt)) existing.startAt = quest.startAt;
      if (!existing.endAt || (quest.endAt && quest.endAt > existing.endAt)) existing.endAt = quest.endAt;

      grouped.set(key, existing);
    }

    return NextResponse.json({
      ok: true,
      campaigns: [...grouped.values()].map((campaign) => ({
        ...campaign,
        startAt: campaign.startAt?.toISOString() ?? null,
        endAt: campaign.endAt?.toISOString() ?? null,
        status: campaign.activeQuests > 0 ? "ACTIVE" : "INACTIVE",
      })),
    });
  } catch (error) {
    return handleApiError(error, "Cannot load campaigns catalog");
  }
}
