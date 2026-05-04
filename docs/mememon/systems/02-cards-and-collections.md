# Systems 02 — Cards and Collections

## Runtime card model
- `CardTemplate`: token/card-set/rarity/edition-linked template with `plannedSupply` and `issuedSupply`.
- `OwnedCardInstance`: user-owned instance linked to a template and source pack opening event.

## Active collectible tier direction
- **Product direction**: editions are the active player-facing scarcity/collectible tier.
- **Runtime reality**: both edition and classic rarity are currently present and used.

## Edition values (confirmed)
- `BASE`
- `REVERSE`
- `BRILLANTE`
- `HOLO`
- `FULL_ART`

## Genesis and supply
- Genesis card templates exist with planned vs issued supply tracking.
- Duplicates are normal via multiple owned instances of the same template.

## Metadata and display
- Template metadata exists (`metadata` JSON).
- Collection projections include `byEdition` and still also include `byRarity`.

## Explicit mismatch
Runtime currently contains both rarity and edition concepts. Product direction is to remove classic rarity from active player-facing design and use editions as the primary collectible/scarcity tier. Remaining rarity field usage should be treated as runtime cleanup/migration work.

## Runtime references
- `prisma/schema.prisma` (`CardTemplate`, `OwnedCardInstance`, `EditionType`, `RarityTier`)
- `lib/domain/projections/collection.ts`
- `app/collection/page.tsx`
