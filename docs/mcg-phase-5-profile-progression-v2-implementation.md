# MCG Phase 5 — Profile / Progression V2 (Implementation Note)

This note documents the Phase 5 incremental delivery aligned with:
- `docs/mcg-pivot-product-foundation.md`
- `docs/mcg-transition-architecture-plan.md`
- `docs/mcg-phase-0-preconditions.md`
- `docs/mcg-phase-1-foundations-implementation.md`
- `docs/mcg-phase-2-pack-collection-transition-implementation.md`
- `docs/mcg-phase-3-contest-backend-mvp-implementation.md`
- `docs/mcg-phase-4-contest-frontend-mvp-implementation.md`

## Scope delivered

- Additive `/api/me` coexistence.v2 profile progression summaries:
  - `accountProgression`
  - `collectionProgression`
  - `competitiveProgression`
- New progression summary builder module to keep route logic bounded:
  - `lib/domain/progression/profile-summary.ts`
- Profile page (`/compte`) evolved from PvE-first counters to a progression hub hierarchy:
  - account progression section
  - collection progression section
  - competitive progression section + recent contest results
  - legacy PvE continuity moved to secondary panel

## Coexistence posture

- Legacy top-level `/api/me` fields are preserved for compatibility.
- `coexistence.v2.collectionProjection` remains unchanged and is reused by the new collection progression summary.
- Added progression blocks are additive under `coexistence.v2` only.
- `useSession` remains session transport; no broad domain-aggregator refactor was introduced.

## Guest handling

- Guest mode remains legacy-temporary and does not fabricate authenticated progression records.
- Profile UI explicitly communicates guest limitations and only shows robust progression summaries when authenticated data exists.

## Deliberately deferred beyond Phase 5

- PvE removal/decommission (Phase 6)
- Deep seasonal ladder systems
- Advanced achievements/badges/cosmetics identity systems
- Broad contest frontend redesign and broad collection page rewrite
