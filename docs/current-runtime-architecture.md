# Current Runtime Architecture (Source of Truth)

This document describes what is currently implemented in runtime.

## Product/runtime scope
- Auth + guest session flows
- Pack opening with controlled emission model
- Collection/read-model surfaces
- Contests and progression
- Rewards/quests/admin reward operations

## Cards system (single active path)

### Canonical card identity
- `data/token-master-50.json`
- Runtime loader: `lib/domain/cards/token-master.ts`

### Controlled emission inventory
- Prisma models: `CardTemplate`, `OwnedCardInstance`, `PackDefinition`, `PackOpeningEvent`
- Auth pack opening (`/api/pack/open`) uses DB-native inventory and weighted draw by remaining supply with slot profiles (3 standard + 1 premium-edition + 1 hit slot).
- `/api/pack/config` exposes sale pack stock (`remaining/total`) and dynamic rarity odds snapshots per slot.

### API payloads
- `/api/pack/open` returns `pulledCardsMvp`.
- `/api/me` returns `mvpCollection` (also mirrored in `coexistence.v2.mvpCollection` envelope).
- `/api/guest/pack/open` returns `pulledCardsMvp` and guest `mvpCollection` state.

### UI rendering
- `/packs` reveal uses `MvpCardTile` + `MvpCardView`.
- `/collection` uses `MvpCardTile` + `MvpCollectionItem`.

## Pack constraints (MVP)
- 5 cards per pack
- 16,000 packs total
  - 11,000 `SALE`
  - 5,000 `REWARD`
- 50 tokens
- 5 rarities
- 5 editions
- 1,250 templates
- Draw weighted by remaining supply; depleted templates cannot be drawn.

## Progression/rewards/contests
- Rewards and quests are ledger-backed.
- Contest entry uses owned instance IDs (`OwnedCardInstance`) as ownership truth.
- Progression summaries are exposed in `coexistence.v2` envelope.

## Notes
- Legacy card runtime modules/components were removed from active pack/collection flow.
- Some legacy DB structures may still exist in schema for compatibility/data retention, but are not active card runtime sources.

## Cloud bootstrap requirement
- `prisma db push` creates schema only; bootstrap data still needs explicit initialization/validation.
- `npm run vercel-build` now includes deploy bootstrap: `npm run bootstrap:mvp:cloud:deploy` (seed + deploy-safe check).
- Deploy-safe check (`check:mvp:bootstrap --allow-exhausted`) validates structures even when all supply has been consumed, so deploys do not fail on successful sellout states.
- For manual strict operations checks, use `npm run bootstrap:mvp:cloud` (fails if no remaining supply).
- If bootstrap structures are missing, `/api/pack/open` returns explicit bootstrap-drift errors (`MVP sale pack is not available`, `missing MVP card set`, etc.).
- Bootstrap seed is idempotent for cloud drift repair and preserves live counters (`CardTemplate.issuedSupply`, `PackDefinition.openedPackCount`) when rows already exist.



## Reward pack admin flow
- `mvp_reward_pack` is now operational through admin runtime (`/api/internal/rewards/pack-grant`).
- Delivery modes:
  - `GRANT_ONLY`: reserves reward-pack stock and records `RewardGrant(PACK)`.
  - `GRANT_AND_OPEN`: reserves reward-pack stock, opens pack immediately, emits `PackOpeningEvent`, and awards `OwnedCardInstance` cards from controlled supply.
- Sale and reward packs share the same DB-native card allocation path and remaining-supply weighted draw.
