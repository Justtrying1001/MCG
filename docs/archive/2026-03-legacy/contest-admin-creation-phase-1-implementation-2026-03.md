# Contest Admin Creation Refactor — Phase 1 Implementation (2026-03)

This document records what was implemented in Phase 1 from:
- `docs/contest-admin-creation-audit-2026-03.md`
- `docs/contest-admin-creation-architecture-2026-03.md`

## Delivered in Phase 1

- New structured contest setup runtime (`lib/domain/contests/config-runtime.ts`):
  - `createContestDraft`
  - `getContestDraft`
  - `updateContestDraft`
  - `validateContestDraft`
  - `publishContest`
- New internal admin config APIs:
  - `POST /api/internal/contest-configs`
  - `GET/PATCH /api/internal/contest-configs/:contestId`
  - `POST /api/internal/contest-configs/:contestId/validate`
  - `POST /api/internal/contest-configs/:contestId/publish`
- New admin create page:
  - `/admin/contests/create`
  - Sectioned flow (Basics, Timing, Entry, Team & Eligibility, Rewards & Distribution, Review & Publish)
  - No JSON payload editing exposed in UI.
- Contest entry runtime integration:
  - reads canonical team policy fields (`teamSizeMode`, `teamSizeValue`)
  - applies entry fee debit via ledger when enabled
  - rejects entry with explicit insufficient-points error.
- Additive Prisma model extension:
  - structured fields on `Contest` / `ContestRule`
  - new reward policy tables (`ContestRewardPolicy`, bundles, components, distribution rules)

## Explicitly deferred to Phase 2+

- Full settlement auto-plan generation/execution replacement for legacy settle flow.
- Rich reward distribution editor (beyond MVP preset-like UX).
- Complete migration/deprecation of legacy create and legacy settle endpoints.
- XP accounting unification strategy beyond policy storage.

## Backward compatibility

- Legacy contest operations endpoints are kept.
- Legacy create page remains available (now marked deprecated).
- Runtime retains fallback compatibility for contests that only have legacy `maxRosterSize` / `cardSetId` fields.

## Stabilization update

- Root-cause fix for Phase 1 blocker tests:
  - runtime comparisons no longer rely on Prisma-generated runtime enum objects for newly introduced contest config enums.
  - canonical comparisons now use stable string constants (`EXACT`, `CARD_SET_ONLY`, `POINTS`, `FIXED_RANKS`, `TOP_N`, `TOP_PERCENT`) to avoid test/runtime enum object undefined mismatches.
- API hardening:
  - added zod validation in contest-config create/patch routes,
  - reject invalid/empty payloads with structured issues,
  - support datetime-local-compatible timestamp validation.
- Additional runtime hardening in normalization:
  - team size mode/value guards,
  - entry fee guard,
  - eligibility guard,
  - timing order guards.
