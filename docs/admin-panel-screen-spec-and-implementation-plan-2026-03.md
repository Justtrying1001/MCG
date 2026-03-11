# MCG Admin Panel Screen Spec and Implementation Plan (2026-03)

## 1. Scope and usage

Ce document est une spécification d’implémentation pour le futur panel admin MCG.
Il sert à:
- découper tickets front/back,
- aligner contrats API,
- orchestrer migration progressive depuis l’existant.

Hypothèse: on conserve temporairement certains endpoints legacy et on introduit progressivement des APIs workbench-oriented (`prepare/validate/preview/execute`).

---

## 2. Global screen map

## 2.1 Top-level modules
1. Dashboard
2. Contests
3. Campaigns & Quests
4. Moderation
5. Rewards & Compensation
6. Users
7. Analytics
8. Activity Log

## 2.2 Target screens by module

### Dashboard
- `Admin Operations Dashboard`

### Contests
- `Contest Catalog`
- `Contest Create Wizard`
- `Contest Overview`
- `Lifecycle Control Panel`
- `Scoring Workbench`
- `Settlement Workbench`
- `Contest Audit Timeline`

### Campaigns & Quests
- `Campaign Catalog`
- `Campaign Builder`
- `Quest Library`
- `Quest Builder`
- `Quest Detail / Performance View`

### Moderation
- `Submission Queue`
- `Submission Detail Review`
- `Decision History`

### Rewards & Compensation
- `Manual Compensation Workbench`
- `Reward Package Catalog`
- `Reward Ledger Explorer`
- `Reward Grants Explorer`
- `Accounting Exceptions`

### Users
- `User Search`
- `User Context Panel`
- `User Reward History`
- `User Contest/Quest Snapshot`

### Analytics
- `Ops KPI Dashboard`
- `Contest Ops Analytics`
- `Campaign/Quest Analytics`
- `Moderation Analytics`
- `Compensation Risk Analytics`

### Activity Log
- `Admin Activity Log`
- `Admin Action Detail`

---

## 3. Cross-screen UX/system standards (mandatory)

## 3.1 Interaction lifecycle for critical mutations
Every critical flow must implement:
1. Prepare
2. Validate
3. Preview
4. Execute
5. Confirm receipt

Critical = contest transition, scoring execute, settlement execute, moderation decision, manual compensation execute.

## 3.2 Standard states
Each screen must define:
- loading state (skeleton/spinner + disabled CTA)
- empty state (actionable, not dead-end)
- recoverable error state (retry + error detail)
- warning state (non-blocking issue)
- blocking validation state (cannot execute)

## 3.3 Validation surface rules
- Row-level errors for tabular data (scoring/import/reward plan).
- Field-level inline validation for forms/wizards.
- Summary banner for blocking issues.
- No silent failure.

## 3.4 Confirmation and audit standards
- Confirmation modal for critical execute actions.
- Modal must show impact summary and irreversible effects.
- Execution success returns receipt id.
- Log event emitted with actor, reason, payload summary, effect summary.

## 3.5 Permissions model (minimum)
Roles:
- `admin_ops` (run workflows)
- `admin_moderator` (moderation decisions)
- `admin_finance_ops` (compensation/rewards)
- `admin_supervisor` (high-risk approvals)

High-risk thresholds require `admin_supervisor` approval (configurable).

---

## 4. Screen-by-screen specification

## 4.1 Dashboard

### 4.1.1 Admin Operations Dashboard
- **Objective**: page d’entrée opérationnelle priorisée.
- **Page type**: overview dashboard.
- **Primary user**: admin ops lead / shift operator.

#### Data displayed
- Action queues summary:
  - contests requiring transition
  - contests waiting scoring
  - contests waiting settlement
  - pending moderation submissions
  - pending high-risk compensations
- SLA widgets:
  - oldest pending moderation
  - avg time to settlement
  - failed critical actions 24h
