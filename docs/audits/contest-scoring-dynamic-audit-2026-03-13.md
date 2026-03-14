# AUDIT DYNAMIQUE CONTEST / SCORING

## 1. Executive summary dynamique
- **Prouvé par exécution**: les flows runtime suivants sont effectivement exécutables en logique métier: entry + roster lock, scoring import, ranking regeneration, settlement legacy, guard de double settlement, et partiellement idempotence via clés/guards. (Preuve: exécution de 7 fichiers de tests, dont un nouveau test stateful non-trivial.)
- **Invalidé**: aucune preuve d’un moteur de scoring token-based; le système persiste un score importé (`userId`, `score`) puis classe.
- **Ambigu malgré tests**: absence d’exécution full-stack avec vraie DB PostgreSQL et routes Next en environnement intégré (les tests existants sont majoritairement mockés).
- **Ce qui casse réellement**: scoring en status OPEN est rejeté (comportement voulu), re-entry user rejetée, ownership invalide rejetée; ce sont des blocages observés en test.
- **Confiance finale**:
  - Entry/Lock/Scoring import/Ranking: **moyenne+** (preuve dynamique stateful + tests existants).
  - Settlement plan/rewards/idempotence route-level: **moyenne**.
  - Snapshotting/token-scoring/versioning formule: **faible (absence prouvée)**.

## 2. Inventaire des tests existants exécutés

### `tests/contest-entry-fee-runtime.test.ts`
- Prouve: débit ledger quand entry fee activé, erreur insuffisance points propagée.
- Ne prouve pas: persistance DB réelle, locks/ranking/settlement.
- Résultat: PASS.
- Valeur: **moyenne**.

### `tests/contest-config-runtime.test.ts`
- Prouve: validation de draft (team size, entry fee, distribution rules).
- Ne prouve pas: écriture DB, publish réel via route, impacts lifecycle.
- Résultat: PASS.
- Valeur: **moyenne**.

### `tests/api-internal-contest-score-hardening.test.ts`
- Prouve: garde importId requis + replay idempotency key côté route score.
- Ne prouve pas: ranking réel DB, qualité scoring métier.
- Résultat: PASS.
- Valeur: **moyenne**.

### `tests/settlement-plan-runtime.test.ts`
- Prouve: génération plan (FIXED_RANKS/TOP_N/TOP_PERCENT), overlap detection, preview totals, execute idempotent branch.
- Ne prouve pas: DB réelle, distribution rewards en base réelle.
- Résultat: PASS.
- Valeur: **forte** sur logique pure, **moyenne** sur intégration.

### `tests/api-internal-contest-settlement-plan-routes.test.ts`
- Prouve: contrats routes generate/get/preview/execute + clé idempotence requise.
- Ne prouve pas: side effects DB réels.
- Résultat: PASS.
- Valeur: **moyenne**.

### `tests/admin-contest-main-flow-contract.test.ts`
- Prouve: enchaînement contractuel admin principal.
- Ne prouve pas: vérité métier/DB; tout est mocké.
- Résultat: PASS.
- Valeur: **faible à moyenne** (test de wiring).

## 3. Gaps de couverture
- Pas de test full integration avec PostgreSQL réel pour contest runtime.
- Pas de test e2e API->DB->API pour publish->enter->score->rank->settle.
- Pas de test de consistance lockState/release lock après settlement.
- Pas de test de concurrence réelle (deux writes simultanés).
- Pas de test de snapshotting START/END (car feature absente).
- Pas de test scoring token-based (car feature absente).
- Peu de tests de mismatch UI/API/DB observé via navigation réelle browser+API.

## 4. Nouveaux tests ajoutés

### `tests/contest-runtime-stateful-flow.test.ts`
- Objectif: prouver dynamiquement le comportement runtime core sur un état mutable (avant/après).
- Scénarios:
  1. Entry crée `ContestEntry` + `RosterLock` + lockState, rejette re-entry et ownership invalide.
  2. Re-import scoring régénère ranking et met à jour ordre/rangs; score rejeté en status OPEN.
  3. Settlement legacy crée settlement/grants, crédite points, passe statuses à SETTLED, bloque seconde settlement.
- Pourquoi nécessaire: combler le gap entre tests route mockés et logique métier réelle (state transitions).
- Résultat: PASS (3/3).
- Ce que ça prouve: invariants runtime principaux tiennent sur exécution concrète stateful.

