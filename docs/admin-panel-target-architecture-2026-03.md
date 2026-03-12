# MCG Admin Panel Target Architecture

## 1. Executive summary

### 1.1 Target admin operating model
Le futur panel admin MCG doit devenir un **système opératoire** structuré autour de jobs explicites, et non un ensemble de pages techniques:

1. **Configure** (définir campagnes/contests/quests/rewards packages)
2. **Run** (piloter les opérations live: lifecycle, scoring windows, settlement windows)
3. **Moderate** (review sociale avec décision traçable)
4. **Analyze** (monitoring, KPI, exceptions, post-mortem)
5. **Compensate** (support grants, corrections contrôlées)

Chaque job doit avoir ses surfaces dédiées, ses APIs dédiées, ses garde-fous, et son audit trail.

### 1.2 What must fundamentally change
D’après l’audit V2, les ruptures nécessaires sont structurelles:

- Passer de **runtime-centric UI** (JSON, IDs, enums, payloads) à **product-centric UI** (intentions, étapes guidées, preview).
- Supprimer le mélange config/run/settle/moderate dans une même surface.
- Rendre les actions critiques safe-by-default (prepare/validate/preview/execute/confirm).
- Unifier le modèle reward/opérations (ledger/grants/points) pour auditabilité cohérente.
- Installer un shell admin persistant + dashboard priorisé + files de travail.

### 1.3 Design principles
1. **Product-first**: concepts manipulés = campaign, contest run, reward policy, moderation decision.
2. **Ops-ready**: lisible sous pression, orienté file de travail, décisions rapides et sûres.
3. **Safe-by-default**: aucune mutation critique sans validation/preview explicite.
4. **Audit-friendly**: chaque action critique doit être attribuable (who/what/when/why/effects).
5. **Extensible**: support natif de reward bundles et social campaign richness.
6. **Progressively implementable**: migration sans freeze produit.

### 1.4 Recommended transformation priorities
- Priorité 1: safety rails scoring/settlement/manual grants.
- Priorité 2: nouveau shell + séparation des domaines/jobs.
- Priorité 3: contest workbench complet.
- Priorité 4: quest/campaign builder product-first.
- Priorité 5: reward accounting unifié et extensible.

---

## 2. Target admin information architecture

### 2.1 Global admin shell

#### 2.1.1 Shell structure
- **Top bar persistante**:
  - environnement (prod/staging),
  - identité admin nominative,
  - rôle/permissions,
  - recherche globale,
  - notifications ops.
- **Sidebar persistante** (navigation primaire):
  - Operations Dashboard
  - Contests
  - Campaigns & Quests
  - Moderation
  - Rewards & Compensation
  - Users
  - Analytics
  - Admin Activity Log
- **Workspace area**:
  - breadcrumb + page state,
  - panneaux action/preview,
  - terminal messages opérateur.

#### 2.1.2 Shell responsibilities
- Conserver le contexte cross-domain.
- Afficher les files prioritaires (badges “pending review”, “contests blocked”, “settlement pending”).
- Centraliser les confirmations critiques et action logs récents.

### 2.2 Primary navigation

#### 2.2.1 Primary modules (L1)
1. **Dashboard** (pilotage quotidien)
2. **Contests** (config/run/score/settle/audit)
3. **Campaigns & Quests** (design/execution monitoring)
4. **Moderation** (submission queues + reviewer tools)
5. **Rewards & Compensation** (manual grants, adjustments, reward packages)
6. **Users** (search + context cards)
7. **Analytics** (ops + product)
8. **Activity Log** (audit transversal)

#### 2.2.2 Secondary navigation (L2)
Exemple Contests:
- Contest Catalog
- Create Contest
- Live Runs
- Scoring Workbench
- Settlement Workbench
- Contest Audit

### 2.3 Domain separation

