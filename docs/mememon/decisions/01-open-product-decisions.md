# Decisions 01 — Open Product Decisions

## Open decisions
- Final roster size and duplicate policy defaults for Weekly Tournament.
- Alpha/Beta monetization posture and pricing communication.
- Marketplace launch timing (late Beta vs V1).

## Classic Rarity Deprecation
1. **Product decision**: classic rarity tiers (Common/Uncommon/Rare/Epic/Legendary) should not be an active player-facing product system.
2. **Active product model**: editions are the active scarcity/collectible tier system.
3. **Runtime mismatch**: current runtime still uses rarity in packs, scoring, odds, and collection surfaces.
4. **Required future decision**: choose whether runtime rarity is removed entirely, retained as hidden/internal legacy metadata, or migrated to edition-first naming.
5. **Required cleanup scope**:
   - pack distribution becomes edition-first,
   - odds become edition-first,
   - scoring removes/replaces `rarityMultiplier`,
   - collection UI removes rarity-facing filters/sorts/counts,
   - economy messaging removes rarity as active value driver.

## Rarity Deprecation Cleanup Backlog
- [ ] Decide whether `RarityTier` is removed, renamed, or kept hidden/internal.
- [ ] Remove player-facing rarity language from collection UI.
- [ ] Remove rarity-based odds grouping from player-facing odds surfaces.
- [ ] Replace `RARITY_HIT` slot naming with edition-first terminology.
- [ ] Remove or replace `rarityMultiplier` from scoring.
- [ ] Revalidate pack distribution after rarity removal.
- [ ] Revalidate tournament scoring after rarity removal.
- [ ] Revalidate economy docs before marketplace design.
- [ ] Ensure investor demo copy does not emphasize rarity.
