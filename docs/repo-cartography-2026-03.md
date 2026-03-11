# MCG Repo Cartography

> ⚠️ Historical snapshot: this document contains pre-rewards/quests assumptions and is **not** the runtime source-of-truth. Use `docs/current-runtime-architecture.md` and `docs/repo-and-docs-consolidation-audit-2026-03.md` first.

## 1. Executive overview

### 1.1 What this repo is
MCG is a Next.js App Router monorepo-style web app (single deployable) for a collectible-first card game pivoted toward contest gameplay.

Current active product loop:
1. Authenticate (X OAuth) or start guest mode.
2. Open packs (authenticated DB-native controlled-emission path; guest local simulation path).
3. View collection/progression projections.
4. Enter contests with owned card instances.
5. Internal admin operates contest lifecycle (create/status/score/settle).

### 1.2 High-level architecture
- **UI/App layer:** `app/` pages + reusable UI components in `components/`.
- **API layer:** Route handlers under `app/api/*`.
- **Domain layer:** `lib/domain/*` (acquisition, contests, projections, progression).
- **Auth/session/security:** `lib/auth.ts`, `lib/admin-auth.ts`, `lib/internal-auth.ts`, `lib/x-oauth.ts`.
- **Data layer:** Prisma schema in `prisma/schema.prisma` with one runtime seed/bootstrap script.
- **Static product data:** `mcg_base_cards.json`, `mcg_card_variants.json`, `mcg_projects.json`.
- **Quality gates:** Vitest tests under `tests/`.

### 1.3 Main product domains
- Packs/acquisition
- Collection ownership and projection
- Account progression/profile summary
- Contests (entry/lineup/score/ranking/settlement)
- Reward grants (mostly contest-settlement-triggered)
- Admin/Ops (contest tooling)
- Auth/session (user + admin + internal key)

### 1.4 Current architectural shape
- Hybrid **target + legacy coexistence** by design:
  - Target write/read models: `OwnedCardInstance`, `PackOpeningEvent`, `CardTemplate`, `PackDefinition`.
  - Legacy continuity: `UserCard`, `PackOpening` still dual-written/fallback-read.
- Contest runtime is relatively centralized in one service (`lib/domain/contests/runtime.ts`).
- Rewards exist as a primitive table/model and contest settlement write path, but no user reward center UI yet.

### 1.5 Critical strengths
- Domain runtime has clear transaction boundaries (`prisma.$transaction`, serializable where needed).
- Contest lifecycle has both player-facing and admin/internal APIs.
- Read model for `/api/me` explicitly codifies v2-first with fallback.
- Seed/bootstrap path formalizes controlled-emission inventory initialization.

### 1.6 Critical ambiguities / risks
- Pack UI odds are hardcoded in frontend copy, while runtime draw is supply-weighted from DB remaining supply.
- Legacy and target systems both active: risk of drift if cleanup sequencing is not tightly controlled.
- Rewards model exists but not yet elevated to full ledger/claims/campaigns/quests domain.
- `DropTable`/`DropTableRow` models exist but are not wired in active opening runtime.
- `game-config.ts` still contains retired PvE tuning constants (dead-ish config surface).

---

## 2. Top-level repository structure

### 2.1 Commented tree (main folders)
```text
.
├─ app/                        # Next App Router pages + API handlers
├─ components/                 # Shared UI and hooks
├─ lib/                        # Runtime/domain/auth/services helpers
├─ prisma/                     # Prisma schema + seed/bootstrap scripts
├─ tests/                      # Vitest tests (runtime + read-model + seed dry-run)
├─ docs/                       # Product/runtime/transformation source docs
├─ types/                      # Shared TS payload/types contracts
├─ mcg_base_cards.json         # Base card catalog (legacy + rendering lookup)
├─ mcg_card_variants.json      # Variant metadata for rendering/drop weighting (legacy path)
├─ mcg_projects.json           # Token/project metadata enrichment
├─ Brand guide/                # Product/brand .docx references (non-runtime)
├─ package.json                # Scripts + dependencies
├─ next.config.mjs             # Next config
├─ tsconfig.json               # TS config
└─ vitest.config.ts            # Test config
```

### 2.2 Naming and organization conventions
- App Router conventions (`page.tsx`, `layout.tsx`, `route.ts`).
- Domain organization under `lib/domain/<domain>/...`.
- Internal/admin API split:
  - public-ish/user API under `app/api/contests/*`, `app/api/pack/*`, etc.
  - internal ops API under `app/api/internal/*`.
