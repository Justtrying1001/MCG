ALTER TYPE "ContestRewardDistributionRuleType" ADD VALUE IF NOT EXISTS 'POINTS_POOL_TOP_PERCENT';

ALTER TABLE "ContestRewardDistributionRule"
ADD COLUMN IF NOT EXISTS "poolAmount" INTEGER;
