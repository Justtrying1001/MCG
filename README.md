# MCG — Collectible-First, Contest-Driven MVP

MCG now centers on:

- Pack opening
- Sale pack runtime info API (`GET /api/pack/config`) with stock remaining and dynamic slot-odds snapshot
- Collection progression
- Contest participation and rankings
- Profile/progression hub
- X OAuth 1.0a authentication + guest mode for temporary local play

PvE has been retired from active gameplay.

## Economy baseline (Phase 1)

- Pack cost: **500 points**
- Welcome signup reward (first authenticated account creation): **500 points**
- Point movements are now tracked with `RewardLedgerEntry` (welcome credit + pack opening debit)

## Rewards/Quests MVP (Phase 3 + Phase 4 + Phase 5 + Phase 6)

- User rewards ledger API: `GET /api/rewards/ledger`
- User quests APIs:
  - `GET /api/quests`
  - `POST /api/quests/:questId/submit` (social submit flow)
- Admin quest APIs:
  - Definitions CRUD: `GET/POST /api/internal/quests`, `GET/PATCH /api/internal/quests/:questId`
  - Review queue: `GET /api/internal/quests/submissions`, `POST /api/internal/quests/submissions/:submissionId/review`
- New UI surfaces:
  - User page: `/rewards` (ledger + quests + social submission form)
  - Admin panels: `/admin/campaigns`, `/admin/quests`, `/admin/quests/builder`, `/admin/moderation`, `/admin/moderation/:submissionId`, `/admin/moderation/history` (legacy fallback `/admin/quests/submissions`)
  - Admin shell/navigation Phase 2: `/admin` dashboard + `/admin/contests`, `/admin/campaigns`, `/admin/moderation`, `/admin/rewards`, `/admin/users`, `/admin/analytics`, `/admin/activity-log`
  - Phase 3 contest surfaces: `/admin/contests/:contestId` (overview), `/lifecycle`, `/scoring`, `/settlement`, `/audit` with legacy fallback at `/admin/contests/legacy/:contestId`
  - Phase 1 contest setup refactor surface: `/admin/contests/create` (structured create/validate/publish flow)
- Live quest runtime types:
  - `CONTEST_COUNT_MILESTONE` (AUTO progression/completion/credit, points-only reward, idempotent ledger credit)
  - `SOCIAL_FOLLOW_X` and `SOCIAL_ENGAGEMENT_X` in submit/review mode (no X auto-verification)
- Social quest lifecycle policy (Phase 4):
  - User submits proof (URL/note) → admin approves/rejects
  - Approval triggers points credit immediately via ledger idempotency key `quest-approval:<questId>:user:<userId>`
  - Rejected submissions can be re-submitted while quest remains active
- Phase 5 ops additions:
  - Admin manual points grants API: `POST /api/internal/rewards/manual-grant`
  - Admin manual grants page: `/admin/rewards`
  - Manual grants are points-only, admin-only, ledger-backed (`ADMIN_GRANT`), and support idempotency keys
  - Internal quests list now includes basic analytics (`progress/completed/submissions/totalPointsDistributed`)
- Phase 6 consolidation additions:
  - Admin user search for rewards ops: `GET /api/internal/users/search`
  - Quest detail admin page: `/admin/quests/:questId`
  - Quest detail API now includes analytics + latest submissions/completions/ledger credits
  - Ledger conventions centralized in code (`lib/domain/rewards/conventions.ts`) for welcome/pack/quest/admin flows


## Ledger conventions (consolidated)

Implemented conventions are centralized in `lib/domain/rewards/conventions.ts` and used by runtime flows:

- `WELCOME_REWARD`
  - `reasonRef = userId`
  - `idempotencyKey = welcome:<userId>`
- `PACK_OPEN`
  - `reasonRef = packCode`
  - metadata includes `packCode`
- `QUEST_REWARD`
  - `reasonRef = questId`
  - auto milestone key: `quest:<questId>:user:<userId>`
  - social approval key: `quest-approval:<questId>:user:<userId>`
- `ADMIN_GRANT`
  - `reasonRef = manual-grant:<idempotencyKey>`
  - idempotency key is caller-provided (or generated if absent)

## Stack

- Next.js (App Router) + TypeScript
- Prisma ORM
- Neon Postgres
- Cookie session auth (custom minimal implementation)

## Data model (Prisma)

Core active models include:

