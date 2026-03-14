# Contest Seasons & Leagues Pass

## Scope
- Added a competitive meta-layer above contests with Seasons, Leagues, seasonal rating, rating history, and seasonal leaderboard storage.
- Integrated season/league metadata into contest APIs and contest UI cards.
- Added a new `/seasons` page and profile competitive additions for league + seasonal rank visibility.

## Data Model Additions
- `Season` + `SeasonStatus`
- `League` + `LeagueTier`
- `Contest.seasonId`
- `Contest.leagueTierRequired`
- `User.leagueId`
- `UserContestRating`
- `ContestRatingChange`
- `SeasonLeaderboard`
- `SeasonRewardGrant`

## Rating System
- New runtime in `lib/domain/seasons/runtime.ts`:
  - `syncSeasonProgressForContest(contestId)` computes per-user deltas from settled rankings.
  - Idempotence via unique key `(contestId, userId)` in `ContestRatingChange`.
  - Updates `UserContestRating`, user league assignment, and `SeasonLeaderboard` points/rank.

## APIs
- `GET /api/seasons` returns season overview + top leaderboard + current user standing.
- `POST /api/internal/seasons/contests/[contestId]/sync` lets admin sync seasonal progression after a settled contest.
- `GET /api/contests` and `GET /api/contests/[contestId]` now include season/league metadata for UI display.

## UX Integrations
- `/seasons` page: current season hero, leaderboard, time remaining, reward tiers.
- Contest Hub and tiles display season + league requirement.
- Contest detail hero displays season + league requirement.
- Profile competitive cards now show league tier and season rank.

## Notes
- Contest lifecycle/snapshot/scoring/settlement engines were not changed in this pass.
- Season sync is exposed as a dedicated layer above contest settlement, preserving the canonical contest pipeline.
