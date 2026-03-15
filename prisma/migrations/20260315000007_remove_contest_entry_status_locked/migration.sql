-- Fix 17: Remove LOCKED from ContestEntryStatus enum
-- LOCKED was dead code: no code path ever set an entry to LOCKED status.
-- Entries go SUBMITTED → SCORED → SETTLED (or CANCELED).

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "ContestEntry" WHERE status = 'LOCKED') THEN
    RAISE EXCEPTION 'Cannot remove LOCKED: rows with LOCKED status exist';
  END IF;
END $$;

CREATE TYPE "ContestEntryStatus_new" AS ENUM ('SUBMITTED', 'SCORED', 'SETTLED', 'CANCELED');

ALTER TABLE "ContestEntry"
  ALTER COLUMN "status" TYPE "ContestEntryStatus_new"
  USING "status"::text::"ContestEntryStatus_new";

DROP TYPE "ContestEntryStatus";

ALTER TYPE "ContestEntryStatus_new" RENAME TO "ContestEntryStatus";
