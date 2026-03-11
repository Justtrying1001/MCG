# MCG Documentation

## Current source-of-truth docs (read first)

- `current-runtime-architecture.md` — runtime implementation truth (what is actually live now).
- `mcg-pivot-product-foundation.md` — product intent/source-of-truth (vision, loop, pillars).
- `repo-and-docs-consolidation-audit-2026-03.md` — consolidated repo+docs truth audit (implementation vs docs alignment, corrections, remaining debt).
- `cards-data-runtime-audit-2026-03.md` — deep audit of card/template/pack/emission data sources, runtime dependencies, and target source-of-truth architecture.
- `csv-50-canonical-migration-audit-2026-03.md` — CSV-50 to legacy-JSON mapping audit with field-level migration plan for canonical card data.
- `token-master-50-source-of-truth.md` — specification for `data/token-master-50.json` canonical dataset and generation workflow.
- `token-master-50-adoption-plan.md` — concrete replacement/adoption plan to move seed and runtime toward token-master-first flows.
- `token-master-50-runtime-adoption.md` — concrete runtime/read-model migration status for token-master-first card identity and DTO adoption.

## Historical / contextual docs (read with caution)

- `reward-system-audit-2026-03.md` — rewards/quests phase audit context (still useful, but superseded by consolidation doc for repo-wide truth).
- `repo-cartography-2026-03.md` — architecture/cartography snapshot from an earlier state.
- `mvp-controlled-emission-transformation.md` — transformation planning document written pre-implementation for controlled-emission rollout.

## Recommended reading order for new contributors

1. `current-runtime-architecture.md`
2. `repo-and-docs-consolidation-audit-2026-03.md`
3. `README.md` (root)
4. `mcg-pivot-product-foundation.md`
5. Historical/context docs only if needed for background.
