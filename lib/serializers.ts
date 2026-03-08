import type { User, UserCard } from "@prisma/client";
import { getCardsMap } from "@/lib/cards";
import type { BaseCard } from "@/types/cards";

function toClientCard(card: BaseCard | undefined) {
  if (!card) return undefined;
  return {
    ...card,
    // Transitional explicit surface for Lot 1 canonical fields.
    baseRarity: card.baseRarity,
    finish: card.finish,
    combatScore: card.combatScore,
    archetype: card.archetype,
    collectorId: card.collectorId,
  };
}

export function buildUserPayload(user: User, userCards: UserCard[]) {
  const cardsMap = getCardsMap();
  const collection = userCards
    .filter((c) => c.quantity > 0)
    .map((c) => ({
      baseCardId: c.baseCardId,
      quantity: c.quantity,
      pveExhausted: c.pveExhausted,
      card: toClientCard(cardsMap.get(c.baseCardId)),
    }))
    .filter((c) => Boolean(c.card));

  return {
    user: {
      id: user.id,
      username: user.username,
      points: user.points,
      packsOpened: user.packsOpened,
      pveBattleTickets: user.pveBattleTickets,
      lastPveResetAt: user.lastPveResetAt,
      createdAt: user.createdAt,
    },
    collection,
  };
}
