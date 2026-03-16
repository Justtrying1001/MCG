/**
 * Désactive les TokenProject actifs qui ne font pas partie du master Genesis (token-master-25.json).
 * NE supprime PAS les tokens — juste isActive: false pour préserver l'historique.
 *
 * Usage : npx tsx scripts/deactivate-parasite-tokens.ts [--dry-run]
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  // Charger le master
  const master = JSON.parse(readFileSync("data/token-master-25.json", "utf8"));
  const masterSlugs = new Set<string>(master.tokens.map((t: any) => t.slug));
  const masterGeckoIds = new Set<string>(
    master.tokens.filter((t: any) => t.coingeckoId).map((t: any) => t.coingeckoId)
  );

  // Tokens actifs en base
  const dbTokens = await prisma.tokenProject.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, displayName: true, coingeckoId: true },
    orderBy: { slug: "asc" },
  });

  const parasites = dbTokens.filter(
    (t) => !masterSlugs.has(t.slug) && (!t.coingeckoId || !masterGeckoIds.has(t.coingeckoId))
  );

  if (parasites.length === 0) {
    console.log("✓ Aucun token parasite trouvé. La base est propre.");
    await prisma.$disconnect();
    return;
  }

  console.log(`\n=== ${parasites.length} tokens parasites détectés ===`);
  parasites.forEach((t) =>
    console.log(`  - [${t.id}] ${t.displayName} | slug: ${t.slug} | gecko: ${t.coingeckoId ?? "null"}`)
  );

  if (dryRun) {
    console.log(`\n[dry-run] Aucune modification effectuée. Relancer sans --dry-run pour désactiver.`);
    await prisma.$disconnect();
    return;
  }

  const parasiteSlugs = parasites.map((t) => t.slug);
  const result = await prisma.tokenProject.updateMany({
    where: { slug: { in: parasiteSlugs } },
    data: { isActive: false },
  });

  console.log(`\n✓ ${result.count} tokens parasites désactivés (isActive: false).`);
  console.log(`  Slugs désactivés : ${parasiteSlugs.join(", ")}`);

  // Vérification finale
  const remaining = await prisma.tokenProject.count({ where: { isActive: true } });
  console.log(`\n=== TokenProjects actifs restants : ${remaining} (attendu: ${master.tokens.length}) ===`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
