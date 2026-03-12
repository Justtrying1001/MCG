# MCG Admin UI Redesign — Implementation Pass (2026-03)

## Context
This implementation pass is based directly on findings from `docs/admin-ui-audit-2026-03.md`.

Primary goals addressed in this pass:
- Reduce backend-ish feel on critical pages.
- Clarify setup/run/audit flows.
- Improve navigation hierarchy and de-emphasize legacy routes.
- Harmonize critical CTA and alert patterns across contests and rewards.

## What was redesigned

### 1. Admin shell and navigation IA
- Navigation is now grouped by operational intent:
  - Run Operations
  - Setup & Catalog
  - Audit & Governance
  - Legacy (Deprecated)
- Critical modules are visibly marked as `critical`.
- Legacy entries remain available for compatibility but are explicitly de-emphasized and tagged `legacy`.

### 2. Contest catalog UX
- Reframed as `Contest Operations` with clearer canonical path messaging.
- Added explicit deprecation callout for legacy contests.
- Kept quick action entry points (overview/scoring/settlement/audit) but improved CTA hierarchy.

### 3. Contest create wizard UX
- Reworked to clearer step semantics and hints.
- Added explicit MVP scope callout for reward builder limitations.
- Improved field labels to product language where possible.
- Kept existing backend payload/runtime integration unchanged (save/validate/publish).

### 4. Rewards/compensation UX
- Reframed as high-risk operations surface with warning callout.
- Structured flow into clear phases (recipient selection, payload prep, apply).
- Added stronger CTA and panel consistency for recent grants.

### 5. Shared visual conventions
- Added utility classes for callouts, actions row, field grids, and section stacks.
- Applied these conventions on redesigned critical pages.

## What remains for later
- Full generic rewards/distribution visual builder in contest setup (current preset MVP remains).
- Broader harmonization pass across moderation/quests/users/detail screens.
- Dashboard vs Analytics consolidation.
- Additional end-to-end UI workflow coverage.


## Contest create UI implementation update (2026-03)
- Contest catalog now includes a primary action hero that elevates `Create New Contest` above refresh/list actions.
- Contest setup wizard now follows a two-column layout (main editor + sticky summary) and a clearer stepper.
- Rewards step now uses a multi-rule reward distribution builder (add/edit/remove/reorder) with human-readable previews.
- Review step now consolidates basics, timing, entry, eligibility, rewards and blocking issues before validate/publish.
