# Contest Frontend Rebuild Audit & Product Plan

## 1) Contest system understanding (current repo)

### A. What already exists
- User pages:
  - `/contests` contest listing surface.
  - `/contests/[contestId]` contest detail, lineup entry, ranking display.
- Contest APIs (current contract):
  - `GET /api/contests`
  - `GET /api/contests/:contestId`
  - `GET /api/contests/:contestId/ranking`
  - `GET /api/contests/:contestId/lineup-options`
  - `POST /api/contests/:contestId/enter`
- Current contest statuses in frontend/backend types:
  - `DRAFT`, `OPEN`, `LOCKED`, `LIVE`, `SETTLED`, `CANCELED`.

### B. Available data used by frontend
- Contest list item:
  - `id`, `code`, `title`, `status`, `startsAt`, `lockAt`, `endsAt`, `rules[]`, `_count.entries`.
- Rule subset for lineup:
  - `cardSetId`, `maxRosterSize`.
- Contest detail:
  - contest core + `userEntry` (entry status + roster locks).
- Ranking rows:
  - `rank`, `score`, `userId`.
- Lineup options:
  - owned card instance based options with set/rarity/edition/name and lock state.

### C. Existing user actions
- Browse contest list.
- Open contest detail.
- Build lineup from eligible options.
- Submit entry when contest is `OPEN` and roster is complete.
- Track leaderboard rows when available.

### D. Backend constraints to preserve
- No API contract change.
- No payload/schema/rule changes.
- No Prisma/domain runtime modification.
- Frontend must derive richer UX only from existing fields and states.

## 2) UX audit

### A. Key UX issues (before this rebuild)
- Listing lacked strong tournament framing (status tension, reward motivation, phase clarity).
- Team builder felt like a technical selector rather than a strategic lineup experience.
- Post-entry tracking was under-expressed (timeline, submitted lineup context, progression state).
- Settled/result storytelling was weak (final snapshot not emphasized).
- Guest experience was binary and abrupt instead of progressive (preview/build vs participate).

### B. Why experience did not feel premium/competitive
- Flat information hierarchy.
- Limited state-based messaging.
- Minimal visual feedback for lineup completion and phase transitions.
- No dedicated “contest memory” block for recent settled participation context.

## 3) UI audit
- Low separation between “discover”, “build”, and “track” moments.
- Weak status affordances in several contexts.
- Missing premium dashboard primitives: timeline, summary side panel, result snapshot cards.

## 4) New product UX proposal

### Contest hub
- Featured contest card.
- Section filters by lifecycle phase (Upcoming/Open/Locked/Live/Settled).
- Search by code/title.
- Rich contest card blocks with status, countdown, rewards, restrictions, CTA.
- Recent settled history strip.

### Contest detail
- Contest hero with status/countdown/reward framing.
- Contest phase timeline.
- Team builder zone + summary panel.
- Submitted lineup panel after entry.
- Leaderboard panel and result snapshot (when settled).

### Team building flow
- Visual slots with click-to-pick.
- Search/filterable selection modal.
- Clear incomplete/complete validation state.
- Guest preview allowed, entry CTA gated to connect.

### Tracking flow
- Timeline clarifies OPEN/LOCKED/LIVE/SETTLED progression.
- Entered lineup visible post-submission.
- Leaderboard available when ranking payload exists.
- Settled snapshot highlights final outcome when available.

## 5) Contest design system direction
- Add/expand componentized primitives:
  - `ContestStatusBadge`
  - `ContestCountdown`
  - `ContestRewardPreview`
  - `ContestFiltersBar`
  - `ContestProgressTimeline`
  - `LineupSummaryPanel`
  - `EnteredLineupPanel`
  - `ContestResultPanel`
  - `ContestHistoryCard`
- Extend `app/design-system.css` with contest-specific layout/state blocks:
  - filters shell, timeline, reward preview, two-column builder, history cards.

## 6) Implementation mapping
1. Refactor `/contests` into a full contest hub with phase filters and richer cards.
2. Refactor `/contests/[contestId]` into product-style detail + builder + tracking stack.
3. Keep API calls and payload usage unchanged.
4. Improve guest UX by allowing preview/team-building interactions while participation remains gated.

## 7) Extension path (future)
- Add stronger personal contest history once dedicated API joins available.
- Add richer reward detail cards when settlement output expands.
- Add lineup performance decomposition cards (card-by-card contribution) when scoring granularity is exposed.
