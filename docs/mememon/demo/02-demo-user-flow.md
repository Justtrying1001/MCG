# Demo 02 — Demo User Flow

## Purpose
Define the investor-facing user journey and where operator intervention is allowed.

## Primary user flow
1. Enter app via controlled demo path.
2. Open a sale pack with internal/demo points.
3. Review reveal result.
4. Confirm newly owned cards in Memedex (`/collection`).
5. Open Weekly Tournament contest detail.
6. Build or preview lineup (only if contest lifecycle is prepared).
7. Review ranking/reward view (live or seeded fallback).

## Acceptance Criteria — User Flow
- Entry does not hard-fail because wallet connection is unavailable.
- Pack open + reveal + collection update are all visible in same flow.
- Tournament section demonstrates utility of owned cards.
- No claim is made that paid or on-chain systems are currently live.

## Runtime references
- `app/packs/page.tsx`
- `app/api/pack/open/route.ts`
- `app/collection/page.tsx`
- `app/contests/[contestId]/page.tsx`
- `app/contests/[contestId]/lineup/page.tsx`
