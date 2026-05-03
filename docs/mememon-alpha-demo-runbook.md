# Mememon Alpha Demo Runbook

## Environment
- Copy `.env.example` to `.env`.
- Required minimum: `DATABASE_URL`, auth/session envs used by Privy/server auth, admin secret envs used by `app/api/admin/*`.

## Setup
1. `npm install`
2. `npm run prisma:push` (or migration workflow used by your environment)
3. `npm run seed:mvp:controlled-emission`
4. Optional sanity: `npm run check:mvp:bootstrap`

## Start app
- `npm run dev`

## Verify Genesis set and packs
- Confirm pack definitions exist via admin surfaces and `/api/pack/config`.
- Confirm Genesis data files exist (`data/token-master-25.json`, `data/mcg-cards-master.json`).

## Demo user loop
1. Login via wallet/X.
2. Open pack in `/packs`.
3. Verify pack reveal contents render.
4. Go to `/collection` and confirm owned cards updated.

## Demo contest loop
1. Admin creates/publishes contest in `/admin/(protected)/contests` flows.
2. User opens `/contests`, enters contest, submits lineup.
3. Verify lock/lifecycle and ranking panels.
4. If scoring/settlement are manual, execute via admin operator pages.

## Known limitations
- No real payment checkout.
- No secondary marketplace.
- Some tests currently failing in baseline branch.

## Troubleshooting
- If pack open fails unauthorized: re-authenticate and verify session cookie.
- If no cards appear: verify seed and pack supply state, and DB write health.
- If contest actions fail: verify contest status/lifecycle state in admin.
