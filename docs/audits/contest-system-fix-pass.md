# Contest System Fix Pass

## Scope
This pass focuses on reliability and automation of the contest lifecycle, especially at critical boundaries:
- CoinGecko snapshot capture behavior at lifecycle transition time.
- Automatic settlement execution after scoring.
- Card lock cleanup after settlement execution.
- Coverage updates for lifecycle + admin transition routes + settlement runtime.

## Problèmes identifiés
1. **Snapshot CoinGecko permissif en cas d’échec**
   - Le snapshot pouvait continuer avec des données nulles en cas d’échec CoinGecko, ce qui autorisait des transitions malgré une donnée marché indisponible.
2. **Settle non entièrement automatisé dans le pipeline lifecycle**
   - Le pipeline faisait snapshot END + scoring, mais le settlement policy pouvait rester manuel selon le chemin.
3. **Risque de lockState persistant côté instance**
   - Les cartes étaient logiquement “libres” via statut contest, mais le champ `OwnedCardInstance.lockState` n’était pas explicitement purgé à l’exécution du settlement plan.

## Corrections appliquées
1. **Fail-fast CoinGecko sur snapshot**
   - Le runtime snapshot lève désormais une erreur `ContestRuntimeError` (503) si CoinGecko échoue, au lieu de fallback silencieux.
   - Effet: la transition lifecycle reste bloquée tant que le snapshot n’est pas réellement capturé.

2. **Settlement auto branché au lifecycle**
   - Ajout d’un helper `executeAutoSettlementForContest(contestId)` dans le runtime settlement plan.
   - Intégration de ce helper dans:
     - la reconciliation automatique par temps (`OPEN/LOCKED/LIVE -> SETTLED`)
     - la route admin de transition de statut vers `SETTLED`
   - Effet: un contest qui atteint la fin suit snapshot END → scoring → settlement automatiquement (idempotent si déjà settlé).

3. **Purge explicite du `lockState` à l’exécution du settlement**
   - Dans `executeSettlementPlan`, ajout d’un `updateMany` sur `OwnedCardInstance` pour remettre `lockState = null` pour toutes les cartes liées au contest concerné.
   - Effet: suppression explicite de tout lock résiduel applicatif après settlement.

## Tests ajoutés / mis à jour
- `tests/contest-snapshot-runtime-edgecases.test.ts`
  - Met à jour le comportement attendu: échec CoinGecko => erreur bloquante (plus de fallback silencieux).
- `tests/contest-lifecycle-reconciliation.test.ts`
  - Vérifie que la phase de transition vers `SETTLED` déclenche aussi l’auto-settlement.
- `tests/api-internal-contest-status-auto-trigger.test.ts`
  - Vérifie que la transition admin vers `SETTLED` déclenche aussi l’auto-settlement.
- `tests/settlement-plan-runtime.test.ts`
  - Ajoute une assertion sur la purge `lockState` lors de `executeSettlementPlan`.

## Risques restants
1. **Race conditions inter-workers**
   - La logique est idempotente mais des workers concurrents peuvent encore générer du bruit opérationnel (retries, conflits), à monitorer côté observabilité.
2. **Dépendance CoinGecko stricte**
   - Le mode fail-fast est cohérent produit mais augmente la sensibilité à l’indisponibilité fournisseur; prévoir runbooks opérateur.
3. **Chemins legacy manuels existants**
   - Certains endpoints/outils manuels demeurent et doivent rester alignés avec la voie canonique auto pour éviter les divergences futures.

## Verdict final
Pass orienté robustesse validé:
- Transitions critiques protégées (pas de fallback snapshot silencieux).
- Chaîne de fin de contest automatisée jusqu’au settlement.
- Nettoyage explicite des locks cartes au settlement.
- Tests ajustés pour refléter les invariants produit demandés.
