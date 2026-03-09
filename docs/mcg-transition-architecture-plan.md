# MCG — Transition Architecture Plan (Official)

## 1. Purpose of this document

This document defines the official architecture transition plan for the MCG pivot from the current legacy runtime to the validated collectible-first, contest-driven target architecture.

It exists to:
- provide a single implementation-guiding transition reference across product, design, and engineering,
- sequence migration decisions phase by phase,
- reduce execution risk during coexistence between legacy and target domains.

This is an architecture transition guide, not:
- an implementation log,
- a migration script,
- a code-level specification.

## 2. Alignment with product foundation

This transition plan is aligned with `docs/mcg-pivot-product-foundation.md` as the validated product source of truth.

Architecture-driving product constraints:
- collectible-first and contest-driven direction,
- canonical collectible model: Project/TokenProject + Set + Rarity + Edition + CardTemplate,
- instance-aware ownership as foundational,
- official MVP editions: **Base, Reverse, Brillante, Holo, Full Art**,
- contests as the gameplay core,
- progression as a multi-layer model (account, collection, competitive),
- MVP scope discipline (avoid overbuilding and defer non-core systems).

## 3. Legacy architecture summary

Current repo reality is optimized for the loop:
- pack opening -> collection -> PvE -> rewards.

Key characteristics of the legacy architecture:
- ownership model is template + quantity (`UserCard` by `baseCardId`),
- strong coupling to fixed card stats and stat-centric rendering,
- PvE is embedded across data, APIs, UI, reward loops, and profile payload,
- `/api/me` and `useSession` currently act as central transport for this legacy model.

## 4. Target architecture principles

1. **Parallel additive migration before deletion**
   - introduce new domain components alongside legacy first.
2. **Stability-first coexistence**
   - preserve app continuity while shifting core semantics.
3. **Instance-aware ownership as foundation**
   - owned card instances become the core ownership primitive.
4. **Read-model/projection-driven UI/API consumption**
   - UI/API surfaces consume aggregates/projections, not raw domain graphs by default.
5. **Strict product/architecture alignment**
   - architecture stays bounded by validated product foundation.
6. **No big-bang rewrite**
   - phased migration with controlled cutovers.
7. **PvE decommission only after contest stability**
   - avoid removing fallback loops prematurely.

## 5. Target domain model

### 5.1 Core collectible catalog and definitions

- **Project / TokenProject**
  - canonical token/project identity.
  - independent from collectible variant definitions.

- **Set**
  - release context and drop activation boundary.

- **Rarity**
  - scarcity tier axis.

- **Edition**
  - collectible expression axis orthogonal to rarity.
  - MVP names only: **Base, Reverse, Brillante, Holo, Full Art**.

- **CardTemplate**
  - canonical collectible definition for a valid combination:
    - Project + Set + Rarity + Edition (+ metadata).

### 5.2 Ownership and collection core

- **OwnedCardInstance**
  - unique owned collectible unit (instance-aware ownership).
  - central ownership entity for inventory and contest rostering.

- **CollectionLog / MemedexEntry (domain-aligned logging)**
  - seen/owned/missing and completion progression trace points.

### 5.3 Acquisition and economy

- **PackDefinition**
  - pack product definition and constraints.

- **DropTable**
  - weighted token/rarity/edition selection policies.

- **PackOpeningEvent**
  - opening event record linking to awarded instances.

- **RewardGrant**
  - reward ledger entry (points, packs, cards).

### 5.4 Contest domain

- **Contest**
- **ContestRule**
- **ContestEntry**
- **RosterLock**
- **ContestScore**
- **ContestRanking**
- **ContestSettlement**

These entities define the core contest lifecycle:
- contest configuration,
- lineup submission and locking,
- dynamic scoring and ranking,
- settlement and reward issuance.

### 5.5 Progression domain

