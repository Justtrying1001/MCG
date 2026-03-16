import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const prisma = new PrismaClient();

async function main() {
  // Tokens en base
  const dbTokens = await prisma.tokenProject.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, displayName: true, coingeckoId: true },
    orderBy: { slug: "asc" },
  });

  // Tokens attendus depuis le master
  const master = JSON.parse(readFileSync("data/token-master-25.json", "utf8"));
  const masterSlugs = new Set(master.tokens.map((t: any) => t.slug));
  const masterGeckoIds = new Set(
    master.tokens.filter((t: any) => t.coingeckoId).map((t: any) => t.coingeckoId)
  );

  const parasites = dbTokens.filter(
    (t) => !masterSlugs.has(t.slug) && (!t.coingeckoId || !masterGeckoIds.has(t.coingeckoId))
  );

  const missing = master.tokens.filter(
    (t: any) =>
      !dbTokens.find((d) => d.slug === t.slug || (t.coingeckoId && d.coingeckoId === t.coingeckoId))
  );

  console.log(`\n=== DB tokens actifs : ${dbTokens.length} ===`);
  console.log(`=== Master tokens : ${master.tokens.length} ===`);
  console.log(
    `\n=== TOKENS PARASITES (${parasites.length}) — à désactiver ===`
  );
  parasites.forEach((t) =>
    console.log(
      `  - ${t.displayName} | slug: ${t.slug} | gecko: ${t.coingeckoId ?? "null"}`
    )
  );
  console.log(`\n=== TOKENS MANQUANTS EN DB (${missing.length}) ===`);
  missing.forEach((t: any) =>
    console.log(
      `  - ${t.displayName} | slug: ${t.slug} | gecko: ${t.coingeckoId ?? "null"}`
    )
  );

  if (parasites.length > 0) {
    console.log(
      `\n=== Pour désactiver les parasites, exécutez : ===`
    );
    console.log(`  npx tsx scripts/deactivate-parasite-tokens.ts`);
    console.log(`\n  Slugs parasites :`);
    parasites.forEach((t) => console.log(`    "${t.slug}"`));
  }

  await prisma.$disconnect();
}

main().catch(console.error);
