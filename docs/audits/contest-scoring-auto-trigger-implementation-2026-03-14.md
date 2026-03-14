# Contest Scoring Auto Trigger Implementation

## 1. Previous State
Before this change, the native contest scoring engine existed but remained manual at runtime:
- START snapshot was manual via `POST /api/internal/contest-runs/:contestId/snapshots/start`.
- END snapshot was manual via `POST /api/internal/contest-runs/:contestId/snapshots/end`.
- Native scoring compute was manual via `POST /api/internal/contest-runs/:contestId/scoring/compute`.

Lifecycle status transition route only updated `Contest.status` and did not trigger snapshot/scoring automation.

## 2. Chosen Lifecycle Hooks
- **Start hook:** on transition target status `LIVE`.
  - Rationale: in current lifecycle model, `LOCKED -> LIVE` is the real contest start.
- **End hook:** on transition target status `SETTLED`.
  - Rationale: in current lifecycle model, `LIVE -> SETTLED` is the terminal transition before contest completion.

Settlement execution itself remains manual/policy-driven (no automatic settlement trigger added).

## 3. Implementation
### Files modified
- `app/api/internal/contests/[contestId]/status/route.ts`
- `app/admin/(protected)/contests/[contestId]/lifecycle/page.tsx`
- `tests/api-internal-contest-status-auto-trigger.test.ts`

### Logic added
In `POST /api/internal/contests/:contestId/status`:
1. Load current contest status (`getContestDetailMvp`).
2. If transition is real (`before.status !== targetStatus`):
   - if target = `LIVE` => `captureStartSnapshot(contestId)`.
   - if target = `SETTLED` => `captureEndSnapshot(contestId)` then `computeContestScoresFromSnapshots(contestId)`.
3. Update contest status via existing `updateContestStatusMvp`.

### Idempotence/safety protections
- Existing route idempotency (`Idempotency-Key`) is kept.
- Transition validation token flow is kept.
- Auto trigger only runs when source status differs from target (`before.status !== status`).
- Snapshots are already upsert-based and idempotent.
- END+compute are executed **before** setting status to `SETTLED`; if they fail, status is not updated (prevents inconsistent settled state without scoring).

## 4. Tests Added
### `tests/api-internal-contest-status-auto-trigger.test.ts`
Scenarios:
1. `LOCKED -> LIVE` triggers START snapshot automatically.
2. `LIVE -> SETTLED` triggers END snapshot + native scoring automatically.
3. No-op transition (`LIVE -> LIVE`) does not trigger automation.
4. If END automation fails, status update is not executed.

Results: all scenarios pass.

## 5. Real Runtime Behavior
### New effective operator flow
- publish contest
- lifecycle transition to `LOCKED` (manual)
- lifecycle transition to `LIVE` (manual) → **START snapshot auto**
- lifecycle transition to `SETTLED` (manual) → **END snapshot auto** + **native scoring compute auto** + **ranking rebuild auto**
- settlement remains manual (settlement-plan generate/execute workbench)

## 6. Final Verdict
If you launch a contest now via lifecycle transitions, START snapshot, END snapshot, and native scoring compute are automatically triggered by the status execution route.

Mandatory answer:
- **OUI**

Scope note:
- This is automatic **within lifecycle status execution**.
- Settlement remains manual by design in this phase.
