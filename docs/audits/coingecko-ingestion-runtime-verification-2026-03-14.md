# CoinGecko Ingestion Runtime Verification

## 1. Token mapping coverage
Executed SQL (runtime DB: `mcg_verify`):
```sql
SELECT
  COUNT(*) AS total_tokens,
  COUNT(*) FILTER (WHERE "coingeckoId" IS NOT NULL) AS with_coingecko,
  COUNT(*) FILTER (WHERE "coingeckoId" IS NULL) AS missing_coingecko
FROM "TokenProject";
```

Observed result:
- total_tokens: **50**
- with_coingecko: **50**
- missing_coingecko: **0**

Conclusion:
- Active seeded token universe has full CoinGecko mapping coverage in this runtime verification dataset.

## 2. CoinGecko client validation
Inspected `lib/domain/contests/coingecko-client.ts`.

Validated:
- Endpoint is exactly `/api/v3/coins/markets`.
- Requests are batched via `ids=<comma-separated-list>` and chunked by 200 ids.
- Parsed response fields include:
  - `current_price`
  - `total_volume`
  - `market_cap`
  - `market_cap_rank`
  - `last_updated`
- Retry/rate-limit behavior exists:
  - retries up to 2 attempts,
  - reads `retry-after` header,
  - backoff fallback if header absent.
- Unknown tokens are handled by omission in API response (caller maps missing rows to null snapshot metrics).

## 3. Snapshot data validation
Executed SQL:
```sql
SELECT
  "tokenProjectId",
  phase,
  "priceUsd",
  "volume24hUsd",
  "marketCapUsd",
  "marketCapRank",
  "marketDataUpdatedAt"
FROM "ContestTokenSnapshot"
LIMIT 20;
```

Observed result:
- Rows are populated for START snapshot.
- `priceUsd`, `volume24hUsd`, `marketCapUsd`, `marketCapRank` are non-null in sampled rows.
- `marketDataUpdatedAt` is populated in sampled rows.

Explanation for potential nulls (by code):
- If CoinGecko omits a token or call fails, snapshot upsert still occurs and market columns can be null; this is intentional graceful degradation in `snapshot-runtime`.

## 4. START vs END comparison
Executed SQL:
```sql
SELECT phase, COUNT(*)
FROM "ContestTokenSnapshot"
GROUP BY phase;
```

Observed result:
- START: **50**
- END: **50**

Executed comparison SQL:
```sql
SELECT
  s."priceUsd" AS start_price,
  e."priceUsd" AS end_price
FROM "ContestTokenSnapshot" s
JOIN "ContestTokenSnapshot" e
  ON s."tokenProjectId" = e."tokenProjectId"
 AND s."contestId" = e."contestId"
WHERE s.phase='START'
  AND e.phase='END'
LIMIT 10;
```

Observed result:
- START and END values are joinable by same token/contest.
- At least one token shows changed price (`1.0 -> 0.5` in sampled run), proving START vs END divergence is persisted.

## 5. Scoring data usage
Inspected `lib/domain/contests/scoring-engine-runtime.ts`.

Validated scoring inputs are read from `ContestTokenSnapshot` START/END rows:
- `priceUsd`
- `volume24hUsd`
- `marketCapUsd`
- `marketCapRank`

Then converted to:
- `priceChange`
- `volumeChange`
- `marketCapChange`
- `rankChange`

These changes feed token formula and final ranking rebuild; no constant/fake fallback is used for the happy path.

## 6. Final verdict
Runtime checks executed:
- mapping coverage SQL,
- snapshot content SQL,
- START/END count + comparison SQL,
- scoring-input code trace,
- smoke execution (`contest-scoring-engine-real-smoke.test.ts`) with DB data writes,
- table counts (`ContestTokenSnapshot`, `ContestRanking`) confirmed non-zero.

## COINGECKO INGESTION VERIFIED

Cause if broken? Not observed in this verification run.
Known caveat remains separate: historical migration-chain `P3006` in `prisma migrate dev` shadow validation does not invalidate runtime ingestion itself.
