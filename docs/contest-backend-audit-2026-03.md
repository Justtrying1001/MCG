# MCG Contest Backend Audit

Date: 2026-03  
Scope: backend contest systems + couplings (collection instances, rewards, progression, admin ops, APIs, docs, tests)

---

## 1. Executive summary

### 1.1 What exists today

MCG already has a complete **contest CRUD+ops backbone** in production code:
- Contest lifecycle entities (`Contest`, `ContestRule`, `ContestEntry`, `RosterLock`, `ContestScore`, `ContestRanking`, `ContestSettlement`) in Prisma.
- Player flows for list/detail/ranking/lineup options/entry.
- Admin flows for create/status update/manual score injection/manual settlement.
- Runtime orchestrator centralized in `lib/domain/contests/runtime.ts` with transaction usage and explicit runtime errors.

### 1.2 What is solid

- **Ownership truth for lineups is correctly instance-aware** (`OwnedCardInstance`) and not legacy quantity-based inventory.
- **Cross-contest lock prevention is implemented** at write time (prevents same owned instance in multiple active contests).
- **Serializable transactions are used** in entry, scoring, and settlement flows.
- **Ranking recomputation is deterministic** (ordered by score desc, then userId asc) and persisted.
- **Admin auth gating exists** (session cookie or internal key) for internal contest APIs.

### 1.3 What is partial

- Contest status machine is present in enum but **transition policy is weakly enforced** (status can be set to any enum value directly).
- Scoring is currently **manual ingestion only** (JSON score rows), no source integration.
- Settlement supports reward rows, but **reward semantics are only partially validated** (e.g., pack/card reward shape not fully enforced).
- Competitive progression is mostly **derived/read-model style**, with partial persisted fallback (`CompetitiveProgression`).

### 1.4 What is fragile

- **Contest settlement is not ledger-aligned**: it writes `RewardGrant` and mutates `User.points` directly for points rewards, bypassing `RewardLedgerEntry` conventions used by newer rewards systems.
- **Settlement preconditions are too permissive**: contest can be settled without requiring scored/ranked completeness.
- **Lock release lifecycle is incomplete**: roster lock rows and `OwnedCardInstance.lockState` are set on entry, but no explicit unlock/reset path is implemented at settlement/cancel.
- User lineup options endpoint can return instances with non-null `lockState`; true lock validity is enforced later in runtime, causing possible UX/back-end mismatch windows.

### 1.5 Main redesign/refactor implications

- Keep the **instance-aware lineup + lock model foundation**, but harden lifecycle rules and unlock semantics.
- Refactor contest rewards to use the **ledger as source-of-truth for points balance movement** while keeping grant records for reward attribution.
- Formalize an explicit contest state transition graph and enforce it in runtime (not only UI/admin conventions).
- Replace manual score JSON ingestion with a pluggable scoring pipeline, while preserving idempotent upsert/ranking recompute behavior.

---

## 2. Contest system reality today

### 2.1 Contest lifecycle

Implemented statuses are: `DRAFT`, `OPEN`, `LOCKED`, `LIVE`, `SETTLED`, `CANCELED`.

**Real lifecycle behavior in code today:**
1. Admin creates contest (default `DRAFT` unless provided).
2. Admin can set status to any enum via status endpoint.
3. User entry is allowed only when contest status is exactly `OPEN` and lock time not passed.
4. Score ingestion is allowed when contest is `LOCKED` or `LIVE`.
5. Settlement rejects only already-settled contests; otherwise it can proceed and then forces contest status to `SETTLED`.

**Lifecycle safety assessment:**
- There is no central transition guard (e.g., `DRAFT -> OPEN -> LOCKED -> LIVE -> SETTLED`) beyond endpoint-specific checks.
- Admin status endpoint can jump states arbitrarily.
- Settlement does not require contest to be `LIVE`/`LOCKED` or to have complete scoring/ranking.

### 2.2 Entry and lineup model

Current user entry path:
- User POSTs `lineupInstanceIds`.
- Runtime normalizes IDs, rejects empty/duplicates.
- Contest must exist, be `OPEN`, and not be past `lockAt`.
- One entry per `(contestId,userId)` enforced (runtime and DB unique).
- Lineup size must exactly match `ContestRule.maxRosterSize` (default 5).
- Ownership validation checks every lineup instance exists under requesting `userId` in `OwnedCardInstance`.
- Optional card set restriction enforces all lineup templates belong to `ContestRule.cardSetId`.
- Cross-contest lock scan rejects lineup instances already locked in contests with status `OPEN|LOCKED|LIVE` and entry status `SUBMITTED|LOCKED|SCORED`.
- Entry is created with status `LOCKED` (not `SUBMITTED`) and roster lock rows are inserted.
- `OwnedCardInstance.lockState` is set to `CONTEST:<contestId>:ENTRY:<entryId>` for all lineup cards.

