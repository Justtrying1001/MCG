-- Phase 2 contest settlement plan auto-derivation foundation

DO $$ BEGIN
  CREATE TYPE "ContestSettlementPlanStatus" AS ENUM ('DRAFT', 'APPROVED', 'EXECUTED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ContestSettlementPlan" (
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

CREATE INDEX IF NOT EXISTS "ContestSettlementPlan_contestId_createdAt_idx" ON "ContestSettlementPlan"("contestId", "createdAt");
CREATE INDEX IF NOT EXISTS "ContestSettlementPlan_status_createdAt_idx" ON "ContestSettlementPlan"("status", "createdAt");
ALTER TABLE "ContestSettlementPlan" ADD CONSTRAINT "ContestSettlementPlan_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ContestSettlementPlanItem" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "ContestSettlementPlanItem_planId_userId_key" ON "ContestSettlementPlanItem"("planId", "userId");
CREATE INDEX IF NOT EXISTS "ContestSettlementPlanItem_planId_rank_idx" ON "ContestSettlementPlanItem"("planId", "rank");
ALTER TABLE "ContestSettlementPlanItem" ADD CONSTRAINT "ContestSettlementPlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ContestSettlementPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContestSettlementPlanItem" ADD CONSTRAINT "ContestSettlementPlanItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
