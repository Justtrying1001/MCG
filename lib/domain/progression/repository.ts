import { prisma } from "@/lib/prisma";

export async function getProgressionFoundation(userId: string) {
  const [userProgression, collectionProgression, competitiveProgression] = await Promise.all([
    prisma.userProgression.findUnique({ where: { userId } }),
    prisma.collectionProgression.findMany({ where: { userId }, take: 10 }),
    prisma.competitiveProgression.findUnique({ where: { userId } }),
  ]);

  return {
    userProgression,
    collectionProgression,
    competitiveProgression,
  };
}
