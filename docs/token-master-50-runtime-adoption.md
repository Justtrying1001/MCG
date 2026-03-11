# Token Master 50 Runtime Adoption (Progressive)

## Goal
Move MVP card identity/read-model surfaces toward **token-master + DB first**, while keeping compatibility bridges where needed.

## What is token-master-first now

### 1) Seed token selection is token-master-first
- `prisma/seed-mvp-controlled-emission.mjs` reads `data/token-master-50.json`.
- Seed fails if token count != 50 or if any `manualReviewRequired` row exists.

### 2) Runtime pack-open payload is token-master-first for card identity
- `lib/domain/acquisition/open-pack.ts` now resolves pulled card identity from token master (`findTokenMasterByBaseCardId`) instead of `getCardsMap()` from legacy base cards JSON.
- Endpoint still returns legacy-compatible `pulledCards` for existing UI and additionally returns `pulledCardsMvp` (MVP DTO) for progressive UI/API adoption.

### 3) `/api/me` user read-model serialization is token-master-first
- `lib/serializers.ts` now builds top-level `collection` cards from token master lookups.
- It also builds a new `coexistence.v2.mvpCollection` array with template-aware `MvpCardView` items.
- `app/api/me/route.ts` now loads needed template fields (rarity/edition/planned/issued) to populate `mvpCollection`.

## New DTO introduced
- `types/cards.ts` now includes:
  - `MvpCardView`
  - `MvpCollectionItem`

`MvpCardView` intentionally carries only MVP-relevant fields:
- template/token identity,
- display metadata,
- rarity/edition,
- supply counters,
- ownership count flags.

## What still remains legacy (intentional for now)
- `lib/cards.ts` still powers guest-mode draw (`/api/guest/pack/open`) and old BaseCard-heavy rendering assumptions.
- `CardFrame` + UI pages are still `BaseCard`-centric.
- `collectionProjection.byBaseCard` and metadata bridge (`extractBaseCardIdFromTemplateMetadata`) remain in coexistence mode.

## Why this is safe
- No breaking change to existing legacy-compatible payload fields consumed by current UI.
- Added token-master-first surfaces in parallel (`pulledCardsMvp`, `coexistence.v2.mvpCollection`) to migrate consumers incrementally.

## Recommended next steps
1. Migrate pack reveal UI to consume `pulledCardsMvp` first.
2. Migrate collection UI to consume `coexistence.v2.mvpCollection` first.
3. Move guest draw to token-master source and deprecate large legacy card JSON dependencies.
4. Remove metadata bridge dependency on `baseCardId` once all clients are template/token-master aware.
