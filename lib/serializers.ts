import type { OwnedCardInstance, User } from "@prisma/client";
import type { MvpCollectionItem } from "@/types/cards";

import { buildCanonicalCardViewOrThrow } from "@/lib/domain/cards/canonical-card-builder";

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
  invitedFriendsCount?: number;
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
      if (!aggregate.tokenProjectSlug) {
        throw new Error(`[me-serializer] missing tokenProject.slug for template=${templateId}`);
      }

      return {
        templateId,
        instanceCount: aggregate.count,
        card: buildCanonicalCardViewOrThrow({
          source: "me-serializer",
          tokenSlug: aggregate.tokenProjectSlug,
          templateId,
          rarityCode: aggregate.rarityCode,
          editionCode: aggregate.editionCode,
          plannedSupply: aggregate.plannedSupply,
          issuedSupply: aggregate.issuedSupply,
          instanceCount: aggregate.count,
        }),
      };
    });

  return {
    mode: "user" as const,
    user: {
      id: params.user.id,
      xUserId: params.user.xUserId,
      username: params.user.xUsername,
      displayName: params.user.displayName,
      avatarUrl: params.user.avatarUrl,
      authProvider: params.user.authProvider,
      inviteCode: params.user.inviteCode,
      invitedFriendsCount: params.invitedFriendsCount ?? 0,
      points: params.user.points,
      packsOpened: params.user.packsOpened,
    },
    mvpCollection,
  };
}
