import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ─── Types ──────────────────────────────────────────────────────────────────

type PerPackTotal = {
  packDefinitionId: string;
  packCode: string;
  displayName: string;
  totalAttributed: number;
  claimed: number;
  pending: number;
};

type BySourceRow = {
  sourceType: "CONTEST_SETTLEMENT" | "MANUAL_OR_OTHER";
  contestId: string | null;
  contestTitle: string | null;
  contestCode: string | null;
  settlementId: string | null;
  packDefinitionId: string;
  packCode: string;
  count: number;
  claimed: number;
  pending: number;
  firstGrantedAt: string;
  lastGrantedAt: string;
};

type RecentGrant = {
  id: string;
  userId: string;
  userLabel: string;
  packCode: string;
  sourceType: "CONTEST_SETTLEMENT" | "MANUAL_OR_OTHER";
  contestTitle: string | null;
  claimed: boolean;
  claimedAt: string | null;
  grantedAt: string;
};

type RewardPackHistoryPayload = {
  ok: true;
  perPackTotals: PerPackTotal[];
  bySource: BySourceRow[];
  recentGrants: RecentGrant[];
  fetchedAt: string;
};

// ─── Route ──────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const rawLimit = searchParams.get("limit");
  const limit = rawLimit
    ? Math.min(500, Math.max(1, parseInt(rawLimit, 10) || 200))
    : 200;

  try {
    const grants = await prisma.rewardGrant.findMany({
      where: {
        type: "PACK",
        packDefinition: { source: "REWARD" },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        userId: true,
        packDefinitionId: true,
        sourceContestSettlementId: true,
        claimedAt: true,
        createdAt: true,
        packDefinition: {
          select: { code: true, displayName: true, source: true },
        },
        sourceContestSettlement: {
          select: {
            id: true,
            contestId: true,
            contest: { select: { title: true, code: true } },
          },
        },
        user: {
          select: { xUsername: true, displayName: true },
        },
      },
    });

    // ── perPackTotals ─────────────────────────────────────────────────────

    const perPackMap = new Map<
      string,
      { packDefinitionId: string; packCode: string; displayName: string; totalAttributed: number; claimed: number; pending: number }
    >();

    for (const g of grants) {
      if (!g.packDefinitionId || !g.packDefinition) continue;
      const key = g.packDefinitionId;
      const entry = perPackMap.get(key) ?? {
        packDefinitionId: key,
        packCode: g.packDefinition.code,
        displayName: g.packDefinition.displayName,
        totalAttributed: 0,
        claimed: 0,
        pending: 0,
      };
      entry.totalAttributed++;
      if (g.claimedAt) entry.claimed++;
      else entry.pending++;
      perPackMap.set(key, entry);
    }

    const perPackTotals: PerPackTotal[] = Array.from(perPackMap.values());

    // ── bySource ──────────────────────────────────────────────────────────

    type BySourceKey = string;
    const bySourceMap = new Map<
      BySourceKey,
      {
        sourceType: "CONTEST_SETTLEMENT" | "MANUAL_OR_OTHER";
        contestId: string | null;
        contestTitle: string | null;
        contestCode: string | null;
        settlementId: string | null;
        packDefinitionId: string;
        packCode: string;
        count: number;
        claimed: number;
        pending: number;
        firstGrantedAt: Date;
        lastGrantedAt: Date;
      }
    >();

    for (const g of grants) {
      if (!g.packDefinitionId || !g.packDefinition) continue;
      const isContest = g.sourceContestSettlementId !== null;
      const sourceType: "CONTEST_SETTLEMENT" | "MANUAL_OR_OTHER" = isContest
        ? "CONTEST_SETTLEMENT"
        : "MANUAL_OR_OTHER";
      const settlementId = g.sourceContestSettlement?.id ?? null;
      const contestId = g.sourceContestSettlement?.contestId ?? null;
      const contestTitle = g.sourceContestSettlement?.contest?.title ?? null;
      const contestCode = g.sourceContestSettlement?.contest?.code ?? null;
      const key: BySourceKey = `${sourceType}|${settlementId ?? "manual"}|${g.packDefinitionId}`;

      const entry = bySourceMap.get(key) ?? {
        sourceType,
        contestId,
        contestTitle,
        contestCode,
        settlementId,
        packDefinitionId: g.packDefinitionId,
        packCode: g.packDefinition.code,
        count: 0,
        claimed: 0,
        pending: 0,
        firstGrantedAt: g.createdAt,
        lastGrantedAt: g.createdAt,
      };

      entry.count++;
      if (g.claimedAt) entry.claimed++;
      else entry.pending++;
      if (g.createdAt < entry.firstGrantedAt) entry.firstGrantedAt = g.createdAt;
      if (g.createdAt > entry.lastGrantedAt) entry.lastGrantedAt = g.createdAt;

      bySourceMap.set(key, entry);
    }

    const bySource: BySourceRow[] = Array.from(bySourceMap.values()).map((r) => ({
      sourceType: r.sourceType,
      contestId: r.contestId,
      contestTitle: r.contestTitle,
      contestCode: r.contestCode,
      settlementId: r.settlementId,
      packDefinitionId: r.packDefinitionId,
      packCode: r.packCode,
      count: r.count,
      claimed: r.claimed,
      pending: r.pending,
      firstGrantedAt: r.firstGrantedAt.toISOString(),
      lastGrantedAt: r.lastGrantedAt.toISOString(),
    }));

    // ── recentGrants ──────────────────────────────────────────────────────

    const recentGrants: RecentGrant[] = grants.slice(0, 50).map((g) => {
      const userLabel =
        g.user?.displayName || (g.user?.xUsername ? `@${g.user.xUsername}` : g.userId);
      const isContest = g.sourceContestSettlementId !== null;
      return {
        id: g.id,
        userId: g.userId,
        userLabel,
        packCode: g.packDefinition?.code ?? "(unknown)",
        sourceType: isContest ? "CONTEST_SETTLEMENT" : "MANUAL_OR_OTHER",
        contestTitle: g.sourceContestSettlement?.contest?.title ?? null,
        claimed: g.claimedAt !== null,
        claimedAt: g.claimedAt ? g.claimedAt.toISOString() : null,
        grantedAt: g.createdAt.toISOString(),
      };
    });

    const payload: RewardPackHistoryPayload = {
      ok: true,
      perPackTotals,
      bySource,
      recentGrants,
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error, "Cannot load reward pack history");
  }
}