- “MVP” and “Phase” terminology appears in comments/docs to mark transitional architecture state.

---

## 3. Architecture by layer

### 3.1 App / UI layer
- **Public/user pages:** home, packs, collection, contests list/detail, compte (profile), combats (legacy informational).
- **Admin pages:** login, protected admin shell, contest admin list/detail.
- **Session-driven shell:** `SiteShell` handles auth controls/nav and both user/guest states.

### 3.2 API layer
- App route handlers call domain services from `lib/domain/*`, plus auth/security helpers.
- Route families:
  - Auth/session: `/api/auth/*`, `/api/me`
  - Pack: `/api/pack/open`, `/api/guest/pack/open`
  - Contests (player): `/api/contests/*`
  - Contests (internal/admin): `/api/internal/contests/*`
  - Admin login/logout: `/api/admin/*`
  - Retired PvE compatibility: `/api/pve/*`, `/api/guest/pve/*` (410)

### 3.3 Domain/service layer
- `lib/domain/acquisition/open-pack.ts` = DB-native authenticated pack opening orchestrator.
- `lib/domain/contests/runtime.ts` = contest runtime orchestration (create, enter, score, settle, status, ranking, list/detail).
- `lib/domain/projections/collection.ts` + `lib/domain/progression/profile-summary.ts` = user-facing read models.

### 3.4 Data/persistence layer
- Prisma models include both legacy and target-controlled-emission structures.
- No migrations folder currently tracked; uses `prisma db push` workflow.
- Seed script `seed-mvp-controlled-emission.mjs` bootstraps rarity/edition/template supply and pack definitions.

### 3.5 Docs / source-of-truth layer
- `docs/mcg-pivot-product-foundation.md`: product intent source.
- `docs/current-runtime-architecture.md`: implementation/runtime source.
- `docs/mvp-controlled-emission-transformation.md`: migration plan and coexistence framing.

### 3.6 Testing layer
- API read-model behavior coverage for `/api/me` v2 + legacy fallback.
- Acquisition transactional invariants coverage for pack opening runtime.
- Seed dry-run invariant count verification.

### 3.7 Tooling / scripts / config layer
- Scripts in `package.json` emphasize Prisma generate/db push + typecheck + Vitest.
- No CI workflow files detected in repo root.
- Environment variables documented in `.env.example` and `README.md`.

---

## 4. Domain mapping

### 4.1 Packs
**Where defined**
- Pack constants: `lib/domain/acquisition/constants.ts` (`mvp_sale_pack`, `mvp_reward_pack`).
- Pack model: `PackDefinition` in Prisma.
- Seed sets `MVP_PACKS` inventory counts in `prisma/seed-mvp-controlled-emission.mjs`.

**Where opened**
- Auth user: `POST /api/pack/open` -> `openSalePackMvpDbNative`.
- Guest: `POST /api/guest/pack/open` -> local `openBasePack` path.

**Stock/odds/supply**
- Stock: `PackDefinition.openedPackCount < plannedPackCount` guard.
- Card issuance: `CardTemplate.issuedSupply < plannedSupply` and increment on allocation.
- Runtime selection weight: remaining supply weighted random (`pickByRemainingSupply`).
- UI odds shown in `app/packs/page.tsx` are static display constants (non-authoritative).

**Inventory reflection**
- Authoritative ownership: `OwnedCardInstance`.
- Transitional dual-write: `UserCard` + `PackOpening` also written in authenticated open path.

### 4.2 Collection
- Core card catalog model: `CardTemplate` + links to `TokenProject`, `CardSet`, `Rarity`, `Edition`.
- Ownership instances: `OwnedCardInstance`.
- Projection builder: `buildCollectionProjectionV2` (template completion + byBaseCard/byRarity/byEdition).
- User payload serializer maps instances -> legacy `baseCardId` collection rows for UI compatibility.

### 4.3 Progression
- Summary builder: `buildProgressionSummariesV2`.
- XP/level policy: derived from points unless `UserProgression` row exists.
- Collection progression summary derives from collection projection.
- Competitive summary aggregates contest entries/rankings + optional `CompetitiveProgression` row.