#### 2.3.1 Separation rules
- **Configure surfaces**: définissent les règles, jamais d’exécution irréversible.
- **Run surfaces**: pilotent lifecycle en live, sans édition structurelle profonde.
- **Moderate surfaces**: décisions review only.
- **Analyze surfaces**: lecture/diagnostic.
- **Compensate surfaces**: corrections financières/grants, gouvernées.

#### 2.3.2 Anti-mixing constraints
- Interdit de combiner dans un même écran:
  - scoring payload editing + settlement execution,
  - quest definition editing + moderation queue,
  - compensation grant + user search non contextualisé.

### 2.4 Cross-cutting patterns
- Prepare → Validate → Preview → Execute → Confirm → Audit record.
- State badges standardisés (OK/WARN/BLOCKED).
- Operator-facing errors: clairs, actionnables, row-level.
- Bulk ops là où pertinent (moderation).
- Idempotency visible partout où mutation critique.

---

## 3. Target domain architecture

### 3.1 Admin home / operations dashboard

#### 3.1.1 Product role
Cockpit quotidien de l’équipe ops.

#### 3.1.2 Modules
- **Work queues snapshot**:
  - contests requiring action,
  - pending submissions,
  - settlements pending review,
  - compensation requests pending approval.
- **Risk alerts**:
  - contests LIVE sans scoring upload,
  - high manual grant volume,
  - unusual rejection rates.
- **SLA panels**:
  - moderation backlog age,
  - time-to-settlement,
  - failed critical actions.

#### 3.1.3 Actions depuis dashboard
- Quick-links vers workbenches filtrés.
- Aucun edit structurel direct.

### 3.2 Contest operations

#### 3.2.1 Product role
Orchestrer des compétitions de bout en bout avec sécurité et traçabilité.

#### 3.2.2 Module map
- Contest Catalog
- Contest Create Wizard
- Contest Overview (single contest)
- Lifecycle Control Panel
- Scoring Workbench
- Settlement Workbench
- Contest Audit & Timeline

### 3.3 Quest / campaign operations

#### 3.3.1 Product role
Configurer et opérer des objectifs d’acquisition/engagement/progression.

#### 3.3.2 Module map
- Campaign Catalog
- Campaign Builder
- Quest Library
- Quest Builder
- Reward Package Selector
- Campaign Performance View

### 3.4 Moderation operations

#### 3.4.1 Product role
Décider rapidement et proprement des submissions sociales.

#### 3.4.2 Module map
- Submission Queue (priority view)
- Submission Detail Review
- Decision History
- Reviewer Performance & QA

### 3.5 Rewards / compensation operations

#### 3.5.1 Product role
Assurer une attribution rewards cohérente, gouvernée et auditable.

#### 3.5.2 Module map
- Reward Ledger Explorer
- Reward Grants Explorer
- Manual Compensation Workbench
- Reward Package Catalog
- Accounting Exceptions

### 3.6 User admin context

#### 3.6.1 Product role
Fournir le minimum contextuel avant toute action sensible sur utilisateur.

#### 3.6.2 Module map
- User Search
- User Context Card
- User Reward History
- User Contest/Quest Snapshot

### 3.7 Analytics / reporting

#### 3.7.1 Product role
Mesurer la santé ops et la qualité d’exécution admin.

#### 3.7.2 Module map
- Ops KPIs
- Contest performance
- Campaign/quest conversion
- Moderation throughput & quality
- Compensation trends and risk signals

---

## 4. Contest admin target design

### 4.1 Contest lifecycle model

#### 4.1.1 Target lifecycle states
Conserver les états techniques existants, mais exposer des **phases produit**:
- Draft Setup
- Published / Entry Open
- Entry Locked
- Live Monitoring
- Scoring Pending / Scoring Completed
- Settlement Pending / Settled
- Canceled

#### 4.1.2 Transition policy
- Transition matrix explicite (allowed/disallowed + prerequisites).
- Exemples:
  - DRAFT → OPEN: requires valid schedule + rule validation pass.
  - LIVE → SETTLED: requires scoring completed + settlement plan validated.
- Disallow direct “unsafe jumps” en UI standard.

### 4.2 Contest creation architecture

