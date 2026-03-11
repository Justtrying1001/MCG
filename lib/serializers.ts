import type { OwnedCardInstance, Prisma, User, UserCard } from "@prisma/client";
import type { MvpCollectionItem } from "@/types/cards";

import { findTokenMasterByBaseCardId, toLegacyBaseCardFromTokenMaster, toMvpCardViewFromTokenMasterRow } from "@/lib/domain/cards/token-master";
import { extractBaseCardIdFromTemplateMetadata } from "@/lib/domain/cards/template-metadata";

type OwnedInstanceWithTemplate = OwnedCardInstance & {
  cardTemplate: {
    id: string;
    metadata: unknown;
    plannedSupply?: number;
    issuedSupply?: number;
    rarity?: { code: string };
    edition?: { code: string };
  };
};

export function buildUserPayload(params: {
  user: User;
  ownedInstances: OwnedInstanceWithTemplate[];
  legacyUserCards?: UserCard[];
}) {
  const quantityByBaseCardId = new Map<string, number>();
  const mvpTemplateAgg = new Map<string, {
    count: number;
    baseCardId: string | null;
    plannedSupply: number;
    issuedSupply: number;
    rarityCode: string;
    editionCode: string;
  }>();

  for (const instance of params.ownedInstances) {
    const metadata = instance.cardTemplate.metadata as Prisma.JsonValue | null;
    const baseCardId = extractBaseCardIdFromTemplateMetadata(metadata);
    if (baseCardId) {
      quantityByBaseCardId.set(baseCardId, (quantityByBaseCardId.get(baseCardId) ?? 0) + 1);
    }

    const aggregate = mvpTemplateAgg.get(instance.cardTemplate.id) ?? {
      count: 0,
      baseCardId,
      plannedSupply: instance.cardTemplate.plannedSupply ?? 0,
      issuedSupply: instance.cardTemplate.issuedSupply ?? 0,
      rarityCode: instance.cardTemplate.rarity?.code ?? "UNKNOWN",
      editionCode: instance.cardTemplate.edition?.code ?? "UNKNOWN",
    };

    aggregate.count += 1;
    if (!aggregate.baseCardId && baseCardId) {
      aggregate.baseCardId = baseCardId;
    }
    mvpTemplateAgg.set(instance.cardTemplate.id, aggregate);
  }

  // Transitional fallback for legacy-only users created before instance-aware ownership existed.
  if (quantityByBaseCardId.size === 0 && params.legacyUserCards) {
    for (const card of params.legacyUserCards) {
      if (card.quantity <= 0) continue;
      quantityByBaseCardId.set(card.baseCardId, (quantityByBaseCardId.get(card.baseCardId) ?? 0) + card.quantity);
    }
  }

  const collection = Array.from(quantityByBaseCardId.entries())
    .map(([baseCardId, quantity]) => {
      const token = findTokenMasterByBaseCardId(baseCardId);
      if (!token) return null;

      return {
        baseCardId,
        quantity,
        card: toLegacyBaseCardFromTokenMaster(token),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const mvpCollection: MvpCollectionItem[] = Array.from(mvpTemplateAgg.entries())
    .map(([templateId, aggregate]) => {
      if (!aggregate.baseCardId) return null;
      const token = findTokenMasterByBaseCardId(aggregate.baseCardId);
      if (!token) return null;

      return {
        templateId,
        instanceCount: aggregate.count,
        card: toMvpCardViewFromTokenMasterRow({
          token,
          templateId,
          rarityCode: aggregate.rarityCode,
          editionCode: aggregate.editionCode,
          plannedSupply: aggregate.plannedSupply,
          issuedSupply: aggregate.issuedSupply,
          instanceCount: aggregate.count,
        }),
      };
    })
    .filter((row): row is MvpCollectionItem => Boolean(row));

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
    mvpCollection,
  };
}
