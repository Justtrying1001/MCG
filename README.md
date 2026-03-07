# MCG MVP V1 — Vercel + Neon Base

This app keeps the exact MVP scope:

- Base cards only
- Pack opening
- Collection
- Simple auth (**Twitter-only**)
- Simple PvE
- Simple reward loop

No variants product flow, no NFT/on-chain, no marketplace, no PvP, no crafting.

## Stack

- Next.js (App Router) + TypeScript
- Prisma ORM
- Neon Postgres
- NextAuth (Twitter OAuth only)

## Data model (Prisma)

- `User`
  - `id`, `twitterId`, `username`, `points`, `packsOpened`, timestamps
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

- `GET/POST /api/auth/[...nextauth]` — Twitter OAuth flow
- `GET /api/me` — profile + persisted collection + counters
- `POST /api/pack/open` — open base pack (5 cards, weighted by tier/rank), persist updates
- `POST /api/pve/run` — run PvE battle, persist history and rewards

## Environment

Copy `.env.example` to `.env` and set Neon + Twitter credentials:

```bash
cp .env.example .env
```

Required:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `TWITTER_CLIENT_ID`
- `TWITTER_CLIENT_SECRET`

## Setup

```bash
npm install
npx prisma db push
npm run dev
```

Open http://localhost:3000.

## Deploy on Vercel

1. Import repo in Vercel.
2. Add all required env vars.
3. Build command: `npm run build`.
4. Install command: `npm install`.

`npm run build` runs `prisma generate && next build` to avoid the Vercel Prisma client cache issue.