- Risk alerts:
  - abnormal grants volume
  - contest state inconsistencies

#### Sections
1. `Priority Actions` table
2. `Queue Health` cards
3. `Risk Alerts` list
4. `Recent Critical Events` timeline (last 20)

#### CTAs
- Primary: `Open workbench` from each priority row.
- Secondary: `View all` by module.

#### Filters
- time window, contest/campaign tags, severity.

#### States
- Empty: “No pending operations” + link to catalogs.
- Error: retry + “open system status”.

#### API dependencies
- New:
  - `GET /api/internal/admin/dashboard/summary`
  - `GET /api/internal/admin/dashboard/priority-actions`
  - `GET /api/internal/admin/dashboard/alerts`
- Legacy temporary fallback:
  - aggregate from existing contests/submissions/manual-grant routes.

#### Log events
- `dashboard.priority_action.opened`

---

## 4.2 Contests (detailed)

### 4.2.1 Contest Catalog
- **Objective**: lister/filtrer contests et ouvrir bon workbench.
- **Page type**: searchable table + quick status insights.
- **Primary user**: admin ops.

#### Layout
1. Header + create button
2. Filters bar
3. Contest table
4. Bulk info panel (selected rows optional phase 2)

#### Table columns
- contest code/title
- current phase
- entries
- scoring status
- settlement status
- starts/lock/ends
- last admin action

#### CTAs
- Primary: `Open Overview`
- Secondary: `Open Scoring`, `Open Settlement`, `Open Audit`

#### Filters
- phase, date range, status risk (`blocked`,`late`,`ready`), owner tag.

#### Empty/loading/error
- empty filter state + clear filter CTA
- loading skeleton rows
- recoverable error row + retry

#### APIs
- New:
  - `GET /api/internal/contest-runs`
  - `GET /api/internal/contest-runs/operational-summary`
- Legacy temporary:
  - `GET /api/internal/contests`
  - `GET /api/internal/contests/:contestId`

#### Logging
- `contest.catalog.filter.changed`
- `contest.catalog.row.opened`

### 4.2.2 Contest Create Wizard
- **Objective**: création guidée d’un contest draft validé.
- **Page type**: wizard 6-7 étapes.
- **Primary user**: ops configurator.

#### Steps
1. Identity (`code`,`title`,`contest template`)
2. Schedule (`startsAt`,`lockAt`,`endsAt`)
3. Eligibility (`card set selector`,`roster size`)
4. Scoring policy (format + constraints)
5. Reward policy draft
6. Validation summary
7. Confirm create

#### Validation rules
- code unique + naming rule
- title required
- schedule order strict: start < lock < end
- roster size > 0
- required fields by template

#### Warnings
- short contest duration
- lock too close to start
- missing reward policy draft (warn, not block in MVP)

#### Confirmation
- Modal with summary + “Create Draft”
- Optional `Create & Open Overview`

#### APIs
- New:
  - `POST /api/internal/contest-runs/create/validate`
  - `POST /api/internal/contest-runs/create/execute`
- Legacy bridge:
  - `POST /api/internal/contests`

#### Logs
- `contest.create.validate`
- `contest.create.executed`

### 4.2.3 Contest Overview
- **Objective**: hub contest-specific, non-destructive overview.
- **Page type**: operational summary detail page.

#### Sections
1. Identity + phase badge + owner
2. Progress cards (entries/scoring/settlement)
3. Timeline of upcoming milestones
4. Blocking issues panel
5. Quick links to lifecycle/scoring/settlement/audit

#### CTA
- Primary contextual:
  - if scoring pending: `Open Scoring Workbench`
  - if settlement pending: `Open Settlement Workbench`

#### APIs
- New:
  - `GET /api/internal/contest-runs/{id}/overview`
- Legacy bridge:
  - `GET /api/internal/contests/{contestId}`

#### Logs
- `contest.overview.opened`

