ALTER TYPE "UserQuestStatus" ADD VALUE 'PENDING_VALIDATION';

ALTER TABLE "UserQuestProgress"
ADD COLUMN "startedAt" TIMESTAMP(3);

CREATE INDEX "UserQuestProgress_startedAt_idx" ON "UserQuestProgress"("startedAt");
