# MCG Repo + Docs Consolidation Audit

_Date: 2026-03_

## 1. Executive summary

### 1.1 What is actually implemented today
- Economy is points-first with `PACK_COST = 500` and welcome reward `500` on first authenticated signup.
- Reward ledger (`RewardLedgerEntry`) is live and used for:
  - welcome reward credit,
  - pack opening debit,
  - quest reward credit,
  - admin manual grant credit.
- Quests are live with user/admin APIs and UI:
  - `CONTEST_COUNT_MILESTONE` auto progression/completion + auto credit,
  - `SOCIAL_FOLLOW_X` and `SOCIAL_ENGAGEMENT_X` submit/review flow (manual admin moderation).
- Admin reward operations are live:
  - `/admin/rewards` + `/api/internal/rewards/manual-grant`,
  - `/api/internal/users/search` user lookup.
- Rewards user surface is live at `/rewards`:
  - points ledger history,
  - quest list,
  - social proof submission,
  - quest status buckets.

### 1.2 What is partially implemented
- Ledger adoption is partial at system scope:
  - quest/manual/welcome/pack are ledger-backed,
  - contest settlement points still mutate `User.points` directly and only write `RewardGrant` (not `RewardLedgerEntry`).
- Quest enum/model supports broader values (`WELCOME`, `MANUAL`, `CLAIMABLE` status, etc.) but runtime automation is only implemented for contest milestone + social submit/review.
- Legacy + target data coexistence remains intentional (`UserCard`/`PackOpening` plus `OwnedCardInstance`/`PackOpeningEvent`).

### 1.3 What is not implemented (despite prior mention in docs/history)
- No social auto-verification against external X APIs.
- No dedicated user-side “claim reward” step (credits happen automatically on completion/approval).
- No reward-pack/card-instance quest rewards in runtime (quest rewards are points-only).
- No fully unified points accounting ledger across all point mutations (contest settlement still outside ledger).

### 1.4 Main repo/documentation risks
- Historical docs still read like “pre-implementation plans” and can mislead engineers about what is already live.
- Some docs framed as source-of-truth were stale regarding rewards/admin/quests implementation reality.
- Cross-doc confusion existed between:
  - current runtime truth,
  - transformation history,
  - cartography snapshots.

### 1.5 Cleanup actions applied in this pass
- Added this consolidation audit as a new reference document.
- Updated docs index to classify docs by role (current source-of-truth vs historical/archive context).
- Updated runtime architecture doc to include rewards/quests/admin realities and ledger coverage boundaries.
- Updated README docs section to point to the consolidation audit and clarify documentation roles.
- Added “historical snapshot” framing to repo cartography + transformation docs.

---

## 2. Current implemented system reality

### 2.1 Economy and points
- `PACK_COST` is `500` in runtime config.
- New users created from X OAuth callback are initialized with `points: 0` then credited via welcome ledger helper (`+500`).
- Pack opening debits points via `debitPointsWithLedger`.
- Contest settlement can still increment points directly for `RewardType.POINTS` grants.

### 2.2 Reward ledger
**Used for:**
- Welcome reward (`WELCOME_REWARD`, idempotent `welcome:<userId>`).
- Pack open debit (`PACK_OPEN`, reasonRef = pack code).
- Quest rewards (`QUEST_REWARD`) with idempotency:
  - milestone: `quest:<questId>:user:<userId>`,
  - approval: `quest-approval:<questId>:user:<userId>`.
- Admin manual grants (`ADMIN_GRANT`) with operator-provided/generated idempotency key.

**Not used for:**
- Contest settlement rewards (`RewardGrant` + direct `User.points` increment).

### 2.3 Quest system
- Schema and admin CRUD support multiple quest types.
- Runtime-supported behavior is explicit:
  1. `CONTEST_COUNT_MILESTONE` + `AUTO` → progress sync on contest entry, auto-complete + auto-credit.
  2. `SOCIAL_FOLLOW_X`/`SOCIAL_ENGAGEMENT_X` + `SUBMIT`/`MANUAL_REVIEW` → user submits proof; admin approves/rejects.
