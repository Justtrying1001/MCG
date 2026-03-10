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

## Current limitation (important)
- Pack opening is **not yet** controlled-emission DB-native.
- Current opening flow still starts from runtime weighted draws in `lib/cards.ts`, then persists outcomes.
- Controlled emission migration scope is documented in `docs/mvp-controlled-emission-transformation.md`.

## Phase B status (data-model alignment)
- Prisma now carries controlled-emission preparation fields:
  - `CardTemplate.plannedSupply` / `CardTemplate.issuedSupply`
  - `PackDefinition.source` (`SALE`/`REWARD`)
  - `PackDefinition.plannedPackCount` / `openedPackCount` / `cardsPerPack`
- These fields are intentionally scaffold-only at this stage; runtime opening logic is not cut over yet.

## Documentation policy
- `docs/mcg-pivot-product-foundation.md` is product source-of-truth.
- This file is implementation/runtime source-of-truth.
- `docs/mvp-controlled-emission-transformation.md` is transformation source-of-truth for migration from current runtime to controlled emission MVP.
