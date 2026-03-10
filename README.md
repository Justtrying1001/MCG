# MCG — Collectible-First, Contest-Driven MVP

MCG now centers on:

- Pack opening
- Collection progression
- Contest participation and rankings
- Profile/progression hub
- X OAuth 1.0a authentication + guest mode for temporary local play

PvE has been retired from active gameplay.

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
- `UserCard` / `PackOpening`
  - legacy-compatible collection and pack history persistence
- Contest + progression domain models
  - `Contest`, `ContestEntry`, `ContestScore`, `ContestRanking`, `ContestSettlement`
  - `OwnedCardInstance`, `RewardGrant`
  - `UserProgression`, `CollectionProgression`, `CompetitiveProgression`

## Documentation

- Docs index: `docs/README.md`
- Product source-of-truth: `docs/mcg-pivot-product-foundation.md`
- Runtime architecture (current implementation): `docs/current-runtime-architecture.md`

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
  - `POST /api/guest/pack/open`
- Contests
  - `GET /api/contests`
  - `GET /api/contests/:contestId`
  - `GET /api/contests/:contestId/ranking`
  - `POST /api/contests/:contestId/enter`
  - `GET /api/internal/contests`
  - `GET /api/internal/contests/:contestId`
  - `POST /api/internal/contests`
  - `POST /api/internal/contests/:contestId/status`
  - `POST /api/internal/contests/:contestId/score`
  - `POST /api/internal/contests/:contestId/settle`
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

`npm run vercel-build` runs `prisma generate && prisma db push && next build`.

For destructive reset during local/dev migration work only, use:

```bash
npm run prisma:push:reset
```