#### 4.2.1 Contest Create Wizard (multi-step)
1. **Identity & intent**: code, title, contest type/template.
2. **Schedule**: starts/lock/ends avec timeline visualisée.
3. **Eligibility & roster**: card set selector (lookup, pas ID brut), roster size.
4. **Scoring policy**: source/mode format attendu.
5. **Reward policy draft**: règles de récompense prévues (pas settlement final).
6. **Validation summary**: checks pass/fail + warnings.
7. **Create as Draft** (default), with optional publish later.

#### 4.2.2 Champ strategy
- Supprimer exposition directe `cardSetId`.
- Encapsuler `config` via fields typed.
- `status` non libre à create: DRAFT par défaut (option OPEN seulement si checks verts + permission).

### 4.3 Contest overview / run architecture

#### 4.3.1 Contest Overview page
- Header: contest identity + phase + risk status.
- Operational tiles:
  - entries total,
  - scoring status,
  - ranking freshness,
  - settlement readiness,
  - last admin action.
- Quick actions vers workbenches spécialisés.

#### 4.3.2 Lifecycle panel
- Timeline visuelle phases.
- Boutons transitions contextualisés (enabled/disabled with reasons).
- “Impact preview” (ce que la transition change).

### 4.4 Scoring workbench

#### 4.4.1 Objectif
Remplacer le textarea JSON par un espace de travail robuste.

#### 4.4.2 Inputs supportés
- CSV upload.
- paste table.
- API ingest job reference (future).

#### 4.4.3 Workflow
1. Import dataset.
2. Validate rows:
   - missing user,
   - duplicate user,
   - invalid score,
   - non-entered user,
   - out-of-range checks (if policy).
3. Show row-level errors + fix options.
4. Preview ranking diff (before/after).
5. Execute scoring commit (idempotency token visible).
6. Post-execution report.

#### 4.4.4 Safety rails
- Pas de commit si errors bloquantes.
- Confirmation contextualisée avec nombre de rows et impacts.
- Action log entry obligatoire.

### 4.5 Settlement workbench

#### 4.5.1 Objectif
Transformer settlement de saisie brute en flow guidé.

#### 4.5.2 Workflow
1. **Generate candidate reward plan** from ranking + reward policy.
2. **Manual adjustments** with guardrails.
3. **Validation**:
   - user resolution,
   - reward package validity,
   - duplicate/conflict checks,
   - accounting checks.
4. **Preview**:
   - per user rewards,
   - points delta,
   - ledger/grant entries to be created,
   - totals summary.
5. **Execute settlement** with execution id.
6. **Post-settlement audit panel**.

#### 4.5.3 Field strategy
- Masquer `packDefinitionId` brut derrière “reward package” selector.
- Remplacer `type+amount` ad hoc par package components.

### 4.6 Contest auditability requirements
- Timeline unique contest:
  - who did what,
  - payload hash/reference,
  - before/after summaries,
  - errors/retries.
- Exportable audit report (ops/compliance).

---

## 5. Quest / campaign target design

### 5.1 Admin model

#### 5.1.1 Model layering
- **Campaign** (niveau business): objectif, période, canal, ownership.
- **Quest** (niveau opérationnel): objective unit exécutée par users.
- **Validation policy** (comment valider).
- **Reward package** (quoi attribuer).

Cette couche Campaign évite de forcer l’admin à manipuler directement seulement `QuestDefinition`.

### 5.2 Quest builder architecture

#### 5.2.1 Builder steps
1. Choose objective template:
   - Follow X
   - Engagement X (Like/RT/Comment)
   - Contest milestone
   - Manual/special
2. Configure target details.
3. Configure validation policy.
4. Configure reward package.
5. Set availability window and audience flags.
6. Preview user-facing copy.
7. Publish (or save draft).

#### 5.2.2 Guided fields vs hidden technical fields
- **Guided**:
  - objective type,
  - proof requirement,
  - target URL,
  - instructions,
  - threshold,
  - one-time/repeatable policy,
  - reward package choice.
