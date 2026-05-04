# Demo 01 — Investor Demo Runbook

## Purpose
Provide a deterministic operator script for investor/internal walkthroughs.

## Demo scope guardrails
- Prioritize demo reliability over feature breadth.
- Do not rely on live wallet flow as the primary entry path.
- Do not present marketplace/payments/paid tournaments as live.

## Pre-demo setup checklist (operator)
1. Confirm environment and DB connectivity.
2. Prepare a demo entry path (`/api/auth/demo/enter`) or a pre-authenticated demo account.
3. Verify an active pack definition is available (`/api/pack/config`, `/packs`).
4. Verify demo user has sufficient points for at least one open.
5. Verify one prepared contest for Weekly Tournament narrative (`/contests`, contest detail).
6. Optionally prepare a pre-scored/pre-settled contest fallback for ranking/reward visibility.

## Live walkthrough steps
1. Enter app via controlled demo path.
2. Navigate to `/packs`, open one pack, and show reveal.
3. Navigate to `/collection` and confirm ownership delta.
4. Navigate to `/contests` and prepared contest detail.
5. Explain lineup, lock behavior, and ranking/reward outputs.
6. If unstable, switch to fallback seeded ranking/reward state.

## Acceptance Criteria — Runbook Execution
- Walkthrough completes in one session without wallet failure dependency.
- At least one successful pack open is completed live or shown from deterministic fallback.
- Collection update is visible after pack interaction.
- Weekly Tournament utility is demonstrated (lineup + lock concept + ranking/reward result).
- Operator avoids out-of-scope flows.

## Runtime references
- `app/api/auth/demo/enter/route.ts`
- `app/api/pack/config/route.ts`, `app/api/pack/open/route.ts`
- `app/collection/page.tsx`
- `app/contests/[contestId]/lineup/page.tsx`
- `app/api/contests/[contestId]/ranking/route.ts`