### 2.3 Roster lock model

Model-level lock artifacts:
- `RosterLock` rows connect each entry to owned instances.
- `OwnedCardInstance.lockState` stores a string lock marker.

Enforcement model:
- Hard enforcement for double-use comes from querying `RosterLock` against active contests, not from `lockState` string.
- `lockState` is mostly a convenience/visibility field for UI.

Fragility:
- No explicit unlock operation on settlement/cancel/status transition; stale `lockState` and historical `RosterLock` rows can persist indefinitely.
- Active lock query intentionally ignores settled/canceled contests, so stale rows do not block entry but can confuse ops/UX.

### 2.4 Scoring model

- Scoring input is manual, admin-provided JSON list of `{ userId, score }`.
- Runtime validates non-empty array, non-empty userId, numeric finite score.
- Duplicate user IDs in payload are deduped by last-write-wins in memory map.
- Scores are upserted per `(contestId,userId)`.

Operationally this is an MVP/manual scoring interface with no upstream feed integration, no schema for scoring provenance, and no per-card/lineup scoring decomposition.

### 2.5 Ranking model

- Rankings are persisted in `ContestRanking` (not computed on read).
- On score submission, runtime:
  - reads all contest scores,
  - sorts by `score DESC`, then `userId ASC`,
  - deletes prior rankings,
  - recreates rankings sequentially with rank = index + 1.

Tie handling is deterministic but simplistic:
- equal scores do not share same rank; they become sequential ranks based on userId sort.

### 2.6 Settlement model

Settlement flow:
1. Ensure contest exists.
2. Reject if contest already `SETTLED` or settlement row already exists.
3. Create one `ContestSettlement` row.
4. Iterate reward rows, create `RewardGrant` for each.
5. For `POINTS` rewards, increment `User.points` directly.
6. Set contest status to `SETTLED`.
7. Set all contest entries to `SETTLED`.

Meaning of `ContestSettlement` today:
- It is primarily a one-per-contest settlement marker + foreign key anchor for related reward grants.

Meaning of `RewardGrant` today in contests:
- Acts as reward attribution record (who got what from which settlement).
- For points, it is not the balance source-of-truth (balance mutation is direct `User.points` increment).

### 2.7 Reward coupling

Critical audit finding:
- Contest settlement rewards are **not aligned with ledger-based reward architecture** used in welcome/pack/quests/manual grants.
- Points from contests bypass `RewardLedgerEntry`, so:
  - user ledger history can be incomplete relative to actual balance,
  - idempotency and audit semantics differ from other reward flows,
  - downstream analytics that rely on ledger can miss contest distributions.

### 2.8 Progression coupling

Couplings implemented:
- Contest entry triggers quest milestone progression via `applyContestEntryQuestProgressionTx` in the same transaction.
- Profile progression summary computes competitive metrics from contest entries/rankings and optional `CompetitiveProgression` row.

Observed behavior:
- `contestsEntered`, `activeEntries`, `settledEntries`, recent results are derived at read time.
- `contestsWon` can come from stored progression row or fallback derived from recent rankings, which can create model duality.

### 2.9 Admin ops reality

Admin can do all core operations in panel:
- Create contest,
- manually set status,
- paste score JSON,
- configure settlement reward rows.

Reality check:
- Operable for internal technical ops, but still highly manual and error-prone.
- UI exposes low-level technical IDs (`userId`, `packDefinitionId`) and raw JSON score ingestion.
- Very limited guardrails/workflow orchestration (no wizarded lifecycle checks, no preflight validations beyond runtime errors).

---

## 3. Code audit by layer

### 3.1 Data model

#### Implemented entities and role

- `Contest`: contest identity + schedule + global status.
- `ContestRule`: per-contest rule container (`maxRosterSize`, optional `cardSetId`, JSON config).
- `ContestEntry`: one row per user entry per contest.
- `RosterLock`: join table recording selected owned instances per entry.
- `ContestScore`: persisted score per user per contest.
- `ContestRanking`: persisted rank snapshot per user per contest.
- `ContestSettlement`: one settlement marker per contest.
- `RewardGrant`: generic reward attribution model; can reference contest settlement.

