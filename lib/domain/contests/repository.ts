import { ContestStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function listOpenContestsFoundation() {
  return prisma.contest.findMany({
    where: { status: { in: [ContestStatus.OPEN, ContestStatus.LOCKED, ContestStatus.LIVE] } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
