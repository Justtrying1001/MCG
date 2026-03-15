-- Fix 18: Remove ContestRule.teamSizeValue duplicate field
-- maxRosterSize is the canonical field; teamSizeValue was a redundant alias.
-- Migrate any rows where maxRosterSize is NULL but teamSizeValue is set.

UPDATE "ContestRule"
SET "maxRosterSize" = "teamSizeValue"
WHERE "maxRosterSize" IS NULL AND "teamSizeValue" IS NOT NULL;

ALTER TABLE "ContestRule" DROP COLUMN IF EXISTS "teamSizeValue";