### 4.2.4 Lifecycle Control Panel
- **Objective**: transitions de phase sûres.
- **Page type**: state machine action panel.

#### Sections
1. Current phase and allowed next phases
2. Preconditions checklist
3. Impact preview
4. Transition execution panel

#### Execute rules
- blocked if unmet preconditions
- requires reason code for exceptional transitions
- high-risk transitions may need supervisor approval

#### APIs
- New:
  - `POST /api/internal/contest-runs/{id}/transitions/prepare`
  - `POST /api/internal/contest-runs/{id}/transitions/validate`
  - `POST /api/internal/contest-runs/{id}/transitions/execute`
- Legacy bridge:
  - `POST /api/internal/contests/{contestId}/status`

#### Logs
- `contest.transition.prepared`
- `contest.transition.executed`

### 4.2.5 Scoring Workbench
- **Objective**: importer/valider/exécuter scoring sans JSON brut.
- **Page type**: table workbench with row validation.

#### Layout
1. Input source panel (CSV upload / paste table)
2. Validation results grid
3. Ranking diff preview
4. Execute panel

#### Validation checks
- invalid/missing user id
- non-entered users
- duplicate rows
- invalid score format/range
- missing expected participants (warning)

#### Preview
- before ranking top N
- after ranking top N
- delta moves
- count of impacted entries

#### Execute
- disabled on blocking errors
- confirmation modal shows rows count + impact
- returns execution receipt

#### APIs
- New:
  - `POST /api/internal/contest-runs/{id}/scoring/import`
  - `POST /api/internal/contest-runs/{id}/scoring/validate`
  - `GET /api/internal/contest-runs/{id}/scoring/preview/{importId}`
  - `POST /api/internal/contest-runs/{id}/scoring/execute`
- Legacy bridge:
  - `POST /api/internal/contests/{contestId}/score`

#### Logs
- `contest.scoring.imported`
- `contest.scoring.validated`
- `contest.scoring.executed`

### 4.2.6 Settlement Workbench
- **Objective**: préparer et exécuter settlement via reward plan guidé.
- **Page type**: plan-review-execute workbench.

#### Sections
1. Plan generation settings
2. Candidate reward plan table
3. Validation panel
4. Accounting impact preview
5. Execute settlement panel

#### Table columns (reward plan)
- rank/user
- reward package
- points delta
- additional assets
- validation status
- override reason

#### Rules
- no unresolved user mapping
- no invalid reward package
- totals must reconcile
- duplicate conflicting rewards blocked

#### Execute
- confirmation modal with totals + irreversible flags
- supervisor approval if high impact threshold

#### APIs
- New:
  - `POST /api/internal/contest-runs/{id}/settlement/plan/generate`
  - `POST /api/internal/contest-runs/{id}/settlement/plan/validate`
  - `GET /api/internal/contest-runs/{id}/settlement/preview/{planId}`
  - `POST /api/internal/contest-runs/{id}/settlement/execute`
- Legacy bridge:
  - `POST /api/internal/contests/{contestId}/settle`

#### Logs
- `contest.settlement.plan.generated`
- `contest.settlement.executed`

### 4.2.7 Contest Audit Timeline
- **Objective**: audit complet des actions contest.
- **Page type**: timeline + event detail drawer.

#### Data
- transitions
- scoring imports/executions
- settlement plan/execution
- errors/retries
- actor identity

#### APIs
- New:
  - `GET /api/internal/contest-runs/{id}/activity`
  - `GET /api/internal/admin-actions/{actionId}`

#### Logs
- read access event: `contest.audit.viewed`

---

## 4.3 Campaigns & Quests (detailed)

### 4.3.1 Campaign Catalog
- Objective: lister campagnes + status + performance.
- Type: table/list.
- Sections: filters, campaign table, quick actions.
- APIs:
  - New `GET /api/internal/campaigns`
  - Legacy fallback from quest list grouping.

