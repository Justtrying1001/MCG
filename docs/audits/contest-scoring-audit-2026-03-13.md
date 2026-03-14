# AUDIT CONTEST / SCORING

## 1. Executive summary
- Le repo implémente un flow **contest entry + scoring manuel + ranking + settlement** piloté par APIs/admin UI.
- Le scoring existant est un **import de scores déjà calculés** (`userId`, `score`) puis tri décroissant pour générer `ContestRanking`.
- Le settlement existe en 2 voies:
  - legacy manuel (plan artefact -> execute)
  - phase 2 policy-based (generate settlement plan from ranking + reward policy -> execute plan).
- Le système **ne capture pas de snapshot START/END de métriques token**. Il n’existe pas de table dédiée à des métriques token temporalisées, ni de job auto de capture start/end.
- Conclusion: le flow cible complet `snapshot début -> snapshot fin -> comparaison -> score token -> agrégation équipe -> classement -> settlement` **n’existe pas**. Seules les étapes `classement` (à partir de scores importés) et `settlement` (récompenses) sont réellement implémentées.

## 2. Cartographie complète du repo concerné

### Docs
- `docs/product-guide.md`: état produit officiel (contests, dépendance admin pour scoring/settlement). Statut: **utilisé**.
- `docs/technical.md`: cartographie architecture; cite modules contests runtime/config/settlement plan. Statut: **utilisé**.
- `docs/contest-system-audit-refonte.md`: audit UX/frontend et contrat API frontend. Statut: **partiel (UX-centric, pas canon scoring)**.
- `docs/archive/**`: historique legacy, explicitement archive/snapshot. Statut: **legacy**.

### Prisma schema + migrations
- `prisma/schema.prisma`: modèles contests/scoring/ranking/settlement/reward policy/settlement plan. Statut: **utilisé**.
- `prisma/migrations/20260312114000_contest_config_phase1/migration.sql`: ajout config contest + reward policy. Statut: **utilisé**.
- `prisma/migrations/20260312132000_contest_settlement_plan_phase2/migration.sql`: ajout settlement plan + items + status. Statut: **utilisé**.

### API routes
- User:
  - `app/api/contests/route.ts`
  - `app/api/contests/[contestId]/route.ts`
  - `app/api/contests/[contestId]/lineup-options/route.ts`
  - `app/api/contests/[contestId]/enter/route.ts`
  - `app/api/contests/[contestId]/ranking/route.ts`
- Internal legacy ops:
  - `app/api/internal/contests/[contestId]/status/route.ts`
  - `app/api/internal/contests/[contestId]/score/route.ts`
  - `app/api/internal/contests/[contestId]/settle/route.ts`
- Internal run-workbench:
  - `app/api/internal/contest-runs/[contestId]/overview/route.ts`
  - `.../transitions/validate/route.ts`
  - `.../scoring/validate/route.ts`
  - `.../scoring/preview/[importId]/route.ts`
  - `.../settlement-plan/generate/route.ts`
  - `.../settlement-plan/[planId]/preview/route.ts`
  - `.../settlement-plan/[planId]/execute/route.ts`
  - `.../settlement/plan/validate/route.ts` (manual legacy)
  - `.../settlement/preview/[planId]/route.ts` (manual legacy)
- Internal config:
  - `app/api/internal/contest-configs/**`.

### Services / domain
- `lib/domain/contests/runtime.ts`: entry validation/lock, scoring import persist, ranking rebuild, legacy settlement execute.
- `lib/domain/contests/config-runtime.ts`: contest draft/create/update/validate/publish.
- `lib/domain/contests/settlement-plan-runtime.ts`: génération plan depuis ranking+policy, preview, execute.
- `lib/admin/contest-workbench.ts`: helpers UI (parse scoring, transitions, progress).

### Jobs / workers / cron
- Aucun module contest dédié de type worker/cron détecté. L’orchestration est API-driven via actions admin manuelles.

