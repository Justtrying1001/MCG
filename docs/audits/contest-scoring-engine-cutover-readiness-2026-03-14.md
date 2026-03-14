# Contest Scoring Engine Cutover Readiness

## 1. Migration Real Status

### Commands executed in this environment
- `npx prisma generate` → **PASS** (client generated from current schema).
- `npx prisma migrate dev --name cutover_readiness_check` → **FAIL** with `P1012 Environment variable not found: DATABASE_URL`.

### Real status
- Migration could **not** be applied in this environment because `DATABASE_URL` is not configured.
- Therefore, runtime validation against a real PostgreSQL instance is **blocked** here.

### Objects expected after migration
From `prisma/schema.prisma` + `prisma/migrations/20260313120000_contest_scoring_engine_phase1/migration.sql`, the target DB must expose:
- `TokenProject.coingeckoId` (unique nullable column).
- `ContestTokenSnapshot` (+ unique `(contestId, tokenProjectId, phase)`, indexes on `(contestId, phase)` and `geckoId`).
- `ContestTokenScore` (+ unique `(contestId, tokenProjectId)`, index `(contestId, score)`).
- `ContestEntryScoreBreakdown` (+ unique `(entryId, cardInstanceId)`, indexes on `entryId`, `tokenProjectId`).

### Exact commands to run in a DB-enabled environment
1. `export DATABASE_URL='postgresql://...'`
2. `npx prisma migrate dev --name cutover_readiness_check`
3. `npx prisma migrate status`
4. `npx prisma studio` (optional visual check)

### SQL verification checklist (post-migration)
```sql
-- Column
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'TokenProject' AND column_name = 'coingeckoId';

-- Tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('ContestTokenSnapshot','ContestTokenScore','ContestEntryScoreBreakdown');

-- Uniques / indexes
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename IN ('TokenProject','ContestTokenSnapshot','ContestTokenScore','ContestEntryScoreBreakdown');
```

## 2. CoinGecko Coverage

### Proven coverage in repo dataset
- Source audited: `data/token-master-50.json`.
- Measured with Node one-liner: `total=50`, `with coingeckoId=50`, `without coingeckoId=0`.

### Runtime fallback behavior
- Eligible-token resolution prefers `TokenProject.coingeckoId` and falls back to `CardTemplate.metadata.tokenIdentity.coingeckoId`.
- Snapshot capture persists rows even if `coingeckoId` is missing (counts `missingGeckoIds`, uses slug fallback for `geckoId`, market metrics may be null).

### Cutover implication
- **Dataset coverage is sufficient** (50/50 mapped).
- **DB coverage cannot be proven in this environment** until migration + seed are run on real DB.

## 3. Multipliers Final Validation

### Source of truth used by scoring engine
- `lib/domain/contests/scoring-engine-runtime.ts` defines and applies multipliers.

#### Rarity multipliers
- `COMMON=1`
- `UNCOMMON=1.05`
- `RARE=1.12`
- `EPIC=1.22`
- `LEGENDARY=1.35`

#### Edition multipliers
- `BASE=1`
- `REVERSE=1.03`
- `BRILLANTE=1.08`
- `HOLO=1.15`
- `FULL_ART=1.25`

### Formula effectively applied
For each locked card:
- `baseScore = tokenScore`
- `finalScore = baseScore * rarityMultiplier * editionMultiplier`

For each user:
- `userScore = sum(finalScore across roster locks)`

### Consistency check vs existing repo values
- Existing multipliers in `lib/domain/acquisition/slot-weights.ts` are **different** and intended for pack draw weights, not contest scoring.
- No pre-existing canonical contest multiplier table exists in schema seeds (`Rarity`, `Edition` only store `weight`, no contest-score multiplier fields).

## 4. End-to-End Real Validation

Given missing `DATABASE_URL`, closest-to-real validation was executed with runtime/route tests (stateful mocked transactions):

### Executed tests
- `tests/contest-snapshot-runtime.test.ts`
- `tests/contest-snapshot-runtime-edgecases.test.ts`
- `tests/contest-scoring-engine-runtime.test.ts`
- `tests/contest-scoring-engine-edgecases.test.ts`
- `tests/api-internal-contest-scoring-compute-route.test.ts`
- `tests/settlement-plan-runtime.test.ts`
- `tests/contest-runtime-stateful-flow.test.ts`
- `tests/admin-contest-main-flow-contract.test.ts`

### What is dynamically proven
- START snapshot captures eligible token set and writes via upsert.
- END snapshot requires START and reuses START canonical population.
- Snapshot upsert path is idempotent.
- Scoring compute writes token scores, entry breakdowns, contest user scores, and rebuilds ranking.
- Compute route enforces idempotency key and blocks replay for same key.
- Legacy settlement-plan runtime tests still pass after scoring-engine additions.

### What is not proven yet
- True SQL DDL/constraints applied on a live Postgres DB.
- Real DB writes/readbacks for new tables in one integrated run.
- Full HTTP->DB->settlement run without mocks.

## 5. Remaining Risks

1. **Primary blocker**: migration not executed on real DB in this environment (`DATABASE_URL` absent).
2. **Cutover confidence gap**: no true DB-backed E2E proving snapshot + scoring + ranking + settlement in one run.
3. **Dual scoring paths still live**:
   - Native compute route exists: `/api/internal/contest-runs/:contestId/scoring/compute`.
   - Manual import route still exists: `/api/internal/contests/:contestId/score`.
   Operational runbook must explicitly choose canonical path.
4. **Multiplier governance risk**: contest multipliers are code constants (not DB-configurable/versioned).

## 6. Fixes Applied

- No code fix applied in this final step.
- Validation-only phase completed with additional evidence capture and cutover decisioning.

## 7. Final Go / No-Go

## Verdict: **GO WITH FALLBACK**

### Decision rationale
- Native scoring path is functionally implemented and strongly covered by runtime tests.
- Manual import can become **fallback-only** operationally.
- But full unconditional GO is blocked by missing real-DB migration/application proof in this environment.

### Required pre-cutover gate (must-do)
1. Apply migration on staging/prod DB with `DATABASE_URL`.
2. Run SQL checklist above.
3. Run one DB-backed smoke flow:
   - capture START,
   - capture END,
   - compute scoring,
   - verify `ContestScore` + `ContestRanking`,
   - execute settlement downstream.
4. Keep manual import route enabled as rollback/fallback until smoke flow is validated in target environment.
