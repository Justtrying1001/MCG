# Cards Legacy Removal Status (MVP/Auth cleanup)

## Scope
This document tracks the **global cleanup status** for card runtime/UI in MVP mode.

Official MVP path:
- Canonical token data: `data/token-master-50.json`
- Runtime inventory/supply: Prisma `CardTemplate` + `OwnedCardInstance` + `PackDefinition` + `PackOpeningEvent`
- DTOs: `MvpCardView`, `MvpCollectionItem`
- Auth UI rendering: `MvpCardTile`

## Legacy dependency inventory and disposition

| Surface | Status | Classification | Decision |
|---|---|---|---|
| `app/collection/page.tsx` auth branch | Migrated | `REPLACE_NOW` | Auth collection no longer falls back to `BaseCard` rendering; it now requires `coexistence.v2.mvpCollection`. |
| `app/packs/page.tsx` auth reveal | Migrated | `REPLACE_NOW` | Auth reveal is MVP-only (`pulledCardsMvp`) and no longer uses legacy card payload for rendering. |
| `app/api/pack/open/route.ts` | Hardened | `REPLACE_NOW` | Adds payload guard to fail if MVP payload is missing/inconsistent. |
| `lib/domain/acquisition/open-pack.ts` | Partially migrated | `KEEP_TEMPORARILY_COMPAT` | Draw/runtime is DB-native + token-master-first; still emits legacy `pulledCards` for coexistence compatibility. |
| `lib/serializers.ts` (`buildUserPayload`) | Partially migrated | `KEEP_TEMPORARILY_COMPAT` | Builds MVP collection from instance-aware rows; still emits legacy `collection` for compatibility/historical users. |
| `app/api/me/route.ts` | Partially migrated | `KEEP_TEMPORARILY_COMPAT` | Auth payload exposes MVP projection; legacy `userCard`/`packOpening` reads remain only as fallback for historical users with zero v2 rows. |
| `lib/cards.ts` + `app/api/guest/pack/open/route.ts` | Legacy isolated | `KEEP_TEMPORARILY_GUEST_ONLY` | Legacy JSON-based draw path remains intentionally guest-only. Not used for authenticated pack opening. |
| `components/ui/CardFrame.tsx` | Legacy isolated | `KEEP_TEMPORARILY_GUEST_ONLY` | Still used for guest flows. Auth pack reveal and auth collection use `MvpCardTile`. |
| `mcg_base_cards.json`, `mcg_projects.json`, `mcg_card_variants.json` | Legacy source | `DOC_ONLY` | No longer auth source-of-truth; retained for guest/compat and historical references. |
| `types/session.ts` `collection` | Compatibility field | `KEEP_TEMPORARILY_COMPAT` | Preserved for guest + coexistence migration; auth MVP consumers should use `coexistence.v2.mvpCollection`. |

## What was removed/replaced in this pass

1. **Auth collection legacy fallback removed**
   - Auth users no longer silently render legacy `CardFrame` cards.
   - If `mvpCollection` payload is missing, UI shows explicit MVP payload warning instead of falling back.

2. **Auth pack reveal now MVP-only**
   - Auth reveal cards are now sourced from `pulledCardsMvp`.
   - Legacy `pulledCards` payload is no longer used for auth render.

3. **Auth pack payload hardening**
   - `/api/pack/open` now rejects invalid responses if MVP payload is absent or cardinality mismatched.

## Remaining legacy (intentional, temporary)

- Guest pack draw remains JSON-based (`lib/cards.ts` + `/api/guest/pack/open`).
- Legacy compatibility payloads are still emitted by auth APIs during coexistence period.
- `baseCardId` metadata bridge remains required for current token-master-to-template mapping.

## Next cleanup milestones

1. Remove auth `pulledCards` from `/api/pack/open` once all clients are MVP DTO-only.
2. Remove auth `collection` compatibility field from `/api/me` once all auth surfaces consume `mvpCollection` exclusively.
3. Replace `baseCardId` bridge in template metadata with direct `tokenId` reference in `CardTemplate` schema.
4. Retire `lib/cards.ts` and legacy JSON runtime path after guest mode migration/retirement.