- **UserProgression** (account progression)
- **CollectionProgression** (collection/memedex progression)
- **CompetitiveProgression** (contest performance progression)

### 5.6 Read models / projections (explicitly non-core-domain)

Projection layer examples:
- collection aggregates,
- memedex views,
- contest roster-ready views,
- contest summary views,
- profile summary projections.

Important boundary:
- core domain entities model truth and lifecycle,
- projections model consumption for UI/API performance and clarity.

## 6. Legacy to future mapping

Classification used:
- **Preserve**
- **Preserve with adaptation**
- **Replace**
- **Decommission later**

| Legacy concept | Target concept | Classification |
|---|---|---|
| `UserCard` (template + quantity) | `OwnedCardInstance` (+ collection projections) | Replace |
| `PackOpening.result` JSON | `PackOpeningEvent` + instance-linked outcomes | Preserve with adaptation |
| `PveRun` | Contest lifecycle entities | Decommission later |
| `User.points` | MVP soft-currency / reward economy unit | Preserve with adaptation |
| Progression signals currently mixed around points/UI | `UserProgression` as separate concern | Replace (conceptually) |
| `/api/me` legacy profile payload | Coexistence payload with legacy + projections | Preserve with adaptation |
| `useSession` as central catch-all transport | Keep core session responsibility + split domain hooks/modules | Preserve with adaptation |
| `CardFrame` stat-centric assumptions | collectible-first rendering model adapters/components | Replace (progressively) |
| PvE routes/pages/libs | Contest routes/pages/services | Decommission later |
| Pack routes | Keep route shape, evolve internals to instance-based outcomes | Preserve with adaptation |
| Profile counters tied to PvE loop | progression/contest/profile summary projections | Preserve with adaptation |

Clarification on currency vs progression:
- `points` remains MVP soft-currency unless explicitly redesigned.
- progression/XP remains a separate progression-layer concern.
- no implicit early merge between economy and progression is assumed.

## 7. Transition boundaries

### 7.1 Can coexist temporarily
- auth/session stack,
- legacy pack and collection experiences while internals evolve,
- legacy PvE loop during contest rollout and hardening.

### 7.2 Must be duplicated temporarily
- domain data layer (legacy + target in parallel),
- serializer/payload layer (`/api/me` coexistence payload),
- frontend rendering/adapters during visual/domain transition.

### 7.3 Should be replaced early
- ownership write model (quantity -> instance),
- drop model internals (toward token/rarity/edition-aware definitions),
- contest backend foundations.

### 7.4 Should remain legacy until late
- PvE player-facing loop and related counters,
- compatibility API fields still required by active UI.

## 8. Read models / projections strategy

The pivot requires a deliberate projection layer to avoid ad hoc aggregation spread across pages and handlers.

Why this matters:
- instance-aware ownership produces high-granularity data,
- UI/API use cases require stable summaries and aggregates,
- projection boundaries reduce coupling and migration risk.

Target projection families:
- **Collection projections**: grid-ready ownership summaries and filter dimensions.
- **Memedex projections**: seen/owned/missing and completion progress.
- **Contest roster projections**: eligibility and lock-aware selection views.
- **Contest summary projections**: rank/score and lifecycle summaries.
- **Profile summary projections**: account, collection, competitive top-level signals.

Policy:
- core domain remains instance-aware ownership + contest entities,
- raw instances are not the default UI contract everywhere,
- projections are first-class API consumption models.

## 9. Phased migration plan

## Phase 0 — Preconditions / Freeze / Contracts

- **Objective**
  - lock architecture boundaries and coexistence contracts before stateful migration.
- **Scope**
  - transition ADRs, naming validation, `/api/me` compatibility contract.
- **Affected layers/files**
  - docs and API contract definitions.
- **Dependencies**
  - none.
- **Main risks**
  - ambiguous boundaries causing rework.
- **Exit criteria**
  - agreed domain naming and `/api/me` coexistence contract.