- Lifecycle in practice:
  - submit creates `QuestSubmission(SUBMITTED)` and sets progress `IN_PROGRESS`.
  - approve sets submission `APPROVED`, progress `COMPLETED`, credits points.
  - reject sets submission `REJECTED`, progress `REJECTED` (unless already completed).

### 2.4 Social submit/review
- User endpoint: `POST /api/quests/:questId/submit`.
- Admin queue endpoints:
  - `GET /api/internal/quests/submissions`
  - `POST /api/internal/quests/submissions/:submissionId/review`
- Admin UI queue: `/admin/quests/submissions`.
- No external verification; proof is reviewed manually by admin/operator.

### 2.5 Manual grants
- API: `POST /api/internal/rewards/manual-grant` (+ `GET` recent grants).
- UI: `/admin/rewards`.
- Points-only credits through ledger with idempotency support.

### 2.6 Admin analytics
- Quest list (`/api/internal/quests`) returns per-quest analytics:
  - progress/completed,
  - submission counts by status,
  - total points distributed (derived from ledger `QUEST_REWARD` credits).
- Quest detail (`/api/internal/quests/:questId`) includes analytics + latest submissions/completions/ledger credits.

### 2.7 User-facing rewards surface
- `/rewards` shows:
  - ledger entries from `/api/rewards/ledger`,
  - quest list from `/api/quests`,
  - social submit forms,
  - bucketed quest states (Available / Under review / Needs resubmission / Completed).

### 2.8 Admin-facing surfaces
- `/admin` links to contests, quest definitions, submissions queue, rewards ops.
- `/admin/quests` supports create/edit/toggle for quest definitions.
- `/admin/quests/submissions` handles moderation actions.
- `/admin/quests/:questId` provides operational detail and analytics.
- `/admin/rewards` supports user search + manual point grants + recent grants list.

---

## 3. Codebase audit by domain

### 3.1 Packs / acquisition
- Auth pack open is DB-native controlled emission (`CardTemplate` remaining supply).
- Pack open is ledger-debited for points.
- Legacy dual-write remains (`UserCard`, `PackOpening`) for continuity.

### 3.2 Collection / progression
- V2 projection is active with instance-aware ownership first.
- Legacy fallback retained.

### 3.3 Contests
- Contest lifecycle APIs and runtime are operational (create, status, score, settle).
- Settlement writes `RewardGrant`; points rewards still update balance directly.

### 3.4 Rewards
- Reward ledger is implemented and actively queried by `/api/rewards/ledger`.
- Ledger conventions are centralized in code.

### 3.5 Quests
- Runtime and APIs implemented for milestone + social submit/review flows.
- Broader enum values exist but are not fully productized.

### 3.6 Admin / ops
- Admin auth (cookie) + internal admin key support exists.
- Reward ops and quest ops surfaces are live but basic (MVP operations tooling).

### 3.7 Auth / onboarding
- X OAuth callback upserts user and applies idempotent welcome reward via ledger helper.

### 3.8 Legacy / transitional areas
- PvE endpoints intentionally return `410 Gone`.
- Legacy acquisition/read compatibility still present by design.
- Contest reward path still partially outside ledger model.

---

## 4. Documentation audit

### 4.1 README.md
- **Accuracy:** Mostly accurate on live rewards/quests/admin surfaces.
- **Issue found:** docs section didn’t clearly separate runtime truth vs historical docs.
- **Action:** Updated docs list to include consolidation audit and role-based reading guidance.

### 4.2 docs/README.md
- **Accuracy:** stale framing of “source-of-truth” included transformation/historical docs.
- **Action:** Reframed into:
  - current runtime source-of-truth,
  - product foundation,
  - consolidation audit,
  - historical/archival references.

### 4.3 docs/repo-cartography-2026-03.md
- **Accuracy:** contains major stale statements (e.g., rewards/quests/admin not yet live).
- **Action:** added explicit historical-snapshot notice at top to prevent misuse as current truth.

### 4.4 docs/reward-system-audit-2026-03.md
- **Accuracy:** largely aligned with quest/reward implementation.
- **Gap:** does not foreground contest settlement path being outside ledger.
- **Action:** left unchanged in this pass (captured clearly in this consolidation audit + runtime doc).

