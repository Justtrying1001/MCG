# Contest Canonicalization Pass — 2026-03-14

## Scope
- Canonicalisation du lock model côté API/UI.
- Canonicalisation du pipeline contest (snapshot -> scoring engine -> settlement plan/execute).
- Dépréciation explicite des chemins legacy scoring/settlement.
- Dépréciation des pages admin legacy contest.
- Renforcement UX minimal (leaderboard usernames, settled rewards panel).

## Correctif Lock Model
- La source métier du lock reste `RosterLock + Contest.status in [OPEN, LOCKED, LIVE]`.
- L'API lineup options expose désormais `isLockedByActiveContest` dérivé de la relation active.
- Le frontend Team Builder/Card Selector s'appuie sur `isLockedByActiveContest` pour l'état disabled.
- `lockState` reste présent en compatibilité, mais n'est plus utilisé comme vérité de lock pour l'action utilisateur.

## Pipeline Canonique Clarifié
### Canonique
- Lifecycle auto via reconciliation temporelle.
- Snapshot START/END via runtime snapshot.
- Scoring via `computeContestScoresFromSnapshots`.
- Settlement auto policy via `executeAutoSettlementForContest`.

### Legacy retiré du flow normal
- `/api/internal/contests/[contestId]/score` => 410 (deprecated).
- `/api/internal/contests/[contestId]/settle` => 410 (deprecated).
- Pages `/admin/contests/legacy/*` redirigées vers les pages canonique admin.

## UX minimale
- Leaderboard user-facing affiche `displayName` puis `@xUsername` puis fallback userId tronqué.
- Result panel SETTLED affiche les rewards réels de l'utilisateur (quand présents) + rappel cartes libérées.

## Scheduler
- Ajout d'un scheduler in-process optionnel (`ENABLE_CONTEST_LIFECYCLE_SCHEDULER=1`) qui exécute périodiquement la reconciliation temporelle.
- Objectif: ne plus dépendre uniquement de requêtes HTTP utilisateur/admin pour faire avancer le lifecycle.

## Tests ajoutés / mis à jour
- `tests/api-contest-lineup-options-locks.test.ts`
- `tests/api-internal-contest-legacy-routes-deprecated.test.ts`
- `tests/contest-lifecycle-scheduler.test.ts`
- `tests/contest-leaderboard-usernames.test.ts`
- `tests/api-internal-contest-score-hardening.test.ts` (adapté à la dépréciation route legacy)

## Risques restants / différés
- `recordContestScoresMvp` et `settleContestMvp` existent encore en runtime pour compatibilité tests/ancien outillage, mais ne font plus partie du flow normal exposé.
- Le scheduler in-process dépend du mode de déploiement (multi-workers/serverless) et doit être piloté explicitement par variable d'environnement.
- Une suppression complète des artefacts legacy runtime peut être faite en passe ultérieure dédiée (avec migration de tests historiques).
