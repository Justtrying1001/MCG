import type { MvpCollectionItem } from "@/types/cards";

export type CollectionProjectionV2 = {
  totalOwnedInstances: number;
  ownedTemplateCount: number;
  missingTemplateCount: number;
  completionPct: number;
  byTokenId: Array<{
    tokenId: string;
    ownedCount: number;
    owned: boolean;
  }>;
  byRarity: Array<{ rarityCode: string; count: number }>;
  byEdition: Array<{ editionCode: string; count: number }>;
};

export type AccountProgressionSummaryV2 = {
  level: number;
  xp: number;
  levelXpFloor: number;
  levelXpCeil: number;
  progressPct: number;
  nextMilestoneLevel: number;
  pointsBalance: number;
  progressionBreakdown: {
    pointsXp: number;
    collectionXp: number;
    competitiveXp: number;
    legacyXp: number;
  };
};

export type CollectionProgressionSummaryV2 = {
  totalOwnedInstances: number;
  ownedTemplateCount: number;
  missingTemplateCount: number;
  completionPct: number;
  topRarityCode: string | null;
  topEditionCode: string | null;
};

export type CompetitiveProgressionRecentResultV2 = {
  contestId: string;
  contestTitle: string;
  rank: number;
  score: number;
  rankedAt: string;
};

export type CompetitiveProgressionSummaryV2 = {
  contestsEntered: number;
  activeEntries: number;
  settledEntries: number;
  contestsWon: number;
  bestRank: number | null;
  averageRank: number | null;
  rating: number | null;
  leagueTier?: string | null;
  seasonRank?: number | null;
  seasonPoints?: number | null;
  recentResults: CompetitiveProgressionRecentResultV2[];
};

export type LinkedWalletSummary = {
  address: string;
  providerUserId: string;
  linkedAt: string;
  lastSeenAt: string | null;
  isVerified: boolean;
};

export type LinkedWalletEnvelope = {
  linkedWallets: {
    solanaWallets: LinkedWalletSummary[];
  };
};

export type LinkedTwitterSummary = {
  providerUserId: string;
  username: string | null;
  displayName: string | null;
  linkedAt: string;
  lastSeenAt: string | null;
  isVerified: boolean;
};

export type LinkedSocialEnvelope = {
  linkedSocials: {
    twitter: LinkedTwitterSummary | null;
  };
};

export type MeCoexistenceEnvelope = {
  coexistence?: {
    v2?: {
      collectionProjection?: CollectionProjectionV2;
      accountProgression?: AccountProgressionSummaryV2;
      collectionProgression?: CollectionProgressionSummaryV2;
      competitiveProgression?: CompetitiveProgressionSummaryV2;
      mvpCollection?: MvpCollectionItem[];
    };
  };
};

export type UserSessionPayload = MeCoexistenceEnvelope & LinkedWalletEnvelope & LinkedSocialEnvelope & {
  mode: "user";
  user: {
    id: string;
    handle: string | null;
    username: string | null;
    displayName: string;
    avatarUrl: string | null;
    points: number;
    packsOpened: number;
  };
  mvpCollection: MvpCollectionItem[];
  openingsCount: number;
};

export type SessionState = UserSessionPayload;