## 5. Vérification réelle du flow contest end-to-end
- Création contest: **partiel** (prouvé via tests contract/config mockés, pas DB réelle).
- Publish: **partiel** (contrat validé, pas observation DB live).
- Entry user: **prouvé (niveau runtime stateful)** via nouveau test.
- Lock roster: **prouvé (runtime stateful)** via création locks + lockState.
- Scoring import: **prouvé (runtime + route hardening)**.
- Ranking: **prouvé (runtime stateful)** via re-génération ordonnée après reimport.
- Settlement: **prouvé partiel** (legacy runtime stateful + settlement-plan logique via tests existants).
- Rewards: **prouvé partiel** (grants/points incrémentés en stateful; pas DB réelle).

## 6. Vérification DB / invariants
- Unicité entry contest+user: **testé** (re-entry rejetée) → confiance **moyenne**.
- Unicité settlement contest: **testé** (double settlement rejetée) → confiance **moyenne**.
- Cohérence ranking après reimport: **testé** (ordre mis à jour) → confiance **moyenne+**.
- Replay scoring: **testé partiel** (idempotency key replay route) → confiance **moyenne**.
- Double settlement: **testé** runtime + execute-plan idempotent branch → confiance **moyenne**.
- Locks cartes: **testé** (création/ownership + conflit de possession) → confiance **moyenne**.
- Status invalide scoring: **testé** (OPEN rejeté) → confiance **moyenne+**.
- User non éligible/ownership faux: **testé ownership**, éligibilité cardSet non couverte dynamiquement → confiance **partielle**.
- Payload scoring user inconnu/non inscrit/doublon/trous: **testé partiel** via route validation existante (non ajouté ici en stateful).

## 7. Vérification de l’idempotence réelle
- Même payload scoring + même key: **replay rejeté** (route hardening test).
- Même payload scoring + autre key: **non prouvé en DB réelle** (gap).
- Re-run settlement plan execute: **retour idempotent `executed=false`** couvert par test runtime settlement-plan.
- Re-run legacy settle: **rejeté** (test stateful ajouté).
- Double transition status: **non testé dynamiquement** (reste gap).
- Ré-entrée user déjà locké: **rejetée** (test stateful ajouté).
- Double lock même carte: **couvert partiel** via conflit ownership/active lock dans runtime stateful.
- Concurrence simulée: **non testée**.

## 8. Vérification du scoring réel
- Conclusion prouvée: le repo **ne calcule pas** un score métier token-based; il persiste un score importé puis classe.
- Preuves:
  - signature scoring validate/execute attend des rows userId/score,
  - runtime `recordContestScoresMvp` ne fait que upsert score + tri.
- Logique cachée: recherche précédente + exécution tests pertinents ne révèle pas de moteur alternatif actif.
- UX potentiellement trompeuse: wording “live scores” côté UI, alors que backend dépend d’import opérateur.

## 9. Vérification snapshotting / before-after
- Snapshot START: **absent** (code + schéma).
- Snapshot END: **absent**.
- Token metrics historisées: **absent**.
- Score par token: **absent**.
- Agrégation token->team->user: **absent**.
- Formula versioning scoring: **absent** (hors `AUTO_POLICY_V1` pour settlement-plan source).
- Recherche side effects via routes/jobs/seeds: rien trouvé qui crée ces snapshots indirectement.

## 10. Vérification UI / API / DB
- UI scoring admin exécute un import manuel (`rows userId,score`) puis execute.
- API applique strictement ce payload; DB cible `ContestScore`/`ContestRanking`.
- Mismatch concret: UI narratif “live tracking” vs réalité API opérateur-driven import.
- “settled” côté UI admin correspond bien à exécution settlement (legacy ou plan), mais pas à un calcul token natif.

## 11. Vérification des cas limites et erreurs
- Testés explicitement (dynamiques):
  - re-entry même user,
  - ownership cartes faux,
  - scoring status invalide,
  - double settlement.
- Testés via existants:
  - import scoring sans importId,
  - replay idempotency key,
  - top-percent/overlap distribution rules,
  - exécution settlement-plan sans clé idempotence.
