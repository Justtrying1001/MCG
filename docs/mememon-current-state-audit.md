# Mememon Current State Audit

## 1) Executive summary
- Repo is a Next.js 14 + Prisma monolith with App Router, server routes, and significant runtime domain code for packs, owned cards, contests, rewards, quests, and admin operations.
- Core playable loop **exists**: auth/session, open pack with internal points, ownership persistence, collection view, and contest entry lifecycle.
- Alpha blockers are mostly in reliability/polish: failing test suite, inconsistent branding, and operational runbook gaps.
- Secondary marketplace implementation is **missing** in runtime.

## 2) Repo stack summary
- Frontend/API: Next.js App Router, React 18, TypeScript (`app/*`, `components/*`).
- DB: PostgreSQL + Prisma (`prisma/schema.prisma`, migrations, seed scripts).
- Auth: Privy + first-party session bridging (`app/api/auth/*`, `lib/auth*`).
- Tests: Vitest (`tests/*`) plus many domain runtime tests.

## 3) Current product verdict
**Verdict: Partial alpha-capable foundation, not alpha-presentable yet without stabilization.**

## 4) Feature matrix
| Feature | Status | Evidence path(s) | Notes | Alpha relevance |
|---|---|---|---|---|
| Auth/session | Implemented | `app/api/auth/privy/exchange/route.ts`, `components/auth/usePrivyLogin.ts` | Privy + app session wiring exists | Critical |
| Genesis card data | Implemented | `data/token-master-25.json`, `data/mcg-cards-master.json` | 25-token master data present | Critical |
| Pack opening (internal currency) | Implemented | `app/api/pack/open/route.ts`, `lib/domain/acquisition/open-pack.ts` | Uses points economy, no real payment | Critical |
| Owned cards persistence | Implemented | `prisma/schema.prisma` (`OwnedCardInstance` etc.), `lib/domain/acquisition/*` | Ownership persisted server-side | Critical |
| Collection/Memedex | Partial | `app/collection/page.tsx`, `components/collection/*` | Present but polish gaps/wording inconsistencies | Critical |
| Contests/tournaments | Partial | `app/contests/*`, `app/api/contests/*`, `app/admin/(protected)/contests/*` | End-to-end foundations exist; operational/manual aspects remain | Critical |
| Rewards/quests | Partial | `app/rewards/page.tsx`, `app/api/rewards/*`, `app/api/quests/*` | Implemented but test failures indicate instability edges | High |
| Admin surfaces | Implemented (broad) | `app/admin/(protected)/*`, `app/api/internal/admin/*` | Many tools available; needs runbook clarity | Critical |
| Analytics basic events | Partial | `app/api/analytics/events/route.ts`, `lib/analytics/*` | Event ingestion exists; reliability not fully validated | Medium |
| Real payments | Missing | no Stripe/fiat/crypto checkout runtime routes | Internal points only | Medium |
| Secondary marketplace | Missing | no listing/sale models or routes in schema/API | Docs target only | Not for Alpha |

## 5) Detailed findings by area
### Auth/account
- Privy exchange/link routes and session are implemented.
- Profile/onboarding flow exists including handle setup.

### Card data / Genesis collection
- Source CSV/JSON and consolidated token/card masters exist.
- Naming remains MCG-centric internally.

### Pack system
- Pack open API requires authenticated user and visitorId.
- Domain runtime enforces internal pack cost and purchase limits.
- No real-money purchase integration.

### Collection / Memedex
- Dedicated route and reusable grid/header components exist.
- Works as owned-card viewer; UX fit/finish still mixed with legacy naming.

### Tournaments / contests
- Public routes for listing, detail, lineup, entry, ranking and rewards.
- Rich admin lifecycle/scoring/settlement tooling exists.
- Likely operable for first demo tournament with admin supervision.

### Rewards
- Reward pack claim routes and ledger routes exist.
- Quest + milestone systems exist but current tests show runtime/test contract drift.

### Marketplace / secondary
- No `MarketplaceListing`-like models in Prisma.
- No listing/buy/cancel APIs or UI.

### Payments / economy
- Points economy and reward ledger exist.
- No Stripe/on-chain payment checkout flow.

### Admin
- Protected admin area includes contests, users, rewards, moderation, analytics, supply.
- Operational power is high; requires careful runbook usage.

### Analytics
- Event model and route exist with guest/user fields.
- Current reliability is uncertain until failing suite stabilized.

### Branding
- Significant user-facing “MCG / Meme Card Game” remains in layout, footer, metadata, docs redirect, and many copy strings.

### Tests
- Test suite currently fails with multiple domain assertion/mocking/runtime issues and one worker OOM failure.
- Typecheck currently fails on nullable progression assertion in tests.

## 6) Current demo readiness score
- **62/100** (core loop exists, but quality and consistency risks remain).

## 7) Critical blockers before alpha
1. Failing tests/typecheck baseline.
2. User-facing branding inconsistency.
3. Missing operator/demo runbook.

## 8) Critical blockers before beta
1. Economy clarity and monetization placeholder hardening.
2. Tournament ops hardening + automation.
3. Analytics trustworthiness baseline.

## 9) Critical blockers before V1
1. Secondary marketplace implementation.
2. Purchase/payment readiness.
3. Compliance/legal gating.

## 10) Technical risks
- Domain complexity across contests/rewards/quests with failing contract tests.
- Runtime behavior may diverge from legacy tests/mocks.

## 11) Product risks
- Over-claiming web3/marketplace readiness when absent.
- Brand confusion while MCG identity remains visible.

## 12) Recommended next actions
1. Stabilize CI baseline (tests + typecheck).
2. Complete safe user-facing branding rename.
3. Use included demo runbook for deterministic staging setup.
4. Keep marketplace out of alpha; design and schedule for Beta/V1.