- **Not directly exposed**:
  - raw `config` JSON,
  - raw enum internals not needed,
  - schema-specific keys.

### 5.3 Social campaign configuration

#### 5.3.1 Follow X quest
- Inputs:
  - account/target handle,
  - proof policy,
  - accepted evidence types,
  - campaign copy preview.
- Output summary:
  - “User must follow X account Y; provide proof URL optional/required; reward package Z.”

#### 5.3.2 Like/RT/Comment quest
- Structure explicite:
  - action subtype selection (LIKE, REPOST, COMMENT, MULTI_ACTION),
  - target post URL(s),
  - required evidence per action,
  - reviewer hints.
- Évite un `SOCIAL_ENGAGEMENT_X` trop générique non interprétable.

### 5.4 Milestone quest configuration
- Inputs métier:
  - milestone metric (contest entries count etc.),
  - threshold value,
  - eligible contest scope,
  - completion behavior (auto/manual check).
- Preview:
  - example users who would currently qualify (simulation snapshot).

### 5.5 Validation and reward configuration

#### 5.5.1 Validation policy UI abstraction
- AUTO
- SUBMIT + auto-accept rules
- MANUAL_REVIEW with required decision reason

#### 5.5.2 Reward package abstraction
- Choix package préconfiguré (e.g. `500_POINTS`, `1000_POINTS_PLUS_PACK`).
- Plus de `rewardPoints` seul comme unique levier long terme.

---

## 6. Moderation target design

### 6.1 Queue architecture

#### 6.1.1 Queue views
- Priority queue (default): tri par SLA risk + fraud signals + age.
- By campaign.
- By reviewer.
- By status.

#### 6.1.2 Filtering
- status, quest/campaign, age bucket, user risk flags, action type.

### 6.2 Submission detail model
Chaque item review doit afficher:
- user context compact,
- quest/campaign context,
- submitted evidence,
- prior submissions by same user/quest,
- previous decisions and notes,
- reward impact if approved.

### 6.3 Review decision model

#### 6.3.1 Actions
- Approve
- Reject (reason required)
- Escalate (phase 2)
- Request additional proof (phase 2)

#### 6.3.2 Decision payload standard
- decision code,
- decision note,
- reviewer identity nominative,
- timestamp,
- idempotency key/action id.

### 6.4 Anti-abuse and reviewer tooling

#### Phase 1 (minimum ops-ready)
- duplicate-proof detection basic,
- repeated reject warnings,
- user recent moderation history.

#### Phase 2
- heuristic risk scoring,
- reviewer QA sampling,
- anomaly alerts.

---

## 7. Rewards / grants / accounting target design

### 7.1 Target reward model

#### 7.1.1 Required abstractions
- **Reward Package**: bundle composé de components (points, packs, assets, future items).
- **Reward Transaction**: événement comptable normalisé.
- **Reward Source**: contest settlement, quest completion, manual compensation, adjustment.

#### 7.1.2 Operator model
L’admin manipule:
- package,
- bénéficiaire,
- source,
- justification,
- preview impact.

Pas:
- type/amount/packDefinitionId bruts dans la plupart des flows.

### 7.2 Target admin abstraction
- Unified “Reward Action” model for UI.
- Source-specific workflows (contest, quest, manual) utilisant la même couche comptable.

### 7.3 Manual compensation flow

#### Workflow cible
1. Search/select user with context card.
2. Select compensation template or custom package.
3. Enter reason code + free note.
4. Validate policy (thresholds).
5. If amount high: approval required.
6. Preview accounting entries.
7. Execute + action receipt.

### 7.4 Contest reward flow
- Settlement workbench génère reward actions basées sur ranking.
- Review & approve plan.
- Execute transaction batch.
- Audit report auto.

### 7.5 Quest reward flow
- Auto/manual review decisions déclenchent reward actions standardisées.
- Même couche accounting que compensation/contest.

### 7.6 Accounting / ledger implications

