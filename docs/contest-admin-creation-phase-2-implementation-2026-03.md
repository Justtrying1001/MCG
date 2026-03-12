# MCG Contest Admin Creation — Phase 2 Implementation (Settlement Plan Bridge)

## Scope delivered
Phase 2 delivers the ranking→policy settlement bridge for contests configured via the structured contest-config flow.

Implemented in this phase:
- Persistent auto-settlement plan model (`ContestSettlementPlan`, `ContestSettlementPlanItem`).
- Runtime derivation from final ranking + published reward policy (`generateSettlementPlan`).
- Preview and execution runtime (`previewSettlementPlan`, `executeSettlementPlan`).
- Internal admin APIs for generate/get/preview/execute under `/api/internal/contest-runs/:contestId/settlement-plan/*`.
- Admin settlement workbench UI updated to a policy-driven primary flow.
- Guardrails that block legacy manual settlement endpoints when contest uses published structured policy.

## Derivation rules (MVP)
- Supported rule types: `FIXED_RANKS`, `TOP_N`, `TOP_PERCENT`.
- Stack mode in MVP: `EXCLUSIVE` only.
- Conflict handling: overlapping rules are blocking errors at generation time.
- TOP_PERCENT winner count rule: `ceil(totalRanked * percent / 100)`, minimum winner count = `1`.

## Execution behavior
- Plan execution is transactional and idempotent-aware:
  - If plan already executed, runtime returns `executed: false` with existing settlement reference.
- Execution writes through existing reward/progression mechanisms:
  - `POINTS`: `RewardGrant(POINTS)` + `User.points` increment.
  - `PACK`: `RewardGrant(PACK)` with quantity + pack definition.
  - `XP`: `UserProgression` upsert/increment.
- Contest status and entries are transitioned to settled state after successful execution.

## Legacy coexistence
- New contests with published structured reward policy:
  - Primary and supported path = settlement-plan generate/preview/execute.
  - Manual legacy `/settle` path is blocked with explicit guidance.
- Legacy contests without structured policy:
  - Existing manual settlement runbook remains available.

## Out of scope (kept for later phases)
- Non-exclusive stacking modes.
- Manual per-plan line-item editing/approval workflow beyond basic status lifecycle.
- Advanced policy versioning controls and replay tooling across historical revisions.
- Rich admin analytics/reporting around settlement plans.
