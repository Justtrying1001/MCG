# MCG Phase 4 — Contest Frontend MVP (Implementation Note)

This note records the Phase 4 frontend delivery aligned with:
- `docs/mcg-pivot-product-foundation.md`
- `docs/mcg-transition-architecture-plan.md`
- `docs/mcg-phase-0-preconditions.md`
- `docs/mcg-phase-1-foundations-implementation.md`
- `docs/mcg-phase-2-pack-collection-transition-implementation.md`
- `docs/mcg-phase-3-contest-backend-mvp-implementation.md`

## Scope delivered

- Dedicated player contest pages:
  - `GET /contests` list/discovery
  - `GET /contests/:contestId` detail, lineup submission, leaderboard
- Contest nav discoverability in existing shell.
- Minimal contest lineup options API for owned instance selection.

## MVP behavior

- Contest list consumes `GET /api/contests` and shows status, timings, roster size, and entry count.
- Contest detail consumes:
  - `GET /api/contests/:contestId`
  - `GET /api/contests/:contestId/ranking`
  - `POST /api/contests/:contestId/enter`
- Lineup selection is instance-based and submission sends `lineupInstanceIds` to backend truth.
- Client-side validation is lightweight (selection count), with backend validation errors displayed directly.

## Coexistence posture

- No broad `useSession` refactor.
- PvE routes/pages remain unchanged.
- Profile/progression cutover remains deferred to later phases.

## Explicit deferrals

- Contest admin UI
- Advanced contest analytics
- Full roster/deckbuilder tooling
- Phase 5 profile/progression frontend cutover
- Phase 6 PvE decommission
