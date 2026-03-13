# Contest UX Redesign — analysis, concept, design system, and extension

## 1) Existing flow analysis
- `app/contests/page.tsx` loads `/api/contests` and groups records into active/upcoming vs settled lists.
- `app/contests/[contestId]/page.tsx` loads detail + ranking + lineup options, supports fixed-size selection, then submits `/enter`.
- Existing classes (`contest-card`, `contest-section`, `contest-option-card`, `contest-ranking-table`) provided a functional MVP but limited game feel.

## 2) New page architecture (text wireframe)
- Listing page:
  - Narrative header + global rules/deadline panel.
  - Tabs: Active/Upcoming, Live, Completed.
  - Enriched contest tiles with status icon, countdown, reward highlight, dynamic CTA.
- Detail page:
  - Contest hero (code, status, rewards, key metadata).
  - Visual lineup manager with slots + reusable card selection modal.
  - Live dashboard state (locked lineup + stylized leaderboard).

## 3) Contest design system
- Global CSS tokens in `app/design-system.css`:
  - `--contest-open-color`, `--contest-live-color`, `--contest-locked-color`, `--contest-badge-bg`, `--contest-reward-card-bg`, etc.
- Reusable components:
  - `ContestTile`, `ContestHero`, `LineupSlot`, `CardSelectorModal`, `LeaderboardCard`.

## 4) Extension guidelines (Rewards / Quests)
- Reuse contest interaction patterns for broader gamification:
  - Hero + status-aware primary CTA.
  - Slot/step-based visual progression.
  - Filterable selector modal.
  - Leaderboard blocks that highlight the current user.
- Keep existing business APIs unchanged; extend only presentation and interaction layers.