## Phase 1 — Parallel Domain Foundations

- **Objective**
  - introduce target domain foundations in parallel (no legacy deletion).
- **Scope**
  - domain models/services for catalog, ownership instances, contests, rewards, progression.
- **Affected layers/files**
  - data model and new domain service layers.
- **Dependencies**
  - Phase 0 contracts.
- **Main risks**
  - dual-source confusion without clear write ownership boundaries.
- **Exit criteria**
  - target domain write/read paths validated in isolation.

## Phase 2 — Pack + Collection Transition

- **Objective**
  - transition acquisition and collection from quantity semantics to instance-aware semantics with projection support.
- **Scope**
  - pack backend adaptation to instance creation,
  - collection aggregation/read model construction,
  - initial memedex-supporting projections,
  - initial collection UI adaptation strategy on projection contracts.
- **Affected layers/files**
  - pack APIs, serializers, card domain services, collection pages/hooks.
- **Dependencies**
  - Phase 1 target domain foundations.
- **Main risks**
  - collection UX regressions if projections are underspecified.
- **Exit criteria**
  - pack openings create owned instances and collection UI consumes stable projection outputs.

## Phase 3 — Contest Backend MVP

- **Objective**
  - deliver contest lifecycle backend with lock and scoring structures.
- **Scope**
  - contest/rule/entry/lock/score/ranking/settlement/reward flows.
- **Affected layers/files**
  - new contest APIs/services and admin-facing backend modules.
- **Dependencies**
  - Phases 1–2.
- **Main risks**
  - lock semantics and scoring consistency complexity.
- **Exit criteria**
  - end-to-end contest backend flow operational in controlled environment.

## Phase 4 — Contest Frontend MVP

- **Objective**
  - deliver contest player surfaces on top of contest backend contracts.
- **Scope**
  - contest discovery, entry, rostering, score/ranking, outcome views.
- **Affected layers/files**
  - new contest pages/components/hooks.
- **Dependencies**
  - Phase 3.
- **Main risks**
  - coupling contest UI to legacy PvE assumptions.
- **Exit criteria**
  - users can enter and track MVP contests end-to-end.

## Phase 5 — Profile / Progression V2

- **Objective**
  - evolve profile from PvE-centric counters to multi-layer progression summaries.
- **Scope**
  - profile APIs/views for account, collection, competitive progression.
- **Affected layers/files**
  - `/api/me`, session consumption, profile pages/components.
- **Dependencies**
  - Phases 2–4.
- **Main risks**
  - payload drift and backward-compatibility breaks.
- **Exit criteria**
  - profile uses projection-backed progression summaries with compatibility maintained.

## Phase 6 — PvE Decommission

- **Objective**
  - retire PvE as structural backbone once contest loop is stable.
- **Scope**
  - staged PvE deprecation in APIs, pages, and backend services.
- **Affected layers/files**
  - PvE routes/pages/libs and related payload fields.
- **Dependencies**
  - contest system and progression/rewards stability.
- **Main risks**
  - premature removal harming retention.
- **Exit criteria**
  - PvE no longer required for primary product loop continuity.

## Phase 7 — Cleanup

- **Objective**
  - remove remaining legacy architecture debt.
- **Scope**
  - obsolete models, payload fields, compatibility adapters.
- **Affected layers/files**
  - legacy-only schema fields/routes/components.
- **Dependencies**
  - successful Phase 6 rollout.
- **Main risks**
  - accidental removal of still-used compatibility edges.
- **Exit criteria**
  - architecture and repo aligned with target domain without legacy crutches.

## 10. File / layer impact map

### Keep stable initially
- `lib/auth.ts`
- auth routes under `app/api/auth/*`
- shell/navigation scaffolding components

### Extend
- `app/api/me/route.ts`
- `components/useSession.ts`
- `app/collection/page.tsx`
- `app/compte/page.tsx`

