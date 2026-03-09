import { prisma } from "@/lib/prisma";

export async function listOwnedCardInstancesByUser(userId: string) {
  return prisma.ownedCardInstance.findMany({
    where: { userId },
    orderBy: { acquiredAt: "desc" },
    take: 100,
  });
}
