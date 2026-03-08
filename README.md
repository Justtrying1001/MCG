# MCG MVP V1 — Vercel + Neon Base

This app keeps the MVP scope:

- Base cards only
- Pack opening
- Collection
- X OAuth authentication + guest mode
- Simple PvE
- Simple reward loop

No variants product flow, no NFT/on-chain, no marketplace, no PvP, no crafting.

## Stack

- Next.js (App Router) + TypeScript
- Prisma ORM
- Neon Postgres
- Cookie session auth (custom minimal implementation)

## Data model (Prisma)

- `User`
  - `id`, `xUserId`, `xUsername`, `displayName`, `avatarUrl`, progression fields, timestamps
- `UserSession`
  - `userId`, hashed session token, expiry
- `UserCard`
  - `userId`, `baseCardId`, `quantity`
- `PackOpening`
  - `userId`, `packType`, JSON result payload
- `PveRun`
  - `userId`, difficulty, selected/enemy payloads, result, reward

## Card data source

- Base card source remains `mcg_base_cards.json`.
- User progression state is persisted in Neon Postgres.

## Card system docs (current runtime vs planning)

- Current runtime entrypoint: `docs/card-runtime-core.md`
- Forensic audit: `docs/card-repo-audit-forensic.md` and `docs/card-repo-audit-table.md`
- Cleanup plan: `docs/card-repo-cleanup-plan.md` and `docs/card-repo-cleanup-actions.md`
- Future specs / vision (not runtime): `docs/card-system-v1-production-spec.md`, `docs/card-pipeline-v1-semi-generatif.md`, `docs/ux-redesign-spec.md`

## API routes

- `GET /api/auth/x/start` — begin OAuth flow with X
- `GET /api/auth/x/callback` — handle OAuth callback, upsert account, start session
- `POST /api/auth/logout` — logout and clear session cookie
- `GET /api/me` — profile + persisted collection + counters
- `POST /api/pack/open` — open base pack for authenticated X users (persistent)
- `POST /api/guest/pack/open` — open base pack for guests (ephemeral)
- `POST /api/pve/run` — run PvE battle for authenticated X users (persistent)
- `POST /api/guest/pve/battle` — run PvE battle for guests (ephemeral)

## Environment

Copy `.env.example` to `.env` and set Neon credentials:

```bash
cp .env.example .env
```

Required:

- `DATABASE_URL`
- `X_CLIENT_ID`
- `X_CLIENT_SECRET`
- `X_REDIRECT_URI`

## Setup

```bash
npm install
npx prisma db push
npm run dev
```

Open http://localhost:3000.

## Deploy on Vercel

1. Import repo in Vercel.
2. Add `DATABASE_URL` env var.
3. Build command: `npm run vercel-build` (recommended for V0, ensures tables exist).
4. Install command: `npm install`.

`npm run vercel-build` runs `prisma generate && prisma db push && next build`.

If you keep `npm run build` as Vercel build command, run `npx prisma db push` manually at least once against the target Neon database before first login/register.
