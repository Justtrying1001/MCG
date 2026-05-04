# Systems 03 — Packs and Pack Opening

## Runtime pack model
- `PackDefinition` supports source (`SALE` / `REWARD`), cards-per-pack, planned/opened counts, and active flag.
- Pack opening reserves pack stock, draws templates by weighted slot logic, increments issued supply, and creates owned card instances.

## Runtime opening paths
- Authenticated open: `/api/pack/open`.
- Demo session path exists via `/api/auth/demo/enter` (demo mode gate), then normal authenticated open.

## Runtime distribution logic
- Slot types: `STANDARD`, `EDITION_BOOST`, `RARITY_HIT`.
- Draw weights currently combine:
  - remaining supply,
  - rarity multipliers,
  - edition multipliers.
- Config endpoint exposes odds aggregated by rarity and rarity+edition.

## Product direction vs runtime
- Product direction: edition-based scarcity should be the active player-facing model.
- Runtime mismatch: pack weighting currently still uses classic rarity multipliers.

## Supply and pack classes
- Sale packs: current runtime loop (internal points cost).
- Reward packs: supported through reward grants and reward-pack supply tracking.
- No confirmed real-money checkout path.

## Runtime references
- `lib/domain/acquisition/open-pack.ts`
- `lib/domain/acquisition/slot-weights.ts`
- `lib/domain/acquisition/pack-config.ts`
- `app/api/pack/open/route.ts`, `app/api/pack/config/route.ts`
