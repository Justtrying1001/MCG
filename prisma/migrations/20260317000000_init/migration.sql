-- CreateEnum
CREATE TYPE "RarityTier" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "EditionType" AS ENUM ('BASE', 'REVERSE', 'BRILLANTE', 'HOLO', 'FULL_ART');

-- CreateEnum
CREATE TYPE "PackSource" AS ENUM ('SALE', 'REWARD');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('POINTS', 'PACK', 'CARD_INSTANCE', 'XP');

-- CreateEnum
CREATE TYPE "RewardLedgerEntryType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "RewardLedgerReasonType" AS ENUM ('WELCOME_REWARD', 'PACK_OPEN', 'QUEST_REWARD', 'CONTEST_REWARD', 'CONTEST_ENTRY_FEE', 'ADMIN_GRANT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ContestTeamSizeMode" AS ENUM ('EXACT');

-- CreateEnum
CREATE TYPE "ContestEligibilityMode" AS ENUM ('ANY', 'CARD_SET_ONLY');

-- CreateEnum
CREATE TYPE "ContestRewardPolicyStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ContestRewardType" AS ENUM ('POINTS', 'PACK', 'XP');

-- CreateEnum
CREATE TYPE "ContestRewardDistributionRuleType" AS ENUM ('FIXED_RANKS', 'TOP_N', 'TOP_PERCENT');

