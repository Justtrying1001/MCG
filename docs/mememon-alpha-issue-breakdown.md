# Mememon Alpha Issue Breakdown

## Milestone 1: Internal Demo
### 1) Stabilize demo setup runbook
- Goal: deterministic local/staging demo setup.
- Files: `docs/mememon-alpha-demo-runbook.md`, `prisma/seed-mvp-controlled-emission.mjs`
- Acceptance: operator can seed, run, and demo core loop in <30 min.
- Priority: P0 | Risk: Low | Dependencies: DB env ready.

### 2) User-facing branding pass (safe)
- Goal: replace key visible MCG labels with Mememon TCG.
- Files: `app/layout.tsx`, `components/layout/*`, `app/docs/page.tsx`, `app/twitter/page.tsx`
- Acceptance: homepage/nav/footer/metadata no longer show old brand.
- Priority: P0 | Risk: Low | Dependencies: copy review.

## Milestone 2: Alpha
### 3) Contest flow operator hardening
- Goal: run first tournament end-to-end with documented manual steps.
- Files: `app/admin/(protected)/contests/*`, contest APIs.
- Acceptance: create->open->lock->live->settle done once without code changes.
- Priority: P0 | Risk: Medium | Dependencies: seeded cards/pack ownership.

### 4) Fix CI baseline (tests/typecheck)
- Goal: remove failing tests and OOM instability.
- Files: `tests/*`, `lib/domain/*`.
- Acceptance: `npm test` and `npm run typecheck` pass in CI profile.
- Priority: P0 | Risk: High | Dependencies: domain owners.

## Milestone 3: Beta
### 5) Economy clarity + pack supply controls review
- Goal: transparent pricing/supply behavior and admin controls.
- Files: pack domain + admin supply pages/routes.
- Acceptance: product copy and backend constraints aligned.
- Priority: P1 | Risk: Medium | Dependencies: PM decision.

## Milestone 4: V1
### 6) Marketplace V1 implementation
- Goal: safe list/cancel/buy flow with atomic transfer.
- Files: prisma schema, new marketplace APIs/UI.
- Acceptance: end-to-end transaction history with no double-sell.
- Priority: P0 | Risk: High | Dependencies: economy/payment policy.

## Milestone 5: Post-V1
### 7) Partner/community seasonal activation toolkit
- Goal: repeatable seasonal content pipeline.
- Files: data seed pipeline + admin content tooling.
- Acceptance: launch one new seasonal drop without engineering patch.
- Priority: P2 | Risk: Medium | Dependencies: live ops team.
