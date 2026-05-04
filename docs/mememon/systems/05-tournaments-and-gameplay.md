# Systems 05 — Tournaments and Gameplay

## Primary competitive format
**Weekly Tournament** is the first primary competitive format for Demo -> Alpha -> Beta -> V1 planning.

## Contest lifecycle (runtime)
`DRAFT -> OPEN -> LOCKED -> LIVE -> SETTLED` (public user flows use OPEN/LOCKED/LIVE/SETTLED when published).

## Entry and lineup rules (runtime)
- Entry only when contest status is `OPEN` and lock time has not passed.
- Lineup must be exact team size (runtime supports `EXACT`; other modes rejected).
- Default roster size is 5 unless overridden by `ContestRule.maxRosterSize`.
- Duplicate **instances** disallowed; duplicate logical token selection disallowed.
- Card set eligibility enforced when rule/card-set mode requires it.
- Cards already locked in another active contest cannot be reused.

## Ranking/reward flow
- Lineups become roster locks on submission.
- Scores/rankings generated from token snapshots and per-card multipliers.
- Contest settlements then grant rewards via reward policy/settlement plan runtime.

## Future formats (not current)
Paid tournaments, prize pools, sponsored/partner formats, seasonal championships, and restricted-format variants are future-scoped.

## Runtime references
- `lib/domain/contests/runtime.ts`
- `lib/domain/contests/contest-lifecycle-runtime.ts`
- `app/api/contests/[contestId]/enter/route.ts`
- `app/api/contests/[contestId]/lineup-options/route.ts`
