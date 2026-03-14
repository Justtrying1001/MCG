# Contest Scoring System Verification

## 1. System architecture
- Snapshot capture is implemented in `lib/domain/contests/snapshot-runtime.ts` and exposed by admin routes:
  - `POST /api/internal/contest-runs/:contestId/snapshots/start`
  - `POST /api/internal/contest-runs/:contestId/snapshots/end`
- Token scoring + card/user aggregation + ranking rebuild is implemented in `lib/domain/contests/scoring-engine-runtime.ts` and exposed by:
  - `POST /api/internal/contest-runs/:contestId/scoring/compute`
- Settlement compatibility remains in existing contest runtime (`settleContestMvp`) and settlement-plan runtime; manual score import route remains available as fallback.

## 2. Token population validation
- **ANY** mode: eligible population is resolved from active `CardTemplate` + active `TokenProject` (not from user rosters). (`resolveEligibleTokensForContest`) 
- **CARD_SET_ONLY** mode: eligible population is resolved from active templates in configured `cardSetId`, then deduped by token project.
- START snapshot uses `resolveEligibleTokensForContest`.
- END snapshot uses canonical population loaded from START rows (`resolveCanonicalTokensFromStart`).
- END without START is rejected (`ContestRuntimeError: START snapshot is required before END snapshot`).

Status: **validated** by runtime code + tests (`contest-eligibility-runtime`, `contest-snapshot-runtime`, `contest-snapshot-runtime-edgecases`).

## 3. CoinGecko ingestion validation
- Client uses `https://api.coingecko.com/api/v3/coins/markets` with batched `ids=...` + `vs_currency=usd`; it does **not** call `/coins/{id}`.
- Parsed fields in client:
  - `current_price`
  - `total_volume`
  - `market_cap`
  - `market_cap_rank`
  - `last_updated`
- Snapshot persistence maps those to:
  - `priceUsd`, `volume24hUsd`, `marketCapUsd`, `marketCapRank`, `marketDataUpdatedAt` (+ `capturedAt`).
- Retry/rate-limit behavior:
  - retries up to 2 times in client,
  - respects `retry-after` header,
  - chunked batching (200 ids).
- Failure/partial handling:
  - unknown/missing token in response => snapshot row still upserted with null market fields for that token,
  - fetch failure/rate-limit exception => warning + snapshot continues with null metrics (no crash).

Real DB verification (`mcg_verify`):
- `TokenProject`: 50 total, 50 with `coingeckoId`, 0 without.
- Active contest-eligible tokens without mapping: 0.
- `ContestTokenSnapshot` contains required columns including `marketDataUpdatedAt`.

## 4. Snapshot validation
- START captures full eligible contest population.
- END reuses strict START canonical population.
- END without START rejected.
- Snapshot upserts are idempotent by unique key `(contestId, tokenProjectId, phase)`.
- DB smoke run produced: START=50 rows, END=50 rows for one contest.

Status: **validated**.

## 5. Scoring formula validation
Implemented formula in `scoring-engine-runtime.ts`:
- `p = (priceEnd - priceStart) / max(priceStart, eps)`
- `priceScore = 50 + 50 * clamp(p / 0.50, -1, 1)`
- `v = (volumeEnd - volumeStart) / max(volumeStart, eps)`
- `volumeScore = 50 + 50 * clamp(v / 1.00, -1, 1)`
- `m = (marketCapEnd - marketCapStart) / max(marketCapStart, eps)`
- `marketCapScore = 50 + 50 * clamp(m / 0.50, -1, 1)`
- `r = (rankStart - rankEnd) / max(rankStart, 1)`
- `rankScore = 50 + 50 * clamp(r / 0.30, -1, 1)`

Weighted base score:
- `0.45*price + 0.25*volume + 0.20*marketCap + 0.10*rank`

Rank bonus:
- `rankMultiplier = 1 + 0.10 * clamp(r / 0.30, 0, 1)`
- `tokenScore = min(100, base * rankMultiplier)`

Status: **validated** by formula unit tests.

## 6. Card scoring validation
- Card score is computed as:
  - `cardScore = tokenScore * rarityMultiplier * editionMultiplier`
- Multipliers source of truth is scoring runtime constants:
  - Rarity: `COMMON 1`, `UNCOMMON 1.05`, `RARE 1.12`, `EPIC 1.22`, `LEGENDARY 1.35`
  - Edition: `BASE 1`, `REVERSE 1.03`, `BRILLANTE 1.08`, `HOLO 1.15`, `FULL_ART 1.25`
- `ContestEntryScoreBreakdown` persists `baseScore`, `rarityMultiplier`, `editionMultiplier`, `finalScore`.

Status: **validated** by unit tests + real smoke DB rows.

## 7. User scoring validation
- User score logic: sum of all locked card scores in entry.
- No averaging is applied.
- Result is upserted into `ContestScore`.

Status: **validated** by test assertions comparing `ContestScore` to sum of 5 breakdown rows.

## 8. Ranking validation
- Ranking is rebuilt from computed user scores:
  - delete previous contest ranking rows,
  - sort by score desc then userId asc,
  - `createMany` new `ContestRanking` rows.

Status: **validated** (unit + DB smoke).

## 9. Edge case validation
Validated edge cases:
- END snapshot without START => rejected.
- snapshot idempotence via upsert.
- token without `coingeckoId` => counted in `missingGeckoIds`, row persisted.
- CoinGecko failure/rate-limit exception => no crash, warning logged, snapshot persisted with null metrics.
- scoring without START/END => rejected.
- idempotency key replay behavior on scoring compute route => replay blocked, new key allowed.
- settlement downstream compatibility preserved in smoke flow.

## 10. Test coverage
Executed and passing:
- `tests/contest-eligibility-runtime.test.ts`
- `tests/contest-snapshot-runtime.test.ts`
- `tests/contest-snapshot-runtime-edgecases.test.ts`
- `tests/contest-scoring-engine-runtime.test.ts`
- `tests/contest-scoring-engine-edgecases.test.ts`
- `tests/api-internal-contest-scoring-compute-route.test.ts`
- `tests/api-internal-contest-score-hardening.test.ts`
- `tests/settlement-plan-runtime.test.ts`
- `tests/contest-scoring-engine-real-smoke.test.ts` (DB-backed)

Coverage conclusion: strong on snapshot/scoring/ranking/idempotency and error handling; migration-chain issue remains external to runtime scoring logic.

## 11. Smoke test result
Environment (`mcg_verify` Postgres):
1. `prisma db push`
2. `seed:mvp:controlled-emission`
3. DB-backed smoke test `contest-scoring-engine-real-smoke`

Observed runtime output:
- START tokens: 50
- END tokens: 50
- Token scores: 50
- Entry breakdowns: 10
- User scores/ranking persisted and consistent
- Settlement + RewardGrant persisted

Smoke flow status: **pass**.

## 12. Final verdict
## SYSTEM VERIFIED

The runtime scoring pipeline matches the specified product logic end-to-end (token population, CoinGecko ingestion, snapshots, token formula, card/user scoring, ranking rebuild, settlement compatibility), and real DB smoke passed.

Remaining operational issue to track separately:
- `prisma migrate dev` on a clean/shadow DB still fails with legacy migration-chain `P3006` (`RewardLedgerReasonType` type missing in shadow application). This is a migration pipeline/history issue, not a scoring runtime behavior issue.
