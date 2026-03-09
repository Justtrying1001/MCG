# MCG Phase 3 — Contest Backend MVP (Implementation Note)

This note documents the Phase 3 implementation aligned with:
- `docs/mcg-pivot-product-foundation.md`
- `docs/mcg-transition-architecture-plan.md`
- `docs/mcg-phase-0-preconditions.md`
- `docs/mcg-phase-1-foundations-implementation.md`
- `docs/mcg-phase-2-pack-collection-transition-implementation.md`

## Scope delivered in this phase

Phase 3 delivers a **backend-only contest runtime MVP** (no contest frontend rollout):

- Contest discovery/detail APIs for authenticated users.
- Contest entry API with transactional lineup validation and roster locking.
- Minimal internal/admin-safe contest control endpoints:
  - create contest,
  - update contest status,
  - record score snapshots,
  - settle contest + issue rewards.
- Ranking storage/read path.
- Settlement path issuing auditable `RewardGrant` rows.

## API surface introduced

Authenticated player-facing APIs:
- `GET /api/contests`
- `GET /api/contests/:contestId`
- `POST /api/contests/:contestId/enter`
- `GET /api/contests/:contestId/ranking`

Internal/admin-safe APIs (header `x-internal-admin-key` must match `INTERNAL_ADMIN_KEY`):
- `POST /api/internal/contests`
- `POST /api/internal/contests/:contestId/status`
- `POST /api/internal/contests/:contestId/score`
- `POST /api/internal/contests/:contestId/settle`

These internal endpoints are intentionally minimal for MVP validation; this is not a broad admin product surface.

## Lineup validation and lock semantics

Entry logic is transactional (`SERIALIZABLE`) and enforces:

- contest existence,
- contest status must be `OPEN`,
- lock cutoff (`lockAt`) not passed,
- single entry per user per contest,
- lineup size exact match (`ContestRule.maxRosterSize` or default 5),
- no duplicate instance IDs inside lineup,
- ownership truth strictly from `OwnedCardInstance` rows for the user,
- optional `cardSetId` eligibility check from `ContestRule`,
- active lock conflict check across other active contests.

Explicit MVP lock rule enforced:
- the same `OwnedCardInstance` cannot be entered in multiple active contests (`OPEN`/`LOCKED`/`LIVE`).

Implementation note:
- lock conflict truth is currently enforced through `RosterLock` joins + active contest status checks in transaction.
- `OwnedCardInstance.lockState` is updated as an auxiliary marker for observability, not the sole lock authority.

## Scoring/ranking posture (MVP-safe)

To avoid overbuilding score orchestration in Phase 3:

- score updates are internal/manual via `POST /api/internal/contests/:contestId/score`,
- provided score rows are upserted into `ContestScore`,
- ranking is recomputed immediately and snapshotted into `ContestRanking` (full replace model),
- tie-break is deterministic by `score DESC`, then `userId ASC`.

This is a deliberately small coherent ranking model for MVP backend operation.

## Settlement/reward posture (minimal + auditable)

Settlement is internal/manual via `POST /api/internal/contests/:contestId/settle`:

- creates one `ContestSettlement` row,
- writes one `RewardGrant` per reward instruction with `sourceContestSettlementId`,
- increments `User.points` only for `RewardType.POINTS` grants,
- marks contest and entries as settled.

This keeps reward issuance traceable through `RewardGrant` without introducing a broad reward orchestration platform in Phase 3.

## Coexistence and migration discipline

- Legacy PvE APIs/pages and profile semantics are untouched.
- Pack/collection dual-write introduced in Phase 2 remains untouched.
- Contest backend depends on `OwnedCardInstance` truth and fails safely if ownership data is missing (no fallback reconstruction from `UserCard.quantity`).

## Explicit deferrals (not in this phase)

- Contest frontend/player pages rollout (Phase 4).
- Profile/progression V2 cutover (Phase 5).
- PvE decommissioning (Phase 6).
- Advanced scoring science pipelines / cadence automation.
- Broad admin UI suite.
