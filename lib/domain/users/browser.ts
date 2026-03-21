import { prisma } from "@/lib/prisma";

type AdminUsersBrowserOptions = {
  query?: string;
  limit?: number;
  page?: number;
};

export async function listUsersForAdminBrowser(options: AdminUsersBrowserOptions = {}) {
  const query = options.query?.trim() ?? "";
  const limit = Number.isInteger(options.limit) && Number(options.limit) > 0
    ? Math.min(Number(options.limit), 100)
    : 25;
  const page = Number.isInteger(options.page) && Number(options.page) > 0
    ? Number(options.page)
    : 1;
  const skip = (page - 1) * limit;

  const where = query
    ? {
      OR: [
        { id: { contains: query, mode: "insensitive" as const } },
        { handle: { contains: query, mode: "insensitive" as const } },
        { displayName: { contains: query, mode: "insensitive" as const } },
        {
          identities: {
            some: {
              providerUserId: { contains: query, mode: "insensitive" as const },
            },
          },
        },
        {
          identities: {
            some: {
              username: { contains: query, mode: "insensitive" as const },
            },
          },
        },
      ],
    }
    : undefined;

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        displayName: true,
        handle: true,
        points: true,
        packsOpened: true,
        createdAt: true,
        userProgression: {
          select: {
            level: true,
            xp: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: limit,
    }),
  ]);

  return {
    total,
    page,
    limit,
    users,
  };
}