### Refactor
- `lib/cards.ts`
- `lib/serializers.ts`
- `types/cards.ts`
- `components/ui/CardFrame.tsx`

### Replace later
- PvE APIs under `app/api/pve/*` and `app/api/guest/pve/*`
- PvE page `app/combats/page.tsx`
- PvE domain libs under `lib/pve/*`

### Remove later
- PvE-legacy-only fields and compatibility payload surface once decommission complete

## 11. API transition strategy

### 11.1 Legacy APIs retained temporarily
- keep auth/session APIs,
- keep pack and profile endpoints as compatibility anchors,
- keep PvE endpoints during coexistence period.

### 11.2 New APIs introduced incrementally
- contest lifecycle APIs,
- contest scoring/ranking views,
- collection/memedex projection endpoints,
- progression summary endpoints,
- admin contest management endpoints.

### 11.3 `/api/me` evolution
- evolve `/api/me` into coexistence payload:
  - legacy-compatible fields,
  - new projection blocks for collection/contest/profile summaries.
- maintain non-breaking behavior during cutover windows.

### 11.4 Deprecation management
- mark fields/routes as deprecated only after consumers migrate,
- remove in late phases with explicit cutover gates.

## 12. Frontend transition strategy

1. Keep `useSession` focused on session/identity bootstrap responsibilities.
2. Introduce domain-specific hooks/modules for collection, contests, and progression.
3. Use adapter strategy around `CardFrame` during rendering model transition.
4. Evolve collection UI using projection contracts (not raw instance lists everywhere).
5. Evolve profile UI toward account/collection/competitive progression summaries.
6. Build contest pages/modules as first-class surfaces; do not overfit legacy PvE screens.

## 13. Data and migration risks

1. **Critical blocker**: destructive deploy workflow (`--force-reset`) is incompatible with stateful migration.
2. Dual source of truth risk during parallel legacy/target coexistence.
3. Historical data limitations in legacy logs and payload granularity.
4. Guest-mode continuity and contest lock semantics complexity.
5. Pack/reward/history migration integrity risks.
6. API payload drift and compatibility regressions.
7. Contest scoring and lock orchestration operational complexity.

## 14. Critical prerequisites before implementation

Implementation should not start without these prerequisites:

1. **Replace destructive reset deployment workflow for migration environments**
   - stateful migration work must not proceed under destructive reset semantics.
2. **Validate `/api/me` coexistence contract**
   - explicit compatibility + projection boundary agreement.
3. **Validate target domain naming and boundaries**
   - Project vs CardTemplate separation,
   - OwnedCardInstance centrality,
   - projection-layer boundary clarity.
4. **Validate economy vs progression separation**
   - points as MVP soft currency,
   - progression modeled separately unless explicitly redesigned.

## 15. Recommended implementation order

1. Resolve prerequisites (especially destructive reset blocker).
2. Lock coexistence contracts (`/api/me`, projection boundaries, naming).
3. Introduce parallel target domain foundations.
4. Migrate pack and collection write/read paths to instance + projections.
5. Deliver contest backend MVP.
6. Deliver contest frontend MVP.
7. Move profile/progression to V2 summary model.
8. Decommission PvE after contest loop stability criteria are met.
9. Run cleanup phase.

What must not happen too early:
- PvE removal before contest stability,
- forced big-bang UI rewrite,
- direct raw-instance UI exposure without projection contracts.

What is intentionally delayed:
- full legacy cleanup and hard deletions,
- non-MVP advanced systems beyond validated scope.

## 16. Open decisions / controlled unknowns

These are known open decisions, not undocumented gaps:

1. Exact contest scoring runtime cadence and publication strategy.
2. Guest scope and constraints in contest participation.
3. Projection granularity and refresh strategy per surface.
4. Potential currency/progression bridges (if any) after MVP validation.
5. Historical backfill strategy depth for legacy events.
6. Cutover thresholds for final PvE decommission timing.
