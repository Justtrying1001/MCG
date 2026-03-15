# Contest Bugs Step 1

## 1. Issues Audited
- bug empty state contests
- delete / stop restrictions
- user contest hub clarity
- settled contest user clarity

## 2. Root Causes
- **Bug empty state contests**: the `/contests` page handled non-2xx responses with `await res.text()` and surfaced raw API payloads directly in UI. This produced technical JSON output (`{"ok":false,...}`) instead of a product message. Empty lifecycle/filter states were already handled in UI, but failure rendering was not user-safe. Files: `app/contests/page.tsx`, `app/api/contests/route.ts`.
- **Delete / stop restrictions**: admin actions were always shown as clickable in catalog/console, even when lifecycle/business rules made the action impossible (e.g., stop on settled, delete with operations on non-canceled). Backend rules were strict but valid; UI did not explain them early enough. Files: `app/admin/(protected)/contests/page.tsx`, `lib/domain/contests/config-runtime.ts`, `app/api/internal/contest-runs/[contestId]/transitions/validate/route.ts`.
- **User contest hub clarity**: featured and contest cards used generic copy and CTAs not always aligned with current phase, reducing clarity on “what can I do now.” Files: `components/contests/ContestHubHero.tsx`, `components/contests/ContestTile.tsx`, `components/contests/contestLifecycle.ts`.
- **Settled contest user clarity**: settled messaging did not explicitly state rewards processing/card re-availability and next action from hub/history/result areas. Files: `components/contests/ContestHistoryCard.tsx`, `components/contests/ContestResultPanel.tsx`, `components/contests/contestLifecycle.ts`.

## 3. Fixes Applied
- Replaced raw text error parsing on `/contests` with JSON-safe parsing and a product-friendly fallback message to avoid exposing raw technical payloads.
- Kept empty-state behavior for 0 matches and validated it via tests (no regression).
- Added explicit admin action policy helpers for stop/delete eligibility and rationale, then wired them into button disabled states and helper text in admin catalog and modal console.
- Improved delete-block error message in contest config runtime to explain the proper path (cancel first, then delete if full purge is needed).
- Clarified user-facing phase actionability and CTA labels for OPEN/LOCKED/LIVE/SETTLED.
- Updated featured hub copy and CTA to match current lifecycle state.
- Added settled clarity text on history and result components: ranking/results intent, rewards processing note, and card reuse availability.

## 4. Tests Added / Updated
- `tests/contest-hub-page-empty-state.test.ts`
  - verifies explicit empty-state wording for 0 matches
  - verifies API error handling does not use raw `res.text()` path
- `tests/admin-contest-actions-policy.test.ts`
  - verifies stop eligibility by status
  - verifies delete allowed/blocked logic and reason quality
- `tests/contest-user-lifecycle-mapping.test.ts` (updated)
  - verifies settled actionability wording
  - verifies CTA mapping for open/live/settled
- `tests/contest-settled-clarity-ui-smoke.test.ts`
  - verifies settled result panel includes rewards/cards clarity copy
  - verifies settled history card clarity copy

## 5. Final Result
- `/contests` no longer leaks raw JSON technical errors when loading fails; empty lifecycle/filter states remain explicit and clean.
- Admin stop/delete flows are now understandable before click (availability + reason) and backend refusal messages are product-friendly.
- Contest hub cards/featured area now communicate current phase and next action more clearly.
- Settled contests now state what users can do next (view results/ranking), plus rewards/card availability context.
- Remaining next-step opportunities (out of this scope): expose explicit per-user reward grant status from backend data model if/when available for richer settled personalization.