### UI admin liée contest
- `app/admin/(protected)/contests/page.tsx`: catalog + publish/unpublish/archive/delete.
- `app/admin/(protected)/contests/create/page.tsx`: wizard config contest.
- `app/admin/(protected)/contests/[contestId]/page.tsx`: overview run.
- `app/admin/(protected)/contests/[contestId]/lifecycle/page.tsx`: validate/execute transition.
- `app/admin/(protected)/contests/[contestId]/scoring/page.tsx`: validate/preview/execute scoring import.
- `app/admin/(protected)/contests/[contestId]/settlement/page.tsx`: plan generate/preview/execute (phase 2).
- `app/admin/(protected)/contests/legacy/**`: flow legacy scoring/settlement manuel.

### UI user liée contest
- `app/contests/page.tsx`: listing active/settled.
- `app/contests/[contestId]/page.tsx`: detail, lineup build, submit entry, leaderboard.
- `components/contests/**`: briques UI (status, countdown, leaderboard, lineup modals).

### Tests
- Domain: `tests/contest-entry-fee-runtime.test.ts`, `tests/settlement-plan-runtime.test.ts`, `tests/contest-config-runtime.test.ts`.
- API internal: `tests/api-internal-contest-score-hardening.test.ts`, `tests/api-internal-contest-settlement-plan-routes.test.ts`, `tests/api-internal-contest-overview-route.test.ts`, `tests/api-internal-contest-configs-routes.test.ts`.
- Admin flow contract: `tests/admin-contest-main-flow-contract.test.ts`.

## 3. Modèle de données réel

### Entités trouvées
- `Contest`: méta lifecycle (`status`, `startsAt/lockAt/endsAt`, `configPublishedAt`).
- `ContestRule`: team-size, eligibility, entry fee.
- `ContestEntry`: inscription user (unique user/contest) + status.
- `RosterLock`: verrou card instances pour une entry.
- `ContestScore`: score final par user/contest (`score`, `scoredAt`).
- `ContestRanking`: rang + score par user/contest.
- `ContestSettlement`: marqueur settlement contest (unique contest).
- `ContestRewardPolicy` / `ContestRewardBundle` / `ContestRewardComponent` / `ContestRewardDistributionRule`: configuration rewards.
- `ContestSettlementPlan` / `ContestSettlementPlanItem`: snapshot policy/ranking-size + rewards résolus par rang.
- `RewardGrant`: persistance des attributions rewards (liée à settlement via `sourceContestSettlementId`).

### Vérifications explicites
- Snapshot START: **NON**.
- Snapshot END: **NON**.
- Table de résultats calculés: **PARTIEL** (`ContestScore`, `ContestRanking` existent, mais pas de décomposition token ni before/after).
- Idempotence settlement: **OUI PARTIEL** (idempotency key route-level + guard `ContestSettlement` unique + `executeSettlementPlan` retourne `executed=false` si déjà exécuté).
- Version de formule stockée: **PARTIEL** (pas de version scoring; seulement `ContestSettlementPlan.source = AUTO_POLICY_V1` pour dérivation reward plan).

## 4. Flow métier réel aujourd’hui
1) Création contest
- Implémenté via `contest-configs` (draft) et legacy create direct.
- Réel: admin crée draft + règles + reward policy.

2) Publication / activation
- `publishContest` pose `configPublishedAt` et force `status=OPEN`.

3) Inscription user
- `enterContestMvp` valide fenêtre/status/propriété cartes, crée `ContestEntry` et `RosterLock`.

4) Sélection d’équipe
- UI user charge options via `/lineup-options` puis submit `/enter`.

5) Lock team
- lock implicite à l’entrée: `ContestEntry.status=LOCKED`, `RosterLock` rows, `OwnedCardInstance.lockState` mis à jour.

6) Début contest
- Pas de capture auto; passage d’état via transitions admin.

7) Capture éventuelle des données
- Scoring: upload/import manuel d’un score agrégé final par user.

8) Fin contest
- Passage vers SETTLED conditionné par rankings + settlement.

9) Calcul éventuel
- Calcul interne limité: tri des scores importés pour ranking; aucune comparaison start/end token.

10) Settlement
- Legacy manuel: validation rows rewards -> execute.
- Phase2 policy: generate plan from `ContestRanking` + reward policy, preview, execute.

11) Distribution rewards
- Création `RewardGrant` et crédit points/XP (packs via grants).

