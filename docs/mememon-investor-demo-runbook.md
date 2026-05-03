# Mememon TCG Investor Demo Runbook

## Setup commands

### Demo mode (wallet-free)
1. `npm install`
2. `npx prisma generate`
3. `npm run prisma:push`
4. `npm run seed:mvp:controlled-emission`
5. `npm run check:mvp:bootstrap`
6. `npm run dev`

- Enable wallet-free demo entry: set `MEMEMON_DEMO_MODE=true` and `NEXT_PUBLIC_MEMEMON_DEMO_MODE=true`.
- Disable demo entry: set both flags to `false`.

## Environment variables
- Must set: `DATABASE_URL`.
- Must set: Privy env values for auth exchange/login.
- Must set: admin auth env used by protected admin routes.
- Optional: `QSTASH_TOKEN` and QStash signing envs for scheduled lifecycle jobs.

## DB setup
- Local: PostgreSQL reachable from `DATABASE_URL`.
- Schema: via `prisma db push`.
- Seed: controlled emission seed script above.

## Demo seed command
- Primary: `npm run seed:mvp:controlled-emission`
- Sanity check: `npm run check:mvp:bootstrap`

## Demo user creation
- Login through app once (`/`) to create user.
- If needed, assign points through admin/manual grant flow (`/admin/(protected)/rewards` + manual grant API).

## Verify packs
- Go to `/packs`.
- Confirm active pack tile and open action.
- Optionally verify `/api/pack/config` returns sale pack data.

## Verify owned cards
- Open one pack.
- Confirm reveal modal shows pulled cards.
- Go to `/collection` and verify new cards render.
- API check: `/api/me` should include `mvpCollection` and owned instances.

## Verify contest
- Confirm contest exists in `/contests`.
- Open detail page and verify timeline, rules, rewards panel.
- Enter lineup if contest is OPEN and card eligibility matches.

## Reset demo state
- Fast reset for local only: `npm run prisma:push:reset` then rerun seed/bootstrap.

## Troubleshooting
- Unauthorized pack open: re-login and verify session cookie.
- Empty collection after open: verify DB writes and template/card set links.
- Contest entry rejected: check status (OPEN), lineup duplicates, and eligibility mode.
- Build-time scheduler warnings: expected locally without QStash env.

## What not to click/show during demo
- Do not open non-implemented marketplace/payment flows.
- Avoid admin destructive/reset actions during live investor walkthrough.
- Avoid showing known failing `test:full` output; use validated demo checklist.


## Demo mode security caveat
- Demo mode creates/uses a deterministic demo user and session through `/api/auth/demo/enter`.
- This must stay disabled outside controlled investor environments.
- Demo mode does not grant admin privileges.
