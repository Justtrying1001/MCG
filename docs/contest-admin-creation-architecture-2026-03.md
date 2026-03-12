# MCG Contest Admin Creation Architecture

## 1. Executive summary

### 1.1 Problem being solved
Le système actuel permet d’opérer des contests MVP, mais pas de **configurer proprement un contest produit** depuis l’admin. L’architecture cible doit transformer la création en un modèle canonique explicite (entry policy, team policy, lifecycle policy, reward policy + distribution), puis relier ce modèle au runtime d’exécution (entries, scoring, settlement).

### 1.2 Why current model is insufficient
L’audit `docs/contest-admin-creation-audit-2026-03.md` établit que le setup est trop technique (legacy form + JSON brut), incomplet (pas d’entry fee, pas de payout model) et trop manuel (settlement row-by-row), ce qui crée un risque ops élevé et une faible scalabilité.

### 1.3 Target outcome
Un admin doit pouvoir:
1. Créer un contest en brouillon avec un modèle produit clair.
2. Configurer explicitement les règles d’entrée/équipe/éligibilité/rewards.
3. Valider/prévisualiser la configuration avant publication.
4. Générer un settlement plan depuis ranking + policy (avec override contrôlé), sans dépendre d’une saisie brute user-by-user.

---

## 2. Product goals and non-goals

### 2.1 Product goals
- Configuration contest claire et non ambiguë.
- Paramétrage rewards et distribution **dès la création**.
- Support MVP explicite de l’entry fee points.
- Base extensible (3/5/7, top N/top %, tiers) sans sur-ingénierie.

### 2.2 Admin ops goals
- Réduire erreurs humaines (guidage + validations métier).
- Rendre les opérations auditables/reproductibles.
- Découpler setup (design) et run (exécution scoring/settlement).

### 2.3 MVP scope
- Contest draft -> publish.
- Lifecycle policy explicite (entry opens/closes + endsAt).
- Entry fee points (enabled + amount).
- Team policy en `EXACT` (MVP: 5 par défaut, 3/7 autorisables).
- Eligibility basique par `cardSetId` optionnel.
- Reward policy avec distribution en:
  - fixed ranks,
  - top N,
  - top %.
- Settlement plan auto-généré depuis ranking + reward policy.

### 2.4 Explicit non-goals
- Pas de moteur financier multi-currency complet.
- Pas de dynamic pricing d’entry fee.
- Pas d’orchestration no-code multi-campaign complexe.
- Pas de système anti-fraude scoring avancé dans cette phase.

---

## 3. Target contest setup model

### 3.1 Contest basics
- `code` (unique)
- `title`
- `description` (optionnel)
- `lifecycleState` (`DRAFT`, `PUBLISHED`, puis états run existants)
- `mode` (optionnel, ex: `STANDARD` pour extensibilité)

### 3.2 Lifecycle policy
- `entryOpensAt`
- `entryClosesAt` (lockAt)
- `endsAt`
- Option UX: `durationMinutes` autorisée en saisie, mais **canonique persisté = timestamps**.
- Invariants:
  - `entryOpensAt < entryClosesAt <= endsAt`
  - un contest publié ne peut pas avoir des timestamps invalides.

### 3.3 Entry policy
- `entryFeeEnabled: boolean`
- `entryFeeCurrency: POINTS` (MVP fixe)
- `entryFeeAmount: Int?` (obligatoire si enabled)
- `insufficientFundsBehavior` (MVP: reject avec erreur explicite)

### 3.4 Team policy
- `teamSizeMode: EXACT` (MVP)
- `teamSizeValue: Int` (MVP default 5, accepter 3/5/7)
- Préparer extension future:
  - `MIN_MAX` avec `minTeamSize`, `maxTeamSize` (non activé MVP)

### 3.5 Eligibility policy
- `cardSetId: String?`
- `eligibilityMode: ANY | CARD_SET_ONLY` (MVP simple)
- Conserver comportement runtime existant (ownership + locks + cardSet filtering).

### 3.6 Reward policy
- Les rewards sont attachées au contest dès le setup.
- Composants supportés MVP:
  - `POINTS`
  - `PACK`
  - `XP`
- Un reward “bundle” = liste de composants.
  - Ex: rang 1 => `{POINTS:500} + {PACK:mvp_reward_pack, qty:2}`

