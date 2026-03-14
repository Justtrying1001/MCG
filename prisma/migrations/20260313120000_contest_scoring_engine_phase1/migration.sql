-- Phase 1 contest scoring engine foundation (CoinGecko snapshots + token scoring)

DO $$ BEGIN
  ALTER TABLE "TokenProject" ADD COLUMN "coingeckoId" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE UNIQUE INDEX "TokenProject_coingeckoId_key" ON "TokenProject"("coingeckoId");
EXCEPTION WHEN duplicate_table THEN NULL;
WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ContestSnapshotPhase" AS ENUM ('START', 'END');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ContestTokenSnapshot" (
  "id" TEXT NOT NULL,
  "contestId" TEXT NOT NULL,
  "tokenProjectId" TEXT NOT NULL,
  "geckoId" TEXT NOT NULL,
  "phase" "ContestSnapshotPhase" NOT NULL,
  "priceUsd" DECIMAL(20,8),
  "marketCapUsd" DECIMAL(30,8),
  "volume24hUsd" DECIMAL(30,8),
  "marketCapRank" INTEGER,
  "marketDataUpdatedAt" TIMESTAMP(3),
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "provider" TEXT NOT NULL DEFAULT 'COINGECKO',
  CONSTRAINT "ContestTokenSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ContestTokenSnapshot_contestId_tokenProjectId_phase_key"
  ON "ContestTokenSnapshot"("contestId", "tokenProjectId", "phase");
CREATE INDEX IF NOT EXISTS "ContestTokenSnapshot_contestId_phase_idx"
  ON "ContestTokenSnapshot"("contestId", "phase");
CREATE INDEX IF NOT EXISTS "ContestTokenSnapshot_geckoId_idx"
  ON "ContestTokenSnapshot"("geckoId");

ALTER TABLE "ContestTokenSnapshot"
  ADD CONSTRAINT "ContestTokenSnapshot_contestId_fkey"
  FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContestTokenSnapshot"
  ADD CONSTRAINT "ContestTokenSnapshot_tokenProjectId_fkey"
  FOREIGN KEY ("tokenProjectId") REFERENCES "TokenProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ContestTokenScore" (
  "id" TEXT NOT NULL,
  "contestId" TEXT NOT NULL,
  "tokenProjectId" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "priceChange" DOUBLE PRECISION,
  "marketCapChange" DOUBLE PRECISION,
  "volumeChange" DOUBLE PRECISION,
  "rankChange" DOUBLE PRECISION,
  "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContestTokenScore_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ContestTokenScore_contestId_tokenProjectId_key"
  ON "ContestTokenScore"("contestId", "tokenProjectId");
CREATE INDEX IF NOT EXISTS "ContestTokenScore_contestId_score_idx"
  ON "ContestTokenScore"("contestId", "score");

ALTER TABLE "ContestTokenScore"
  ADD CONSTRAINT "ContestTokenScore_contestId_fkey"
  FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContestTokenScore"
  ADD CONSTRAINT "ContestTokenScore_tokenProjectId_fkey"
  FOREIGN KEY ("tokenProjectId") REFERENCES "TokenProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ContestEntryScoreBreakdown" (
  "id" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "tokenProjectId" TEXT NOT NULL,
  "cardInstanceId" TEXT NOT NULL,
  "rosterLockId" TEXT NOT NULL,
  "baseScore" DOUBLE PRECISION NOT NULL,
  "rarityMultiplier" DOUBLE PRECISION NOT NULL,
  "editionMultiplier" DOUBLE PRECISION NOT NULL,
  "finalScore" DOUBLE PRECISION NOT NULL,
  "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContestEntryScoreBreakdown_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ContestEntryScoreBreakdown_entryId_cardInstanceId_key"
  ON "ContestEntryScoreBreakdown"("entryId", "cardInstanceId");
CREATE INDEX IF NOT EXISTS "ContestEntryScoreBreakdown_entryId_idx"
  ON "ContestEntryScoreBreakdown"("entryId");
CREATE INDEX IF NOT EXISTS "ContestEntryScoreBreakdown_tokenProjectId_idx"
  ON "ContestEntryScoreBreakdown"("tokenProjectId");

ALTER TABLE "ContestEntryScoreBreakdown"
  ADD CONSTRAINT "ContestEntryScoreBreakdown_entryId_fkey"
  FOREIGN KEY ("entryId") REFERENCES "ContestEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContestEntryScoreBreakdown"
  ADD CONSTRAINT "ContestEntryScoreBreakdown_tokenProjectId_fkey"
  FOREIGN KEY ("tokenProjectId") REFERENCES "TokenProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContestEntryScoreBreakdown"
  ADD CONSTRAINT "ContestEntryScoreBreakdown_cardInstanceId_fkey"
  FOREIGN KEY ("cardInstanceId") REFERENCES "OwnedCardInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContestEntryScoreBreakdown"
  ADD CONSTRAINT "ContestEntryScoreBreakdown_rosterLockId_fkey"
  FOREIGN KEY ("rosterLockId") REFERENCES "RosterLock"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "ContestTokenSnapshot" ADD COLUMN IF NOT EXISTS "marketDataUpdatedAt" TIMESTAMP(3);
