# MCG Phase 1 — Parallel Domain Foundations (Implementation Note)

This note documents the **additive foundations** introduced for Phase 1, aligned with:
- `docs/mcg-pivot-product-foundation.md`
- `docs/mcg-transition-architecture-plan.md`
- `docs/mcg-phase-0-preconditions.md`

## Implemented in this phase

- Added parallel target-domain schema foundations for:
  - catalog: `TokenProject`, `CardSet`, `Rarity`, `Edition`, `CardTemplate`
  - ownership: `OwnedCardInstance`
  - acquisition/rewards: `PackDefinition`, `DropTable`, `DropTableRow`, `PackOpeningEvent`, `RewardGrant`
  - contests: `Contest`, `ContestRule`, `ContestEntry`, `RosterLock`, `ContestScore`, `ContestRanking`, `ContestSettlement`
  - progression: `UserProgression`, `CollectionProgression`, `CompetitiveProgression`
- Added lightweight domain module boundaries under `lib/domain/*`.
- Added shared domain constants/types under `types/domain/foundations.ts`.
- Added projection contract scaffolding under `lib/domain/projections/contracts.ts`.

## Explicitly deferred (out of Phase 1)

- No cutover of `/api/pack/open` to `OwnedCardInstance` writes.
- No replacement of `UserCard` reads in collection/account pages.
- No contest UI or contest API feature flow rollout.
- No `/api/me` payload migration to full projection-backed v2.
- No PvE decommissioning or PvE behavior changes.

## Legacy stability posture

- Legacy models (`UserCard`, `PackOpening`, `PveRun`) are preserved and unchanged.
- Existing auth/session and legacy API/page flows remain the active product loop.
- New domain entities are additive foundations for later phases.

## Foundation-ahead-of-use governance note

Some contest/progression models are intentionally introduced as **foundation-ahead-of-use** structures in Phase 1.

- They exist to stabilize domain boundaries early.
- They are **not** a signal for immediate runtime cutover.
- Later phases must still follow `docs/mcg-transition-architecture-plan.md` sequencing for backend/frontend rollout and compatibility transitions.