### 3.7 Distribution policy
Distribution via règles explicites ordonnées:
- `FIXED_RANKS`: ex. rank 1, rank 2, rank 3
- `TOP_N`: ex. top 10
- `TOP_PERCENT`: ex. top 25%

Recommandation canonique:
- Une table de `RewardDistributionRule` avec:
  - `ruleType`
  - `priority`
  - cible (`rankFrom/rankTo` ou `topN` ou `topPercent`)
  - `rewardBundleId`
  - `stackMode` (`EXCLUSIVE` MVP)

`EXCLUSIVE` MVP signifie: un user reçoit le premier rule matché (priority ascendante), évitant superpositions ambiguës.

---

## 4. Proposed data model architecture

### 4.1 What should remain in Contest
Conserver dans `Contest`:
- identité (`id`, `code`, `title`, `description`)
- statut run (`status`)
- timestamps canoniques (`startsAt`, `lockAt`, `endsAt`)
- relations run (`entries`, `scores`, `rankings`, `settlements`)

Ajouter minimalement:
- `setupVersion Int @default(1)`
- `publishedAt DateTime?`

### 4.2 What should remain / change in ContestRule
`ContestRule` actuel est trop générique. Recommandation:
- garder `ContestRule` comme agrégat racine de configuration,
- retirer sa dépendance à `config Json?` comme voie principale,
- ajouter champs structurés:
  - `entryFeeEnabled Boolean`
  - `entryFeeAmount Int?`
  - `entryFeeCurrency String @default("POINTS")`
  - `teamSizeMode String @default("EXACT")`
  - `teamSizeValue Int`
  - `eligibilityMode String @default("ANY")`
  - `cardSetId String?`

`config Json?` peut rester en “escape hatch” temporaire, mais interdit pour les règles MVP canoniques.

### 4.3 New models or sub-models needed
Nouveaux objets recommandés:

1. `ContestRewardPolicy`
- `id`, `contestId` unique
- `status` (`DRAFT|LOCKED`)
- `distributionMode` (`RULES_ENGINE_V1`)

2. `ContestRewardBundle`
- `id`, `rewardPolicyId`, `name`, `priority`

3. `ContestRewardComponent`
- `id`, `bundleId`
- `type` (`POINTS|PACK|XP`)
- `pointsAmount Int?`
- `xpAmount Int?`
- `packDefinitionId String?`
- `packQuantity Int?`

4. `ContestRewardDistributionRule`
- `id`, `rewardPolicyId`, `priority`, `ruleType`
- `rankFrom Int?`, `rankTo Int?`
- `topN Int?`
- `topPercent Float?`
- `bundleId`
- `stackMode` (`EXCLUSIVE` MVP)

5. `ContestSettlementPlan` (persist preview artifacts métier)
- `id`, `contestId`, `policyVersion`, `generatedFromRankingAt`
- `status` (`DRAFT|APPROVED|EXECUTED|CANCELED`)
- `createdBy`

6. `ContestSettlementPlanItem`
- `planId`, `userId`, `rank`
- `sourceRuleId`
- `resolvedBundleId`
- payload résolu (components)

### 4.4 Reward distribution modeling options
Option A — JSON unique dans `ContestRule.config`:
- + rapide
- - faible validation DB, difficile à requêter/auditer

Option B — modèles relationnels dédiés (recommandé):
- + explicite, validable, audit-friendly, migrable
- - plus de tables

**Choix**: Option B, avec surface MVP restreinte pour limiter complexité.

### 4.5 Entry fee modeling
Choix MVP:
- champs dans `ContestRule`.
- débit effectué au `enterContest` si enabled.
- journalisation recommandée via `RewardLedgerEntry` (DEBIT, reason contest entry).

### 4.6 Team policy modeling
Choix MVP:
- `teamSizeMode=EXACT`, `teamSizeValue`.
- autoriser seulement 3/5/7 côté validation create.
- runtime continue d’imposer `lineup.length === teamSizeValue`.

### 4.7 Versioning / future extensibility considerations
- Versionner la policy (`policyVersion`) au publish.
- Interdire modification de policy après publication (ou duplication en nouvelle version).
- Settlement plan stocke `policyVersion` pour reproductibilité.

---

