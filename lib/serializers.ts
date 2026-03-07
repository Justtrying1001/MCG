import type { User, UserCard } from "@prisma/client";
import { getCardsMap } from "@/lib/cards";

export function buildUserPayload(user: User, userCards: UserCard[]) {
  const cardsMap = getCardsMap();
  const collection = userCards
    .filter((c) => c.quantity > 0)
    .map((c) => ({
      baseCardId: c.baseCardId,
      quantity: c.quantity,
      pveExhausted: c.pveExhausted,
      card: cardsMap.get(c.baseCardId),
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