#### Position recommandée
- **Unifier la comptabilité via ledger transactionnel** pour toute attribution points.
- `RewardGrant` peut être conservé comme vue/source legacy ou artefact de distribution non-points, mais pas comme chemin parallèle opaque pour points.

#### Concrètement
- Contest settlement points doit passer par même primitive comptable que quest/manual grants.
- Chaque mutation points = ledger entry explicite avec source context.

---

## 8. UX / safety / workflow standards

### 8.1 Required admin interaction patterns
- Prepare / Validate / Preview / Execute / Confirm.
- Context summary sticky sur actions critiques.
- Diff before/after obligatoire pour scoring & settlement.

### 8.2 Critical action safety rails

#### Mandatory in V1
- Contest status transitions: prerequisites + impact preview.
- Scoring: row-level validation + blocked commit on critical errors.
- Settlement: reward plan preview + final confirmation with totals.
- Manual grants: reason code required + user context required.

#### Phase 2+
- Approval tiers,
- automated anomaly checks,
- rollback assistants where feasible.

### 8.3 Audit trail requirements
- Actor nominatif (pas seulement `session|key`).
- Action id + idempotency id.
- Request summary + effect summary.
- Immutable event stream for critical operations.

### 8.4 Approval and governance patterns
- Two-step approvals for sensitive thresholds.
- Permission scopes by job (run vs compensate vs moderate).
- Mandatory reason taxonomy for compensation and reject decisions.

---

## 9. API target architecture

### 9.1 Design principles
1. Product-centric contracts (intentions métier).
2. Explicit operation stages (`prepare`, `validate`, `preview`, `execute`).
3. Operator-friendly errors (field/row/actionable).
4. Execution receipts with effect summaries.
5. Idempotency first-class for critical writes.

### 9.2 Contest APIs

#### 9.2.1 Lifecycle
- `POST /api/internal/contest-runs/{id}/transitions/prepare`
- `POST /api/internal/contest-runs/{id}/transitions/validate`
- `POST /api/internal/contest-runs/{id}/transitions/execute`

Payload cible:
- `targetPhase`, `reasonCode`, `note`.

Response:
- `allowed`, `blockingIssues[]`, `impactSummary`, `executionToken`.

#### 9.2.2 Scoring
- `POST /api/internal/contest-runs/{id}/scoring/import` (file/table ingest)
- `POST /api/internal/contest-runs/{id}/scoring/validate`
- `GET /api/internal/contest-runs/{id}/scoring/preview`
- `POST /api/internal/contest-runs/{id}/scoring/execute`

#### 9.2.3 Settlement
- `POST /api/internal/contest-runs/{id}/settlement/plan/generate`
- `POST /api/internal/contest-runs/{id}/settlement/plan/validate`
- `GET /api/internal/contest-runs/{id}/settlement/preview`
- `POST /api/internal/contest-runs/{id}/settlement/execute`

### 9.3 Quest / campaign APIs
- `POST /api/internal/campaigns`
- `PATCH /api/internal/campaigns/{id}`
- `POST /api/internal/quests/build/validate`
- `POST /api/internal/quests/build/preview`
- `POST /api/internal/quests/build/execute`

Remplacer progressivement exposition de `config` brute par payloads typed par objective template.

### 9.4 Moderation APIs
- `GET /api/internal/moderation/submissions?view=priority&...`
- `GET /api/internal/moderation/submissions/{id}/context`
- `POST /api/internal/moderation/submissions/{id}/decide`

Decision payload:
- `decision`, `decisionCode`, `note`, `requestAdditionalProof?`.

### 9.5 Rewards / grants APIs
- `POST /api/internal/reward-actions/prepare`
- `POST /api/internal/reward-actions/validate`
- `GET /api/internal/reward-actions/preview/{token}`
- `POST /api/internal/reward-actions/execute`

Manual compensation dedicated wrapper:
- `POST /api/internal/compensations/execute`

### 9.6 User context APIs
- `GET /api/internal/users/search`
- `GET /api/internal/users/{id}/admin-context`

