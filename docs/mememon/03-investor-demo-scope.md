# 03 — Investor Demo Scope

## Purpose
Define a strict, practical investor/internal demo scope that can be run reliably.

## Demo must show
1. Landing/product framing.
2. Controlled access path (wallet-free or pre-controlled demo session).
3. Pack opening with internal/demo currency.
4. Card reveal and owned-card persistence.
5. Memedex/collection progression.
6. Weekly Tournament utility concept (lineup, lock, ranking, rewards context).

## Demo must exclude
- Marketplace listing/buy/sell.
- Real-money checkout.
- Paid tournament entry fees.
- Live prize-pool payouts.
- Mandatory on-chain ownership proof.
- Any claim of public Alpha/Beta/V1 readiness.

## Non-blocking requirements
- Demo must not fail if wallet/Privy flow is unavailable.
- Demo must have fallback for fragile contest lifecycle states.
- Demo must be runnable with seeded pack supply, demo points, and prepared contest states.

## Edition and rarity messaging rule
- Demo narrative should present **editions** as the active collectible framing.
- If a screen still exposes classic rarity labels, treat it as runtime legacy/mismatch, not target product design.

## Acceptance Criteria — Investor Demo
- Operator can initiate demo via controlled entry path (`/api/auth/demo/enter` or pre-authenticated account).
- User can complete at least one pack open from `/packs`.
- Reveal completes and owned cards become visible in `/collection`.
- Weekly Tournament concept is shown on prepared contest pages.
- Ranking/reward context is shown from prepared live state or seeded fallback.
- Narration explicitly states marketplace/payments/paid tournaments/on-chain enforcement are not currently live.

## Runtime references
- `app/api/auth/demo/enter/route.ts`
- `app/packs/page.tsx`, `app/api/pack/open/route.ts`
- `app/collection/page.tsx`
- `app/contests/page.tsx`, `app/contests/[contestId]/page.tsx`, `app/contests/[contestId]/lineup/page.tsx`
- `app/api/contests/[contestId]/ranking/route.ts`, `app/api/contests/[contestId]/my-rewards/route.ts`
