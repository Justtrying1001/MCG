-- AlterTable
ALTER TABLE "Event" ADD COLUMN "visitorId" TEXT;

-- CreateIndex
CREATE INDEX "Event_visitorId_createdAt_idx" ON "Event"("visitorId", "createdAt");
