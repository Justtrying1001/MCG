# Token Master 50 UI Adoption

## Status
UI card rendering is now MVP-first on both major card surfaces:
- `/packs` reveal uses `MvpCardView` only.
- `/collection` grid uses `MvpCollectionItem` / `MvpCardView` only.

## Active rendering component
- `components/ui/MvpCardTile.tsx`

## Data contracts consumed
- Auth:
  - `/api/pack/open` → `pulledCardsMvp`
  - `/api/me` → `mvpCollection` (+ `coexistence.v2.mvpCollection`)
- Guest:
  - `/api/guest/pack/open` → `pulledCardsMvp`
  - local guest session state → `mvpCollection`

## Removed from active UI flow
- `CardFrame` usage on pack reveal
- `CardFrame` usage on collection
- Legacy `BaseCard`-centric card rendering on packs/collection

## Remaining note
- Guest mode still exists, but now uses MVP DTO cards instead of legacy JSON card model.
