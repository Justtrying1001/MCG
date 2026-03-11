# MCG Current Runtime Architecture

This document describes the **active implementation runtime**.

## Product runtime (current)
- Collectible-first acquisition via pack opening.
- Collection browsing over owned cards.
- Contest-driven gameplay (entry, lineup lock, ranking, settlement).
- Profile/progression hub using v2 summary projections.
- Rewards/quests runtime with user and admin surfaces.
- PvE is retired from active flow (legacy compatibility endpoints return `410 Gone`).

## Runtime boundaries
- **Auth/session transport**: `GET /api/me` + `useSession`.
- **Pack acquisition**:
  - `/api/pack/open` (authenticated, DB-native controlled emission)
  - `/api/guest/pack/open` (temporary local guest state)
- **Contest domain**:
  - player routes: `/api/contests/*`
  - internal ops routes: `/api/internal/contests/*`
  - runtime orchestrator: `lib/domain/contests/runtime.ts`
- **Rewards/quests domain**:
  - user routes: `/api/rewards/ledger`, `/api/quests`, `/api/quests/:questId/submit`
  - internal ops routes: `/api/internal/quests/*`, `/api/internal/rewards/manual-grant`, `/api/internal/users/search`
  - runtime orchestrators: `lib/domain/rewards/*`, `lib/domain/quests/runtime.ts`
- **Collection/progression projections**:
  - `lib/domain/projections/collection.ts`
  - `lib/domain/progression/profile-summary.ts`

## Acquisition runtime status
- Authenticated pack opening (`/api/pack/open`) uses controlled-emission supply from `CardTemplate.plannedSupply` / `issuedSupply`.
- Runtime opening allocates from remaining template stock, increments `PackDefinition.openedPackCount`, writes `PackOpeningEvent` + `OwnedCardInstance`, and keeps temporary legacy dual-write (`PackOpening`, `UserCard`) for continuity.
- Pack open point debit is ledger-backed (`PACK_OPEN`).
- Guest opening remains local/temporary and is not part of controlled-emission inventory.

## Read-model status
- `/api/me` reads primarily from instance-aware models (`OwnedCardInstance`, `PackOpeningEvent`) and treats legacy (`UserCard`, `PackOpening`) as compatibility fallback only.
- Collection projection is aligned to active catalog templates (`CardTemplate`) and computes completion on template ownership.

## Rewards/ledger status
- `RewardLedgerEntry` is actively used for:
  - welcome signup credit (`WELCOME_REWARD`),
  - pack opening debit (`PACK_OPEN`),
  - quest credits (`QUEST_REWARD`),
  - admin manual point grants (`ADMIN_GRANT`).
- Ledger conventions are centralized in `lib/domain/rewards/conventions.ts`.

### Important boundary (partial adoption)
- Contest settlement points still apply via direct `User.points` increment + `RewardGrant` (not yet mirrored to `RewardLedgerEntry`).
- Therefore, ledger is operational but not yet the single source of truth for **all** point mutations.

## Quest runtime status
- Implemented quest flows:
  1. `CONTEST_COUNT_MILESTONE` (`AUTO`) → auto progression/completion/credit on contest entry count threshold.
  2. `SOCIAL_FOLLOW_X` / `SOCIAL_ENGAGEMENT_X` (`SUBMIT`/`MANUAL_REVIEW`) → user proof submission + admin approve/reject.
- Social verification is manual review only (no direct external X API proof validation).
- User rewards page `/rewards` shows quest buckets and social submission UX.
- Admin quest ops pages:
  - `/admin/quests`
  - `/admin/quests/submissions`
  - `/admin/quests/:questId`

## Admin rewards ops status
- Manual grants are live:
  - API: `/api/internal/rewards/manual-grant` (`POST`, optional `GET` recent grants)
  - UI: `/admin/rewards`
- User lookup for reward ops:
  - API: `/api/internal/users/search`

## Coexistence still intentional
- Dual-write in pack opening remains intentional:
  - legacy continuity (`UserCard`, `PackOpening`)
  - target ownership truth (`OwnedCardInstance`, `PackOpeningEvent`)
- `/api/me` includes `coexistence.v2` because active profile/collection UI consumes it.

## Stabilization checks (automated)
- `npm test` (Vitest): rewards/quests/manual-grants/onboarding/acquisition invariants and API route behavior.
- `npm run typecheck`: Prisma generation + TypeScript compile validation.

## Documentation policy
- Product intent source: `docs/mcg-pivot-product-foundation.md`.
- Runtime implementation source: this file.
- Repo/docs alignment source: `docs/repo-and-docs-consolidation-audit-2026-03.md`.
- Historical context docs (cartography/transformation) are not runtime source-of-truth.
