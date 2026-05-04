# Decisions 02 — Economy Decisions

## Open decisions
- Internal points source/sink targets by stage (Demo vs Alpha vs Beta).
- Pack pricing framework (assumptions only until approved).
- Reward emission caps to control inflation.
- Duplicate handling policy (utility sinks, exchange, or pure collectibility).
- Paid tournament fee policy and prize redistribution math (future scoped).
- Marketplace fee structure and fee recipients (future scoped).

## Classic Rarity Deprecation
- Economy direction is edition-first scarcity/value signaling.
- Runtime currently still blends rarity and edition effects in supply/pack/scoring surfaces.
- Economy model must decide whether rarity stays hidden metadata or is removed before paid features.

## Required economy cleanup implications
- Player-facing pack odds and scarcity language should be edition-based.
- Future paid pack communication should avoid rarity-tier marketing.
- Marketplace fee/value assumptions should not depend on two parallel scarcity systems.
- Tournament reward/economy modeling should remove rarity as active player-facing value axis.

## Decision constraints
- Do not introduce paid flows before compliance and settlement policy is defined.
- Do not present assumed pricing as finalized market pricing.
- Do not launch player-facing paid economy with unresolved dual rarity+edition scarcity messaging.
