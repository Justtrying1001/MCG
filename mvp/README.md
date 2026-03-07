# MCG MVP V1 (Scope-Cut Build)

This MVP intentionally focuses on the smallest playable loop.

## Included in V1

- **Base cards only** (`mcg_base_cards.json`)
- Card display fields: image, name, symbol, faction, rank, ATK, DEF, SPD, CTRL
- **Simple pack opening**
  - fixed 5 cards per pack
  - weighted drops using project tier + market cap rank
  - no premium variants
- **Lightweight auth + persistence**
  - username login/register
  - localStorage-backed persistence for user profile, collection, and openings
- **Collection view**
  - quantity per owned card
  - search + faction filter
- **Simple PvE**
  - pick up to 3 owned cards
  - power-score battle vs random enemy team
  - points rewards with occasional bonus-pack equivalent

## Explicitly out of scope for V1

- Variant product flow (holo/full_art/glitch/gold)
- NFT/on-chain
- Marketplace
- PvP
- Crafting
- Advanced economy/social systems

## Run

Use any static server from repo root so `mvp/index.html` can fetch `mcg_base_cards.json`:

```bash
python -m http.server 8000
# open http://localhost:8000/mvp/
```
