-- Fix 1: Rename Contest.startsAt → Contest.liveAt
-- Eliminates semantic ambiguity: startsAt was used as "when contest goes LIVE",
-- not "when entries open". Rename clarifies intent.

ALTER TABLE "Contest" RENAME COLUMN "startsAt" TO "liveAt";
