import { prisma } from "@/lib/prisma";

export async function searchUsersForAdminMvp(termRaw: string, limitRaw?: number) {
  const term = termRaw.trim();
  if (!term) return [];

  const limit = Number.isInteger(limitRaw) && Number(limitRaw) > 0
    ? Math.min(Number(limitRaw), 20)
    : 10;

  return prisma.user.findMany({
    where: {
      OR: [
        { id: { contains: term, mode: "insensitive" } },
        { handle: { contains: term, mode: "insensitive" } },
        { displayName: { contains: term, mode: "insensitive" } },
        {
          identities: {
            some: {
              providerUserId: { contains: term, mode: "insensitive" },
            },
          },
        },
        {
          identities: {
            some: {
              username: { contains: term, mode: "insensitive" },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      handle: true,
      displayName: true,
      points: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit,
  });
}
