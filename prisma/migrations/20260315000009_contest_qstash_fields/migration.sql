-- Add openAt scheduling field and QStash job ID fields to Contest

ALTER TABLE "Contest"
  ADD COLUMN IF NOT EXISTS "openAt"            TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "qstashOpenJobId"   TEXT,
  ADD COLUMN IF NOT EXISTS "qstashLiveJobId"   TEXT,
  ADD COLUMN IF NOT EXISTS "qstashSettleJobId" TEXT;
