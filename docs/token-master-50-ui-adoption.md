# Token Master 50 UI Adoption (Progressive)

## Scope of this pass
This pass migrates **auth MVP card surfaces** toward `MvpCardView` / `MvpCollectionItem` without breaking guest/legacy flows.

## Legacy UI dependencies audited
Primary legacy-dependent UI surfaces:
- `app/collection/page.tsx` (historically `me.collection` + `BaseCard`)
- `app/packs/page.tsx` reveal grid (`BaseCard` payload)
- `components/ui/CardFrame.tsx` (fully `BaseCard`-centric)

Related data bridges:
- `/api/me` legacy-compatible `collection` payload still present
- `/api/pack/open` legacy-compatible `pulledCards` still present

## What is migrated now

### 1) New MVP card component
- Added `components/ui/MvpCardTile.tsx`.
- It renders `MvpCardView` directly (template/token identity, rarity/edition, supply, ownership count), without depending on `BaseCard` fields.

### 2) Collection auth is MVP-first when available
- `app/collection/page.tsx` now checks `me.coexistence.v2.mvpCollection`.
- For authenticated users with `mvpCollection` rows:
  - filters/search and grid rendering use `MvpCollectionItem`.
  - `MvpCardTile` is used for rendering cards.
- Fallback behavior remains:
  - guest mode and users without `mvpCollection` continue using legacy `BaseCard` + `CardFrame` path.

### 3) Pack reveal auth uses MVP DTO when available
- `app/packs/page.tsx` now reads `pulledCardsMvp` in addition to `pulledCards`.
- In authenticated reveal flow, when `pulledCardsMvp` cardinality matches pull size, reveal front renders with `MvpCardTile`.
- Legacy fallback remains:
  - guest flow and missing MVP payload still render `CardFrame` with `BaseCard`.

## What remains legacy (intentionally)
- `CardFrame` remains `BaseCard`-centric and unchanged.
- Guest pack draw still relies on legacy card data path.
- Legacy-compatible payloads are still returned for compatibility during migration.

## Why this migration is safe
- New MVP rendering is additive and conditional.
- Existing legacy payloads/components are preserved as fallback.
- Guest and legacy-auth behavior remains operational while auth MVP path moves forward.

## Next steps recommended
1. Add dedicated visual styling parity for `MvpCardTile` to match/replace `CardFrame` aesthetics.
2. Move additional auth card surfaces (contests lineup cards, detail cards) to `MvpCardView` where feasible.
3. Introduce API contracts that explicitly distinguish MVP DTO vs legacy compatibility payloads.
4. Reduce/retire `BaseCard` dependence once UI migration reaches full auth coverage.

## 2026-03 Debug pass: why legacy visuals were still showing

Root causes found in live branches:
- `app/collection/page.tsx` used `mvpCollection.length > 0` to enable MVP rendering, so authenticated users with an empty MVP projection fell back to legacy `BaseCard` branch.
- `app/packs/page.tsx` gated MVP reveal on `me.mode === "user"`; when session mode/state was temporarily unavailable after open, reveal could still take the legacy card path despite `pulledCardsMvp` being present.
- `lib/domain/acquisition/open-pack.ts` was rebuilding reveal payload from a post-query of awarded instances; this made MVP reveal construction less direct than the actual template selection loop.

Fixes applied:
- Collection gating is now based on `Array.isArray(me.coexistence?.v2?.mvpCollection)` and keeps empty-state in MVP branch.
- Pack reveal now prefers MVP rendering whenever `pulledCardsMvp` exists with matching cardinality to `pulledCards`.
- Pack-open service now constructs `pulledCardsMvp` directly from selected templates (including rarity/edition/planned/issued supply), while still emitting legacy-compatible `pulledCards` for coexistence.

Net effect:
- Auth reveal/collection paths are now MVP-first by payload availability, not by fragile legacy/session gates.
- Legacy card rendering remains as compatibility fallback for guest and non-MVP payload paths.

## 2026-03 legacy cleanup pass (auth MVP-only rendering)

Additional cleanup in this pass:
- `app/collection/page.tsx` now treats authenticated collection as **MVP-only**; it does not render legacy `CardFrame` for auth users anymore.
- `app/packs/page.tsx` now treats authenticated reveal as **MVP-only** (`pulledCardsMvp`) and uses legacy render strictly for guest path.
- `/api/pack/open` now validates that `pulledCardsMvp` exists and matches pull cardinality before returning success.

Compatibility still retained:
- `CardFrame` and legacy payload remain for guest-only route and temporary compatibility (`pulledCards`, `collection`).
