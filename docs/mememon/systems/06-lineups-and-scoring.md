# Systems 06 — Lineups and Scoring

## Runtime lineup constraints
- Exact lineup size required (`maxRosterSize`, default 5).
- Owned-card-instance ownership enforced.
- Duplicate token identities blocked.
- Cross-contest active lock conflicts blocked.

## Runtime scoring formula (confirmed)
1. Build token score from START/END snapshots:
   - `priceScore = bounded(change, 0.45)`
   - `volumeScore = bounded(change, 0.75)`
   - `marketCapScore = bounded(change, 0.7)`
   - `rankScore = bounded(change, 0.3)`
   - `baseTokenScore = 0.40*price + 0.30*volume + 0.15*marketCap + 0.15*rank`
   - `momentumMultiplier = 1 + volumeContribution + rankContribution`
   - `tokenScore = clamp(baseTokenScore * momentumMultiplier, 0, 105)`
2. Per locked card:
   - `finalScore = tokenScore * rarityMultiplier * editionMultiplier`
3. Entry score is sum of all locked-card final scores.
4. Ranking tie-break order:
   - total score desc,
   - raw token score sum desc,
   - positive token count desc,
   - best token score desc,
   - userId lexicographic asc.

## Multipliers currently used
- Rarity multipliers and edition multipliers are both active in runtime scoring.
- **Mismatch**: product direction is to remove classic rarity as active player-facing system.

## Scoring readiness/failure cases
- Requires both START and END snapshots.
- Fails when snapshot data is missing.
- Logs degraded scoring when partial market data exists.

## Runtime references
- `lib/domain/contests/scoring-engine-runtime.ts`
- `lib/domain/contests/runtime.ts`
- `prisma/schema.prisma` (`ContestTokenSnapshot`, `ContestTokenScore`, `ContestEntryScoreBreakdown`, `ContestScore`, `ContestRanking`)