### 4.3.2 Campaign Builder
- Objective: créer/éditer campagne regroupant quests.
- Steps:
  1. campaign identity
  2. period/channel
  3. objectives selection
  4. publish settings
- APIs:
  - New `POST/PATCH /api/internal/campaigns`
  - `POST /api/internal/campaigns/{id}/publish/validate`
  - `POST /api/internal/campaigns/{id}/publish/execute`

### 4.3.3 Quest Library
- Objective: catalogue de quest definitions/templates.
- Table columns:
  - quest code/title
  - objective type
  - validation policy
  - reward package
  - active status
  - campaign linkage
- APIs:
  - New `GET /api/internal/quests/library`
  - Legacy `GET /api/internal/quests`

### 4.3.4 Quest Builder
- Objective: flow guidé de création quest.
- Steps:
  1. Objective template selection
  2. Objective config
  3. Validation policy config
  4. Reward package
  5. Window & availability
  6. User-facing preview
  7. Validate + execute

#### Mandatory objective templates
- Follow X
- Like / RT / Comment
- Contest milestone

#### Template-specific rules

##### Follow X
- required target account/handle
- proof mode optional/required
- instructions preview required

##### Like / RT / Comment
- required action subtype(s)
- required target post URL
- required proof policy by action subtype

##### Contest milestone
- required milestone metric + threshold
- threshold > 0
- optional contest scope filter

#### APIs
- New:
  - `POST /api/internal/quests/build/validate`
  - `POST /api/internal/quests/build/preview`
  - `POST /api/internal/quests/build/execute`
- Legacy bridge:
  - `POST /api/internal/quests`
  - `PATCH /api/internal/quests/{questId}`

### 4.3.5 Quest Detail / Performance View
- Objective: lecture actionnable par quest.
- Sections:
  - identity/config summary (no raw JSON by default)
  - funnel metrics
  - latest submissions
  - reward distribution summary
  - linked moderation actions
- APIs:
  - New `GET /api/internal/quests/{id}/performance`
  - Legacy `GET /api/internal/quests/{questId}`

---

## 4.4 Moderation (detailed)

### 4.4.1 Submission Queue
- Objective: prioriser et traiter backlog.
- Type: queue table with priority sorting.

#### Columns
- priority score
- age/SLA risk
- campaign/quest
- user
- evidence completeness
- decision status

#### Filters
- status, campaign, quest type, age bucket, risk level.

#### APIs
- New:
  - `GET /api/internal/moderation/submissions?view=priority`

### 4.4.2 Submission Detail Review
- Objective: prendre décision review.
- Type: split view (context left / decision right).

#### Context pane
- submission evidence
- user context summary
- previous submissions on same quest
- projected reward impact if approved

#### Decision pane
- actions: approve / reject / escalate
- reject reason dropdown mandatory
- optional note field (required for escalate)
- confirmation modal before execute

#### APIs
- New:
  - `GET /api/internal/moderation/submissions/{id}/context`
  - `POST /api/internal/moderation/submissions/{id}/decide`
- Legacy bridge:
  - `POST /api/internal/quests/submissions/{submissionId}/review`

### 4.4.3 Decision History
- Objective: audit reviewer actions.
- Type: timeline/table.
- Filters: reviewer, decision code, period, campaign.
- API:
  - New `GET /api/internal/moderation/decisions`

---

## 4.5 Rewards & Compensation (detailed)

### 4.5.1 Manual Compensation Workbench
- Objective: compensation safe-by-default.
- Type: staged flow page.

#### Sections
1. user selection + context
2. compensation package selection
3. reason code + note
4. validation checks
5. accounting preview
6. execute + receipt

#### Rules
- reason code required
- high amount threshold triggers supervisor approval
- no execute without preview success

#### APIs
- New:
  - `POST /api/internal/compensations/prepare`
  - `POST /api/internal/compensations/validate`
  - `GET /api/internal/compensations/preview/{token}`
  - `POST /api/internal/compensations/execute`