12) Affichage résultats
- User: `/api/contests/:id/ranking` + panel leaderboard.
- Admin: overview/scoring/settlement/audit pages.

## 5. Analyse détaillée du scoring
- Où vit la logique:
  - `recordContestScoresMvp` (runtime) + routes validate/preview/execute.
- Données consommées:
  - Import rows `{userId, score}` validées contre users entrés.
- Granularité:
  - **par user/entry**, pas par token, pas par équipe décomposée.
- Compare avant/après:
  - Non pour métriques business; preview compare seulement top-rank movement avant/après import.
- Déterminisme:
  - Oui pour ranking (tri `score desc`, tie-break `userId asc`).
- Versioning:
  - Aucune version de formule scoring persistée.
- Dépendance externe:
  - Le calcul de score est externalisé hors repo (repo reçoit un score déjà calculé).
- Usage réel:
  - Oui, branché dans UI admin scoring workbench + route execute.

Logiques concurrentes:
- Legacy scoring/settlement manuel (`/api/internal/contests/:id/score` + `/settle`).
- Nouveau settlement plan policy-based (`/contest-runs/.../settlement-plan/*`).
- Canonique actuelle: settlement-plan policy-based pour contests publishés avec policy; legacy conservé pour anciens cas.

## 6. Snapshotting / capture des données
- Capture début contest: **NON**.
- Capture fin contest: **NON**.
- Métriques stockées: **PARTIEL** (`ContestScore` final, `ContestRanking` final, `policySnapshot` config reward, `rankingSnapshotSize`).
- Granularité: **USER/CONTEST**, pas token-level.
- Forme: scores/ranks numériques + JSON reward components.
- Source de vérité: scoring import artefact admin (`contest_scoring_import`) puis DB.
- Timestamp: `scoredAt`, `rankedAt`, `settledAt`, `generatedAt/executedAt`.
- Stratégie en cas échec source externe: **NON implémentée** côté métriques token; validations bloquent simplement payload invalide.
- Recalculable a posteriori: **PARTIEL** (ranking depuis `ContestScore`; settlement plan régénérable depuis ranking/policy; impossible de recalculer score business sans snapshots start/end token).

## 7. Sources de données et intégrations externes
- Prix / market cap / volume / social metrics:
  - **Aucune ingestion scoring trouvée** dans domaine contest.
- Sources utilisées réellement:
  - DB interne (`ContestEntry`, `ContestScore`, `ContestRanking`, reward policy).
  - Input admin manuel pour scores et (legacy) rewards.
- Fiabilité:
  - Dépend du process opérateur + validations syntaxiques.
- Mock/stub/TODO:
  - Pas de connecteur scoring externe actif.
- Persistée:
  - Oui pour scores/rankings/plan/reward grants.
- Sert score final vs affichage:
  - `ContestScore`/`ContestRanking` servent le score final affiché; preview admin est auxiliaire.

## 8. API et orchestration
- Start contest: **indirect** via transition validate + status execute.
- Close contest: **indirect** via status transitions.
- Lock roster: **à l’entry** (pas endpoint lock séparé user).
- Capture snapshot: **absent**.
- Calculate score: **import manuel + ranking rebuild**.
- Settle contest: **oui** (legacy manuel + plan-based execute).
- Fetch leaderboard/results: **oui** (`GET /api/contests/:id/ranking`, internal overview/detail).

Usage UI réel:
- UI admin moderne utilise `contest-runs/*` (validate/preview/generate/execute).
- UI legacy utilise `internal/contests/:id/score` et `.../settle` avec validations `contest-runs/.../settlement/plan/validate`.

## 9. UI admin / UI user

### Admin
- Catalog + actions publication/archivage: branché backend.
- Create/edit draft: branché `contest-configs`.
- Lifecycle run: branché transition validate/execute.
- Scoring workbench: branché validate -> preview -> execute.
- Settlement workbench: branché generate plan -> preview -> execute.
- Legacy pages: encore branchées, explicitement fallback.

### User
- Listing contests: branché `/api/contests`.
- Contest detail/team selection: branché detail+lineup-options+enter.
- Verrouillage: implicite après submit.
- Live status/score/leaderboard: branché via ranking endpoint.
- Settlement results: affichage du rank/score, pas de breakdown rewards détaillé par contest dans ce flux.

