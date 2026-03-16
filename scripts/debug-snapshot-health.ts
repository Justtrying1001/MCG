import { PrismaClient, ContestStatus } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // 1. État des snapshots par contest
  const snapshots = await prisma.contestTokenSnapshot.groupBy({
    by: ["contestId", "phase"],
    _count: { id: true },
    _sum: { capturedCount: true },
  });

  // 2. Contests LIVE ou SETTLED avec leur code
  const contests = await prisma.contest.findMany({
    where: { status: { in: [ContestStatus.LIVE, ContestStatus.SETTLED] } },
    select: { id: true, code: true, status: true },
  });

  // 3. Coverage coingeckoId sur les tokenProjects
  const totalTokens = await prisma.tokenProject.count({ where: { isActive: true } });
  const withGeckoId = await prisma.tokenProject.count({
    where: { isActive: true, coingeckoId: { not: null } },
  });

  // 4. Snapshots avec prix null
  const snapshotsWithNullPrice = await prisma.contestTokenSnapshot.count({
    where: { priceUsd: null },
  });
  const snapshotsWithPrice = await prisma.contestTokenSnapshot.count({
    where: { priceUsd: { not: null } },
  });

  console.log("=== CONTESTS LIVE/SETTLED ===");
  console.log(JSON.stringify(contests, null, 2));

  console.log("\n=== SNAPSHOTS PAR CONTEST/PHASE ===");
  for (const snap of snapshots) {
    const contest = contests.find(c => c.id === snap.contestId);
    console.log(`${contest?.code ?? snap.contestId} | ${snap.phase} | count: ${snap._count.id}`);
  }

  console.log("\n=== COINGECKO COVERAGE ===");
  console.log(`Total token projects actifs : ${totalTokens}`);
  console.log(`Avec coingeckoId : ${withGeckoId}`);
  console.log(`Sans coingeckoId : ${totalTokens - withGeckoId}`);

  console.log("\n=== PRIX DANS LES SNAPSHOTS ===");
  console.log(`Snapshots avec prix : ${snapshotsWithPrice}`);
  console.log(`Snapshots sans prix (null) : ${snapshotsWithNullPrice}`);

  await prisma.$disconnect();
}

main().catch(console.error);
