# MCG Phase 7 — Final Cleanup (Implementation Note)

This note documents the Phase 7 cleanup delivery aligned with:
- `docs/mcg-pivot-product-foundation.md`
- `docs/mcg-transition-architecture-plan.md`
- `docs/mcg-phase-0-preconditions.md`
- `docs/mcg-phase-1-foundations-implementation.md`
- `docs/mcg-phase-2-pack-collection-transition-implementation.md`
- `docs/mcg-phase-3-contest-backend-mvp-implementation.md`
- `docs/mcg-phase-4-contest-frontend-mvp-implementation.md`
- `docs/mcg-phase-5-profile-progression-v2-implementation.md`
- `docs/mcg-phase-6-pve-decommission-implementation.md`

## Scope delivered

- Removed now-dead PvE-only persistence leftovers from Prisma legacy models:
  - `User.pveBattleTickets`
  - `User.lastPveResetAt`
  - `User.pveRuns`
  - `UserCard.pveExhausted`
  - `UserCard.pveExhaustedAt`
  - `PveRun` model
- Simplified session/guest collection transport shapes by removing unused PvE compatibility field:
  - `collection[].pveExhausted`
- Removed obsolete PvE-only CSS blocks/classes that were no longer referenced by any active route/component.
- Updated root documentation (`README.md`) to reflect current product/runtime truth:
  - collectible + contests center of gravity,
  - progression hub,
  - retired PvE endpoints explicitly marked as `410 Gone` compatibility surfaces.

## Evidence-based safety checks

- Confirmed no active frontend/runtime reads of `collection[].pveExhausted` before removing transport field.
- Confirmed no non-schema code references to:
  - `pveBattleTickets`
  - `lastPveResetAt`
  - `PveRun`
  - `pveExhaustedAt`
- Confirmed removed PvE CSS selectors had no remaining JSX/className consumers.

## Compatibility posture after cleanup

- PvE API compatibility endpoints remain present and explicit (`410 Gone`) to avoid ambiguous runtime behavior.
- `/api/me` coexistence envelope (`coexistence.v2`) remains intact and unchanged for active profile/collection/contest consumers.
- Guest mode remains a temporary local session path, but without obsolete PvE-only collection fields.

## Intentionally left unchanged

- No redesign of `useSession` transport architecture.
- No contest feature expansion or gameplay changes.
- No broad speculative renaming/refactor outside migration-value cleanup.
