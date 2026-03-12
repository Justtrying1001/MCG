# Cards Legacy Removal Status (final cleanup pass)

## Decision
The active card system is now **single-path MVP**:
- Token master source: `data/token-master-50.json`
- Runtime inventory/source: Prisma templates + owned instances + pack definitions/events
- API/UI payload: `MvpCardView` / `MvpCollectionItem`

## Removed now

- Runtime legacy card loader and JSON draw engine:
  - `lib/cards.ts` (deleted)
- Legacy card frame component:
  - `components/ui/CardFrame.tsx` (deleted)
- Legacy acquisition transition helper:
  - `lib/domain/acquisition/pack-foundations.ts` (deleted)
- Legacy template metadata base-card extraction bridge:
  - `lib/domain/cards/template-metadata.ts` (deleted)
- Auth API/model coexistence for cards:
  - `/api/me` no longer reads legacy `UserCard` / `PackOpening` fallback for card/session payload.
  - `/api/pack/open` no longer returns legacy `pulledCards`.
- UI card rendering fallback:
  - Auth and guest pack reveal now render only MVP DTO tiles.
  - Auth and guest collection now render only MVP DTO tiles.

## Replaced now

- `BaseCard` payload contract replaced by MVP-only card contracts in card flows.
- `CollectionProjectionV2.byBaseCard` replaced by `CollectionProjectionV2.byTokenId`.
- Guest open-pack route replaced from legacy JSON draw to token-master-driven MVP DTO draw.

## Kept temporarily (blocked)

- Files `mcg_base_cards.json`, `mcg_projects.json`, `mcg_card_variants.json` are still present for **historical migration provenance** and builder/audit context; they are no longer active runtime sources in pack/collection/reveal APIs.
- Prisma legacy tables (`UserCard`, `PackOpening`) still exist in schema for backward compatibility/data retention, but are no longer used by active card runtime routes in this pass.

## Official path after this pass

1. Seed: `prisma/seed-mvp-controlled-emission.mjs`
2. Runtime pack open: `lib/domain/acquisition/open-pack.ts`
3. Session read-model: `app/api/me/route.ts` + `lib/serializers.ts`
4. UI render: `components/ui/MvpCardTile.tsx` + `/packs` + `/collection`
