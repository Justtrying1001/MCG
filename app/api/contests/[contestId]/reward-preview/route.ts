import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getSessionUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: { contestId: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const policy = await prisma.contestRewardPolicy.findUnique({
      where: { contestId: params.contestId },
      include: {
        bundles: { include: { components: true } },
        distributionRules: { orderBy: [{ priority: "asc" }, { id: "asc" }] },
      },
    });

    if (!policy || policy.status !== "PUBLISHED") {
      return NextResponse.json({ hasPolicyData: false, tiers: [] });
    }

    const bundleById = new Map(policy.bundles.map((b) => [b.id, b]));

    const tiers = policy.distributionRules.map((rule) => {
      const bundle = bundleById.get(rule.bundleId);
      const components = bundle?.components ?? [];

      let label = "";
      if (rule.ruleType === "FIXED_RANKS") {
        label = rule.rankFrom === rule.rankTo
          ? `Rank #${rule.rankFrom}`
          : `Ranks #${rule.rankFrom}–#${rule.rankTo}`;
      } else if (rule.ruleType === "TOP_N") {
        label = `Top ${rule.topN}`;
      } else if (rule.ruleType === "TOP_PERCENT") {
        label = `Top ${rule.topPercent}%`;
      }

      const pointsAmount = components.filter((c) => c.type === "POINTS").reduce((sum, c) => sum + (c.pointsAmount ?? 0), 0);
      const xpAmount = components.filter((c) => c.type === "XP").reduce((sum, c) => sum + (c.xpAmount ?? 0), 0);
      const packsCount = components.filter((c) => c.type === "PACK").reduce((sum, c) => sum + (c.packQuantity ?? 0), 0);

      return { label, bundleName: bundle?.name ?? "", pointsAmount, xpAmount, packsCount };
    });

    return NextResponse.json({ hasPolicyData: true, tiers });
  } catch (error) {
    return handleApiError(error, "Cannot load reward preview");
  }
}