- `User`
  - account identity + points + pack counters
- `UserSession`
  - hashed session token + expiry
- Contest + progression domain models
  - `Contest`, `ContestEntry`, `ContestScore`, `ContestRanking`, `ContestSettlement`
  - `OwnedCardInstance`, `RewardGrant`
  - `UserProgression`, `CollectionProgression`, `CompetitiveProgression`
- Rewards/quests foundations
  - `RewardLedgerEntry`
  - `QuestDefinition`, `UserQuestProgress`, `QuestSubmission`

## Documentation

- Docs index: `docs/README.md`
- Runtime implementation source-of-truth: `docs/current-runtime-architecture.md`
- Final cards system source-of-truth: `docs/cards-system-source-of-truth.md`
- Cloud bootstrap runbook: `docs/mvp-cloud-bootstrap-runbook.md`
- Repo/docs consolidation source-of-truth: `docs/repo-and-docs-consolidation-audit-2026-03.md`
- Product intent source-of-truth: `docs/mcg-pivot-product-foundation.md`
- Card/template/pack data deep audit: `docs/cards-data-runtime-audit-2026-03.md`
- Pack draw & economic balancing audit (slot-aware): `docs/pack-draw-supply-audit-2026-03.md`
- Token master canonical spec: `docs/token-master-50-source-of-truth.md`
- Historical context: `docs/repo-cartography-2026-03.md`, `docs/mvp-controlled-emission-transformation.md`, `docs/reward-system-audit-2026-03.md`

## API routes (active + explicit retired compatibility)

- Auth/session
  - `GET /api/auth/x/start`
  - `GET /api/auth/x/callback`
  - `POST /api/auth/logout`
  - `GET /api/me`
  - `POST /api/admin/login`
  - `POST /api/admin/logout`
- Pack / collection
  - `POST /api/pack/open`
  - `GET /api/pack/config`
  - `POST /api/guest/pack/open`
- Contests
  - `GET /api/contests`
  - `GET /api/contests/:contestId`
  - `GET /api/contests/:contestId/ranking`
  - `POST /api/contests/:contestId/enter`
  - `GET /api/internal/contests`
  - `GET /api/internal/contests/:contestId`
  - `POST /api/internal/contests`
  - `POST /api/internal/contests/:contestId/status` (now requires `validationToken` from transition validate + `Idempotency-Key`)
  - `POST /api/internal/contests/:contestId/score` (now requires `importId` from scoring validate + `Idempotency-Key`)
  - `POST /api/internal/contests/:contestId/settle` (legacy manual path; blocked for policy-configured contests)
  - `POST /api/internal/contest-configs`
  - `GET /api/internal/contest-configs/:contestId`
  - `PATCH /api/internal/contest-configs/:contestId`
  - `POST /api/internal/contest-configs/:contestId/validate`
  - `POST /api/internal/contest-configs/:contestId/publish`
  - `POST /api/internal/contest-runs/:contestId/settlement-plan/generate`
  - `GET /api/internal/contest-runs/:contestId/settlement-plan/:planId`
  - `GET /api/internal/contest-runs/:contestId/settlement-plan/:planId/preview`
  - `POST /api/internal/contest-runs/:contestId/settlement-plan/:planId/execute` (`Idempotency-Key` required)
- Rewards / quests
  - `POST /api/internal/rewards/manual-grant`
  - `POST /api/internal/rewards/pack-grant`
  - `GET /api/internal/users/search`
  - `GET /api/rewards/ledger`
  - `GET /api/quests`
  - `POST /api/quests/:questId/submit`
  - `GET /api/internal/quests`
  - `POST /api/internal/quests`
  - `GET /api/internal/quests/:questId`
  - `PATCH /api/internal/quests/:questId`
  - `GET /api/internal/quests/library`
  - `POST /api/internal/quests/builder/validate`
  - `GET /api/internal/campaigns/catalog`
  - `GET /api/internal/quests/submissions`
  - `POST /api/internal/quests/submissions/:submissionId/review`
  - `GET /api/internal/moderation/queue`
  - `GET /api/internal/moderation/decisions`