- Legacy bridge:
  - `POST /api/internal/rewards/manual-grant`

### 4.5.2 Reward Package Catalog
- Objective: gérer packages réutilisables.
- Type: CRUD table + detail drawer.
- APIs:
  - New `GET/POST/PATCH /api/internal/reward-packages`

### 4.5.3 Reward Ledger Explorer
- Objective: explorer comptabilité points/reward transactions.
- Type: filterable ledger table.
- Filters:
  - source type, reason code, user, period, amount range.
- API:
  - New `GET /api/internal/rewards/ledger`
  - Legacy adaptation from user ledger route for admin scope.

### 4.5.4 Reward Grants Explorer
- Objective: visibilité sur grants non-ledger/legacy and mapping.
- API:
  - New `GET /api/internal/rewards/grants`

### 4.5.5 Accounting Exceptions
- Objective: détecter anomalies de comptabilité opérationnelle.
- Sections:
  - unreconciled actions
  - duplicate attempt logs
  - failed executions
- APIs:
  - New `GET /api/internal/rewards/exceptions`

---

## 4.6 Users (detailed)

### 4.6.1 User Search
- Objective: trouver utilisateur rapidement avec contexte minimal.
- Type: search + result list.
- API:
  - Reuse `GET /api/internal/users/search`

### 4.6.2 User Context Panel
- Objective: contexte avant action sensible.
- Sections:
  - profile basic
  - points balance
  - recent grants/rewards
  - moderation flags
  - active contests/quests snapshot
- API:
  - New `GET /api/internal/users/{id}/admin-context`

### 4.6.3 User Reward History
- Objective: historique rewards user-level.
- APIs:
  - New `GET /api/internal/users/{id}/rewards/history`

### 4.6.4 User Contest/Quest Snapshot
- Objective: vision compacte de l’état progression.
- APIs:
  - New `GET /api/internal/users/{id}/progression-snapshot`

---

## 4.7 Analytics (detailed)

### 4.7.1 Ops KPI Dashboard
- KPIs:
  - queue backlog,
  - time-to-score,
  - time-to-settlement,
  - moderation SLA,
  - compensation anomaly rate.
- API:
  - New `GET /api/internal/analytics/ops-kpis`

### 4.7.2 Contest Ops Analytics
- contest throughput, scoring quality metrics, settlement latency.
- API: `GET /api/internal/analytics/contests`

### 4.7.3 Campaign/Quest Analytics
- submission conversion, approval rates, reward spend.
- API: `GET /api/internal/analytics/campaigns-quests`

### 4.7.4 Moderation Analytics
- reviewer throughput, reject reasons distribution, quality checks.
- API: `GET /api/internal/analytics/moderation`

### 4.7.5 Compensation Risk Analytics
- grant volume trends, high-risk grants, approval breaches.
- API: `GET /api/internal/analytics/compensation-risk`

---

## 4.8 Activity Log (detailed)

### 4.8.1 Admin Activity Log
- Objective: audit transversal des actions admin.
- Type: event table with facets.
- Filters:
  - actor, module, action type, severity, time range.
- API:
  - New `GET /api/internal/admin-actions`

### 4.8.2 Admin Action Detail
- Objective: détails d’une action et effets.
- Sections:
  - request summary
  - validation/preview summary
  - execution result
  - affected entities
- API:
  - New `GET /api/internal/admin-actions/{actionId}`

---

## 5. API mapping matrix (screen -> contracts)

