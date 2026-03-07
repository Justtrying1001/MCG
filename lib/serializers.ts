import type { User, UserCard } from "@prisma/client";
import { getCardsMap } from "@/lib/cards";

export function buildUserPayload(user: User, userCards: UserCard[]) {
  const cardsMap = getCardsMap();
  const collection = userCards
    .filter((c) => c.quantity > 0)
    .map((c) => ({
      baseCardId: c.baseCardId,
      quantity: c.quantity,
      card: cardsMap.get(c.baseCardId),
    }))
    .filter((c) => Boolean(c.card));

  return {
    user: {
      id: user.id,
      username: user.username,
      points: user.points,
      packsOpened: user.packsOpened,
      createdAt: user.createdAt,
    },
    collection,
  };
}
