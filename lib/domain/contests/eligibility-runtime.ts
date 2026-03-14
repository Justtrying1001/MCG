import { ContestEligibilityMode, Prisma } from "@prisma/client";

import { ContestRuntimeError } from "@/lib/domain/contests/runtime";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

export type EligibleToken = {
  tokenProjectId: string;
  slug: string;
  coingeckoId: string | null;
};

export async function resolveEligibleTokensForContest(contestId: string, tx?: Tx): Promise<EligibleToken[]> {
  const db = tx ?? prisma;

  const contest = await db.contest.findUnique({
    where: { id: contestId },
    include: {
      rules: {
        take: 1,
        orderBy: { id: "asc" },
      },
    },
  });

  if (!contest) throw new ContestRuntimeError("Contest not found", 404);

  const rule = contest.rules[0];
  const eligibilityMode = rule?.eligibilityMode ?? ContestEligibilityMode.ANY;

  if (eligibilityMode === ContestEligibilityMode.CARD_SET_ONLY) {
    if (!rule?.cardSetId) {
      throw new ContestRuntimeError("cardSetId is required for CARD_SET_ONLY eligibility", 409);
    }

    const templates = await db.cardTemplate.findMany({
      where: {
        isActive: true,
        cardSetId: rule.cardSetId,
        tokenProject: { isActive: true },
      },
      select: {
        tokenProjectId: true,
        metadata: true,
        tokenProject: { select: { slug: true, coingeckoId: true } },
      },
    });

    return dedupeEligibleTokens(templates);
  }

  const templates = await db.cardTemplate.findMany({
    where: {
      isActive: true,
      tokenProject: { isActive: true },
    },
    select: {
      tokenProjectId: true,
      metadata: true,
      tokenProject: { select: { slug: true, coingeckoId: true } },
    },
  });

  return dedupeEligibleTokens(templates);
}

function dedupeEligibleTokens(rows: Array<{
  tokenProjectId: string;
  metadata: unknown;
  tokenProject: { slug: string; coingeckoId: string | null };
}>): EligibleToken[] {
  const byProject = new Map<string, EligibleToken>();

  for (const row of rows) {
    const fromTemplateMetadata = readCoingeckoFromTemplateMetadata(row.metadata);
    const resolved = row.tokenProject.coingeckoId ?? fromTemplateMetadata ?? null;

    if (!byProject.has(row.tokenProjectId)) {
      byProject.set(row.tokenProjectId, {
        tokenProjectId: row.tokenProjectId,
        slug: row.tokenProject.slug,
        coingeckoId: resolved,
      });
      continue;
    }

    const existing = byProject.get(row.tokenProjectId)!;
    if (!existing.coingeckoId && resolved) {
      existing.coingeckoId = resolved;
    }
  }

  return [...byProject.values()];
}

function readCoingeckoFromTemplateMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const tokenIdentity = (metadata as Record<string, unknown>).tokenIdentity;
  if (!tokenIdentity || typeof tokenIdentity !== "object" || Array.isArray(tokenIdentity)) return null;
  const coingeckoId = (tokenIdentity as Record<string, unknown>).coingeckoId;
  if (typeof coingeckoId !== "string") return null;
  const value = coingeckoId.trim().toLowerCase();
  return value.length > 0 ? value : null;
}
