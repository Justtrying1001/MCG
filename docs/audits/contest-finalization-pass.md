# Contest Finalization Pass

## Canonical architecture
- Lifecycle is driven by reconciliation (`reconcileContestLifecycleByTime` / `reconcileDueContestsByTime`) and optional process scheduler.
- Canonical execution path is: snapshots (START/END) -> scoring engine -> settlement plan generation/execution.
- Deprecated legacy manual routes remain blocked with `410 Gone`.

## Lifecycle pipeline
1. OPEN -> LOCKED by `lockAt`.
2. LOCKED -> LIVE by `startsAt`, with START snapshot prerequisite.
3. LIVE -> SETTLED by `endsAt`, with END snapshot + scoring + auto-settlement.
4. Replays are idempotent through upsert/guards and settlement uniqueness.

## Lock model
- Backend source of truth: `RosterLock + contest.status in [OPEN, LOCKED, LIVE]`.
- API exposes `isLockedByActiveContest` derived from active roster locks.
- Frontend selection components now rely on `isLockedByActiveContest` only.
- `lockState` is compatibility metadata and is cleared at settlement.

## Card release guarantees
- Settlement now clears `OwnedCardInstance.lockState` and deletes `RosterLock` rows for contest entries.
- Prevents persistent card lock artifacts after SETTLED.

## Removed/deprecated legacy paths
- Deprecated: `/api/internal/contests/[contestId]/score` (410)
- Deprecated: `/api/internal/contests/[contestId]/settle` (410)
- Legacy admin contest pages are redirects to canonical admin pages.

## UX alignment
- Leaderboard identity prefers `displayName`, then `@xUsername`, then non-ID fallback label.
- Contest settled result panel shows rank, score, reward rows and score breakdown summary.
- Contest hub error state uses product empty-state wording.

## Tests added/updated in this pass
- `tests/contest-lock-ui-derivation.test.ts`
- `tests/contest-leaderboard-usernames.test.ts` (updated fallback assertion)
- `tests/settlement-plan-runtime.test.ts` (asserts roster lock deletion)

## Remaining risks
- In-process scheduler depends on deployment topology; should be enabled deliberately with env guard.
- Legacy runtime helper functions still exist in code for compatibility, but are not part of canonical exposed flow.
