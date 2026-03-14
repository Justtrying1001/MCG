# Contest Scoring Engine Phase 4 Validation

## 1. DB Migration Validation
- `npx prisma generate` exécute correctement avec le schéma actuel (OK).
- `npx prisma migrate dev` n’a pas pu être appliqué réellement car `DATABASE_URL` n’est pas défini dans cet environnement.
- Validation structurelle réalisée via schéma + SQL migration:
  - `TokenProject.coingeckoId` présent.
  - `ContestTokenSnapshot`, `ContestTokenScore`, `ContestEntryScoreBreakdown` présents.
  - contraintes/index présents (`unique(contestId, tokenProjectId, phase)` etc.).
- Conclusion: migration **non appliquée en DB réelle dans cet environnement**, mais schéma/migration sont prêts et cohérents.

## 2. CoinGecko ID Coverage Audit
- Audit source de vérité locale (`data/token-master-50.json`) exécuté:
  - total tokens: 50
  - tokens avec coingeckoId: 50
  - tokens sans coingeckoId: 0
- Backfill DB réel non vérifiable sans DB active (`DATABASE_URL` absent).
- Couverture théorique depuis dataset canonical: suffisante (100%).

## 3. Rarity / Edition Multipliers Validation
- Source existante pré-implémentation: multiplicateurs seulement dans le domaine pack draw (`lib/domain/acquisition/slot-weights.ts`), pas dans scoring contest.
- Source scoring actuelle (nouveau moteur): `lib/domain/contests/scoring-engine-runtime.ts`.
- Valeurs appliquées:
  - Rarity: COMMON 1, UNCOMMON 1.05, RARE 1.12, EPIC 1.22, LEGENDARY 1.35
  - Edition: BASE 1, REVERSE 1.03, BRILLANTE 1.08, HOLO 1.15, FULL_ART 1.25
- Branchements réels:
  - `finalScore = baseScore * rarityMultiplier * editionMultiplier`.
- Conclusion: multiplicateurs now branchés réellement dans scoring natif; ils n’existaient pas côté scoring contest avant.

## 4. Snapshot Runtime Validation
- Scénarios exécutés:
  - START snapshot capture depuis population éligible.
  - END snapshot capture depuis population canonique START.
  - END sans START -> erreur attendue.
  - START réexécuté -> idempotence via upsert clé unique.
- Observations prouvées par tests:
  - population END dépend de START (pas des rosters).
  - `CARD_SET_ONLY` force filtre `cardSetId`.
  - comportement stable en re-run.
- Limite: persistance DB PostgreSQL réelle non observée localement (absence DATABASE_URL).

## 5. Scoring Engine Validation
- Scénarios exécutés:
  - calcul token score borné [0,100]
  - scoring token->carte->user avec multipliers
  - rebuild ranking avec au moins 2 users
  - compute avec snapshots manquants -> erreur
  - compute avec 0 entries -> ranking vide (comportement explicite)
- Observations:
  - `ContestTokenScore` upsert appelé,
  - `ContestEntryScoreBreakdown` créé,
  - `ContestScore` upsert,
  - `ContestRanking` recalculé.

## 6. Integration Compatibility Audit
- Compatibilité maintenue:
  - `ContestEntry`, `RosterLock`, `ContestRanking`, settlement plan runtime, `RewardGrant` inchangés structurellement.
- Conflit potentiel identifié:
  - coexistence de 2 voies scoring: import manuel legacy et compute natif.
- Canon recommandé:
  - privilégier `/api/internal/contest-runs/:contestId/scoring/compute` pour les contests snapshotés,
  - garder import legacy en fallback temporaire.

## 7. Edge Cases Validation
Cas testés et observés:
- contest `ANY` avec token sans coingeckoId: couvert partiellement (runtime accepte `coingeckoId` null et persist fallback geckoId=slug).
- contest `CARD_SET_ONLY`: testé (filtre `cardSetId`).
- END sans START: erreur confirmée.
- compute sans START/END: erreur confirmée.
- compute snapshots incomplets: couvert via cas snapshots manquants.
- double compute même idempotency key: rejet route confirmé.
- double compute autre key: autorisé (recompute), confirmé.
- contest sans entries: compute OK, ranking vide.
- contest avec entries sans snapshots: rejet confirmé.
- settlement downstream après scoring natif: compatibilité indirecte validée par maintien des tables `ContestScore/ContestRanking` (pas de run DB e2e possible ici).

## 8. Fixes Applied
- Ajout tests de validation Phase 4:
  - `tests/contest-snapshot-runtime-edgecases.test.ts`
  - `tests/contest-scoring-engine-edgecases.test.ts`
  - `tests/api-internal-contest-scoring-compute-route.test.ts`
  - extension `tests/contest-eligibility-runtime.test.ts` pour `CARD_SET_ONLY`.
- Aucun refactor architectural supplémentaire.

## 9. Final Verdict
- Le moteur de scoring contest natif est-il opérationnel ?
  - **Oui au niveau logique applicative/testée** (runtime + routes + tests), **Non prouvé en DB réelle dans cet environnement** faute de `DATABASE_URL`.
- Peut-il remplacer le score importé manuel dès maintenant ?
  - **Techniquement oui** pour le pipeline applicatif, **sous réserve d’une validation finale sur DB PostgreSQL réelle** (migration + run contest fixture + settlement end-to-end).
- Blockers restants:
  1) absence de validation migration/exécution sur DB réelle dans cet environnement,
  2) coexistence legacy import vs compute natif à gouverner explicitement (switch canonique opérationnel).
