-- Fix 9: Add dataQuality column to ContestEntryScoreBreakdown
-- "COMPLETE" = all market data was present when the score was computed
-- "INCOMPLETE" = one or more price/volume/marketCap values were null (CoinGecko data missing)

ALTER TABLE "ContestEntryScoreBreakdown"
  ADD COLUMN IF NOT EXISTS "dataQuality" VARCHAR(20) NOT NULL DEFAULT 'COMPLETE';
