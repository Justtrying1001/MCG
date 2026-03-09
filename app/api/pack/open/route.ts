import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getBaseCards, openBasePack } from "@/lib/cards";
import { GAME_CONFIG } from "@/lib/game-config";
import { ensurePhase2PackFoundations } from "@/lib/domain/acquisition/phase2-pack-foundations";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const pulled = openBasePack(getBaseCards());

  const result = await prisma.$transaction(async (tx) => {
    const spend = await tx.user.updateMany({
      where: { id: user.id, points: { gte: GAME_CONFIG.PACK_COST } },
      data: { points: { decrement: GAME_CONFIG.PACK_COST }, packsOpened: { increment: 1 } },
    });

    if (spend.count !== 1) {
      return { ok: false as const };
    }

    await tx.packOpening.create({
      data: {
        userId: user.id,
        packType: "base_v1",
        result: { cards: pulled.map((c) => c.baseCardId) },
      },
    });

    // Phase 2 strategy: explicit dual-write.
    // - Legacy continuity: PackOpening + UserCard quantity writes remain active.
    // - New ownership truth foundation: PackOpeningEvent + OwnedCardInstance writes are added.
    const { packDefinitionId, cardTemplateIdByBaseCardId } = await ensurePhase2PackFoundations(tx, pulled);

    const openingEvent = await tx.packOpeningEvent.create({
      data: {
        userId: user.id,
        packDefinitionId,
      },
    });

    for (const card of pulled) {
      await tx.userCard.upsert({
        where: { userId_baseCardId: { userId: user.id, baseCardId: card.baseCardId } },
        create: { userId: user.id, baseCardId: card.baseCardId, quantity: 1 },
        update: { quantity: { increment: 1 } },
      });

      const cardTemplateId = cardTemplateIdByBaseCardId.get(card.baseCardId);
      if (cardTemplateId) {
        await tx.ownedCardInstance.create({
          data: {
            userId: user.id,
            cardTemplateId,
            sourcePackOpeningEventId: openingEvent.id,
          },
        });
      }
    }

    return { ok: true as const };
  });

  if (!result.ok) {
    return new NextResponse("Not enough points", { status: 400 });
  }

  return NextResponse.json({ pulledCards: pulled });
}
