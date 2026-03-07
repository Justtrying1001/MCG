# MCG MVP V1 — Vercel + Neon Base

This app keeps the MVP scope:

- Base cards only
- Pack opening
- Collection
- Minimal auth (username + password)
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
  - `id`, `username`, `passwordHash`, `points`, `packsOpened`, timestamps
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

## API routes

- `POST /api/auth/register` — create account and start session
- `POST /api/auth/login` — login and start session
- `POST /api/auth/logout` — logout and clear session cookie
- `GET /api/me` — profile + persisted collection + counters
- `POST /api/pack/open` — open base pack (5 cards, weighted by tier/rank), persist updates
- `POST /api/pve/run` — run PvE battle, persist history and rewards

Credentials format:
- `username`: 3-24 chars, letters/numbers/underscore only
- `password`: 4-72 chars

## Environment

Copy `.env.example` to `.env` and set Neon credentials:

```bash
cp .env.example .env
```

Required:

- `DATABASE_URL`

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
