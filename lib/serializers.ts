import type { OwnedCardInstance, User } from "@prisma/client";
import type { MvpCollectionItem } from "@/types/cards";

import { findTokenMasterBySlug, toMvpCardViewFromTokenMasterRow } from "@/lib/domain/cards/token-master";

type OwnedInstanceWithTemplate = OwnedCardInstance & {
  cardTemplate: {
    id: string;
    plannedSupply?: number;
    issuedSupply?: number;
    rarity?: { code: string };
    edition?: { code: string };
    tokenProject?: { slug: string };
  };
};

export function buildUserPayload(params: {
  user: User;
  ownedInstances: OwnedInstanceWithTemplate[];
}) {
  const mvpTemplateAgg = new Map<string, {
    count: number;
    tokenProjectSlug: string | null;
    plannedSupply: number;
    issuedSupply: number;
    rarityCode: string;
    editionCode: string;
  }>();

  for (const instance of params.ownedInstances) {
    const aggregate = mvpTemplateAgg.get(instance.cardTemplate.id) ?? {
      count: 0,
      tokenProjectSlug: instance.cardTemplate.tokenProject?.slug ?? null,
      plannedSupply: instance.cardTemplate.plannedSupply ?? 0,
      issuedSupply: instance.cardTemplate.issuedSupply ?? 0,
      rarityCode: instance.cardTemplate.rarity?.code ?? "UNKNOWN",
      editionCode: instance.cardTemplate.edition?.code ?? "UNKNOWN",
    };

    aggregate.count += 1;
    if (!aggregate.tokenProjectSlug && instance.cardTemplate.tokenProject?.slug) {
      aggregate.tokenProjectSlug = instance.cardTemplate.tokenProject.slug;
    }
    mvpTemplateAgg.set(instance.cardTemplate.id, aggregate);
  }

  const mvpCollection: MvpCollectionItem[] = Array.from(mvpTemplateAgg.entries())
    .map(([templateId, aggregate]) => {
      if (!aggregate.tokenProjectSlug) return null;
      const token = findTokenMasterBySlug(aggregate.tokenProjectSlug);
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
    mvpCollection,
  };
}