- Non testés dynamiquement dans cette phase:
  - contest non publié côté user API avec DB réelle,
  - settlement sans ranking en DB réelle,
  - transitions incohérentes avec observation persistante réelle.

## 12. Vérification du niveau de mock vs réalité
- Majorité des tests existants: **mock-heavy** (route contracts, service calls).
- Nouveau test ajouté: **stateful runtime simulation** (plus proche métier, mais encore sans DB PostgreSQL réelle).
- Faux sentiment de couverture actuel:
  - routes admin bien testées contractuellement,
  - mais pas de preuve intégration full stack Next+Prisma+Postgres.

## 13. Matrice de confiance finale
- config contest: couverture **moyenne**, preuve dynamique **partielle**, risque **moyen**, confiance **moyenne**.
- publish: couverture **moyenne**, preuve **partielle**, risque **moyen**, confiance **moyenne-**.
- entry: couverture **moyenne+**, preuve **oui (stateful)**, risque **moyen**, confiance **moyenne+**.
- roster lock: couverture **moyenne**, preuve **oui (stateful)**, risque **moyen**, confiance **moyenne**.
- scoring import: couverture **moyenne+**, preuve **oui**, risque **élevé produit** (manual), confiance **moyenne**.
- ranking: couverture **moyenne+**, preuve **oui reimport**, risque **moyen**, confiance **moyenne+**.
- settlement legacy: couverture **moyenne**, preuve **oui stateful**, risque **moyen**, confiance **moyenne**.
- settlement plan: couverture **moyenne+**, preuve **oui logique + routes**, risque **moyen**, confiance **moyenne+**.
- reward grants: couverture **moyenne**, preuve **partielle**, risque **moyen**, confiance **moyenne-**.
- idempotence: couverture **partielle**, preuve **partielle**, risque **élevé** si concurrence réelle, confiance **moyenne-**.
- UI/API coherence: couverture **faible**, preuve **partielle**, risque **moyen**, confiance **faible+**.
- scoring token-based: couverture **N/A**, preuve **absence**, risque **bloquant produit**, confiance **élevée sur l’absence**.
- snapshotting: couverture **N/A**, preuve **absence**, risque **bloquant produit**, confiance **élevée sur l’absence**.

## 14. Liste des vérités prouvées
- Entry crée bien entry+locks+lockState.
- Re-entry même user est bloquée.
- Ownership invalide est bloquée.
- Scoring en OPEN est bloqué.
- Re-import scoring régénère le ranking et peut inverser les positions.
- Settlement legacy crédite points, crée grants, met contest/entries en SETTLED.
- Double settlement legacy est bloquée.
- Settlement-plan execute exige idempotency key et possède une branche idempotente.
- Le score métier n’est pas calculé token-side dans ce repo; il est importé.

## 15. Liste des zones encore inconnues
- Comportement exact sous concurrence réelle PostgreSQL (transactions concurrentes).
- Comportement full integration des routes user/admin sur DB réelle provisionnée.
- Effets secondaires cross-modules (progression, ledger complet) en scénario intégré long.

## 16. Recommandations de tests supplémentaires
- Ajouter une suite d’intégration Prisma/PostgreSQL (docker test DB) pour:
  - create/publish/enter/score/settle end-to-end,
  - assertions DB avant/après chaque étape.
- Ajouter tests de concurrence (2 requêtes score/settle simultanées).
- Ajouter tests d’éligibilité cardSet réels avec fixtures multi-cardSet.
- Ajouter tests transitions status invalides en full API+DB.
- Introduire fixtures canon contest minimal pour réduire le coût des scénarios intégrés.

## Canon de vérité recommandé après vérification dynamique
- **Source de vérité actuelle du score**: `ContestScore` alimenté par import admin.
- **Source de vérité actuelle du ranking**: `ContestRanking` recalculé depuis `ContestScore`.
- **Source de vérité actuelle du settlement**: `ContestSettlement` + (optionnel) `ContestSettlementPlan` exécuté.
- **Source de vérité actuelle des rewards**: `RewardGrant` (+ update points/xp selon type).
- **Canon cible après refonte**:
  - snapshots start/end token metrics,
  - scoring run versionné et idempotent,
  - breakdown token->team->user persistant,
  - ranking dérivé de ce scoring canonique,
  - settlement strictement dérivé du ranking canonique.