| Screen | New APIs | Legacy temporary reuse | Gap to close |
|---|---|---|---|
| Dashboard | `/admin/dashboard/*` | aggregate `contests`, `submissions`, `manual-grant` | no single summary endpoint |
| Contest Catalog | `/contest-runs`, `/contest-runs/operational-summary` | `/api/internal/contests` | phase/risk summary missing |
| Contest Create Wizard | `/contest-runs/create/validate`, `/create/execute` | `POST /api/internal/contests` | no validation endpoint |
| Contest Overview | `/contest-runs/{id}/overview` | `GET /api/internal/contests/{id}` | no overview contract |
| Lifecycle Panel | `/transitions/prepare|validate|execute` | `POST /status` | no transition guards |
| Scoring Workbench | `/scoring/import|validate|preview|execute` | `POST /score` | no row-level validate/preview |
| Settlement Workbench | `/settlement/plan/generate|validate|preview|execute` | `POST /settle` | no plan/preview APIs |
| Contest Audit | `/contest-runs/{id}/activity` | none | no action timeline API |
| Campaign Catalog | `/campaigns` | derive from quests list | no campaign entity API |
| Campaign Builder | `/campaigns` + publish endpoints | none | missing campaign runtime/API |
| Quest Library | `/quests/library` | `GET /api/internal/quests` | library-specific contract missing |
| Quest Builder | `/quests/build/*` | `POST/PATCH /api/internal/quests` | still schema-centric payloads |
| Quest Performance | `/quests/{id}/performance` | `GET /api/internal/quests/{id}` | no funnel/perf contract |
| Submission Queue | `/moderation/submissions` | `/api/internal/quests/submissions` | no priority model |
| Submission Review | `/moderation/submissions/{id}/context|decide` | `/review` legacy endpoint | no context endpoint |
| Decision History | `/moderation/decisions` | none | missing decision log API |
| Compensation WB | `/compensations/*` | `/api/internal/rewards/manual-grant` | no prepare/preview/approval API |
| Reward Package Catalog | `/reward-packages` | none | new model needed |
| Reward Ledger Explorer | `/rewards/ledger` admin scope | user ledger endpoint adaptation | no admin ledger endpoint |
| Reward Grants Explorer | `/rewards/grants` | none | missing grants explorer API |
| Accounting Exceptions | `/rewards/exceptions` | none | missing exception service |
| User Search | reuse `/users/search` | existing | context enrichment missing |
| User Context | `/users/{id}/admin-context` | none | missing context API |
| Analytics screens | `/analytics/*` | partial ad hoc aggregation | no analytics contracts |
| Activity Log | `/admin-actions`, `/admin-actions/{id}` | none | missing admin action logging API |

---

## 6. Implementation plan (phased)

## 6.1 Phase 0 — Foundations (1 sprint)
- **Goal**: préparer infrastructure front/back pour migration.
- **Screens**: none net-new, shell scaffolding behind feature flag.
- **Backend**:
  - introduce `AdminActionLog` minimal write path
  - add actor identity normalization (nominative)
- **Risks**: logging overhead.
- **Done**:
  - log instrumentation active on existing critical endpoints.

## 6.2 Phase 1 — Critical safety rails (2 sprints)
- **Goal**: sécuriser flows existants sans refonte visuelle totale.
- **Screens touched**:
  - current contest detail
  - current rewards manual grant
  - current moderation review
- **APIs**:
  - add contest transition validate
  - add scoring validate preview
  - add settlement preview
  - add compensation validate preview
- **Data changes**:
  - reason code taxonomy tables (basic)
- **Risks**: dual UX (old + new panels).
- **Done**:
  - no critical execute without validation + confirmation summary.

## 6.3 Phase 2 — Admin shell + Dashboard + Catalogs (2 sprints)
- **Goal**: nouvelle IA/navigation en production.
- **Screens**:
  - Admin Dashboard
  - Contest Catalog
  - Campaign Catalog
  - User Search (new shell)
- **Dependencies**: phase 1 APIs + summary endpoints.
- **Done**:
  - operators can navigate all domains from persistent shell.

## 6.4 Phase 3 — Contest workbenches (3 sprints)
- **Goal**: remplacer scoring/settlement bruts.
- **Screens**:
  - Contest Overview
  - Lifecycle Control Panel
  - Scoring Workbench
  - Settlement Workbench
  - Contest Audit Timeline