-- CreateEnum
CREATE TYPE "ContestSettlementPlanStatus" AS ENUM ('DRAFT', 'EXECUTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "QuestType" AS ENUM ('WELCOME', 'SOCIAL_FOLLOW_X', 'SOCIAL_ENGAGEMENT_X', 'CONTEST_COUNT_MILESTONE', 'MANUAL');

-- CreateEnum
CREATE TYPE "QuestValidationMode" AS ENUM ('AUTO', 'SUBMIT', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "UserQuestStatus" AS ENUM ('AVAILABLE', 'IN_PROGRESS', 'CLAIMABLE', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "QuestSubmissionStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ContestStatus" AS ENUM ('DRAFT', 'OPEN', 'LOCKED', 'LIVE', 'SETTLED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ContestEntryStatus" AS ENUM ('SUBMITTED', 'SCORED', 'SETTLED', 'CANCELED');

-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LeagueTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'LEGEND');

-- CreateEnum
CREATE TYPE "ContestSnapshotPhase" AS ENUM ('START', 'END');

-- CreateEnum
CREATE TYPE "AdminActionStatus" AS ENUM ('VALIDATED', 'EXECUTED', 'FAILED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN_OPS', 'ADMIN_MODERATOR', 'ADMIN_FINANCE_OPS', 'ADMIN_SUPERVISOR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "xUserId" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "xUsername" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "authProvider" TEXT NOT NULL DEFAULT 'x',
    "points" INTEGER NOT NULL DEFAULT 300,
    "packsOpened" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "leagueId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInvite" (
    "id" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "baseCardId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackOpening" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packType" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackOpening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenProject" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "coingeckoId" TEXT,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardSet" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rarity" (
    "id" TEXT NOT NULL,
    "code" "RarityTier" NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rarity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Edition" (
    "id" TEXT NOT NULL,
    "code" "EditionType" NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Edition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardTemplate" (
    "id" TEXT NOT NULL,
    "tokenProjectId" TEXT NOT NULL,
    "cardSetId" TEXT NOT NULL,
    "rarityId" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "metadata" JSONB,
    "plannedSupply" INTEGER NOT NULL DEFAULT 0,
    "issuedSupply" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnedCardInstance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardTemplateId" TEXT NOT NULL,
    "sourcePackOpeningEventId" TEXT,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "OwnedCardInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "cardSetId" TEXT NOT NULL,
    "source" "PackSource" NOT NULL DEFAULT 'SALE',
    "plannedPackCount" INTEGER NOT NULL DEFAULT 0,
    "openedPackCount" INTEGER NOT NULL DEFAULT 0,
    "cardsPerPack" INTEGER NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardPackSupply" (
    "id" TEXT NOT NULL,
    "totalSupply" INTEGER NOT NULL,
    "distributed" INTEGER NOT NULL DEFAULT 0,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardPackSupply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DropTable" (
    "id" TEXT NOT NULL,
    "packDefinitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DropTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DropTableRow" (
    "id" TEXT NOT NULL,
    "dropTableId" TEXT NOT NULL,
    "rarityId" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,

    CONSTRAINT "DropTableRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackOpeningEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packDefinitionId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackOpeningEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "RewardType" NOT NULL,
    "amount" INTEGER,
    "packDefinitionId" TEXT,
    "sourcePackOpeningEventId" TEXT,
    "sourceContestSettlementId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardLedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryType" "RewardLedgerEntryType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reasonType" "RewardLedgerReasonType" NOT NULL,
    "reasonRef" TEXT,
    "idempotencyKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "QuestType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "rewardPoints" INTEGER NOT NULL DEFAULT 0,
    "rewardPackDefinitionId" TEXT,
    "rewardPackQuantity" INTEGER NOT NULL DEFAULT 1,
    "validationMode" "QuestValidationMode" NOT NULL,
    "oneTime" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserQuestProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "status" "UserQuestStatus" NOT NULL DEFAULT 'AVAILABLE',
    "progressValue" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserQuestProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "status" "QuestSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "proofUrl" TEXT,
    "note" TEXT,
    "reviewedByAdmin" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "SeasonStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" "LeagueTier" NOT NULL,
    "minRating" INTEGER NOT NULL,
    "maxRating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ContestStatus" NOT NULL DEFAULT 'DRAFT',
    "configPublishedAt" TIMESTAMP(3),
    "openAt" TIMESTAMP(3),
    "liveAt" TIMESTAMP(3),
    "lockAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "qstashOpenJobId" TEXT,
    "qstashLiveJobId" TEXT,
    "qstashSettleJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "seasonId" TEXT,
    "leagueTierRequired" "LeagueTier",

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestRule" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "cardSetId" TEXT,
    "maxRosterSize" INTEGER,
    "teamSizeMode" "ContestTeamSizeMode" NOT NULL DEFAULT 'EXACT',
    "eligibilityMode" "ContestEligibilityMode" NOT NULL DEFAULT 'ANY',
    "entryFeeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "entryFeeCurrency" TEXT NOT NULL DEFAULT 'POINTS',
    "entryFeeAmount" INTEGER,
    "config" JSONB,

    CONSTRAINT "ContestRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestRewardPolicy" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "status" "ContestRewardPolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestRewardPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestRewardBundle" (
    "id" TEXT NOT NULL,
    "rewardPolicyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestRewardBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestRewardComponent" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "type" "ContestRewardType" NOT NULL,
    "pointsAmount" INTEGER,
    "xpAmount" INTEGER,
    "packDefinitionId" TEXT,
    "packQuantity" INTEGER,

    CONSTRAINT "ContestRewardComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestRewardDistributionRule" (
    "id" TEXT NOT NULL,
    "rewardPolicyId" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "ruleType" "ContestRewardDistributionRuleType" NOT NULL,
    "rankFrom" INTEGER,
    "rankTo" INTEGER,
    "topN" INTEGER,
    "topPercent" DOUBLE PRECISION,

    CONSTRAINT "ContestRewardDistributionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestEntry" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ContestEntryStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RosterLock" (
    "id" TEXT NOT NULL,
    "contestEntryId" TEXT NOT NULL,
    "ownedCardInstanceId" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RosterLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestTokenSnapshot" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "tokenProjectId" TEXT NOT NULL,
    "geckoId" TEXT NOT NULL,
    "phase" "ContestSnapshotPhase" NOT NULL,
    "priceUsd" DECIMAL(20,8),
    "marketCapUsd" DECIMAL(30,8),
    "volume24hUsd" DECIMAL(30,8),
    "marketCapRank" INTEGER,
    "marketDataUpdatedAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT NOT NULL DEFAULT 'COINGECKO',
    "capturedCount" INTEGER NOT NULL DEFAULT 0,
    "missingCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ContestTokenSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestTokenScore" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "tokenProjectId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "priceChange" DOUBLE PRECISION,
    "marketCapChange" DOUBLE PRECISION,
    "volumeChange" DOUBLE PRECISION,
    "rankChange" DOUBLE PRECISION,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestTokenScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestEntryScoreBreakdown" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "tokenProjectId" TEXT NOT NULL,
    "cardInstanceId" TEXT NOT NULL,
    "rosterLockId" TEXT NOT NULL,
    "baseScore" DOUBLE PRECISION NOT NULL,
    "rarityMultiplier" DOUBLE PRECISION NOT NULL,
    "editionMultiplier" DOUBLE PRECISION NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "dataQuality" TEXT NOT NULL DEFAULT 'COMPLETE',
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestEntryScoreBreakdown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestScore" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "scoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestRanking" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "rankedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestRanking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestSettlement" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestSettlementPlan" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "status" "ContestSettlementPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "source" TEXT NOT NULL DEFAULT 'AUTO_POLICY_V1',
    "policySnapshot" JSONB,
    "rankingSnapshotSize" INTEGER NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestSettlementPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestSettlementPlanItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "sourceRuleId" TEXT,
    "sourceRuleType" TEXT,
    "sourceBundleId" TEXT,
    "rewardComponents" JSONB NOT NULL,
    "pointsTotal" INTEGER NOT NULL DEFAULT 0,
    "xpTotal" INTEGER NOT NULL DEFAULT 0,
    "packsTotal" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestSettlementPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserContestRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 1200,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserContestRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestRatingChange" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "percentile" DOUBLE PRECISION NOT NULL,
    "ratingDelta" INTEGER NOT NULL,
    "pointsDelta" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestRatingChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonLeaderboard" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonLeaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonRewardGrant" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "rewardType" "ContestRewardType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonRewardGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProgression" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProgression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionProgression" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardSetId" TEXT,
    "completionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionProgression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitiveProgression" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contestsEntered" INTEGER NOT NULL DEFAULT 0,
    "contestsWon" INTEGER NOT NULL DEFAULT 0,
    "rating" INTEGER NOT NULL DEFAULT 1000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitiveProgression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminActionLog" (
    "id" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorLabel" TEXT NOT NULL,
    "authMode" TEXT NOT NULL,
    "status" "AdminActionStatus" NOT NULL,
    "requestSummary" JSONB,
    "effectSummary" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminOpArtifact" (
    "id" TEXT NOT NULL,
    "artifactType" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "payload" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminOpArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminIdempotencyKey" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "actorId" TEXT NOT NULL,
    "actionLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminIdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_xUserId_key" ON "User"("xUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteCode_key" ON "User"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvite_inviteeId_key" ON "UserInvite"("inviteeId");

-- CreateIndex
CREATE INDEX "UserInvite_inviterId_idx" ON "UserInvite"("inviterId");

-- CreateIndex
CREATE INDEX "UserInvite_inviteCode_idx" ON "UserInvite"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvite_inviterId_inviteeId_key" ON "UserInvite"("inviterId", "inviteeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_sessionTokenHash_key" ON "UserSession"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- CreateIndex
CREATE INDEX "UserCard_userId_idx" ON "UserCard"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCard_userId_baseCardId_key" ON "UserCard"("userId", "baseCardId");

-- CreateIndex
CREATE INDEX "PackOpening_userId_idx" ON "PackOpening"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TokenProject_slug_key" ON "TokenProject"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TokenProject_coingeckoId_key" ON "TokenProject"("coingeckoId");

-- CreateIndex
CREATE UNIQUE INDEX "CardSet_code_key" ON "CardSet"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Rarity_code_key" ON "Rarity"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Edition_code_key" ON "Edition"("code");

-- CreateIndex
CREATE INDEX "CardTemplate_tokenProjectId_idx" ON "CardTemplate"("tokenProjectId");

-- CreateIndex
CREATE INDEX "CardTemplate_cardSetId_idx" ON "CardTemplate"("cardSetId");

-- CreateIndex
CREATE UNIQUE INDEX "CardTemplate_tokenProjectId_cardSetId_rarityId_editionId_key" ON "CardTemplate"("tokenProjectId", "cardSetId", "rarityId", "editionId");

-- CreateIndex
CREATE INDEX "OwnedCardInstance_userId_idx" ON "OwnedCardInstance"("userId");

-- CreateIndex
CREATE INDEX "OwnedCardInstance_cardTemplateId_idx" ON "OwnedCardInstance"("cardTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "PackDefinition_code_key" ON "PackDefinition"("code");

-- CreateIndex
CREATE INDEX "PackDefinition_cardSetId_idx" ON "PackDefinition"("cardSetId");

-- CreateIndex
CREATE INDEX "DropTable_packDefinitionId_idx" ON "DropTable"("packDefinitionId");

-- CreateIndex
CREATE INDEX "DropTableRow_dropTableId_idx" ON "DropTableRow"("dropTableId");

-- CreateIndex
CREATE INDEX "DropTableRow_rarityId_idx" ON "DropTableRow"("rarityId");

-- CreateIndex
CREATE INDEX "DropTableRow_editionId_idx" ON "DropTableRow"("editionId");

-- CreateIndex
CREATE INDEX "PackOpeningEvent_userId_idx" ON "PackOpeningEvent"("userId");

-- CreateIndex
CREATE INDEX "PackOpeningEvent_packDefinitionId_idx" ON "PackOpeningEvent"("packDefinitionId");

-- CreateIndex
CREATE INDEX "RewardGrant_userId_idx" ON "RewardGrant"("userId");

-- CreateIndex
CREATE INDEX "RewardGrant_type_idx" ON "RewardGrant"("type");

-- CreateIndex
CREATE INDEX "RewardGrant_claimedAt_idx" ON "RewardGrant"("claimedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RewardLedgerEntry_idempotencyKey_key" ON "RewardLedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "RewardLedgerEntry_userId_createdAt_idx" ON "RewardLedgerEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RewardLedgerEntry_reasonType_idx" ON "RewardLedgerEntry"("reasonType");

-- CreateIndex
CREATE UNIQUE INDEX "QuestDefinition_code_key" ON "QuestDefinition"("code");

-- CreateIndex
CREATE INDEX "QuestDefinition_rewardPackDefinitionId_idx" ON "QuestDefinition"("rewardPackDefinitionId");

-- CreateIndex
CREATE INDEX "UserQuestProgress_userId_idx" ON "UserQuestProgress"("userId");

-- CreateIndex
CREATE INDEX "UserQuestProgress_questId_idx" ON "UserQuestProgress"("questId");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuestProgress_userId_questId_key" ON "UserQuestProgress"("userId", "questId");

-- CreateIndex
CREATE INDEX "QuestSubmission_userId_idx" ON "QuestSubmission"("userId");

-- CreateIndex
CREATE INDEX "QuestSubmission_questId_idx" ON "QuestSubmission"("questId");

-- CreateIndex
CREATE INDEX "QuestSubmission_status_idx" ON "QuestSubmission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Season_name_key" ON "Season"("name");

-- CreateIndex
CREATE INDEX "Season_status_startsAt_idx" ON "Season"("status", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "League_name_key" ON "League"("name");

-- CreateIndex
CREATE UNIQUE INDEX "League_tier_key" ON "League"("tier");

-- CreateIndex
CREATE INDEX "League_minRating_maxRating_idx" ON "League"("minRating", "maxRating");

-- CreateIndex
CREATE UNIQUE INDEX "Contest_code_key" ON "Contest"("code");

-- CreateIndex
CREATE INDEX "ContestRule_contestId_idx" ON "ContestRule"("contestId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestRewardPolicy_contestId_key" ON "ContestRewardPolicy"("contestId");

-- CreateIndex
CREATE INDEX "ContestRewardBundle_rewardPolicyId_idx" ON "ContestRewardBundle"("rewardPolicyId");

-- CreateIndex
CREATE INDEX "ContestRewardComponent_bundleId_idx" ON "ContestRewardComponent"("bundleId");

-- CreateIndex
CREATE INDEX "ContestRewardDistributionRule_rewardPolicyId_priority_idx" ON "ContestRewardDistributionRule"("rewardPolicyId", "priority");

-- CreateIndex
CREATE INDEX "ContestEntry_contestId_idx" ON "ContestEntry"("contestId");

-- CreateIndex
CREATE INDEX "ContestEntry_userId_idx" ON "ContestEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestEntry_contestId_userId_key" ON "ContestEntry"("contestId", "userId");

-- CreateIndex
CREATE INDEX "RosterLock_ownedCardInstanceId_idx" ON "RosterLock"("ownedCardInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "RosterLock_contestEntryId_ownedCardInstanceId_key" ON "RosterLock"("contestEntryId", "ownedCardInstanceId");

-- CreateIndex
CREATE INDEX "ContestTokenSnapshot_contestId_phase_idx" ON "ContestTokenSnapshot"("contestId", "phase");

-- CreateIndex
CREATE INDEX "ContestTokenSnapshot_geckoId_idx" ON "ContestTokenSnapshot"("geckoId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestTokenSnapshot_contestId_tokenProjectId_phase_key" ON "ContestTokenSnapshot"("contestId", "tokenProjectId", "phase");

-- CreateIndex
CREATE INDEX "ContestTokenScore_contestId_score_idx" ON "ContestTokenScore"("contestId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "ContestTokenScore_contestId_tokenProjectId_key" ON "ContestTokenScore"("contestId", "tokenProjectId");

-- CreateIndex
CREATE INDEX "ContestEntryScoreBreakdown_entryId_idx" ON "ContestEntryScoreBreakdown"("entryId");

-- CreateIndex
CREATE INDEX "ContestEntryScoreBreakdown_tokenProjectId_idx" ON "ContestEntryScoreBreakdown"("tokenProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestEntryScoreBreakdown_entryId_cardInstanceId_key" ON "ContestEntryScoreBreakdown"("entryId", "cardInstanceId");

-- CreateIndex
CREATE INDEX "ContestScore_contestId_idx" ON "ContestScore"("contestId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestScore_contestId_userId_key" ON "ContestScore"("contestId", "userId");

-- CreateIndex
CREATE INDEX "ContestRanking_contestId_rank_idx" ON "ContestRanking"("contestId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "ContestRanking_contestId_userId_key" ON "ContestRanking"("contestId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestSettlement_contestId_key" ON "ContestSettlement"("contestId");

-- CreateIndex
CREATE INDEX "ContestSettlementPlan_contestId_createdAt_idx" ON "ContestSettlementPlan"("contestId", "createdAt");

-- CreateIndex
CREATE INDEX "ContestSettlementPlan_status_createdAt_idx" ON "ContestSettlementPlan"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ContestSettlementPlanItem_planId_rank_idx" ON "ContestSettlementPlanItem"("planId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "ContestSettlementPlanItem_planId_userId_key" ON "ContestSettlementPlanItem"("planId", "userId");

-- CreateIndex
CREATE INDEX "UserContestRating_seasonId_rating_idx" ON "UserContestRating"("seasonId", "rating");

-- CreateIndex
CREATE UNIQUE INDEX "UserContestRating_userId_seasonId_key" ON "UserContestRating"("userId", "seasonId");

-- CreateIndex
CREATE INDEX "ContestRatingChange_seasonId_createdAt_idx" ON "ContestRatingChange"("seasonId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContestRatingChange_contestId_userId_key" ON "ContestRatingChange"("contestId", "userId");

-- CreateIndex
CREATE INDEX "SeasonLeaderboard_seasonId_points_idx" ON "SeasonLeaderboard"("seasonId", "points");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonLeaderboard_seasonId_userId_key" ON "SeasonLeaderboard"("seasonId", "userId");

-- CreateIndex
CREATE INDEX "SeasonRewardGrant_seasonId_rank_idx" ON "SeasonRewardGrant"("seasonId", "rank");

-- CreateIndex
CREATE INDEX "SeasonRewardGrant_userId_createdAt_idx" ON "SeasonRewardGrant"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserProgression_userId_key" ON "UserProgression"("userId");

-- CreateIndex
CREATE INDEX "CollectionProgression_userId_idx" ON "CollectionProgression"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionProgression_userId_cardSetId_key" ON "CollectionProgression"("userId", "cardSetId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitiveProgression_userId_key" ON "CompetitiveProgression"("userId");

-- CreateIndex
CREATE INDEX "AdminActionLog_module_createdAt_idx" ON "AdminActionLog"("module", "createdAt");

-- CreateIndex
CREATE INDEX "AdminActionLog_actionType_createdAt_idx" ON "AdminActionLog"("actionType", "createdAt");

-- CreateIndex
CREATE INDEX "AdminActionLog_targetType_targetId_idx" ON "AdminActionLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AdminOpArtifact_artifactType_createdAt_idx" ON "AdminOpArtifact"("artifactType", "createdAt");

-- CreateIndex
CREATE INDEX "AdminOpArtifact_expiresAt_idx" ON "AdminOpArtifact"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminIdempotencyKey_idempotencyKey_key" ON "AdminIdempotencyKey"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AdminIdempotencyKey_actionType_createdAt_idx" ON "AdminIdempotencyKey"("actionType", "createdAt");

-- CreateIndex
CREATE INDEX "AdminIdempotencyKey_targetType_targetId_idx" ON "AdminIdempotencyKey"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCard" ADD CONSTRAINT "UserCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackOpening" ADD CONSTRAINT "PackOpening_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardTemplate" ADD CONSTRAINT "CardTemplate_tokenProjectId_fkey" FOREIGN KEY ("tokenProjectId") REFERENCES "TokenProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardTemplate" ADD CONSTRAINT "CardTemplate_cardSetId_fkey" FOREIGN KEY ("cardSetId") REFERENCES "CardSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardTemplate" ADD CONSTRAINT "CardTemplate_rarityId_fkey" FOREIGN KEY ("rarityId") REFERENCES "Rarity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardTemplate" ADD CONSTRAINT "CardTemplate_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnedCardInstance" ADD CONSTRAINT "OwnedCardInstance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnedCardInstance" ADD CONSTRAINT "OwnedCardInstance_cardTemplateId_fkey" FOREIGN KEY ("cardTemplateId") REFERENCES "CardTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnedCardInstance" ADD CONSTRAINT "OwnedCardInstance_sourcePackOpeningEventId_fkey" FOREIGN KEY ("sourcePackOpeningEventId") REFERENCES "PackOpeningEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackDefinition" ADD CONSTRAINT "PackDefinition_cardSetId_fkey" FOREIGN KEY ("cardSetId") REFERENCES "CardSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DropTable" ADD CONSTRAINT "DropTable_packDefinitionId_fkey" FOREIGN KEY ("packDefinitionId") REFERENCES "PackDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DropTableRow" ADD CONSTRAINT "DropTableRow_dropTableId_fkey" FOREIGN KEY ("dropTableId") REFERENCES "DropTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DropTableRow" ADD CONSTRAINT "DropTableRow_rarityId_fkey" FOREIGN KEY ("rarityId") REFERENCES "Rarity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DropTableRow" ADD CONSTRAINT "DropTableRow_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackOpeningEvent" ADD CONSTRAINT "PackOpeningEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackOpeningEvent" ADD CONSTRAINT "PackOpeningEvent_packDefinitionId_fkey" FOREIGN KEY ("packDefinitionId") REFERENCES "PackDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardGrant" ADD CONSTRAINT "RewardGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardGrant" ADD CONSTRAINT "RewardGrant_packDefinitionId_fkey" FOREIGN KEY ("packDefinitionId") REFERENCES "PackDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardGrant" ADD CONSTRAINT "RewardGrant_sourcePackOpeningEventId_fkey" FOREIGN KEY ("sourcePackOpeningEventId") REFERENCES "PackOpeningEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardGrant" ADD CONSTRAINT "RewardGrant_sourceContestSettlementId_fkey" FOREIGN KEY ("sourceContestSettlementId") REFERENCES "ContestSettlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardLedgerEntry" ADD CONSTRAINT "RewardLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestDefinition" ADD CONSTRAINT "QuestDefinition_rewardPackDefinitionId_fkey" FOREIGN KEY ("rewardPackDefinitionId") REFERENCES "PackDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuestProgress" ADD CONSTRAINT "UserQuestProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuestProgress" ADD CONSTRAINT "UserQuestProgress_questId_fkey" FOREIGN KEY ("questId") REFERENCES "QuestDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestSubmission" ADD CONSTRAINT "QuestSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestSubmission" ADD CONSTRAINT "QuestSubmission_questId_fkey" FOREIGN KEY ("questId") REFERENCES "QuestDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestRule" ADD CONSTRAINT "ContestRule_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestRule" ADD CONSTRAINT "ContestRule_cardSetId_fkey" FOREIGN KEY ("cardSetId") REFERENCES "CardSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestRewardPolicy" ADD CONSTRAINT "ContestRewardPolicy_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestRewardBundle" ADD CONSTRAINT "ContestRewardBundle_rewardPolicyId_fkey" FOREIGN KEY ("rewardPolicyId") REFERENCES "ContestRewardPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestRewardComponent" ADD CONSTRAINT "ContestRewardComponent_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "ContestRewardBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestRewardComponent" ADD CONSTRAINT "ContestRewardComponent_packDefinitionId_fkey" FOREIGN KEY ("packDefinitionId") REFERENCES "PackDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestRewardDistributionRule" ADD CONSTRAINT "ContestRewardDistributionRule_rewardPolicyId_fkey" FOREIGN KEY ("rewardPolicyId") REFERENCES "ContestRewardPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestRewardDistributionRule" ADD CONSTRAINT "ContestRewardDistributionRule_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "ContestRewardBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterLock" ADD CONSTRAINT "RosterLock_contestEntryId_fkey" FOREIGN KEY ("contestEntryId") REFERENCES "ContestEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterLock" ADD CONSTRAINT "RosterLock_ownedCardInstanceId_fkey" FOREIGN KEY ("ownedCardInstanceId") REFERENCES "OwnedCardInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestTokenSnapshot" ADD CONSTRAINT "ContestTokenSnapshot_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestTokenSnapshot" ADD CONSTRAINT "ContestTokenSnapshot_tokenProjectId_fkey" FOREIGN KEY ("tokenProjectId") REFERENCES "TokenProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestTokenScore" ADD CONSTRAINT "ContestTokenScore_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestTokenScore" ADD CONSTRAINT "ContestTokenScore_tokenProjectId_fkey" FOREIGN KEY ("tokenProjectId") REFERENCES "TokenProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntryScoreBreakdown" ADD CONSTRAINT "ContestEntryScoreBreakdown_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ContestEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntryScoreBreakdown" ADD CONSTRAINT "ContestEntryScoreBreakdown_tokenProjectId_fkey" FOREIGN KEY ("tokenProjectId") REFERENCES "TokenProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntryScoreBreakdown" ADD CONSTRAINT "ContestEntryScoreBreakdown_cardInstanceId_fkey" FOREIGN KEY ("cardInstanceId") REFERENCES "OwnedCardInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntryScoreBreakdown" ADD CONSTRAINT "ContestEntryScoreBreakdown_rosterLockId_fkey" FOREIGN KEY ("rosterLockId") REFERENCES "RosterLock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestScore" ADD CONSTRAINT "ContestScore_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestScore" ADD CONSTRAINT "ContestScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestRanking" ADD CONSTRAINT "ContestRanking_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestRanking" ADD CONSTRAINT "ContestRanking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestSettlement" ADD CONSTRAINT "ContestSettlement_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestSettlementPlan" ADD CONSTRAINT "ContestSettlementPlan_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestSettlementPlanItem" ADD CONSTRAINT "ContestSettlementPlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ContestSettlementPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestSettlementPlanItem" ADD CONSTRAINT "ContestSettlementPlanItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContestRating" ADD CONSTRAINT "UserContestRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContestRating" ADD CONSTRAINT "UserContestRating_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestRatingChange" ADD CONSTRAINT "ContestRatingChange_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestRatingChange" ADD CONSTRAINT "ContestRatingChange_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestRatingChange" ADD CONSTRAINT "ContestRatingChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonLeaderboard" ADD CONSTRAINT "SeasonLeaderboard_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonLeaderboard" ADD CONSTRAINT "SeasonLeaderboard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonRewardGrant" ADD CONSTRAINT "SeasonRewardGrant_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonRewardGrant" ADD CONSTRAINT "SeasonRewardGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProgression" ADD CONSTRAINT "UserProgression_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionProgression" ADD CONSTRAINT "CollectionProgression_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionProgression" ADD CONSTRAINT "CollectionProgression_cardSetId_fkey" FOREIGN KEY ("cardSetId") REFERENCES "CardSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitiveProgression" ADD CONSTRAINT "CompetitiveProgression_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

