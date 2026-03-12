# Cards System Source of Truth (MCG MVP)

## A) Canonical card source

### File
- `data/token-master-50.json`

### Role
- Canonical 50-token MVP dataset used as card identity source for runtime/UI.
- Loaded by `lib/domain/cards/token-master.ts`.

### Main fields (runtime-relevant)
- `tokenId`, `displayName`, `symbol`, `slug`
- `coingeckoId`, `projectId`
- `imageUrl`, `primaryChain`, `faction`
- `projectTier`, `marketCapRank`
- `isMvpEligible`

### Regeneration
- Script: `scripts/build-token-master-50.mjs`
- Command: `npm run build:token-master-50`

---

## B) Runtime DB model (authoritative inventory/supply)

- `CardTemplate`
  - One template per token × rarity × edition.
  - Holds `plannedSupply`, `issuedSupply`, relations to rarity/edition/tokenProject/cardSet.
- `OwnedCardInstance`
  - Per-user owned card instances.
- `PackDefinition`
  - Pack config + stock counters (`plannedPackCount`, `openedPackCount`, `cardsPerPack`).
- `PackOpeningEvent`
  - Auth pack opening event log.

Rarity/edition dimensions are managed through `Rarity` and `Edition` tables and attached to templates.

---

## C) Pack model and controlled emission

Current MVP target implemented:
- 5 cards per pack
- 16,000 packs total
  - 11,000 `SALE`
  - 5,000 `REWARD`
- 50 tokens
- 5 rarity tiers
- 5 edition tiers
- 1,250 templates (`50 × 5 × 5`)
- Draw is weighted by remaining template supply (`plannedSupply - issuedSupply`)
- Depleted templates cannot be drawn

Auth opening runtime:
- `app/api/pack/open/route.ts`
- `lib/domain/acquisition/open-pack.ts`

---

## D) Auth vs guest

### Auth
- Uses DB-native controlled emission (`CardTemplate` stock + `OwnedCardInstance` creation).
- Pack API returns MVP payload (`pulledCardsMvp`) only.
- Collection/session uses `mvpCollection` only for card rendering.

### Guest
- Remains local/session-scoped.
- Uses token-master MVP DTO generation in `app/api/guest/pack/open/route.ts`.
- Does **not** use legacy JSON card files anymore.
- Guest collection shape is MVP (`mvpCollection`) and rendered with MVP UI.

---

## E) API payloads (cards)

### `POST /api/pack/open`
- Returns:
  - `pulledCardsMvp: MvpCardView[]`
- Route rejects invalid payload (`pulledCardsMvp.length === 0`).

### `GET /api/me`
- Returns:
  - top-level `mvpCollection: MvpCollectionItem[]`
  - `coexistence.v2.mvpCollection` (same projection for v2 envelope consumers)
  - progression summaries (`collectionProjection`, account/collection/competitive progression)

### `POST /api/guest/pack/open`
- Returns:
  - `pulledCardsMvp: MvpCardView[]`
  - updated guest `state` with `mvpCollection`

---

## F) UI rendering contracts

Active components/pages:
- `components/ui/MvpCardTile.tsx`
- `app/packs/page.tsx`
- `app/collection/page.tsx`

These surfaces consume `MvpCardView` / `MvpCollectionItem`.
Legacy card frame rendering is removed from active cards flow.

---

## G) Seed and maintenance workflow

1. Build/refresh token master if needed:
   - `npm run build:token-master-50`
2. Seed controlled-emission templates/packs:
   - `node prisma/seed-mvp-controlled-emission.mjs`
   - dry run: `node prisma/seed-mvp-controlled-emission.mjs --dry-run`
3. Validate with tests:
   - `npm run typecheck`
   - `npm test`
4. Cloud bootstrap/remediation:
   - strict manual check: `npm run bootstrap:mvp:cloud`
   - deploy-safe check (allows exhausted inventory): `npm run bootstrap:mvp:cloud:deploy`


---

## H) What was removed from active cards system

Removed runtime legacy pieces:
- `lib/cards.ts`
- `components/ui/CardFrame.tsx`
- `lib/domain/acquisition/pack-foundations.ts`
- `lib/domain/cards/template-metadata.ts`

Removed active legacy payload dependence:
- auth pack route no longer returns legacy `pulledCards`
- auth/guest UI no longer renders legacy card model
- `/api/me` card payload is MVP-first/top-level

Still present but non-runtime for cards flow:
- `mcg_base_cards.json`, `mcg_projects.json`, `mcg_card_variants.json` (historical/provenance for migration tooling)


## I) Reward pack distribution

- Runtime pack codes:
  - sale: `mvp_sale_pack`
  - reward: `mvp_reward_pack`
- Product labels (from token master editorial fields) map to GENESIS / Edition 1 set identity, while runtime uses `MVP_SET_V1` + pack codes.
- Admin reward distribution endpoint: `POST /api/internal/rewards/pack-grant`
  - `GRANT_ONLY`: consume reward stock + log `RewardGrant(PACK)`
  - `GRANT_AND_OPEN`: consume reward stock + open immediately + create instances + log `RewardGrant(PACK)`

- Cloud bootstrap commands:
  - `npm run bootstrap:mvp:cloud` (seed + strict check requiring remaining supply)
  - `npm run bootstrap:mvp:cloud:deploy` (seed + deploy-safe check allowing exhausted supply)
- Vercel build path runs deploy-safe bootstrap automatically through `npm run vercel-build`.
- Seed upserts preserve live runtime counters on existing rows (`issuedSupply`, `openedPackCount`) to avoid resetting production inventory history.
