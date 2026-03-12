# Token Master 50 — Source of Truth

## Purpose
`data/token-master-50.json` is the canonical 50-token master dataset for MVP migration.

It is built from:
- primary input: `MCG_Set1_Edition1_v3.csv`
- enrichment: `mcg_base_cards.json`, `mcg_projects.json`, `mcg_card_variants.json`

This file is intended to become the stable source for:
- backend seed inputs,
- runtime card/template metadata migration,
- UI card data migration away from direct legacy JSON reads.

## Files
- Canonical output: `data/token-master-50.json`
- Builder script: `scripts/build-token-master-50.mjs`
- Command: `npm run build:token-master-50`

## Matching strategy
The builder uses deterministic matching:
1. `coingeckoId` exact match (primary)
2. `symbol + name` exact intersection (strict fallback)
3. otherwise `manualReviewRequired = true`

No weak auto-fallback (`symbol` only / `name` only) is used to avoid false positives.

## Output structure
Top-level object:
- `version`
- `generatedAt`
- `inputSources`
- `matchingPolicy`
- `summary`
- `tokens[]`

Each token row includes:
- Identity/runtime bridge:
  - `tokenId`, `setOrder`, `sourceCsvRow`,
  - `displayName`, `symbol`, `slug`, `coingeckoId`,
  - `projectId`, `baseCardId`,
  - `imageUrl`, `primaryChain`, `faction`,
  - `marketCapRank`, `projectTier`, `isMvpEligible`
- Editorial block from CSV:
  - `editorial.*`
- Transitional legacy UI bridge:
  - `legacyVariantBridge`
- Migration controls:
  - `migrationStatus`, `mappingConfidence`, `mappingStrategy`,
  - `manualReviewRequired`, `manualReviewReason`, `candidateMatches`
- Traceability:
  - `fieldSources` (per-field provenance)

## Field provenance policy
- CSV-derived: naming/editorial (`displayName`, `symbol`, `editorial.*`, etc.)
- JSON-derived: stable runtime bridge fields (`projectId`, `baseCardId`, `slug`, `imageUrl`, etc.)
- Derived/generated: `tokenId`, `migrationStatus`, confidence flags, provenance metadata.

## Fields intentionally excluded from canonical core
Not promoted into canonical runtime core:
- legacy variant `dropWeight`
- legacy PvE stats (`ATK`, `DEF`, `SPD`, `CTRL`)
- volatile market snapshot fields (`marketCap`, `totalVolume`, etc.)

These can remain in legacy sources for historical/ops use, but are not canonical runtime card-master fields.

## Manual review workflow
Rows with unresolved deterministic mapping are emitted with:
- `manualReviewRequired: true`
- `migrationStatus: REVIEW_REQUIRED`
- `manualReviewReason`
- `candidateMatches`

Current known review-required IDs are visible in `summary.problematicTokens`.

## Operational notes
- Re-run generator whenever CSV or legacy source files change.
- Commit both script and generated JSON together.
- Do not hand-edit `data/token-master-50.json`; use builder + explicit source correction.


## Related adoption doc
- `docs/token-master-50-adoption-plan.md` for replacement decisions, seed adoption, and remaining legacy dependencies.
