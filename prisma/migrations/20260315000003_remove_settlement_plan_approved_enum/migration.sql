-- Fix 7: Remove APPROVED from ContestSettlementPlanStatus enum
-- APPROVED was dead code: no code path ever set a plan to APPROVED status.
-- The execute flow goes directly DRAFT → EXECUTED.

-- PostgreSQL requires creating a new type, migrating the column, then dropping the old type.
-- Ensure no rows have APPROVED status first (they shouldn't; it was never written).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "ContestSettlementPlan" WHERE status = 'APPROVED') THEN
    RAISE EXCEPTION 'Cannot remove APPROVED: rows with APPROVED status exist';
  END IF;
END $$;

CREATE TYPE "ContestSettlementPlanStatus_new" AS ENUM ('DRAFT', 'EXECUTED', 'CANCELED');

ALTER TABLE "ContestSettlementPlan"
  ALTER COLUMN "status" TYPE "ContestSettlementPlanStatus_new"
  USING "status"::text::"ContestSettlementPlanStatus_new";

DROP TYPE "ContestSettlementPlanStatus";

ALTER TYPE "ContestSettlementPlanStatus_new" RENAME TO "ContestSettlementPlanStatus";
