-- Phase 1 contest admin creation/config foundation

DO $$ BEGIN
  CREATE TYPE "ContestTeamSizeMode" AS ENUM ('EXACT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ContestEligibilityMode" AS ENUM ('ANY', 'CARD_SET_ONLY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ContestRewardPolicyStatus" AS ENUM ('DRAFT', 'PUBLISHED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ContestRewardType" AS ENUM ('POINTS', 'PACK', 'XP');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ContestRewardDistributionRuleType" AS ENUM ('FIXED_RANKS', 'TOP_N', 'TOP_PERCENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "RewardLedgerReasonType" ADD VALUE 'CONTEST_ENTRY_FEE';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "configPublishedAt" TIMESTAMP(3);

ALTER TABLE "ContestRule" ADD COLUMN IF NOT EXISTS "teamSizeMode" "ContestTeamSizeMode" NOT NULL DEFAULT 'EXACT';
ALTER TABLE "ContestRule" ADD COLUMN IF NOT EXISTS "teamSizeValue" INTEGER;
ALTER TABLE "ContestRule" ADD COLUMN IF NOT EXISTS "eligibilityMode" "ContestEligibilityMode" NOT NULL DEFAULT 'ANY';
ALTER TABLE "ContestRule" ADD COLUMN IF NOT EXISTS "entryFeeEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ContestRule" ADD COLUMN IF NOT EXISTS "entryFeeCurrency" TEXT NOT NULL DEFAULT 'POINTS';
ALTER TABLE "ContestRule" ADD COLUMN IF NOT EXISTS "entryFeeAmount" INTEGER;

CREATE TABLE IF NOT EXISTS "ContestRewardPolicy" (
  "id" TEXT NOT NULL,
  "contestId" TEXT NOT NULL,
  "status" "ContestRewardPolicyStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContestRewardPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ContestRewardPolicy_contestId_key" ON "ContestRewardPolicy"("contestId");
ALTER TABLE "ContestRewardPolicy" ADD CONSTRAINT "ContestRewardPolicy_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ContestRewardBundle" (
  "id" TEXT NOT NULL,
  "rewardPolicyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContestRewardBundle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ContestRewardBundle_rewardPolicyId_idx" ON "ContestRewardBundle"("rewardPolicyId");
ALTER TABLE "ContestRewardBundle" ADD CONSTRAINT "ContestRewardBundle_rewardPolicyId_fkey" FOREIGN KEY ("rewardPolicyId") REFERENCES "ContestRewardPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ContestRewardComponent" (
  "id" TEXT NOT NULL,
  "bundleId" TEXT NOT NULL,
  "type" "ContestRewardType" NOT NULL,
  "pointsAmount" INTEGER,
  "xpAmount" INTEGER,
  "packDefinitionId" TEXT,
  "packQuantity" INTEGER,
  CONSTRAINT "ContestRewardComponent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ContestRewardComponent_bundleId_idx" ON "ContestRewardComponent"("bundleId");
ALTER TABLE "ContestRewardComponent" ADD CONSTRAINT "ContestRewardComponent_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "ContestRewardBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContestRewardComponent" ADD CONSTRAINT "ContestRewardComponent_packDefinitionId_fkey" FOREIGN KEY ("packDefinitionId") REFERENCES "PackDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ContestRewardDistributionRule" (
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

CREATE INDEX IF NOT EXISTS "ContestRewardDistributionRule_rewardPolicyId_priority_idx" ON "ContestRewardDistributionRule"("rewardPolicyId", "priority");
ALTER TABLE "ContestRewardDistributionRule" ADD CONSTRAINT "ContestRewardDistributionRule_rewardPolicyId_fkey" FOREIGN KEY ("rewardPolicyId") REFERENCES "ContestRewardPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContestRewardDistributionRule" ADD CONSTRAINT "ContestRewardDistributionRule_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "ContestRewardBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
