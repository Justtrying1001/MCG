# Contest Scoring Engine Real Smoke Test

## 1. Migration Applied

### Commands executed
1. `apt-get install -y postgresql` (local PostgreSQL installed for real DB validation in this environment).
2. `pg_ctlcluster 16 main start && pg_isready` (Postgres started, ready on `localhost:5432`).
3. `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/mcg_smoke?schema=public' npx prisma migrate dev --name cutover_real_smoke`

### Result
- `prisma migrate dev` **failed** with `P3006` on migration `20260312114000_contest_config_phase1` because `RewardLedgerReasonType` does not exist in shadow DB.
- This means migration-chain validation on a clean DB is not currently passing in this repository snapshot.

### Real DB workaround used for smoke execution
To still run an operational smoke test on real PostgreSQL:
- `psql ... -c 'CREATE DATABASE mcg_smoke;'`
- `DATABASE_URL=... npx prisma db push`
- `DATABASE_URL=... npm run seed:mvp:controlled-emission`

### Object existence verification (real DB)
Verified by SQL on `mcg_smoke`:
- `TokenProject.coingeckoId` column exists.
- Tables exist: `ContestTokenSnapshot`, `ContestTokenScore`, `ContestEntryScoreBreakdown`.
- Expected indexes exist, including:
  - `ContestTokenSnapshot_contestId_tokenProjectId_phase_key`
  - `ContestTokenScore_contestId_tokenProjectId_key`
  - `ContestEntryScoreBreakdown_entryId_cardInstanceId_key`
  - `TokenProject_coingeckoId_key`
- FKs/relations exist from snapshot/score/breakdown tables to `Contest`, `TokenProject`, `ContestEntry`, `OwnedCardInstance`, `RosterLock`.

## 2. DB Verification

### Read/write verification via Prisma runtime
Executed DB-backed smoke test:
- `KEEP_SMOKE_DATA=1 DATABASE_URL=... npm test -- --run tests/contest-scoring-engine-real-smoke.test.ts`

Observed runtime output (`SMOKE_RESULT`):
- `startTokenCount: 50`
- `endTokenCount: 50`
- `tokenScoresCount: 50`
- `entryBreakdownsCount: 10`
- user scores persisted and ranked
- settlement persisted

### SQL verification on persisted smoke contest
Contest used: `cmmplbdqo000m87vhuato28mo`

- Contest status: `SETTLED`
- Snapshots: `START=50`, `END=50`
- Token scores: `50`
- Entry score breakdown rows: `10`
- Contest scores and rankings: `2 users`, consistent rank ordering
- Reward grants linked to settlement: `1`

## 3. CoinGecko Coverage

### Before fix (real DB observation)
After first seed run:
- `TokenProject`: `50 total`, `0 with coingeckoId`, `50 without coingeckoId`.
- Root cause: seed upsert `update` path did not set `TokenProject.coingeckoId`.

### Minimal fix applied
File updated:
- `prisma/seed-mvp-controlled-emission.mjs`
- `tokenProject.upsert(...).update` now also sets `coingeckoId`.

### After fix (real DB observation)
After rerunning seed:
- `TokenProject`: `50 total`, `50 with coingeckoId`, `0 without coingeckoId`.
- Active tokens used by contest structures without `coingeckoId`: none found.

### Coverage conclusion
- **Coverage OK** for activation on this validated dataset after fix.

## 4. Native Flow Smoke Test

### Scenario executed (real DB + runtime functions)
In `tests/contest-scoring-engine-real-smoke.test.ts`:
1. create 2 users
2. create owned card instances (5 LEGENDARY/FULL_ART for user A, 5 COMMON/BASE for user B)
3. create contest + rule (`eligibilityMode=ANY`, team size 5)
4. enter both users via `enterContestMvp`
5. set contest `LOCKED`
6. `captureStartSnapshot(contestId)`
7. `captureEndSnapshot(contestId)`
8. `computeContestScoresFromSnapshots(contestId)`
9. verify persistence of `ContestTokenSnapshot`, `ContestTokenScore`, `ContestEntryScoreBreakdown`, `ContestScore`, `ContestRanking`
10. `settleContestMvp` and verify `RewardGrant` + contest `SETTLED`

### Concrete observed results
From smoke run:
- START/END snapshots captured same token population: `50/50`.
- `ContestTokenScore` rows: `50`.
- `ContestEntryScoreBreakdown` rows: `10` (5 cards x 2 users).
- `ContestScore` rows: 2 (`375.46875` vs `222.5`).
- `ContestRanking`: rank 1/2 consistent with score ordering.
- `ContestSettlement` + `RewardGrant` persisted and contest moved to `SETTLED`.

## 5. Multipliers Validation

### Source of truth
`lib/domain/contests/scoring-engine-runtime.ts`:
- Rarity multipliers:
  - `COMMON=1`
  - `UNCOMMON=1.05`
  - `RARE=1.12`
  - `EPIC=1.22`
  - `LEGENDARY=1.35`
- Edition multipliers:
  - `BASE=1`
  - `REVERSE=1.03`
  - `BRILLANTE=1.08`
  - `HOLO=1.15`
  - `FULL_ART=1.25`

### Real DB effect observed
In persisted `ContestEntryScoreBreakdown` rows:
- `LEGENDARY/FULL_ART` rows had `rarityMultiplier=1.35` and `editionMultiplier=1.25`, giving higher final scores (`84.375` for base `50`).
- `COMMON/BASE` rows had multipliers `1` and `1`, leaving base score unchanged (`50`).

## 6. Fallback Validation

### Manual import path still exists
- Native route: `POST /api/internal/contest-runs/:contestId/scoring/compute`
- Legacy/manual route: `POST /api/internal/contests/:contestId/score`

### Conflict posture
- Both paths can write `ContestScore`/`ContestRanking` (native compute and legacy import).
- Operationally, they should not be used on the same contest in parallel.
- `tests/api-internal-contest-score-hardening.test.ts` still passes, confirming manual route remains operational.

### Canonical path recommendation
- Admin canonical path should be **native compute**.
- Manual import should be kept **fallback-only**.

## 7. Fixes Applied

1. **Seed backfill fix (applied)**
   - File: `prisma/seed-mvp-controlled-emission.mjs`
   - Change: include `coingeckoId` in `TokenProject.upsert.update`.
   - Why: real DB showed 0/50 `TokenProject.coingeckoId` populated without this fix.
   - Validation: reseed + SQL coverage query now returns 50/50 populated.

2. **Real smoke integration test (applied)**
   - File: `tests/contest-scoring-engine-real-smoke.test.ts`
   - Purpose: DB-backed end-to-end smoke across snapshot, scoring, ranking, settlement.
   - Includes optional `KEEP_SMOKE_DATA=1` mode for post-run SQL inspection.

## 8. Final Activation Verdict

## Verdict: **GO WITH FALLBACK**

### Decision
- Native scoring flow is **operational on real PostgreSQL** in this smoke validation.
- Native path can become **admin canonical path now**.
- Manual import should remain **fallback-only**.

### Remaining blocker before full unconditional GO
- Migration chain (`prisma migrate dev`) still fails on clean/shadow DB (`P3006` in `20260312114000_contest_config_phase1`).
- For production rollout, migration/deploy workflow must be validated on target environment migration history.

### Activation recommendation
- **Activate native scoring as canonical** for admin operations.
- **Keep manual import fallback enabled** until migration-path validation is completed on staging/prod DB history.
