ALTER TABLE "RewardGrant"
ADD COLUMN "claimedAt" TIMESTAMP(3);

UPDATE "RewardGrant"
SET "claimedAt" = COALESCE("claimedAt", "createdAt")
WHERE "type" = 'PACK' AND "sourcePackOpeningEventId" IS NOT NULL;

CREATE INDEX "RewardGrant_claimedAt_idx" ON "RewardGrant"("claimedAt");
