# MCG Technical Documentation (single source of truth)

## Table of contents
1. [Overview](#1-overview)
2. [Architecture and runtime boundaries](#2-architecture-and-runtime-boundaries)
3. [Repository structure](#3-repository-structure)
4. [Stack and runtime dependencies](#4-stack-and-runtime-dependencies)
5. [Local development](#5-local-development)
6. [Environment variables](#6-environment-variables)
7. [Database and Prisma model map](#7-database-and-prisma-model-map)
8. [Domain model and core flows](#8-domain-model-and-core-flows)
9. [Auth, session, permissions](#9-auth-session-permissions)
10. [API routes and backend map](#10-api-routes-and-backend-map)
11. [Frontend surfaces and component map](#11-frontend-surfaces-and-component-map)
12. [Admin system and operations surfaces](#12-admin-system-and-operations-surfaces)
13. [Assets, media, card data pipeline](#13-assets-media-card-data-pipeline)
14. [Read paths, write paths, serializers, projections](#14-read-paths-write-paths-serializers-projections)
15. [Source of truth vs legacy](#15-source-of-truth-vs-legacy)
16. [Testing](#16-testing)
17. [Deployment and operations](#17-deployment-and-operations)
18. [Known gaps and limitations](#18-known-gaps-and-limitations)

---

## 1) Overview
MCG is a single Next.js App Router repository where frontend pages, backend HTTP routes, domain logic, and Prisma persistence live in one deployable app.

Primary implemented loop:
1. Authenticate with X OAuth or run guest mode.
2. Open packs.
3. View collection and profile projections.
4. Enter contests.
5. Track rewards and quests.
6. Operate contest/moderation/reward admin flows.

Primary entrypoints in code:
- UI routes: `app/**/page.tsx`
- HTTP routes: `app/api/**/route.ts`
- Domain logic: `lib/domain/**`
- Admin logic: `lib/admin/**`, `lib/admin-ops.ts`, `lib/internal-auth.ts`
- Persistence: `prisma/schema.prisma`

## 2) Architecture and runtime boundaries
- **Presentation/UI layer**: App Router pages in `app/`, reusable components in `components/`.
- **HTTP layer**: Next route handlers in `app/api/`.
- **Domain layer**:
  - Acquisition/packs: `lib/domain/acquisition/*`
  - Contests: `lib/domain/contests/*`
  - Quests: `lib/domain/quests/runtime.ts`
  - Rewards: `lib/domain/rewards/*`
  - Projections: `lib/domain/projections/*`, `lib/domain/progression/*`
- **Auth/session layer**: `lib/auth.ts`, `lib/admin-auth.ts`, `lib/internal-auth.ts`, `lib/x-oauth.ts`
- **Persistence**: Prisma client in `lib/prisma.ts`, schema in `prisma/schema.prisma`.

Current runtime boundaries:
- Active gameplay: packs + collection + contests + quests/rewards.
- Retired gameplay: PvE endpoints intentionally return `410 Gone`.

Explicit runtime note:
- No Next Server Actions are used as the primary mutation surface; writes are exposed through `app/api/**/route.ts` handlers.

## 3) Repository structure
- `app/`
  - User pages: `/`, `/packs`, `/collection`, `/contests`, `/contests/[contestId]`, `/rewards`, `/compte`, `/combats`.
  - Admin pages: `/admin/login`, `/admin/(protected)/*`.
  - APIs: `app/api/**` grouped by module (`auth`, `pack`, `contests`, `quests`, `rewards`, `internal`, etc.).
- `components/`
  - `layout/SiteShell.tsx` (global user shell)
  - `admin/AdminShell.tsx` (admin shell)
  - `ui/MvpCardTile.tsx` (main card display component)
  - `useSession.ts` (session bootstrap + guest fallback)
- `lib/`
  - `admin/` workbench helpers
  - `domain/` business logic
  - auth/internal/admin helpers
  - serializers and config modules
- `prisma/`
  - `schema.prisma`
  - migrations
  - seed and bootstrap-check scripts
- `data/`
  - `token-master-50.json` canonical token/card dataset
- `scripts/`
  - token dataset builder and simulation utilities
- `tests/`
  - Vitest suite for routes/domain/admin modules
- `docs/`
  - this file + `product-guide.md` as active documentation
  - archive for historical material

## 4) Stack and runtime dependencies
From `package.json` and runtime code:
- Next.js 14 App Router
- React 18
- TypeScript
- Prisma ORM (`@prisma/client`, `prisma`)
- PostgreSQL datasource (`DATABASE_URL`)
- Zod (validation in runtime/admin utilities)
- Vitest for tests

No Redux/Zustand state layer is installed; client state is mostly local state + fetch + `useSession`.

## 5) Local development
Baseline setup:
```bash
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

Key scripts:
- `npm run dev`
- `npm run build`
- `npm run typecheck`
- `npm test`
- `npm run seed:mvp:controlled-emission`
- `npm run bootstrap:mvp:cloud`
- `npm run bootstrap:mvp:cloud:deploy`

## 6) Environment variables
Defined/used in `.env.example` and runtime modules:

Required for core runtime:
- `DATABASE_URL` (Prisma datasource)
- `X_CONSUMER_KEY`
- `X_CONSUMER_SECRET`
- `X_REDIRECT_URI`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`

Optional internal/admin ops:
- `INTERNAL_ADMIN_KEY`
- `ADMIN_DEFAULT_ROLE`
- `INTERNAL_ADMIN_KEY_ID`
- `INTERNAL_ADMIN_KEY_ROLE`

Behavior notes:
- Missing `INTERNAL_ADMIN_KEY` disables key-auth internal access (`503` from guard).
- Missing X/admin secrets breaks related routes at execution time via `requireEnv(...)` checks.
- `NODE_ENV` controls cookie `secure` and Prisma log verbosity.

## 7) Database and Prisma model map
Source: `prisma/schema.prisma`.

### Identity/session
- `User`
- `UserSession`

### Legacy continuity tables (still present)
- `UserCard`
- `PackOpening`

### Card, pack, ownership runtime
- `TokenProject`, `CardSet`, `Rarity`, `Edition`, `CardTemplate`
- `PackDefinition`, `DropTable`, `DropTableRow`, `PackOpeningEvent`
- `OwnedCardInstance`

### Rewards/economy
- `RewardGrant`
- `RewardLedgerEntry`

### Quests/moderation
- `QuestDefinition`
- `UserQuestProgress`
- `QuestSubmission`

### Contests
- `Contest`, `ContestRule`
- `ContestEntry`, `RosterLock`
- `ContestScore`, `ContestRanking`, `ContestSettlement`
- `ContestRewardPolicy`, `ContestRewardBundle`, `ContestRewardComponent`, `ContestRewardDistributionRule`
- `ContestSettlementPlan`, `ContestSettlementPlanItem`

### Progression projections
- `UserProgression`
- `CollectionProgression`
- `CompetitiveProgression`

### Admin ops/auditability
- `AdminActionLog`
- `AdminOpArtifact`
- `AdminIdempotencyKey`

## 8) Domain model and core flows

### 8.1 Card acquisition model
Main files:
- `lib/domain/acquisition/open-pack.ts`
- `lib/domain/acquisition/pack-config.ts`
- `lib/domain/acquisition/slot-weights.ts`
- `lib/domain/cards/token-master.ts`

Auth pack write flow:
1. Resolve active sale pack (`PackDefinition`) or create fallback sale pack if missing.
2. Validate card set/template readiness.
3. Reserve pack stock (`openedPackCount` increment).
4. For each slot, draw candidate template by slot weighting.
5. Increment template issued supply.
6. Create `PackOpeningEvent` and `OwnedCardInstance` rows.
7. Debit user points through ledger.
8. Return `pulledCardsMvp` DTO.

Guest flow:
- `app/api/guest/pack/open/route.ts` simulates draw from token-master pool and writes only guest state payload.

### 8.2 Rewards and ledger model
Main files:
- `lib/domain/rewards/ledger.ts`
- `lib/domain/rewards/conventions.ts`
- `lib/domain/rewards/welcome.ts`
- `lib/domain/rewards/manual-grants.ts`
- `lib/domain/rewards/reward-pack-grants.ts`
- `lib/domain/rewards/onboarding.ts`

Active ledger reason families:
- `WELCOME_REWARD`
- `PACK_OPEN`
- `QUEST_REWARD`
- `CONTEST_ENTRY_FEE`
- `ADMIN_GRANT`
(and other enum values exist, but usage depends on route flow)

### 8.3 Quests model
Main files:
- `lib/domain/quests/runtime.ts`
- user routes: `app/api/quests/**`
- admin routes: `app/api/internal/quests/**`, `app/api/internal/moderation/**`

Social quest flow:
1. User submits proof (`QuestSubmission: SUBMITTED`).
2. Admin reviews via legacy or moderation endpoints.
3. Approval updates submission status and grants points with idempotency.

### 8.4 Contest model
Main files:
- `lib/domain/contests/runtime.ts`
- `lib/domain/contests/config-runtime.ts`
- `lib/domain/contests/settlement-plan-runtime.ts`

Entry flow:
1. Validate contest state/time.
2. Validate lineup ownership and eligibility.
3. Create `ContestEntry` + `RosterLock`.
4. Debit entry fee if enabled.
5. Lock instance state.

Run/settlement flow:
- Admin validates transitions/scoring/settlement inputs.
- Settlement plan can be generated, previewed, and executed with idempotency safeguards.

## 9) Auth, session, permissions

### User auth/session
- OAuth with X implemented in `lib/x-oauth.ts` and routes under `app/api/auth/x/*`.
- Session token management in `lib/auth.ts` using cookie `mcg_session` and hashed token in `UserSession`.

### Admin auth/session
- Admin credentials verified in `lib/admin-auth.ts`.
- Cookie `mcg_admin_session` signed with `ADMIN_SESSION_SECRET`.
- Protected admin layout in `app/admin/(protected)/layout.tsx` redirects to `/admin/login` if invalid.

### Internal API auth and roles
- Guard: `requireInternalAdminAccess` in `lib/internal-auth.ts`.
- Accepted auth modes:
  1. valid admin cookie session
  2. valid `x-internal-admin-key` header
- Role helpers in `lib/admin-ops.ts` (`requireAdminRole`, supervisor fallback logic).

## 10) API routes and backend map
Source: `app/api/**/route.ts`.

### 10.1 Auth/session/profile
- `GET /api/auth/x/start`
- `GET /api/auth/x/callback`
- `POST /api/auth/logout`
- `GET /api/me`
- `POST /api/admin/login`
- `POST /api/admin/logout`

### 10.2 Packs/rewards/quests (user)
- `GET /api/pack/config`
- `POST /api/pack/open`
- `POST /api/guest/pack/open`
- `GET /api/rewards/ledger`
- `GET /api/quests`
- `POST /api/quests/:questId/submit`

### 10.3 Contests (user)
- `GET /api/contests`
- `GET /api/contests/:contestId`
- `GET /api/contests/:contestId/ranking`
- `GET /api/contests/:contestId/lineup-options`
- `POST /api/contests/:contestId/enter`

Auth reality for contests endpoints:
- All five contest endpoints above require a valid user session and return `401` when no authenticated user is present.

### 10.4 Internal/admin
- contests legacy family: `/api/internal/contests/*`
- contest config family: `/api/internal/contest-configs/*`
- contest run family: `/api/internal/contest-runs/*`
- moderation family: `/api/internal/moderation/*`
- quests family: `/api/internal/quests/*`
- campaigns catalog: `/api/internal/campaigns/catalog`
- rewards and compensations: `/api/internal/rewards/*`, `/api/internal/compensations/*`
- users/admin logs: `/api/internal/users/*`, `/api/internal/admin-actions/*`, `/api/internal/admin/dashboard-summary`

### 10.5 Explicit legacy compatibility
- `POST /api/pve/battle` -> `410 Gone`
- `POST /api/pve/run` -> alias to battle `410`
- `POST /api/guest/pve/battle` -> `410 Gone`

## 11) Frontend surfaces and component map

### User pages
- `/` -> `app/page.tsx`
- `/packs` -> `app/packs/page.tsx`
- `/collection` -> `app/collection/page.tsx`
- `/contests` -> `app/contests/page.tsx` (guest mode blocked at UI level and no contest fetch performed)
- `/contests/[contestId]` -> `app/contests/[contestId]/page.tsx` (guest mode blocked at UI level)
- `/rewards` -> `app/rewards/page.tsx`
- `/compte` -> `app/compte/page.tsx`
- `/combats` -> redirect page to `/contests`

Main user components:
- `components/layout/SiteShell.tsx`
- `components/ui/MvpCardTile.tsx`
- `components/useSession.ts`

### Admin pages
- `/admin/login` -> `app/admin/login/page.tsx`
- Protected pages under `app/admin/(protected)/*`:
  - dashboard, contests (new + legacy), campaigns, quests (new + legacy), moderation, rewards, users, activity-log, analytics.

Main admin components/modules:
- `components/admin/AdminShell.tsx`
- `components/admin/AdminLogoutButton.tsx`
- `lib/admin/navigation.ts`
- `lib/admin/*`

## 12) Admin system and operations surfaces
Core operational surfaces:
- `/admin` dashboard (`/api/internal/admin/dashboard-summary`)
- `/admin/contests` and contest run sub-pages
- `/admin/moderation*`
- `/admin/rewards`
- `/admin/campaigns`
- `/admin/quests*`
- `/admin/users`
- `/admin/activity-log`

Status classes:
- **Current**: dashboard, contests run/config pages, moderation pages, rewards ops, users, activity-log.
- **Legacy/fallback**: `/admin/contests/legacy*`, `/admin/quests/legacy`, `/admin/quests/submissions`.
- **Partial**: `/admin/analytics` currently reuses dashboard-summary style data and is not a full analytics module.

Admin dependency note:
- Admin pages use internal APIs guarded by `requireInternalAdminAccess` and role checks (`requireAdminRole`) in route handlers.

## 13) Assets, media, card data pipeline
Runtime assets in repo root:
- `pack.png`
- `verso.png`
- `frame.png`

Canonical card dataset:
- `data/token-master-50.json`

Pipeline files:
- builder: `scripts/build-token-master-50.mjs`
- seed/bootstrap: `prisma/seed-mvp-controlled-emission.mjs`
- runtime mapping: `lib/domain/cards/token-master.ts`

Legacy card JSONs (still present):
- `mcg_base_cards.json`
- `mcg_card_variants.json`
- `mcg_projects.json`

## 14) Read paths, write paths, serializers, projections

### 14.1 Principal read paths
- Session/profile aggregate: `GET /api/me` -> `app/api/me/route.ts`
- Collection projection builder: `lib/domain/projections/collection.ts`
- Progression summaries: `lib/domain/progression/profile-summary.ts`
- Serializer bridge to frontend: `lib/serializers.ts`

### 14.2 Principal write paths
- Pack open write: `POST /api/pack/open` -> `open-pack.ts`
- Contest entry write: `POST /api/contests/:contestId/enter` -> `contests/runtime.ts`
- Quest submit write: `POST /api/quests/:questId/submit` -> quests runtime
- Moderation decision write: `POST /api/internal/moderation/submissions/:submissionId/decide`
- Compensation/manual grant writes: `app/api/internal/compensations/*`, `app/api/internal/rewards/manual-grant/route.ts`

### 14.3 Adapters/projections still transitional
- `/api/me` payload envelope includes `coexistence.v2` naming.
- Card DTO contract uses `MvpCardView` / `MvpCollectionItem` types in `types/cards.ts`.

## 15) Source of truth vs legacy
Current source-of-truth:
- Cards ownership: `OwnedCardInstance`
- Auth pack events: `PackOpeningEvent`
- Canonical card identity: `data/token-master-50.json` + `tokenProject.slug` mapping
- Active gameplay surfaces: packs, collection, contests (authenticated), rewards/quests

Legacy/compatibility still present:
- `UserCard`, `PackOpening` schema models
- PvE endpoints with `410 Gone`
- Admin legacy screens and legacy contest/quest admin routes
- Transitional payload naming (`coexistence.v2`, `MVP` prefixes)

## 16) Testing
Test framework: Vitest (`npm test`).

Coverage includes:
- API route contract tests (`tests/api-*.test.ts`)
- Domain runtime tests (packs, quests, rewards, contests)
- Admin helpers and access/role checks
- bootstrap validation checks

Limit:
- No dedicated full-stack browser+database e2e harness is maintained in repo.

## 17) Deployment and operations
Relevant scripts in `package.json`:
- `npm run build`
- `npm run start`
- `npm run vercel-build` (generate + db push + bootstrap + build)
- bootstrap commands for cloud consistency checks

Operational behavior:
- seed/bootstrap scripts are intended to be idempotent for runtime drift correction.
- strict vs deploy-safe bootstrap checks are separated by script (`bootstrap:mvp:cloud` vs `bootstrap:mvp:cloud:deploy`).

## 18) Known gaps and limitations
- PvE is retired but compatibility endpoints remain for explicit deprecation signaling.
- Admin contests and moderation still have dual paths (current + legacy/fallback).
- Admin analytics page is partial.
- Transitional vocabulary remains in several code contracts (`MVP`, `coexistence.v2`).
- Without configured DB/env, runtime integration can’t be fully exercised outside mocked tests.
