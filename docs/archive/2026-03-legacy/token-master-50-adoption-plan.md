# Token Master 50 Adoption Plan

## Scope of this update
This update completes two concrete steps:
1. remove the 3 ambiguous/unresolved tokens from the canonical MVP50 output,
2. make MVP seed token selection depend on `data/token-master-50.json` (instead of selecting top 50 directly from legacy JSON at seed time).

## Tokens removed and replaced

### Removed (problematic)
- `terra-luna`
- `banana-gun`
- `sats-ordinals`

Reason: these IDs were unresolved/non-deterministic in the legacy mapping process.

### Added (clean deterministic replacements)
- `pump-fun`
- `pippin`
- `dogwifcoin`

Reason: each replacement has deterministic identity mapping in legacy sources (`coingeckoId`, `projectId`, `baseCardId`, `slug`, `image`), is eligible, and avoids ambiguity.

## Builder behavior changes
File: `scripts/build-token-master-50.mjs`

New behavior:
- Explicitly excludes the 3 problematic CSV IDs.
- Injects exactly 3 replacement rows from preferred clean candidates.
- Produces fixed-size 50-token output.
- Emits summary metadata:
  - `excludedProblematicFromCsv`
  - `replacementsAdded`
- Keeps strict deterministic match policy:
  - `coingeckoId` first,
  - strict `symbol+name` fallback,
  - otherwise manual review.

## Seed behavior changes
File: `prisma/seed-mvp-controlled-emission.mjs`

New behavior:
- Reads tokens from `data/token-master-50.json` (source of truth for MVP50 scope).
- Fails fast if:
  - token count is not 50,
  - any token has `manualReviewRequired = true`.
- Uses token master fields to create/update token projects and templates.

This makes seed selection of MVP50 **explicitly driven by token master** and no longer by direct top-50 ranking query over `mcg_base_cards.json`.

## Current status after this change
- Canonical token master target size: 50.
- Manual-review rows: expected 0 after replacement regeneration.
- MVP seed selection source: `data/token-master-50.json`.

## Remaining legacy dependencies (not removed in this step)
- `lib/cards.ts` still reads legacy JSON for guest draw and runtime card hydration.
- `lib/domain/acquisition/open-pack.ts` still bridges selected template metadata -> `baseCardId` -> `getCardsMap()`.
- `lib/serializers.ts` still builds collection cards via legacy base-card map.
- UI card rendering (`types/cards.ts`, `CardFrame`) still expects legacy-enriched `BaseCard` shape.

## Recommended migration order (next)
1. Introduce API DTOs sourced from token master + DB templates (remove direct dependence on legacy `BaseCard` shape).
2. Migrate `/api/pack/open` payload and `/api/me` collection payload to template-native/token-master-backed representation.
3. Move `lib/cards.ts` guest pool to token master dataset.
4. Retire legacy JSON runtime lookups once UI/contracts no longer require them.
