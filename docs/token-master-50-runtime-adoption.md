# Token Master 50 Runtime Adoption

## Status (current)
Card runtime is now MVP-path only for active pack/collection flows.

### Implemented
- `prisma/seed-mvp-controlled-emission.mjs` seeds templates from `data/token-master-50.json`.
- `lib/domain/acquisition/open-pack.ts` resolves card identity by template `tokenProject.slug` + token master lookup.
- `/api/pack/open` returns `pulledCardsMvp` only.
- `/api/me` returns `mvpCollection` built from `OwnedCardInstance` + template relations.
- `buildCollectionProjectionV2` now projects by token (`byTokenId`) instead of legacy base-card bridge.

### Guest runtime
- `/api/guest/pack/open` now also uses token-master-driven MVP DTO cards (`pulledCardsMvp`).
- Guest no longer uses legacy JSON card draw runtime.

## Removed from active runtime path
- Legacy `pulledCards` payload from auth pack route.
- Legacy `UserCard` / `PackOpening` fallback reads in `/api/me` card payload.
- Legacy base-card metadata extraction in active pack/collection/read-model path.

## Still present but non-active for card runtime
- Legacy Prisma tables (`UserCard`, `PackOpening`) remain in schema for compatibility/data retention.
- Legacy JSON files remain in repo for migration provenance/build context, not active card runtime.
