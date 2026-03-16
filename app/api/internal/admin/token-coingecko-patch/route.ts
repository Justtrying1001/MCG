import { readFileSync } from "node:fs";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireInternalAdminAccess } from "@/lib/internal-auth";
import { prisma } from "@/lib/prisma";

const TOKEN_MASTER_PATH = path.join(process.cwd(), "data", "token-master-25.json");

function loadTokenMaster(): Array<{ slug: string; coingeckoId: string | null; displayName: string }> {
  const payload = JSON.parse(readFileSync(TOKEN_MASTER_PATH, "utf8")) as {
    tokens: Array<{ slug: string; coingeckoId?: string | null; displayName: string }>;
  };
  return (payload.tokens ?? []).map((token) => ({
    ...token,
    coingeckoId: token.coingeckoId ?? null,
  }));
}

/** GET — diagnostic: compare token master vs DB */
export async function GET(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const masterTokens = loadTokenMaster();
    const masterSlugs = masterTokens.map((t) => t.slug);

    const [withId, withoutId, missing, masterCoverage] = await Promise.all([
      prisma.tokenProject.count({ where: { coingeckoId: { not: null } } }),
      prisma.tokenProject.count({ where: { coingeckoId: null } }),
      prisma.tokenProject.findMany({
        where: { coingeckoId: null },
        select: { id: true, slug: true, displayName: true },
        take: 10,
      }),
      // Cross-check: which master tokens exist in DB and what is their coingeckoId state
      prisma.tokenProject.findMany({
        where: { slug: { in: masterSlugs } },
        select: { slug: true, coingeckoId: true },
      }),
    ]);

    const dbBySlug = new Map(masterCoverage.map((r) => [r.slug, r.coingeckoId]));
    const masterMismatches = masterTokens
      .filter((t) => t.coingeckoId && dbBySlug.get(t.slug) === null)
      .map((t) => ({ slug: t.slug, masterCoingeckoId: t.coingeckoId, dbCoingeckoId: null }));

    const masterNotInDb = masterTokens
      .filter((t) => !dbBySlug.has(t.slug))
      .map((t) => t.slug);

    return NextResponse.json({
      ok: true,
      db: { withId, withoutId },
      missing,
      master: {
        total: masterTokens.length,
        withCoingeckoId: masterTokens.filter((t) => t.coingeckoId).length,
        // Tokens that have a coingeckoId in master but null in DB → patchable
        patchable: masterMismatches.length,
        mismatches: masterMismatches,
        notInDb: masterNotInDb,
      },
    });
  } catch (error) {
    return handleApiError(error, "Cannot load coingeckoId diagnostic");
  }
}

/** POST — patch: write coingeckoId from token master to DB where currently null */
export async function POST(request: NextRequest) {
  const auth = requireInternalAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const masterTokens = loadTokenMaster();
    const eligible = masterTokens.filter((t) => t.coingeckoId?.trim());

    console.log(`[token-coingecko-patch] Starting patch — ${eligible.length} tokens with coingeckoId in master`);

    let patched = 0;
    let skipped = 0;
    const errors: Array<{ slug: string; error: string }> = [];

    for (const token of eligible) {
      try {
        const result = await prisma.tokenProject.updateMany({
          where: { slug: token.slug, coingeckoId: null },
          data: { coingeckoId: token.coingeckoId },
        });
        if (result.count > 0) {
          console.log(`[token-coingecko-patch] Patched ${token.slug} → ${token.coingeckoId}`);
          patched += result.count;
        } else {
          skipped += 1;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[token-coingecko-patch] Failed for slug=${token.slug}: ${message}`);
        errors.push({ slug: token.slug, error: message });
      }
    }

    console.log(`[token-coingecko-patch] Done — patched=${patched} skipped=${skipped} errors=${errors.length}`);

    // Post-patch count to confirm result
    const [withId, withoutId] = await Promise.all([
      prisma.tokenProject.count({ where: { coingeckoId: { not: null } } }),
      prisma.tokenProject.count({ where: { coingeckoId: null } }),
    ]);

    return NextResponse.json({
      ok: errors.length === 0,
      patched,
      skipped,
      errors,
      after: { withId, withoutId },
    });
  } catch (error) {
    return handleApiError(error, "Cannot patch coingeckoId");
  }
}
