# MCG Phase 2 — Pack + Collection Transition (Implementation Note)

This note documents the incremental Phase 2 implementation aligned with:
- `docs/mcg-pivot-product-foundation.md`
- `docs/mcg-transition-architecture-plan.md`
- `docs/mcg-phase-0-preconditions.md`
- `docs/mcg-phase-1-foundations-implementation.md`

## Chosen pack write strategy: explicit dual-write

Phase 2 uses **dual-write** in `/api/pack/open`.

On each authenticated pack opening, the transaction now writes:
1. **Legacy compatibility path (preserved):**
   - `PackOpening`
   - `UserCard` quantity upserts
2. **Target-domain ownership path (new):**
   - `PackOpeningEvent`
   - one `OwnedCardInstance` per awarded pull
   - each awarded instance links provenance via `sourcePackOpeningEventId`

This preserves current user-facing behavior while beginning the shift of ownership truth toward instance-aware records.

## Deterministic catalog/template bootstrap policy

To avoid hidden migration magic, the pack route uses a single explicit deterministic bootstrap module:
- `lib/domain/acquisition/phase2-pack-foundations.ts`

Bootstrap policy is deterministic and idempotent:
- card set code: `BASE_SET_V1`
- pack definition code: `BASE_PACK_V1`
- rarity mapping from legacy `projectTier`: `S->LEGENDARY`, `A->EPIC`, `B->RARE`, `C->UNCOMMON`, default `COMMON`
- edition mapping from legacy `variantType`: `standard->BASE`, `holo->HOLO`, `full_art->FULL_ART`, default `BASE`
- template metadata persists `baseCardId` so collection projections can map instance ownership to existing base-card UI contracts.

## Collection projection/read-model introduced

Phase 2 adds a pragmatic collection projection:
- `lib/domain/projections/collection.ts`

It produces:
- total owned instances,
- owned template count,
- missing template count,
- completion %, 
- per-base-card owned/missing + count,
- rarity and edition ownership aggregations.

The projection is exposed additively under `/api/me`:
- `coexistence.v2.collectionProjection`

Legacy payload fields are preserved.

## Guest-mode strategy in Phase 2

Guest mode remains **legacy-only temporary state** in Phase 2.

- Guest pack opening and guest collection persistence stay session-storage based with legacy quantity semantics.
- No server-side `OwnedCardInstance` writes are performed for guests.
- `coexistence.v2.collectionProjection` is introduced for authenticated users via `/api/me`.

This keeps guest behavior stable and avoids introducing contradictory pseudo-persistent instance ownership semantics for temporary sessions.

## Explicitly deferred beyond Phase 2

- contest runtime implementation (Phase 3)
- contest frontend rollout (Phase 4)
- broad profile/progression cutover (Phase 5)
- PvE decommissioning (Phase 6)
- full API-wide migration to projection-only contracts
