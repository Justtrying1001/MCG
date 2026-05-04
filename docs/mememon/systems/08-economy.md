# Systems 08 — Economy

## Current economy reality
- Internal points are used for pack opening.
- Reward grants/ledger entries and reward-pack supply are runtime-supported.
- No confirmed real-money checkout, paid tournament fee collection, or marketplace fees in live runtime.

## Scarcity/value framing
- Product direction: editions should be primary collectible scarcity layer.
- Runtime mismatch: classic rarity still affects pack weighting and contest scoring.

## Future economy scope
- Paid packs (future).
- Marketplace fees (future).
- Paid tournament entry fees and prize pools (future).
- Sponsored/partner activation rewards (future).

## Risks
- Reward inflation from grant policy drift.
- Supply/value confusion while rarity+edition both influence outcomes.
- Legal/compliance risks for future paid competitions and pools.

## Runtime references
- `lib/domain/rewards/ledger.ts`
- `lib/domain/rewards/reward-pack-grants.ts`
- `lib/domain/acquisition/open-pack.ts`
- `lib/domain/acquisition/slot-weights.ts`
- `lib/domain/contests/scoring-engine-runtime.ts`