`admin-context` includes:
- profile summary,
- reward balances/history summary,
- recent moderation events,
- recent contest/quest statuses.

---

## 10. Data and runtime implications

### 10.1 Necessary abstractions

#### Indispensables
1. `RewardPackage` (+ package components)
2. `AdminActionLog` (nominatif + effects)
3. `OperationExecution` (prepare/validate/execute lifecycle)
4. `ModerationDecision` standard fields (decisionCode/note/reviewerId)

### 10.2 Recommended schema evolution

#### Recommandé court terme
- Add reviewer identity explicit field (not only mode).
- Add reason code taxonomy tables (compensation/rejection).
- Add contest transition guard metadata.

#### Recommandé moyen terme
- Reward package tables.
- Unified reward transaction abstraction mapped to ledger.

### 10.3 Runtime/service implications
- Extra orchestration layer “admin operations service” au-dessus des runtimes actuels.
- Runtime actuel conservé comme moteurs techniques; contrats admin passent par façade orientée opérations.

### 10.4 What can remain internal-only
- détails locks/roster internals,
- raw intermediate scoring artifacts,
- low-level ids non nécessaires à l’opérateur.

---

## 11. Migration strategy

### 11.1 Immediate safety fixes
1. Contest status transition checks + UI warnings (sans grand redesign visuel).
2. Scoring validation endpoint + UI error table avant submit.
3. Settlement preview endpoint + confirmation écran.
4. Manual grants: reason code obligatoire + confirmation contextualisée.

### 11.2 Phase-by-phase transition

#### Phase 1 — Safety rails critiques
- Ajouter prepare/validate/preview sur scoring/settlement/transitions.
- Conserver écrans existants mais injecter garde-fous.

#### Phase 2 — New shell and IA
- Introduire shell persistant + sidebar + dashboard.
- Re-router progressivement anciennes pages dans nouvelle navigation.

#### Phase 3 — Contest workbenches
- Déployer Scoring Workbench puis Settlement Workbench.
- Déprécier textarea JSON et reward rows brutes.

#### Phase 4 — Quest/Campaign builder
- Introduire couche Campaign + Quest Builder templates.
- Garder compatibilité QuestDefinition runtime.

#### Phase 5 — Rewards unification
- Introduire RewardPackage + unified reward action pipeline.
- Migrer contest points path vers ledger-consistent flow.

#### Phase 6 — Moderation maturity + analytics
- Priority queue, reason taxonomy, reviewer QA, analytics avancées.

### 11.3 Backward compatibility considerations
- Conserver endpoints existants derrière façade tant que nouveaux workbenches pas GA.
- Feature flags par module.
- Data dual-write temporaire si besoin (ex: grants + unified transaction index).

### 11.4 Risks during migration
- Divergence contrats old/new APIs.
- dette de double surfaces.
- confusion opérateur pendant transition.

Mitigation:
- rollout par domaine,
- migration guides internes,
- métriques d’adoption,
- kill-switchs pour opérations critiques.

---

## 12. Final recommendations

### 12.1 What to do first
1. Sécuriser scoring/settlement/manual grants.
2. Installer shell et séparation claire des jobs.
3. Construire contest workbench preview-first.

### 12.2 What to preserve
- runtime transactionnel existant,
- conventions idempotency,
- endpoints internes actuels comme couche de compatibilité.

### 12.3 What to stop doing
- Exposer JSON libre et IDs bruts comme interface primaire.
- Permettre transitions status sans guardrails.
- Mélanger config/exécution/analyse dans un seul écran.

### 12.4 Structural debt to treat explicitly
- incohérence actuelle grants/ledger/points,
- absence d’identité admin nominative sur certains flows,
- absence d’admin action log transversal.

### 12.5 Official target statement
MCG doit évoluer vers un back-office où l’opérateur manipule des intentions produit, exécute des workflows guidés et sûrs, et dispose d’une traçabilité complète des effets système—tout en conservant une migration incrémentale réaliste depuis l’architecture actuelle.
