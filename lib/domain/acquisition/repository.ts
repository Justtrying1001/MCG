import { prisma } from "@/lib/prisma";

export async function recordPackOpeningEventFoundation(params: {
  userId: string;
  packDefinitionId: string;
}) {
  return prisma.packOpeningEvent.create({
    data: {
      userId: params.userId,
      packDefinitionId: params.packDefinitionId,
    },
  });
}
