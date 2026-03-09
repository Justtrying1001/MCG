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
    .filter((c): c is { baseCardId: string; quantity: number; pveExhausted: boolean; card: NonNullable<typeof c.card> } => Boolean(c.card));

  return {
    mode: "user" as const,
    user: {
      id: user.id,
      xUserId: user.xUserId,
      username: user.xUsername,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      authProvider: user.authProvider,
      points: user.points,
      packsOpened: user.packsOpened,
      pveBattleTickets: user.pveBattleTickets,
      lastPveResetAt: user.lastPveResetAt.toISOString(),
    },
    collection,
  };
}
