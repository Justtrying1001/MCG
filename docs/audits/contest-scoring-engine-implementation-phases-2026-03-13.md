# Rarity / Edition Multipliers Audit

## Constats repo
- Aucun multiplicateur `rarityMultiplier` / `editionMultiplier` n’existe aujourd’hui dans le scoring contest actuel.
- Le scoring contest actuel prend un score importé par user et génère le ranking sans dimension carte/rarity/edition.
- Des multiplicateurs existent déjà dans le domaine **pack acquisition** (`slot-weights`) mais ils servent au tirage des cartes, pas au scoring contest.

## Où c’est défini aujourd’hui
- Multiplicateurs pack (non contest scoring): `lib/domain/acquisition/slot-weights.ts`.
- Types rarity/edition: `RarityTier`, `EditionType` dans Prisma.
- Les cartes lineup exposent bien rarity/edition via lineup options (`rarityCode`, `editionCode`) mais non utilisés dans scoring.

## Où l’ajouter pour le moteur contest
- Ajout proposé/implémenté dans `lib/domain/contests/scoring-engine-runtime.ts`.
- Multiplicateurs appliqués au niveau carte: `cardScore = tokenScore * rarityMultiplier * editionMultiplier`.

---

# Phase 1 Report

## Schema ajouté
- `TokenProject.coingeckoId` (nullable, unique).
- Enum `ContestSnapshotPhase` (`START`, `END`).
- Table `ContestTokenSnapshot` avec index `unique(contestId, tokenProjectId, phase)`.
- Table `ContestTokenScore`.
- Table `ContestEntryScoreBreakdown` (optionnelle demandée).

## Migrations
- Nouvelle migration SQL: `prisma/migrations/20260313120000_contest_scoring_engine_phase1/migration.sql`.

## Tests / vérifications
- Validation TypeScript/Prisma via génération client (voir commandes exécutées).
- Tests ciblés ajoutés pour eligibility/snapshot/scoring runtime.

---

# Phase 2 Report

## Snapshots
- Service CoinGecko ajouté: `lib/domain/contests/coingecko-client.ts`.
- Runtime snapshot ajouté: `lib/domain/contests/snapshot-runtime.ts`.
- Capture START: population via éligibilité contest.
- Capture END: réutilise strictement la population START.

## Routes admin
- `POST /api/internal/contest-runs/:contestId/snapshots/start`
- `POST /api/internal/contest-runs/:contestId/snapshots/end`

## Tests
- `tests/contest-snapshot-runtime.test.ts` couvre START/END + canon START pour END.

---

# Contest Scoring Engine Implementation

## Schema
- `ContestTokenSnapshot`, `ContestTokenScore`, `ContestEntryScoreBreakdown`, `TokenProject.coingeckoId`.

## Snapshots
- START/END snapshots basés sur CoinGecko (`coins/markets`) via client avec retry + throttling basique.
- Résolution d’éligibilité dédiée (`ANY`, `CARD_SET_ONLY`).

## Scoring
- `lib/domain/contests/scoring-engine-runtime.ts`:
  - compute token changes START/END,
  - score token normalisé [0,100],
  - score carte avec multiplicateurs rarity+edition,
  - agrégation user,
  - persistence `ContestScore` + rebuild `ContestRanking`.

## Ranking integration
- Réutilise les tables existantes `ContestScore` / `ContestRanking` / `ContestEntry`.
- Ne casse pas `ContestEntry`, `RosterLock`, `Settlement`, `RewardGrant`.

## Route scoring compute
- `POST /api/internal/contest-runs/:contestId/scoring/compute`
- nécessite `Idempotency-Key`.

## Tests
- Ajoutés:
  - `tests/contest-eligibility-runtime.test.ts`
  - `tests/contest-snapshot-runtime.test.ts`
  - `tests/contest-scoring-engine-runtime.test.ts`
- Le test stateful existant `tests/contest-runtime-stateful-flow.test.ts` reste valide pour la voie legacy.