### 4.4 Contests
- Models: `Contest`, `ContestRule`, `ContestEntry`, `RosterLock`, `ContestScore`, `ContestRanking`, `ContestSettlement`.
- Player flow: list -> detail -> lineup options -> enter -> ranking read.
- Admin/internal flow: create contest, status update, score recording, settlement.
- Settlement writes `RewardGrant` rows and increments user points for POINTS rewards.

### 4.5 Rewards / grants / quests
- Existing primitive: `RewardGrant` model + `RewardType` enum.
- Existing writer: `settleContestMvp` creates grants.
- Existing side effect: points rewards update `User.points`.
- Existing admin UI support: contest detail admin page can submit reward rows during settlement.
- Missing currently:
  - reward ledger UI
  - user claim workflow/status
  - quest/campaign/daily models and runtime
  - reward page and dedicated reward APIs

### 4.6 Admin / ops
- Admin auth cookie system (`mcg_admin_session`) with signed payload.
- Protected admin route group enforces session via server layout redirect.
- Internal APIs accept either admin cookie session OR internal key header via `requireInternalAdminAccess`.
- Current admin panel is contest-operations focused, no dedicated rewards/quests admin yet.

### 4.7 Auth / session
- User auth: X OAuth 1.0a request token -> callback -> user upsert -> custom session cookie + `UserSession` table.
- Session read: `/api/me` and `useSession` hook.
- Guest mode: browser sessionStorage state with local-only pack opening and collection.

### 4.8 Legacy / transition zones
- Legacy models still active: `UserCard`, `PackOpening`.
- Transition comments embedded across runtime/docs.
- Legacy pack helper module retained: `lib/domain/acquisition/pack-foundations.ts` (deprecated).
- Legacy draw system for guest/local and catalog lookup still in `lib/cards.ts`.

---

## 5. Route and endpoint inventory

### 5.1 App routes
- `/` Home
- `/packs` Pack opening UX
- `/collection` Collection grid/summary
- `/contests` Contest list
- `/contests/[contestId]` Contest detail and entry
- `/compte` Profile/progression hub
- `/combats` Legacy PvE retired notice
- `/admin/login`
- `/admin` (protected)
- `/admin/contests` (protected)
- `/admin/contests/[contestId]` (protected)

### 5.2 API routes (user/public)
- `GET /api/me`
- `POST /api/pack/open`
- `POST /api/guest/pack/open`
- `GET /api/contests`
- `GET /api/contests/:contestId`
- `GET /api/contests/:contestId/ranking`
- `GET /api/contests/:contestId/lineup-options`
- `POST /api/contests/:contestId/enter`
- `GET /api/auth/x/start`
- `GET /api/auth/x/callback`
- `POST /api/auth/logout`

