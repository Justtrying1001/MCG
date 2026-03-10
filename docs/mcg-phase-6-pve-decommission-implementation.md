# MCG Phase 6 — PvE Decommission (Implementation Note)

This note documents the Phase 6 delivery aligned with the transition plan.

## What was decommissioned now

- PvE removed from active navigation and primary product copy.
- Legacy PvE page route (`/combats`) converted to a redirect into contest flow (`/contests`).
- PvE API runtime endpoints retired with explicit HTTP `410 Gone` responses:
  - `/api/pve/battle`
  - `/api/pve/run`
  - `/api/guest/pve/battle`
- PvE backend domain runtime (`lib/pve/*`) removed from the active codebase.

## Session/profile de-emphasis decisions

- `/api/me` no longer computes or returns active PvE counters/reset fields.
- `useSession` guest state no longer carries PvE ticket/reset/run concerns.
- Profile page (`/compte`) no longer presents the legacy PvE continuity panel.

## Compatibility posture

- Collection item shape still includes `pveExhausted` for compatibility with existing stored card records.
- No auth/session transport changes were introduced.
- Pack opening, collection, contests, and profile progression flows remain active.

## Deferred to Phase 7

- Deep residual data-model cleanup for legacy PvE-only fields in persistence schema.
- Broad CSS dead-style pruning from retired PvE UI classes.
- Any final repository-wide legacy artifact sweep beyond controlled decommission scope.
