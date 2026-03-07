# MCG MVP V1 — Vercel + Neon Base

This repository now ships the **same reduced MVP product scope** with a deployable architecture:

- Base cards only
- Pack opening
- Collection
- Simple auth
- Simple PvE
- Simple reward loop

No variants product flow, no NFT/on-chain, no marketplace, no PvP, no crafting.

## Stack

- Next.js (App Router) + TypeScript
- Prisma ORM
- Neon Postgres
- Cookie session auth (simple username login/register)

## Data model (Prisma)

- `User`
  - `id`, `username`, `points`, `packsOpened`, timestamps
- `Session`
  - persistent login cookie token
- `UserCard`
  - `userId`, `baseCardId`, `quantity`
- `PackOpening`
  - `userId`, `packType`, JSON result payload
- `PveRun`
  - `userId`, difficulty, selected/enemy payloads, result, reward

## Card data source

- The app continues to use `mcg_base_cards.json` as the base card source.
- User state is persisted in Neon Postgres.

## API routes

- `POST /api/auth/login` — login/register by username + create session
- `POST /api/auth/logout` — clear session
- `GET /api/me` — profile + persisted collection + counters
- `POST /api/pack/open` — open base pack (5 cards, weighted by tier/rank), persist updates
- `POST /api/pve/run` — run PvE battle, persist history and rewards

## Environment

Copy `.env.example` to `.env` and set Neon URLs:

```bash
cp .env.example .env
```

Required:

- `DATABASE_URL`
- `DIRECT_URL`

Optional:

- `SESSION_COOKIE_NAME` (default: `mcg_mvp_session`)

## Setup

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Open http://localhost:3000.

## Deploy on Vercel

1. Import repo in Vercel.
2. Add environment variables (`DATABASE_URL`, `DIRECT_URL`, optional `SESSION_COOKIE_NAME`).
3. Build command: `npm run build`.
4. Install command: `npm install`.
5. Ensure DB schema is pushed (run `prisma db push` in CI/predeploy step or manually).

This gives a production-ready MVP baseline with real persistence while keeping the same reduced product scope.
