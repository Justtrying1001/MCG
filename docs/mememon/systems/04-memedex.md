# Systems 04 — Memedex

## Runtime behavior
- Shows owned cards and collection progression.
- Tracks duplicates by owned instance count.
- Uses projection data including completion %, missing templates, by-edition counts.

## Current display reality
- Edition display exists and is used in finish sections.
- Collection UI still includes rarity sorting/filtering and rarity count blocks.

## Product direction
- Edition-centric collectible framing should be primary.
- Existing rarity-first UI controls are a product/runtime mismatch to clean up.

## Runtime references
- `app/collection/page.tsx`
- `components/collection/*`
- `lib/domain/projections/collection.ts`
