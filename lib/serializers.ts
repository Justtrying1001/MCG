import type { OwnedCardInstance, Prisma, User, UserCard } from "@prisma/client";
import { getCardsMap } from "@/lib/cards";
import { extractBaseCardIdFromTemplateMetadata } from "@/lib/domain/cards/template-metadata";

type OwnedInstanceWithTemplate = OwnedCardInstance & {
  cardTemplate: {
    metadata: unknown;
  };
};

export function buildUserPayload(params: {
  user: User;
  ownedInstances: OwnedInstanceWithTemplate[];
  legacyUserCards?: UserCard[];
}) {
  const cardsMap = getCardsMap();

  const quantityByBaseCardId = new Map<string, number>();

  for (const instance of params.ownedInstances) {
    const baseCardId = extractBaseCardIdFromTemplateMetadata(instance.cardTemplate.metadata as Prisma.JsonValue | null);
    if (!baseCardId) continue;
    quantityByBaseCardId.set(baseCardId, (quantityByBaseCardId.get(baseCardId) ?? 0) + 1);
  }

  // Transitional fallback for legacy-only users created before instance-aware ownership existed.
  if (quantityByBaseCardId.size === 0 && params.legacyUserCards) {
    for (const card of params.legacyUserCards) {
      if (card.quantity <= 0) continue;
      quantityByBaseCardId.set(card.baseCardId, (quantityByBaseCardId.get(card.baseCardId) ?? 0) + card.quantity);
    }
  }

  const collection = Array.from(quantityByBaseCardId.entries())
    .map(([baseCardId, quantity]) => ({
      baseCardId,
      quantity,
      card: cardsMap.get(baseCardId),
    }))
    .filter((row): row is { baseCardId: string; quantity: number; card: NonNullable<typeof row.card> } => Boolean(row.card));

  return {
    mode: "user" as const,
    user: {
      id: params.user.id,
      xUserId: params.user.xUserId,
      username: params.user.xUsername,
      displayName: params.user.displayName,
      avatarUrl: params.user.avatarUrl,
      authProvider: params.user.authProvider,
      points: params.user.points,
      packsOpened: params.user.packsOpened,
    },
    collection,
  };
}