## 5. Proposed runtime architecture

### 5.1 Contest creation runtime
Nouveaux services:
- `createContestDraft(input)`
- `updateContestDraft(contestId, patch)`
- `validateContestDraft(contestId)`
- `publishContest(contestId)`

Principes:
- create/update en DRAFT uniquement,
- publish seulement si validations métier passées,
- à publish: freeze de la policy.

### 5.2 Entry validation runtime
`enterContest` devient:
1. Vérifier fenêtres et status.
2. Vérifier entry fee:
   - si enabled, points >= fee,
   - debit points + ledger entry idempotent.
3. Vérifier lineup/team/eligibility (réutiliser logique existante).
4. Créer entry + roster locks.

### 5.3 Reward-plan derivation runtime
Nouveau service:
- `deriveRewardAssignmentsFromRanking(contestId, policyVersion)`

Sortie:
- liste des users éligibles + bundle résolu + composants.
- attribution déterministe basée sur ranking.

### 5.4 Settlement-plan generation runtime
Nouveau flux:
1. `generateSettlementPlan` (auto depuis ranking + policy)
2. `previewSettlementPlan`
3. `approveSettlementPlan` (optionnel selon gouvernance)
4. `executeSettlementPlan`

Override admin:
- autoriser `manualAdjustments` contrôlés (add/remove component) avec trace audit.

### 5.5 Validation rules and invariants
- Aucun contest publié sans reward policy valide.
- Aucune rule distribution sans bundle valide.
- Interdiction d’ambiguïté en mode `EXCLUSIVE` (règles conflictuelles bloquantes).
- Settlement exécutable une seule fois par contest (conserver contrainte unique).

---

## 6. Proposed API architecture

### 6.1 Admin create/update draft endpoints
- `POST /api/internal/contest-configs` → create draft
- `GET /api/internal/contest-configs/:contestId` → read full config
- `PATCH /api/internal/contest-configs/:contestId` → patch draft sections

### 6.2 Validation / preview endpoints
- `POST /api/internal/contest-configs/:contestId/validate`
- `GET /api/internal/contest-configs/:contestId/preview`
- `POST /api/internal/contest-configs/:contestId/reward-plan/preview`

### 6.3 Publish / activate flow
- `POST /api/internal/contest-configs/:contestId/publish`
- après publish, updates structurantes bloquées.

### 6.4 Settlement-plan preview flow
- `POST /api/internal/contest-runs/:contestId/settlement-plan/generate`
- `GET /api/internal/contest-runs/:contestId/settlement-plan/:planId/preview`
- `POST /api/internal/contest-runs/:contestId/settlement-plan/:planId/execute`

### 6.5 Backward compatibility considerations
- Conserver endpoints actuels status/score/settle pendant migration.
- Mettre `/settle` legacy en mode “deprecated warning” puis soft-block sur nouveaux contests.
- Adapter `createContestMvp` pour rediriger vers create draft minimal pendant transition.

---

## 7. Proposed admin UX architecture

### 7.1 Recommended create flow
Wizard 6 étapes:
1. Basics
2. Timing
3. Entry
4. Team & Eligibility
5. Rewards & Distribution
6. Review & Publish

### 7.2 Suggested wizard/sections
- Chaque étape avec statut (`Complete`, `Needs attention`, `Invalid`).
- Sidebar récap de config en langage produit.
- Page finale “Contest Summary” + warnings bloquants/non bloquants.

### 7.3 What should be explicit in UI
- Règles de timing lisibles (UTC + local preview).
- Entry fee ON/OFF + impact.
- Team size exact (MVP) et formats autorisés.
- Distribution rewards avec exemples en clair:
  - “Rang 1: 500 points + 2 packs”
  - “Top 10: 1 pack”

### 7.4 What should be hidden from admins
- JSON interne.
- IDs techniques non nécessaires (sauf lookup assisté).
- Détails artifacts/idempotency.

### 7.5 How reward distribution should be configured
UI recommandée:
- Builder de règles tabulaire:
  - colonne `Target` (Rank range / Top N / Top %)
  - colonne `Bundle`
  - colonne `Priority`
- Bundle editor:
  - add component (POINTS, PACK, XP)
  - quantités validées.
