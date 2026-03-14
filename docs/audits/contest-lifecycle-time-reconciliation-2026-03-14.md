# Contest Lifecycle Time Reconciliation

## 1. Issue Observed
- Symptom reported: a contest remains displayed in **Team building** although `lockAt` and even `endsAt` are already in the past.
- Audit note on runtime data access:
  - The repository has no configured `.env`/`DATABASE_URL` in this environment, so direct query of the production contest record was not possible from this workspace.
  - As a result, the diagnosis below is based on audited source code paths and runtime flow.
- Contest model (source of truth) includes:
  - `status` (`DRAFT | OPEN | LOCKED | LIVE | SETTLED | CANCELED`)
  - `startsAt`, `lockAt`, `endsAt`
  - `configPublishedAt` and relations for entries/scores/rankings/settlements.
- Admin stage mapping was status-first and did not derive from wall-clock dates:
  - `LOCKED => Team lock`
  - fallback for non-locked/non-live/non-settled => `Team building`
  - therefore any stale backend status stays stale visually.

## 2. Root Cause
- **Exact root cause**: there was no automatic lifecycle reconciliation mechanism comparing `now` against `lockAt/startsAt/endsAt` to advance contest `status`.
- Existing automation existed only on **manual status change endpoint** (`POST /api/internal/contests/[contestId]/status`):
  - entering `LIVE` triggers START snapshot
  - entering `SETTLED` triggers END snapshot + scoring.
- Therefore, if nobody manually executes transitions, contests can remain in old statuses (`OPEN`, `LOCKED`, etc.) indefinitely, and admin UI reflects that stale status.
- A scheduler/cron/reconciliation worker was absent in the codebase.

## 3. Expected Lifecycle Behavior
Expected temporal lifecycle (authoritative backend status):
1. `OPEN` (Team building) while `now < lockAt`
2. `LOCKED` (Team lock) when `now >= lockAt`
3. `LIVE` (Contest running) when `now >= startsAt`
4. `SETTLED` (Contest ended/results flow complete) when `now >= endsAt`

Business/UI phase mapping currently used:
- Team building ⇢ backend `OPEN` (and fallback in UI)
- Team lock ⇢ backend `LOCKED`
- Contest running ⇢ backend `LIVE`
- Contest ended / Scoring / Results are currently inferred from `SETTLED` + counters (`scores`, `rankings`) in admin rendering.

## 4. Fix Implemented
Implemented a real backend lifecycle reconciliation module:
- Added `lib/domain/contests/lifecycle-reconciliation.ts`:
  - `reconcileContestLifecycleByTime(contestId, now?)`
  - `reconcileDueContestsByTime(now?)`
- Reconciliation behavior:
  - Detect target status from time thresholds (`lockAt`, `startsAt`, `endsAt`)
  - Apply **step-by-step catch-up transitions** (`OPEN -> LOCKED -> LIVE -> SETTLED`) when overdue
  - Preserve existing automation hooks by executing before status updates:
    - entering `LIVE`: capture START snapshot
    - entering `SETTLED`: capture END snapshot + scoring compute.
- Wired reconciliation into runtime/API access paths:
  - `listContestsMvp()` now runs `reconcileDueContestsByTime()` before returning contests
  - `getContestDetailMvp()` now runs `reconcileContestLifecycleByTime(contestId)` before returning detail
  - internal admin contests listing route now also triggers due reconciliation before DB fetch.
- Added manual backfill API endpoint:
  - `POST /api/internal/contests/reconcile-lifecycle`
  - Returns processed/changed contests and transition steps.

## 5. Backfill / Reconciliation Strategy
For already stuck contests:
1. Run `POST /api/internal/contests/reconcile-lifecycle` (internal admin auth required).
2. Reconciler scans due contests and advances each to the correct phase according to current time.
3. If a contest is far behind (e.g. still `OPEN` after `endsAt`), it is caught up sequentially:
   - `OPEN -> LOCKED`
   - `LOCKED -> LIVE` (START snapshot)
   - `LIVE -> SETTLED` (END snapshot + scoring)
4. Because snapshot/scoring functions are idempotent via upserts/rebuild semantics, reruns remain safe for backfill operations.

## 6. Tests Added / Updated
Added new test suite:
- `tests/contest-lifecycle-reconciliation.test.ts`

Covered scenarios:
- contest before lock remains `OPEN` (Team building)
- contest after lock leaves Team building (`OPEN -> LOCKED`)
- contest after end is no longer active (`LIVE -> SETTLED`)
- catch-up transition chain for old stuck contest (`OPEN -> LOCKED -> LIVE -> SETTLED`)
- batch reconciliation path for due contests

Regression-safety checks:
- Existing status transition automation tests remain passing:
  - START snapshot trigger on manual `-> LIVE`
  - END snapshot + scoring trigger on manual `-> SETTLED`

## 7. Final Verdict
- **Bug cause confirmed**: status was not auto-advanced by time; UI displayed stale backend status.
- **Fix status**: implemented and wired backend time reconciliation + manual backfill endpoint.
- **Result**: contests no longer remain indefinitely in Team building / old phases once date thresholds are passed, and existing snapshot/scoring pipeline remains integrated with lifecycle transitions.
- **Remaining operational note**: in this workspace, direct inspection of the specific production contest row was not possible due to missing DB connection variables.
