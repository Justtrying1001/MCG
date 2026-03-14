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
  recentResults: CompetitiveProgressionRecentResultV2[];
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

export type UserSessionPayload = MeCoexistenceEnvelope & {
  mode: "user";
  user: {
    id: string;
    xUserId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    authProvider: string;
    inviteCode: string;
    invitedFriendsCount: number;
    points: number;
    packsOpened: number;
  };
  mvpCollection: MvpCollectionItem[];
  openingsCount: number;
};

export type GuestSessionPayload = {
  mode: "guest";
  user: {
    id: "guest";
    xUserId: null;
    username: "Guest";
    displayName: "Guest";
    avatarUrl: null;
    authProvider: "guest";
    points: number;
    packsOpened: number;
  };
  mvpCollection: MvpCollectionItem[];
  openingsCount: number;
};

export type SessionState = UserSessionPayload | GuestSessionPayload;
