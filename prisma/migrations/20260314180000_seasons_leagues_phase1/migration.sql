-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LeagueTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'LEGEND');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "leagueId" TEXT;
ALTER TABLE "Contest" ADD COLUMN "seasonId" TEXT, ADD COLUMN "leagueTierRequired" "LeagueTier";

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

-- Indexes
CREATE UNIQUE INDEX "Season_name_key" ON "Season"("name");
CREATE INDEX "Season_status_startsAt_idx" ON "Season"("status", "startsAt");
CREATE UNIQUE INDEX "League_name_key" ON "League"("name");
CREATE UNIQUE INDEX "League_tier_key" ON "League"("tier");
CREATE INDEX "League_minRating_maxRating_idx" ON "League"("minRating", "maxRating");
CREATE UNIQUE INDEX "UserContestRating_userId_seasonId_key" ON "UserContestRating"("userId", "seasonId");
CREATE INDEX "UserContestRating_seasonId_rating_idx" ON "UserContestRating"("seasonId", "rating");
CREATE UNIQUE INDEX "ContestRatingChange_contestId_userId_key" ON "ContestRatingChange"("contestId", "userId");
CREATE INDEX "ContestRatingChange_seasonId_createdAt_idx" ON "ContestRatingChange"("seasonId", "createdAt");
CREATE UNIQUE INDEX "SeasonLeaderboard_seasonId_userId_key" ON "SeasonLeaderboard"("seasonId", "userId");
CREATE INDEX "SeasonLeaderboard_seasonId_points_idx" ON "SeasonLeaderboard"("seasonId", "points");
CREATE INDEX "SeasonRewardGrant_seasonId_rank_idx" ON "SeasonRewardGrant"("seasonId", "rank");
CREATE INDEX "SeasonRewardGrant_userId_createdAt_idx" ON "SeasonRewardGrant"("userId", "createdAt");
CREATE INDEX "User_leagueId_idx" ON "User"("leagueId");

-- FKs
ALTER TABLE "User" ADD CONSTRAINT "User_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserContestRating" ADD CONSTRAINT "UserContestRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserContestRating" ADD CONSTRAINT "UserContestRating_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContestRatingChange" ADD CONSTRAINT "ContestRatingChange_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContestRatingChange" ADD CONSTRAINT "ContestRatingChange_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContestRatingChange" ADD CONSTRAINT "ContestRatingChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeasonLeaderboard" ADD CONSTRAINT "SeasonLeaderboard_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeasonLeaderboard" ADD CONSTRAINT "SeasonLeaderboard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeasonRewardGrant" ADD CONSTRAINT "SeasonRewardGrant_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeasonRewardGrant" ADD CONSTRAINT "SeasonRewardGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