#### Key constraints/invariants in schema

- Unique contest code.
- Unique `(contestId,userId)` for entries/scores/rankings.
- Unique `(contestEntryId,ownedCardInstanceId)` for roster locks.
- Unique settlement per contest.

#### Structural limits

- No explicit state transition table or transition log.
- `ContestRule` is a list relation; runtime assumes first rule (`findFirst`), so multi-rule future is ambiguous.
- `OwnedCardInstance.lockState` is a free-form string, not enum/relational lock object.
- Settlement model has no per-rank payout structure; rewards are externally supplied at settlement time.

### 3.2 Runtime/domain logic

`lib/domain/contests/runtime.ts` centralizes all contest commands/queries.

Robust parts:
- Validation-heavy lineup normalization.
- Ownership and rule checks.
- Active lock conflict detection across contests.
- Serializable transactions around contested writes.
- Ranking rebuild and entry status updates after score ingestion.

MVP/manual/fragile parts:
- Status update command has no transition policy.
- Entry status starts directly at `LOCKED`, leaving `SUBMITTED` underused.
- Settlement lacks precondition checks (e.g., minimum scoring completeness).
- Reward validation is shallow for non-points reward types.
- No lock release path.

### 3.3 User APIs

Implemented user endpoints:
- `GET /api/contests`: authenticated list, returns non-draft/non-canceled statuses (`OPEN|LOCKED|LIVE|SETTLED`).
- `GET /api/contests/:contestId`: authenticated contest detail + caller entry.
- `GET /api/contests/:contestId/ranking`: authenticated ranking snapshot.
- `GET /api/contests/:contestId/lineup-options`: authenticated owned instances projected with template metadata.
- `POST /api/contests/:contestId/enter`: authenticated entry creation with lineup.

API abstraction quality:
- Functional and straightforward but still close to DB/runtime structure.
- Some product-facing concepts are implicit rather than explicit (e.g., no dedicated lock-window state object, no eligibility reasons per option except lockState display).

### 3.4 Internal/admin APIs

Implemented internal endpoints:
- `GET/POST /api/internal/contests`
- `GET /api/internal/contests/:contestId`
- `POST /api/internal/contests/:contestId/status`
- `POST /api/internal/contests/:contestId/score`
- `POST /api/internal/contests/:contestId/settle`

Security model:
- Requires either valid admin session cookie or `x-internal-admin-key`.

Ops abstraction assessment:
- API exposes technical primitives (direct status setting, raw score list, raw rewards list) with limited domain-level guardrails.
- Good for internal engineering velocity; not ideal for non-technical live ops users.

### 3.5 UI/admin surfaces

User surfaces:
- `/contests`: splits active/upcoming and settled lists.
- `/contests/[contestId]`: shows rules/meta, lineup picker, submit entry, ranking view.

Admin surfaces:
- `/admin/contests`: create form with code/title/status/times/rule fields and optional config JSON.
- `/admin/contests/[contestId]`: status select, score JSON textarea, reward rows for settlement, ranking snapshot.

Ops friction:
- Heavy reliance on manual IDs and JSON payload crafting.
- No first-class participant list + score helper tooling.
- No explicit lifecycle guidance/checklist in UI.

### 3.6 Docs

What is accurate:
- README and architecture docs correctly list contest routes and major runtime components.
- `repo-cartography` broadly reflects current contest building blocks and flow.

Gaps/inaccuracies:
- Requested file `docs/repo-and-docs-consolidation-audit-2026-03.md` is absent.
- High-level docs describe contest-driven runtime but do not detail critical caveats:
  - missing lock release semantics,
  - weak status transition enforcement,
  - settlement-vs-ledger inconsistency.
- Some docs are historical/transformation oriented and not a strict backend contest SoT.

### 3.7 Tests

Findings:
- No dedicated tests for `lib/domain/contests/runtime.ts`.
- No direct API tests for contest endpoints.
- Contest coupling is indirectly covered through quest progression tests (contest entry count milestone behavior) and profile read-model tests.

Risk implication:
- Core contest lifecycle correctness is weakly protected by automated tests compared with rewards/quests/acquisition domains.

---

## 4. Strengths and reusable foundations

1. **Correct ownership primitive for competitive lineups** (`OwnedCardInstance`).
2. **Centralized contest runtime module** with clear command functions.
3. **Transactional mutation discipline** in critical write paths.
4. **Practical admin control plane** already available for launch-stage operations.
5. **Persisted ranking snapshots** enabling stable profile/read-model integration.

