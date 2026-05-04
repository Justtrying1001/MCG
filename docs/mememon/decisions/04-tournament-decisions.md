# Decisions 04 — Tournament Decisions

## Open decisions
- Weekly cadence and lock timing.
- Scoring data source SLA/fallback logic.
- Settlement and dispute policy for future paid formats.

## Classic Rarity Deprecation
- Current runtime scoring uses both `rarityMultiplier` and `editionMultiplier`.
- Product direction requires rarity to stop being active player-facing tournament/scoring logic.
- Tournament scoring model needs a follow-up decision: edition-only modifier or alternative approved model.

## Required tournament cleanup scope
- Remove/replace rarity multiplier dependence from scoring logic.
- Revalidate ranking behavior after scoring-model change.
- Reconfirm reward fairness assumptions after scoring-model change.