### 4.5 docs/current-runtime-architecture.md
- **Accuracy:** acquisition/contest coverage good; rewards/quests/admin reality under-documented.
- **Action:** expanded with explicit rewards/quests/admin runtime sections + ledger boundary (contest settlement exception).

### 4.6 docs/mcg-pivot-product-foundation.md
- **Accuracy:** product vision/source doc, not runtime checklist.
- **Action:** no change needed.

### 4.7 docs/mvp-controlled-emission-transformation.md
- **Accuracy:** historical pre-implementation transformation framing.
- **Risk:** could be misread as current implementation status.
- **Action:** added historical/transformation note at top and pointer to current runtime/consolidation docs.

### 4.8 Other docs
- No other docs in `docs/`.

---

## 5. Consistency matrix

### 5.1 Code vs README
- Mostly consistent for active routes/pages and reward/quest/admin surfaces.
- README does not deeply model ledger partial-adoption caveat for contest settlement.

### 5.2 Code vs docs/*
- Main inconsistencies were in cartography/transformation docs being read as current-state docs.
- Runtime architecture doc required updates for rewards/quests/admin reality.

### 5.3 Docs vs docs
- Previously contradictory “source-of-truth” labels across historical and current docs.
- Now clarified by updated docs index + historical banners.

### 5.4 Tests vs documented behavior
- Tests confirm:
  - welcome reward idempotency and conventions,
  - quest submit/review flows,
  - manual grants route/runtime behaviors,
  - rewards ledger endpoint and quest endpoints.

---

## 6. Cleanup changes applied

### 6.1 Docs corrected
- `docs/current-runtime-architecture.md`
- `docs/README.md`
- `README.md`

### 6.2 Docs clarified
- Added historical framing to:
  - `docs/repo-cartography-2026-03.md`
  - `docs/mvp-controlled-emission-transformation.md`

### 6.3 Docs reduced / deduplicated
- Reduced confusion by centralizing “what to read first” in docs index and this consolidation audit.

### 6.4 Small safe code cleanups
- None (mission focused on audit/documentation consolidation).

---

## 7. Remaining issues / debt

### 7.1 Safe to leave for now
- Legacy dual-write/fallback paths in acquisition + `/api/me` coexistence.
- PvE compatibility endpoints returning `410`.

### 7.2 Should be addressed next
- Decide whether contest settlement points should move to ledger-backed credits (`CONTEST_REWARD`) for full accounting consistency.
- Decide whether `CLAIMABLE`/`WELCOME` quest type runtime is needed or should be de-scoped from public/admin UX.

### 7.3 Risks if ignored
- Partial ledger adoption can produce long-term audit/accounting ambiguity.
- Exposed but unused quest statuses/types can confuse ops and future contributors.

---

## 8. Recommended next doc structure

### 8.1 What should remain source-of-truth
1. `docs/current-runtime-architecture.md` (runtime truth)
2. `docs/mcg-pivot-product-foundation.md` (product intent)
3. `docs/repo-and-docs-consolidation-audit-2026-03.md` (repo/docs alignment truth)

### 8.2 What should be archival/context only
- `docs/repo-cartography-2026-03.md`
- `docs/mvp-controlled-emission-transformation.md`

### 8.3 What future agents should read first
1. `docs/README.md`
2. `docs/current-runtime-architecture.md`
3. `docs/repo-and-docs-consolidation-audit-2026-03.md`
4. `README.md`

---

## 9. File-by-file evidence appendix

Primary evidence was taken from:
- API routes under `app/api/*`.
- User/admin pages under `app/rewards` and `app/admin/(protected)/*`.
- Domain runtimes under `lib/domain/rewards/*`, `lib/domain/quests/runtime.ts`, `lib/domain/contests/runtime.ts`, `lib/domain/acquisition/open-pack.ts`.
- Data model in `prisma/schema.prisma`.
- Tests in `tests/*` for rewards/quests/manual-grants/onboarding/ledger conventions.