- Preview auto:
  - simulation sur tailles de leaderboard (ex: 100, 1k) pour vérifier volumes.

---

## 8. Migration strategy from current system

### 8.1 What can be reused
- Contest run core (`entries/scores/rankings/settlements`).
- Guardrails validate/preview/execute existants.
- Admin audit/idempotency infra.

### 8.2 What must be replaced
- Create legacy UI.
- `ContestRule.config` comme axe principal.
- Settlement row-by-row comme mécanisme par défaut.

### 8.3 Migration phases
1. **Data + runtime foundation** (nouveaux modèles + services draft/publish).
2. **New create wizard** branché sur nouveaux endpoints.
3. **Auto settlement plan** branché ranking+policy.
4. **Deprecation legacy create/settle brute**.

### 8.4 Risk mitigation
- Feature flags par route admin.
- Compat layer pour anciens contests (sans reward policy).
- Migrations DB additive d’abord, destructive ensuite.
- Tests golden-path + rollback scripts.

---

## 9. Recommended MVP implementation path

### 9.1 Phase 1
- Étendre data model (`ContestRule` structuré + reward policy tables).
- Ajouter endpoints draft/read/patch/validate/publish.
- Ajouter validation entry/team/timing/reward distribution.

### 9.2 Phase 2
- Implémenter wizard create admin.
- Supprimer dépendance au JSON brut.
- Activer entry fee debit au runtime enter contest.

### 9.3 Phase 3
- Implémenter génération settlement plan depuis ranking+policy.
- Ajouter preview + execute avec override contrôlé.
- Déprécier settlement manuel user-by-user pour contests nouveaux.

---

## 10. Open questions
1. XP doit-il créditer `UserProgression.xp` directement ou passer par un ledger XP dédié?
2. Les packs rewards doivent-ils imposer un catalogue whitelisté par contest?
3. Faut-il autoriser cumul de règles (`stackMode=STACK`) plus tard?
4. Gouvernance: qui peut publish/execute settlement (RBAC fin par module)?
5. Faut-il permettre édition limitée post-publish tant que contest pas OPEN?

---

## 11. File-by-file impact estimate

### Likely to modify
- `prisma/schema.prisma`
- `lib/domain/contests/runtime.ts`
- `app/api/internal/contests/route.ts`
- `app/api/internal/contests/[contestId]/route.ts`
- `app/api/internal/contests/[contestId]/settle/route.ts`
- `app/api/internal/contest-runs/[contestId]/settlement/plan/validate/route.ts`
- `app/admin/(protected)/contests/page.tsx`
- `app/admin/(protected)/contests/legacy/page.tsx` (deprecation path)
- `app/admin/(protected)/contests/[contestId]/settlement/page.tsx`
- `lib/admin/contest-workbench.ts`

### Likely new files
- `app/api/internal/contest-configs/route.ts`
- `app/api/internal/contest-configs/[contestId]/route.ts`
- `app/api/internal/contest-configs/[contestId]/validate/route.ts`
- `app/api/internal/contest-configs/[contestId]/publish/route.ts`
- `lib/domain/contests/config-runtime.ts`
- `lib/domain/contests/reward-policy-runtime.ts`
- `app/admin/(protected)/contests/create/page.tsx`

### Tests to add
- `tests/contest-config-runtime.test.ts`
- `tests/api-internal-contest-configs-route.test.ts`
- `tests/api-internal-contest-publish-route.test.ts`
- `tests/contest-settlement-plan-derivation.test.ts`
- `tests/api-internal-contest-settlement-plan-generate.test.ts`

---

## Recommended canonical solution (final choice)
La solution retenue est:
1. **Contest setup canonique structuré** (pas JSON libre) porté par `ContestRule` enrichi + `ContestRewardPolicy` relationnelle.
2. **Flow draft/validate/publish** obligatoire avant run.
3. **Entry fee points** natif dans la policy d’entrée.
4. **Team policy explicite** (`EXACT` MVP, 3/5/7 ready).
5. **Reward distribution policy explicite** (fixed ranks, top N, top %) reliée à des bundles de composants (points/pack/xp).
6. **Settlement plan auto-généré** depuis ranking+policy avec override contrôlé.

Ce choix répond directement aux gaps identifiés dans l’audit tout en restant MVP-réaliste et exploitable par l’admin ops.
