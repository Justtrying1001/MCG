# MCG Current Runtime Architecture

This document describes the **active** architecture of the running product.

## Product runtime (current)
- Collectible-first acquisition via pack opening.
- Collection browsing over owned cards.
- Contest-driven gameplay (entry, lineup lock, ranking, settlement).
- Profile/progression hub using v2 summary projections.
- PvE is retired from active flow (legacy compatibility endpoints return `410 Gone`).

## Runtime boundaries
- **Auth/session transport**: `GET /api/me` + `useSession`.
- **Pack acquisition**: `/api/pack/open` (authenticated), `/api/guest/pack/open` (temporary local guest state).
- **Contest domain**:
  - player routes: `/api/contests/*`
  - internal ops routes: `/api/internal/contests/*`
  - runtime orchestrator: `lib/domain/contests/runtime.ts`
- **Collection/progression projections**:
  - `lib/domain/projections/collection.ts`
  - `lib/domain/progression/profile-summary.ts`

## Coexistence still intentional
- Dual-write in pack opening remains intentional:
  - legacy continuity (`UserCard`, `PackOpening`)
  - target ownership truth (`OwnedCardInstance`, `PackOpeningEvent`)
- `/api/me` includes `coexistence.v2` because active profile/collection UI consumes it.

## Acquisition runtime status (Phase D)
- Authenticated pack opening (`/api/pack/open`) is now DB-native and uses controlled-emission supply from `CardTemplate.plannedSupply` / `issuedSupply`.
- Runtime opening allocates from remaining template stock, increments `PackDefinition.openedPackCount`, writes `PackOpeningEvent` + `OwnedCardInstance`, and preserves temporary legacy dual-write (`PackOpening`, `UserCard`) for UI continuity.
- Guest opening remains local/temporary and is not part of controlled-emission inventory.

## Phase B status (data-model alignment)
- Prisma now carries controlled-emission preparation fields:
  - `CardTemplate.plannedSupply` / `CardTemplate.issuedSupply`
  - `PackDefinition.source` (`SALE`/`REWARD`)
  - `PackDefinition.plannedPackCount` / `openedPackCount` / `cardsPerPack`
- These fields were introduced as scaffold in Phase B and are now consumed by authenticated opening in Phase D.
- Bootstrap script for Phase C data initialization: `prisma/seed-mvp-controlled-emission.mjs` (`npm run seed:mvp:controlled-emission`).

## Documentation policy
- `docs/mcg-pivot-product-foundation.md` is product source-of-truth.
- This file is implementation/runtime source-of-truth.
- `docs/mvp-controlled-emission-transformation.md` is transformation source-of-truth for migration from current runtime to controlled emission MVP.