---

## 5. Weaknesses, risks, and debt

1. **Reward architecture split-brain (critical):** contest points do not use ledger while newer systems do.
2. **Lifecycle policy debt:** status transitions and settlement prerequisites are not rigorously encoded.
3. **Lock lifecycle debt:** no unlock/reset routine for instance lock markers and lock rows.
4. **Ops fragility:** manual score + reward entry with raw IDs and JSON.
5. **Testing gap:** high-risk contest domain is under-tested.
6. **Model ambiguity:** single-rule assumption implemented over one-to-many schema design.

---

## 6. Documentation accuracy audit for contests

### Accurate enough today
- Contest runtime exists and is centralized.
- Player and internal contest API surfaces listed in docs are mostly correct.
- Product positioning as contest-driven is coherent with implemented routes/pages.

### Incomplete or weakly documented
- Real lifecycle constraints and transition safety are not documented as enforceable rules.
- Settlement-reward behavior (especially ledger bypass) is under-documented.
- Lock cleanup semantics absent from docs.

### Missing artifact
- `docs/repo-and-docs-consolidation-audit-2026-03.md` requested in scope is not present in repository.

---

## 7. Gaps for future contest backend maturity

1. Explicit contest state machine with transition guards + audit trail.
2. First-class scoring ingestion pipeline (source adapters, schema, idempotency).
3. Ledger-integrated contest reward settlement.
4. Deterministic unlock lifecycle management for roster locks and instance lock state.
5. Stronger admin UX abstractions (rank-based payout templates, validated scoring import tooling).
6. Dedicated contest runtime and API test suite covering invariants and failure modes.

---

## 8. Recommended next design questions

1. What is the canonical contest lifecycle graph and who is allowed to trigger each transition?
2. Should ranking be immutable per scoring version, or replace-in-place as now?
3. What tie policy should be product-standard (shared rank vs sequential rank)?
4. Should contest settlement be possible without full score coverage?
5. How should rewards be represented: grant attribution + ledger movement in one atomic pattern?
6. What is the canonical unlock moment (`LOCKED->LIVE`, `LIVE->SETTLED`, cancellation)?
7. Which admin actions need guardrailed high-level workflows vs low-level raw endpoints?

---

## 9. File-by-file evidence appendix

### Core contest data/runtime
- `prisma/schema.prisma` — contest/reward/progression models and constraints.
- `lib/domain/contests/runtime.ts` — lifecycle command/query logic, validations, transactions, reward writes.

### Contest API layer
- `app/api/contests/route.ts`
- `app/api/contests/[contestId]/route.ts`
- `app/api/contests/[contestId]/ranking/route.ts`
- `app/api/contests/[contestId]/lineup-options/route.ts`
- `app/api/contests/[contestId]/enter/route.ts`
- `app/api/internal/contests/route.ts`
- `app/api/internal/contests/[contestId]/route.ts`
- `app/api/internal/contests/[contestId]/status/route.ts`
- `app/api/internal/contests/[contestId]/score/route.ts`
- `app/api/internal/contests/[contestId]/settle/route.ts`

### Coupled domains
- `lib/domain/quests/runtime.ts` — contest entry milestone progression coupling.
- `lib/domain/progression/profile-summary.ts` — contest-derived competitive summary.
- `lib/domain/rewards/ledger.ts` and `lib/domain/rewards/conventions.ts` — ledger standard used by other reward paths.
- `app/api/rewards/ledger/route.ts` — user-visible ledger read path.

### UI/admin operational surfaces
- `app/contests/page.tsx`
- `app/contests/[contestId]/page.tsx`
- `app/admin/(protected)/contests/page.tsx`
- `app/admin/(protected)/contests/[contestId]/page.tsx`
- `app/admin/(protected)/layout.tsx`

### Documentation audited
- `README.md`
- `docs/current-runtime-architecture.md`
- `docs/repo-cartography-2026-03.md`
- `docs/mcg-pivot-product-foundation.md`
- `docs/reward-system-audit-2026-03.md`
- `docs/README.md`
- Missing in repo: `docs/repo-and-docs-consolidation-audit-2026-03.md`

### Tests audited
- No dedicated contest runtime/API tests found in `tests/`.
- Contest coupling evidence reviewed via quest/progression tests:
  - `tests/quests-runtime.test.ts`
  - `tests/api-me-read-model.test.ts`
  - `tests/api-quests-route.test.ts`

