import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  const twitterId = session?.user?.twitterId;
  if (!twitterId) return null;

  return prisma.user.findUnique({ where: { twitterId } });
}