- Admin phase 0/1 safety rails APIs (new):
  - `GET /api/internal/admin-actions`
  - `GET /api/internal/admin-actions/:actionId`
  - `POST /api/internal/contest-runs/:contestId/transitions/validate`
  - `POST /api/internal/contest-runs/:contestId/scoring/validate`
  - `GET /api/internal/contest-runs/:contestId/scoring/preview/:importId`
  - `POST /api/internal/contest-runs/:contestId/settlement/plan/validate`
  - `GET /api/internal/contest-runs/:contestId/settlement/preview/:planId`
  - `POST /api/internal/compensations/validate`
  - `GET /api/internal/compensations/preview/:token`
  - `POST /api/internal/compensations/execute` (`validationToken` + `Idempotency-Key` required)
  - `GET /api/internal/moderation/submissions/:submissionId/context`
  - `POST /api/internal/moderation/submissions/:submissionId/decide`
  - `GET /api/internal/users/:userId/admin-context`
  - `GET /api/internal/admin/dashboard-summary`
- Retired PvE compatibility endpoints (intentional `410 Gone`)
  - `POST /api/pve/battle`
  - `POST /api/pve/run`
  - `POST /api/guest/pve/battle`

## Environment

Copy `.env.example` to `.env` and set credentials:

```bash
cp .env.example .env
```

Required:

- `DATABASE_URL`
- `X_CONSUMER_KEY`
- `X_CONSUMER_SECRET`
- `X_REDIRECT_URI`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`

Optional (recommended for machine-to-machine/internal scripts):

- `INTERNAL_ADMIN_KEY`
- `ADMIN_DEFAULT_ROLE` (optional, default `ADMIN_OPS`)
- `INTERNAL_ADMIN_KEY_ID` (optional stable service actor id, default `internal-admin-service`)
- `INTERNAL_ADMIN_KEY_ROLE` (optional, default `ADMIN_SUPERVISOR`)

Generate `ADMIN_PASSWORD_HASH` locally (replace `<PASSWORD>`):

```bash
node -e "const c=require('node:crypto');const p='<PASSWORD>';const s=c.randomBytes(16).toString('hex');const i=210000;const d=c.pbkdf2Sync(p,s,i,32,'sha256').toString('hex');console.log(`pbkdf2_sha256$${i}$${s}$${d}`)"
```

Admin UI flow:

1. Open `/admin/login`
2. Log in with `ADMIN_USERNAME` + password matching `ADMIN_PASSWORD_HASH`
3. Manage contests at `/admin/contests`

Internal contest APIs now accept:
- valid admin cookie session **OR**
- `x-internal-admin-key` matching `INTERNAL_ADMIN_KEY`.

## Setup

```bash
npm install
npx prisma db push
npm run dev
```

Open http://localhost:3000.

## Deploy on Vercel

1. Import repo in Vercel.
2. Add env vars: `DATABASE_URL`, `X_CONSUMER_KEY`, `X_CONSUMER_SECRET`, `X_REDIRECT_URI`.
3. Build command: `npm run vercel-build`.
4. Install command: `npm install`.

`npm run vercel-build` runs `prisma generate && prisma db push && npm run bootstrap:mvp:cloud:deploy && next build`.

This means every Vercel build now enforces cloud bootstrap idempotently:
- `seed:mvp:controlled-emission` upserts pack/card MVP runtime data
- `check:mvp:bootstrap:allow-exhausted` validates required structures even if inventory is fully exhausted

For manual cloud remediation (or first bootstrap from a local terminal), run:

```bash
npm run bootstrap:mvp:cloud
```

`bootstrap:mvp:cloud` is strict and fails if no remaining supply is available.
`bootstrap:mvp:cloud:deploy` is deploy-safe and allows fully exhausted inventory while still validating structure integrity.

For destructive reset during local/dev migration work only, use:

```bash
npm run prisma:push:reset
```


## Reward packs (GENESIS Edition 1)

Admin can now distribute `mvp_reward_pack` via `/admin/rewards` in two delivery modes:

- `GRANT_ONLY`: consume reward-pack stock and log `RewardGrant(PACK)` without immediate opening.
- `GRANT_AND_OPEN`: consume reward-pack stock, create `PackOpeningEvent`, allocate 5 cards from DB supply, create `OwnedCardInstance` rows, and log `RewardGrant(PACK)`.

These operations are backed by `/api/internal/rewards/pack-grant`.


Important ops note: rerunning `seed:mvp:controlled-emission` is idempotent and now preserves existing runtime counters (`issuedSupply`, `openedPackCount`) on existing rows; it is safe for cloud drift repair and does not reset live inventory history.
