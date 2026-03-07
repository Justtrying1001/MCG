import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getBaseCards, openBasePack, GAME_CONFIG } from "@/lib/cards";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  if (user.points < GAME_CONFIG.PACK_COST) {
    return new NextResponse("Not enough points", { status: 400 });
  }

  const pulled = openBasePack(getBaseCards());

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { points: { decrement: GAME_CONFIG.PACK_COST }, packsOpened: { increment: 1 } },
    });

    await tx.packOpening.create({
      data: {
        userId: user.id,
        packType: "base_v1",
        result: { cards: pulled.map((c) => c.baseCardId) },
      },
    });

    for (const card of pulled) {
      await tx.userCard.upsert({
        where: { userId_baseCardId: { userId: user.id, baseCardId: card.baseCardId } },
        create: { userId: user.id, baseCardId: card.baseCardId, quantity: 1 },
        update: { quantity: { increment: 1 } },
      });
    }
  });

  return NextResponse.json({ pulledCards: pulled });
}