- **APIs**:
  - full `/contest-runs/*` workbench endpoints.
- **Migration**:
  - deprecate old scoring textarea and raw reward rows UI.
- **Done**:
  - 100% contest critical actions via workbench flow.

## 6.5 Phase 4 — Quest/Campaign builder + moderation v1 (3 sprints)
- **Goal**: sortir de QuestDefinition schema-first.
- **Screens**:
  - Campaign Builder
  - Quest Builder
  - Quest Performance View
  - Submission Queue
  - Submission Detail Review
  - Decision History
- **APIs**:
  - campaigns APIs
  - quest build validate/preview/execute
  - moderation context/decide APIs
- **Data**:
  - campaign linkage (minimal)
- **Done**:
  - Follow X / Like-RT-Comment / milestone flows fully guided.

## 6.6 Phase 5 — Rewards unification + compensation governance (3 sprints)
- **Goal**: cohérence reward/accounting.
- **Screens**:
  - Reward Package Catalog
  - Manual Compensation Workbench (full)
  - Reward Ledger Explorer
  - Reward Grants Explorer
  - Accounting Exceptions
- **APIs/Data**:
  - reward package model
  - unified reward action pipeline
  - supervisor approval workflow
- **Done**:
  - contest/quest/manual rewards reconciled in unified accounting view.

## 6.7 Phase 6 — Analytics + hardening (2 sprints)
- **Goal**: ops maturity and observability.
- **Screens**:
  - analytics suite
  - enhanced dashboard alerts
- **Done**:
  - KPI baselines + SLA monitoring operational.

---

## 7. Dependencies and sequencing constraints

1. `AdminActionLog` foundation before large workbenches.
2. Validation/preview APIs before UI migration of critical flows.
3. Contest workbenches before removing legacy contest detail controls.
4. Campaign model before full quest builder GA.
5. RewardPackage + unified reward action before deprecating raw reward fields.

---

## 8. Risks and mitigations

## 8.1 Product/ops risks
- Operator confusion during dual-run period.
- Inconsistent outcomes between legacy and new endpoints.

Mitigation:
- feature flags per screen,
- shadow mode validations,
- strict routing of critical actions to one path at a time.

## 8.2 Technical risks
- API proliferation and contract drift.
- Data reconciliation complexity (grants/ledger).

Mitigation:
- contract versioning,
- centralized admin operations service,
- reconciliation jobs and exception dashboards.

---

## 9. Prioritization

## 9.1 Refonte MVP (must ship first)
- Phase 1 + core of Phase 2:
  - safety rails on existing critical actions,
  - admin shell,
  - dashboard summary,
  - contest catalog.

## 9.2 V1 ops-ready
- End of Phase 3 + Phase 4:
  - full contest workbenches,
  - guided quest/campaign builder,
  - moderation queue+detail decision.

## 9.3 V2 maturity
- Phase 5 + Phase 6:
  - reward accounting unification,
  - governance approvals,
  - advanced analytics/risk tooling.

---

## 10. Ticketization starter pack (implementation-ready)

## 10.1 Frontend epic seeds
1. Admin shell framework + nav + permissions gates
2. Dashboard summary widgets
3. Contest workbench UI suite
4. Campaign/Quest builder UI suite
5. Moderation queue/detail/decision UI
6. Rewards/compensation UI suite
7. User context screens
8. Analytics and activity log screens

## 10.2 Backend epic seeds
1. Admin action log service + schemas
2. Contest run workbench APIs
3. Campaign/Quest build APIs
4. Moderation context/decision APIs
5. Compensation/reward action APIs
6. User admin context APIs
7. Analytics aggregation APIs
8. Exception/reconciliation services

## 10.3 Definition of Done (global)
- Every critical action has validate+preview+confirm.
- Every critical action writes admin action log with actor identity.
- Legacy screen path disabled once replacement reaches parity + runbook signoff.
