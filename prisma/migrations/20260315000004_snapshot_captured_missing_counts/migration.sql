-- Fix 8: Add capturedCount and missingCount to ContestTokenSnapshot
-- These store per-run aggregate diagnostics on every token row:
--   capturedCount = # tokens that received real CoinGecko market data
--   missingCount  = # tokens with no market data (no geckoId or not returned by CoinGecko)
-- Stored redundantly on each row so any row can be used to query run-level stats.

ALTER TABLE "ContestTokenSnapshot"
  ADD COLUMN IF NOT EXISTS "capturedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "missingCount"  INTEGER NOT NULL DEFAULT 0;