### 5.3 Admin/internal routes
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/internal/contests`
- `POST /api/internal/contests`
- `GET /api/internal/contests/:contestId`
- `POST /api/internal/contests/:contestId/status`
- `POST /api/internal/contests/:contestId/score`
- `POST /api/internal/contests/:contestId/settle`

### 5.4 Retired compatibility routes
- `POST /api/pve/battle` -> 410
- `POST /api/pve/run` -> 410
- `POST /api/guest/pve/battle` -> 410

---

## 6. Data model mapping

### 6.1 Core models
- Identity/session: `User`, `UserSession`
- Legacy collection/opening: `UserCard`, `PackOpening`
- Catalog/acquisition target: `TokenProject`, `CardSet`, `Rarity`, `Edition`, `CardTemplate`, `PackDefinition`, `PackOpeningEvent`, `OwnedCardInstance`

### 6.2 Reward-adjacent models
- `RewardGrant` with optional links:
  - to `PackDefinition` (pack grant)
  - to `PackOpeningEvent`
  - to `ContestSettlement`
- Reward typing via `RewardType` enum (`POINTS`, `PACK`, `CARD_INSTANCE`)

### 6.3 Contest-adjacent models
- `Contest`, `ContestRule`, `ContestEntry`, `RosterLock`, `ContestScore`, `ContestRanking`, `ContestSettlement`
- Core constraints:
  - unique `(contestId, userId)` for entry/score/ranking
  - unique settlement per contest
  - unique roster lock tuple per entry+instance

### 6.4 Progression-adjacent models
- `UserProgression`
- `CollectionProgression`
- `CompetitiveProgression`

### 6.5 Legacy models
- `UserCard`
- `PackOpening`
- Legacy metadata dependencies via `baseCardId` extraction from template metadata

### 6.6 Key relationships and invariants
- Pack opening invariant: user points and pack stock and template supply are decremented/incremented atomically in transaction.
- Contest entry invariant: lineup ownership + uniqueness + lock constraints validated before write.
- Settlement invariant: one settlement per contest.
- Projection invariant: `/api/me` prefers v2 instance-aware path; legacy fallback only when v2 rows absent.

---

## 7. Service and runtime mapping

### 7.1 Core runtime flows
- **Pack open (auth):** `/api/pack/open` -> `openSalePackMvpDbNative` -> writes pack+instance+events (+legacy dual-write).
- **Pack open (guest):** `/api/guest/pack/open` -> local state mutation only.
- **Contest enter:** `/api/contests/:id/enter` -> `enterContestMvp` with roster locks and instance lockState updates.
- **Contest score/settle:** internal endpoints -> `recordContestScoresMvp` and `settleContestMvp`.

### 7.2 Read-model builders
- `buildCollectionProjectionV2(userId)`
- `buildProgressionSummariesV2(userId, points, collectionProjection)`
- `buildUserPayload` serializer (collection rows derived from instances, fallback legacy)

### 7.3 Admin/service helpers
- `requireInternalAdminAccess` (session OR key).
- `handleApiError` central API error normalization.
- `admin-auth` for credentials/session signing.

### 7.4 Validation and integrity mechanisms
- Explicit runtime errors: `PackOpenRuntimeError`, `ContestRuntimeError` with status codes.
- Prisma serializable transactions in contested/critical mutation flows.
- Input normalization in contest lineup and scoring.

---

## 8. File-by-file important inventory

> Status legend: **central / useful / partial / legacy / unclear**

### Application and API entrypoints
- `app/layout.tsx` — global HTML shell + analytics; **central**.
- `app/page.tsx` — marketing/home entrypoint; **useful**.
- `app/packs/page.tsx` — pack-opening UX and API trigger; **central** (packs).
- `app/collection/page.tsx` — user collection rendering based on session payload; **central** (collection).
- `app/compte/page.tsx` — profile/progression display surface; **central** (progression).
- `app/contests/page.tsx` — contests listing UI; **central** (contests).
- `app/contests/[contestId]/page.tsx` — contest detail, lineup selection and entry; **central**.
- `app/combats/page.tsx` — retired PvE page/notice; **legacy**.

- `app/api/me/route.ts` — primary user session read model assembly; **central**.
- `app/api/pack/open/route.ts` — authenticated pack open endpoint; **central**.
- `app/api/guest/pack/open/route.ts` — guest open endpoint; **partial** (local only).
- `app/api/contests/route.ts` — contest list; **central**.
- `app/api/contests/[contestId]/route.ts` — contest detail; **central**.
- `app/api/contests/[contestId]/lineup-options/route.ts` — lineup candidate list from owned instances; **central**.
- `app/api/contests/[contestId]/enter/route.ts` — player entry mutation; **central**.
- `app/api/contests/[contestId]/ranking/route.ts` — ranking read; **central**.

- `app/api/internal/contests/route.ts` — internal list/create contests; **central** (ops).
- `app/api/internal/contests/[contestId]/route.ts` — internal contest detail snapshot; **useful**.
- `app/api/internal/contests/[contestId]/status/route.ts` — status transitions; **central**.
- `app/api/internal/contests/[contestId]/score/route.ts` — score ingestion/ranking recompute; **central**.
- `app/api/internal/contests/[contestId]/settle/route.ts` — settlement + reward grants; **central**.

- `app/api/auth/x/start/route.ts`, `app/api/auth/x/callback/route.ts`, `app/api/auth/logout/route.ts` — user auth/session transport; **central**.
- `app/api/admin/login/route.ts`, `app/api/admin/logout/route.ts` — admin auth transport; **central**.
- `app/api/pve/*`, `app/api/guest/pve/*` — compatibility 410 responses; **legacy**.

### Admin UI
- `app/admin/login/page.tsx` — admin login UI; **central** for ops access.
- `app/admin/(protected)/layout.tsx` — admin route guard; **central**.
- `app/admin/(protected)/page.tsx` — admin home links; **useful**.
- `app/admin/(protected)/contests/page.tsx` — contest creation/list ops panel; **central**.
- `app/admin/(protected)/contests/[contestId]/page.tsx` — status/score/settlement operator console; **central**.

### Domain/runtime services
- `lib/domain/acquisition/open-pack.ts` — pack opening transaction orchestration; **central**.
- `lib/domain/acquisition/constants.ts` — canonical pack codes; **central**.
- `lib/domain/acquisition/pack-foundations.ts` — deprecated migration helper; **legacy**.
- `lib/domain/contests/runtime.ts` — contest domain runtime service; **central**.
- `lib/domain/projections/collection.ts` — collection projection v2; **central**.
- `lib/domain/progression/profile-summary.ts` — progression summary builder; **central**.
- `lib/domain/cards/template-metadata.ts` — metadata baseCardId adapter; **useful/bridge**.
- `lib/domain/projections/contracts.ts` — projection contracts; **useful**.

### Core infrastructure helpers
- `lib/prisma.ts` — Prisma singleton; **central infra**.
- `lib/auth.ts` — user session create/read/clear; **central infra**.
- `lib/admin-auth.ts` — admin credentials + cookie signing/verification; **central infra**.
- `lib/internal-auth.ts` — internal access policy (session or key); **central infra**.
- `lib/x-oauth.ts` — OAuth 1.0a implementation for X; **central infra**.
- `lib/serializers.ts` — `/api/me` payload serializer with coexistence fallback; **central bridge**.
- `lib/cards.ts` — static catalog loading + legacy weighted draw; **partial + legacy bridge**.
- `lib/game-config.ts` — game constants (pack cost, starting points); **central config**.
- `lib/guest.ts` — guest state types; **useful**.
- `lib/api-error.ts` — shared API error adapter; **useful**.

### UI components
- `components/useSession.ts` — client session source switch (user API vs guest storage); **central UX glue**.
- `components/layout/SiteShell.tsx` — nav/auth shell used across pages; **central UX shell**.
- `components/ui/*` — reusable UI atoms (`Button`, `CardFrame`, `Modal`, `ProgressBar`); **useful**.
- `components/auth/AuthErrorNotice.tsx` — OAuth error messaging; **useful**.
- `components/admin/AdminLogoutButton.tsx` — admin action helper; **useful**.

### Data model/scripts/tests/docs
- `prisma/schema.prisma` — canonical runtime model; **central**.
- `prisma/seed-mvp-controlled-emission.mjs` — controlled-emission bootstrap script; **central**.
- `tests/open-pack-runtime.test.ts` — opening invariants test; **central test**.
- `tests/api-me-read-model.test.ts` — v2/fallback read-model behavior test; **central test**.
- `tests/bootstrap-seed-validation.test.ts` — seed invariant dry-run test; **useful test**.
- `docs/*.md` — architecture/product/transformation knowledge base; **central docs**.

---

## 9. Current product flows reconstructed

### 9.1 Signup / onboarding
- User presses “Continue with X” -> `/api/auth/x/start` sets request token cookies and redirects to X.
- Callback `/api/auth/x/callback` verifies state, exchanges access token, fetches profile, upserts user, creates session cookie.
- Alternate onboarding: guest mode in `useSession` starts local guest state in sessionStorage.

### 9.2 Pack opening
- Auth user opens via `/api/pack/open`.
- Runtime debits points, reserves pack stock, allocates card templates by remaining supply, creates owned instances and pack opening event, then writes legacy continuity rows.
- Guest pack opening uses local weighted draw from JSON catalog and updates client-side guest state only.

### 9.3 Collection view
- UI reads `me.collection` from `/api/me` payload.
- `/api/me` builds from owned instances first, legacy fallback only when no v2 rows.
- Additional v2 collection projection returned under `coexistence.v2.collectionProjection`.

### 9.4 Contest participation
- Contest list from `/api/contests`.
- Detail/ranking/lineup options loaded from dedicated endpoints.
- Entry submitted to `/api/contests/:contestId/enter` with selected owned instance IDs.
- Runtime validates ownership, card-set eligibility, lock conflicts, and roster size.

### 9.5 Contest settlement
- Internal admin sets statuses and injects scores.
- Score route upserts user scores and rebuilds ranking rows.
- Settle route creates settlement, writes reward grants, applies points rewards, marks contest/entries settled.

### 9.6 Rewards / points / grants (current)
- `RewardGrant` rows are created primarily via contest settlement flow.
- Points rewards are immediately materialized onto `User.points` balance.
- No explicit claim state or delayed distribution currently implemented.

### 9.7 Admin flows
- Admin login obtains signed admin cookie.
- Protected admin pages call internal contest APIs.
- Internal APIs can also be machine-called via `x-internal-admin-key`.

---

## 10. Legacy, duplication, and debt

### 10.1 Dual systems
- Collection/opening dual-write: target (`OwnedCardInstance`, `PackOpeningEvent`) + legacy (`UserCard`, `PackOpening`).

### 10.2 Transitional reads/writes
- `/api/me` fallback reads legacy only if v2 instance rows absent.
- Auth pack open still writes legacy rows for continuity.

### 10.3 Obsolete or suspicious files/surfaces
- PvE routes/pages retained but intentionally retired.
- `pack-foundations.ts` explicitly marked deprecated.
- Drop table models in schema not used in active acquisition runtime.

### 10.4 Areas needing consolidation
- Single source for displayed odds/supply vs runtime allocation logic.
- Transition off legacy `baseCardId` adapters toward pure template/instance-native UI contracts.
- Dedicated reward ledger/claims/campaign architecture.

---

## 11. What already exists for future rewards/quests admin

### 11.1 Reusable primitives
- `RewardGrant` model and reward type enum.
- Contest settlement writer pipeline (`settleContestMvp`).
- Internal admin auth/access scaffold (cookie + internal key).
- Admin route group + patterns for CRUD-like ops panels.
- Progression and `/api/me` coexistence envelope for extending payload safely.

### 11.2 Missing primitives
- Quest domain schema (quest definition, objective, eligibility, state, submission/review).
- Reward claim state machine (pending/claimable/claimed/revoked).
- User-facing rewards endpoints/pages.
- Dedicated reward ledger endpoint/history projection.

### 11.3 Good insertion points for implementation
- **Runtime services:** add `lib/domain/rewards/*`, `lib/domain/quests/*` mirroring contests/acquisition structure.
- **API:** add `/api/rewards/*`, `/api/quests/*`, `/api/internal/rewards/*`, `/api/internal/quests/*`.
- **Admin UI:** extend `/admin` tools with rewards/quests links and dedicated pages under `app/admin/(protected)/...`.
- **Session payload extension:** evolve `/api/me` `coexistence.v2` with rewards summaries.

### 11.4 Dangerous areas to avoid touching blindly
- `openSalePackMvpDbNative` transaction logic (financial/supply invariants).
- Contest settle path side effects (points balance, settlement uniqueness).
- Legacy fallback path in `/api/me` until full migration retirement criteria are formalized.

---

## 12. Recommended next implementation entry points

### 12.1 For future admin rewards/quests panel
- New protected pages:
  - `app/admin/(protected)/rewards/page.tsx`
  - `app/admin/(protected)/quests/page.tsx`
- Link from `app/admin/(protected)/page.tsx` tool cards.
- Reuse auth gating from `app/admin/(protected)/layout.tsx`.
- Back with internal APIs secured by `requireInternalAdminAccess`.

### 12.2 For future user rewards/quests page
- New user page(s):
  - `app/rewards/page.tsx`
  - optionally `app/quests/page.tsx`
- Reuse `useSession` + `/api/me` patterns for state.

### 12.3 For welcome reward 500 points
- Preferred hook points:
  1. On first login/user creation in `app/api/auth/x/callback/route.ts` (detect newly created user),
  2. Write reward grant row + increment points atomically.
- Add idempotency guard (e.g., unique grant reason key) in schema/service.

### 12.4 For pack cost at 500 points
- `lib/game-config.ts` `PACK_COST` constant (single current active source used by `/api/pack/open` and guest open checks).
- Verify UI text in `app/packs/page.tsx` if cost displayed explicitly later.

### 12.5 For automatic quests
- New quest evaluator service invoked on existing mutation events:
  - pack open completion (after successful open transaction),
  - contest entry,
  - contest settlement.
- Practical insertion points:
  - end of `openSalePackMvpDbNative`,
  - end of `enterContestMvp`,
  - end of `settleContestMvp`.

### 12.6 For submit/manual-review quests
- Create admin review queue APIs + pages under `/api/internal/quests/*` and `/admin/quests/*`.
- Add quest submission records linked to user and evidence payload.

### 12.7 For reward ledger
- Extend `RewardGrant` or add dedicated `RewardLedgerEntry` for normalized reason/source/status.
- Add APIs:
  - user history: `/api/rewards/ledger`
  - admin adjustments/reversals: `/api/internal/rewards/ledger/*`
- Expose summary in `/api/me` coexistence envelope initially for backward-safe rollout.

### 12.8 For contest milestone rewards
- Insert milestone evaluation in `recordContestScoresMvp` or settlement stage depending business rule.
- Prefer settlement stage if reward should only finalize when contest final state is immutable.

---

## 13. Appendix

### 13.1 Full tree snapshot

#### Root snapshot
```text
./.env.example
./Brand guide/
./README.md
./app/
./components/
./docs/
./lib/
./mcg_base_cards.json
./mcg_card_variants.json
./mcg_projects.json
./next-env.d.ts
./next.config.mjs
./package.json
./prisma/
./tests/
./tsconfig.json
./types/
./vitest.config.ts
```

#### `app/` snapshot
```text
app/
├─ layout.tsx
├─ page.tsx
├─ packs/page.tsx
├─ collection/page.tsx
├─ compte/page.tsx
├─ contests/page.tsx
├─ contests/[contestId]/page.tsx
├─ combats/page.tsx
├─ admin/login/page.tsx
├─ admin/(protected)/layout.tsx
├─ admin/(protected)/page.tsx
├─ admin/(protected)/contests/page.tsx
├─ admin/(protected)/contests/[contestId]/page.tsx
└─ api/... (auth, me, pack, guest, contests, internal, admin, pve)
```

#### `app/api/` snapshot
```text
app/api/
├─ me/route.ts
├─ pack/open/route.ts
├─ guest/pack/open/route.ts
├─ auth/x/start/route.ts
├─ auth/x/callback/route.ts
├─ auth/logout/route.ts
├─ contests/route.ts
├─ contests/[contestId]/route.ts
├─ contests/[contestId]/lineup-options/route.ts
├─ contests/[contestId]/ranking/route.ts
├─ contests/[contestId]/enter/route.ts
├─ internal/contests/route.ts
├─ internal/contests/[contestId]/route.ts
├─ internal/contests/[contestId]/status/route.ts
├─ internal/contests/[contestId]/score/route.ts
├─ internal/contests/[contestId]/settle/route.ts
├─ admin/login/route.ts
├─ admin/logout/route.ts
├─ pve/battle/route.ts
├─ pve/run/route.ts
└─ guest/pve/battle/route.ts
```

#### `lib/` snapshot
```text
lib/
├─ auth.ts
├─ admin-auth.ts
├─ internal-auth.ts
├─ x-oauth.ts
├─ prisma.ts
├─ api-error.ts
├─ game-config.ts
├─ cards.ts
├─ serializers.ts
├─ guest.ts
└─ domain/
   ├─ acquisition/{constants.ts,open-pack.ts,pack-foundations.ts}
   ├─ contests/runtime.ts
   ├─ projections/{contracts.ts,collection.ts}
   ├─ progression/profile-summary.ts
   └─ cards/template-metadata.ts
```

#### `prisma/` snapshot
```text
prisma/
├─ schema.prisma
└─ seed-mvp-controlled-emission.mjs
```

#### `docs/` snapshot
```text
docs/
├─ README.md
├─ mcg-pivot-product-foundation.md
├─ current-runtime-architecture.md
├─ mvp-controlled-emission-transformation.md
└─ repo-cartography-2026-03.md
```

#### `tests/` snapshot
```text
tests/
├─ open-pack-runtime.test.ts
├─ api-me-read-model.test.ts
└─ bootstrap-seed-validation.test.ts
```

### 13.2 Important docs
- `README.md` (runtime + setup + endpoint listing)
- `docs/README.md` (doc index)
- `docs/mcg-pivot-product-foundation.md`
- `docs/current-runtime-architecture.md`
- `docs/mvp-controlled-emission-transformation.md`

### 13.3 Important tests
- `tests/open-pack-runtime.test.ts`
- `tests/api-me-read-model.test.ts`
- `tests/bootstrap-seed-validation.test.ts`

### 13.4 Important scripts
- `npm run dev`
- `npm run typecheck`
- `npm test`
- `npm run seed:mvp:controlled-emission`
- `node prisma/seed-mvp-controlled-emission.mjs --dry-run`

