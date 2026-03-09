# MCG Phase 0 — Preconditions / Freeze / Contracts

This document captures the **implemented Phase 0 repository safeguards** aligned with:
- `docs/mcg-pivot-product-foundation.md`
- `docs/mcg-transition-architecture-plan.md`

## Scope guardrail

Phase 0 is preparation only:
- no contest domain implementation,
- no PvE replacement,
- no pack/collection write-model migration,
- no UI redesign.

## A) Destructive reset workflow mitigation

### What was found
- `package.json` previously defined `vercel-build` as:
  - `prisma generate && prisma db push --force-reset && next build`
- This can drop/recreate schema state during deployment build, which is incompatible with stateful phased migration.

### Phase 0 mitigation applied
- `vercel-build` now uses non-destructive push:
  - `prisma generate && prisma db push && next build`
- destructive reset remains available only as an explicit manual script:
  - `prisma:push:reset`.

### Operational intent
- migration/preview/prod-like environments should use non-destructive flow.
- destructive reset is now opt-in by explicit command, not implicit in deployment build.

## B) `/api/me` coexistence contract preparation

### Current contract handling (Phase 0)
- Introduced shared session payload types in `types/session.ts`.
- Added a reserved additive coexistence envelope:
  - `coexistence?.v2` (unused in Phase 0).
- `/api/me` response remains backward-compatible with current consumers.

### Why
This provides a stable additive extension point so later phases can attach projection-backed migration payloads without ad hoc field sprawl.

## C) Session/auth boundary clarification

### Current handling (Phase 0)
- `components/useSession.ts` now imports shared payload contracts from `types/session.ts`.
- Added explicit boundary note that `useSession` is bootstrap/auth transport and should not become the catch-all domain aggregator.

## Deferred to later phases

- new target domain models/entities,
- contest backend/frontend,
- profile/progression V2 payload implementation,
- PvE decommissioning,
- pack internals migration to instance-aware ownership.