Incohérences front/back notables:
- UX parle de “track scores live”, mais backend n’expose pas moteur live auto; dépend d’import admin.
- “Result snapshot” UI existe, mais sans snapshot métier start/end token.

## 10. Tests et niveau de confiance
- Unit/domain: validation config, entry fee runtime, settlement plan runtime.
- API integration-like (mocked): score hardening, settlement-plan routes, contest config routes, main flow contract.
- E2E réel DB/external: non vu.

Couverture explicite:
- Formule de score token: **NON**.
- Snapshots start/end: **NON**.
- Lifecycle contest: **PARTIEL** (routes + transitions validation).
- Lock team: **PARTIEL** (runtime logic covered indirectly).
- Settlement: **OUI PARTIEL** (plan runtime + routes).
- Rewards post-contest: **PARTIEL** (grants/credits via settlement tests mock).
- Idempotence: **PARTIEL** (tests route-level replay + runtime execute idempotent branch).

Niveau de confiance global:
- Moyen pour workflow opérateur admin (validate/preview/execute).
- Faible pour exactitude métier scoring cible (absence moteur/snapshots).

## 11. Bugs, trous et incohérences

### Bloquant
- Absence totale de snapshot start/end token metrics.
- Absence de calcul de score token avant/après dans le backend.

### Élevé
- Scoring dépend d’un import manuel externe non traçable côté formule/version.
- Pas d’idempotence métier forte pour recalcul scoring (upsert score écrase sans version run).
- Pas de preuve de freeze roster à timestamp lock global (lock à l’entrée, mais pas event lock contest-wide).

### Moyen
- Double stack legacy + nouvelle stack settlement (complexité opérationnelle).
- UI messaging “live scoring” potentiellement trompeur vs process manuel.

### Faible
- Documentation mixte (active + archives), risque de confusion si mauvaise source consultée.

## 12. Gap analysis vs objectif cible
- Snapshot début: **Non** | où: N/A | remarque: aucune entité dédiée.
- Snapshot fin: **Non** | où: N/A | remarque: aucune capture finale token metrics.
- Comparaison token start/end: **Non** | où: N/A | remarque: logique absente.
- Calcul score token: **Non** | où: N/A | remarque: score importé déjà calculé.
- Agrégation équipe/participant: **Partiel** | où: score par user + ranking | remarque: pas de contribution par token.
- Classement final: **Oui** | où: `ContestRanking` | remarque: tri score desc.
- Settlement: **Oui** | où: legacy + plan runtime | remarque: rewards distribués.
- Idempotence settlement: **Partiel/Oui** | où: idempotency key + guard settlement unique | remarque: bonne base, pas versionnement scoring.

## 13. Plan de correction recommandé
1. **Choisir un point de vérité canonique scoring**
   - Introduire service unique `contest-scoring-engine` interne (pas import de score final brut).
2. **Ajouter persistence snapshots robustes**
   - `ContestMetricSnapshot` (contestId, phase START/END, capturedAt, source, payload hash, status).
   - `ContestTokenMetricSnapshot` (snapshotId, tokenId, métriques normalisées).
3. **Versionner la formule**
   - table `ContestScoringFormula` + `formulaVersion` référencé par run/snapshot.
4. **Introduire run idempotent**
   - `ContestScoringRun` (unique contestId+formulaVersion+snapshotStartId+snapshotEndId), statut et checksums.
5. **Calcul explicite token -> équipe -> user**
   - persister `ContestTokenScore` puis `ContestEntryScoreBreakdown`.
6. **Unifier orchestration admin**
   - conserver `validate/preview/execute`, retirer progressivement voie legacy manuelle.
7. **Automatiser lifecycle time-based (optionnel phase 2)**
   - job/cron pour déclencher capture START/END selon schedule.
8. **Tests prioritaires**
   - unit formule versionnée, intégration snapshot start/end, idempotence scoring run, settlement idempotent DB, non-régression UI/API.
9. **Rebrancher UI**
   - exposer breakdown par token, provenance snapshot, version formule, et auditability.
