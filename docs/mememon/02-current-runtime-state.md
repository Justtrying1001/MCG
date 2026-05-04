# 02 — Current Runtime State

## Purpose
Capture verified runtime reality from the current repository.

## Runtime status snapshot
| Area | Status | Notes |
|---|---|---|
| Demo entry route | Current | Demo auth entry endpoint exists (`/api/auth/demo/enter`). |
| Privy wallet/social auth | Current | Privy exchange/link routes exist. |
| Card templates & owned instances | Current | `CardTemplate` + `OwnedCardInstance` persist ownership/supply state. |
| Edition system | Current | Edition enum exists and is used in packs, collection projections, and scoring multipliers. |
| Legacy rarity system | Current (Mismatch) | Rarity enum/field is still used in packs, collection UI filters, and scoring multipliers. |
| Pack definitions and open flow | Current | Internal points pack opening with supply-reservation exists. |
| Collection/Memedex UI | Partial | Collection works; still exposes rarity-first sorting/filtering in UI. |
| Tournament lifecycle & entry | Partial | OPEN/LOCKED/LIVE/SETTLED lifecycle + lineup/ranking/reward flows exist. |
| Rewards/ledger | Partial | Reward grants/ledger and reward-pack supply runtime exist. |
| Analytics event ingest | Partial | Event ingestion exists; reporting maturity varies. |
| Marketplace | Not Implemented | No confirmed runtime listing/buy/cancel flow. |
| Real-money payments | Not Implemented | No confirmed checkout/payment rails in this pass. |
| On-chain ownership enforcement | Not Implemented | Current loop does not require on-chain ownership enforcement. |

## Edition values confirmed in runtime
`BASE`, `REVERSE`, `BRILLANTE`, `HOLO`, `FULL_ART`.

## Runtime references
- `prisma/schema.prisma` — `EditionType`, `RarityTier`, `CardTemplate`, `OwnedCardInstance`, `PackDefinition`, `DropTableRow`, contest score models.
- `app/api/auth/demo/enter/route.ts`, `app/api/auth/privy/*`.
- `lib/domain/acquisition/open-pack.ts`, `lib/domain/acquisition/slot-weights.ts`, `lib/domain/acquisition/pack-config.ts`.
- `app/collection/page.tsx`, `lib/domain/projections/collection.ts`.
- `lib/domain/contests/runtime.ts`, `lib/domain/contests/scoring-engine-runtime.ts`, `app/api/contests/*`.

## Product/runtime mismatch (explicit)
Product direction is edition-first scarcity. Runtime still actively uses classic rarity in pack weighting, UI filtering, and scoring multipliers; this requires follow-up migration planning.

## Product/Runtime Mismatch — Classic Rarity
Current runtime still includes classic rarity across multiple active surfaces:
- Schema and template model (`RarityTier`, `CardTemplate.rarityId`).
- Pack draw weighting and odds groupings (rarity + edition).
- Scoring multipliers (`rarityMultiplier` + `editionMultiplier`).
- Collection UI sort/filter/count blocks.

Editions also exist and are active in runtime (`EditionType`, edition multipliers, edition display/projections), creating dual scarcity systems.

This conflicts with current product direction (edition-first player-facing scarcity).

Documentation remains edition-first, and runtime cleanup is required in a later implementation pass.

### Runtime references
- `prisma/schema.prisma`
- `lib/domain/acquisition/open-pack.ts`
- `lib/domain/acquisition/slot-weights.ts`
- `lib/domain/acquisition/pack-config.ts`
- `lib/domain/contests/scoring-engine-runtime.ts`
- `lib/domain/contests/runtime.ts`
- `lib/domain/projections/collection.ts`
- `app/collection/page.tsx`

## Rarity Deprecation Cleanup Backlog
- [ ] Decide whether `RarityTier` is removed, renamed, or kept hidden/internal.
- [ ] Remove player-facing rarity language from collection UI.
- [ ] Remove rarity-based odds grouping from player-facing odds surfaces.
- [ ] Replace `RARITY_HIT` slot naming with edition-first terminology.
- [ ] Remove or replace `rarityMultiplier` from scoring.
- [ ] Revalidate pack distribution after rarity removal.
- [ ] Revalidate tournament scoring after rarity removal.
- [ ] Revalidate economy docs before marketplace design.
- [ ] Ensure investor demo copy does not emphasize rarity.
