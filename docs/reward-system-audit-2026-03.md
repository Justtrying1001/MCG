# MCG Reward System Audit — 2026-03

## Scope
This audit captures the reward/quest state after Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5 + Phase 6 MVP slices.

## Implemented now
- Pack cost baseline is `500` points.
- First authenticated signup receives `500` points as welcome reward.
- Welcome reward is idempotent using ledger key `welcome:<userId>`.
- New append-only points ledger foundation exists via `RewardLedgerEntry`.
- Pack opening writes a ledger debit entry (`DEBIT` / `PACK_OPEN`) in the same transaction path.
- Minimal quest foundations are present in Prisma:
  - `QuestDefinition`
  - `UserQuestProgress`
  - `QuestSubmission`

## Phase 3 MVP slices now live
- User rewards ledger API: `GET /api/rewards/ledger`
- User quests API: `GET /api/quests`
- Admin quest definition APIs:
  - `GET /api/internal/quests`
  - `POST /api/internal/quests`
  - `GET /api/internal/quests/:questId`
  - `PATCH /api/internal/quests/:questId`
- User page: `/rewards`
- Admin panel: `/admin/quests`
- First live quest type:
  - `CONTEST_COUNT_MILESTONE`
  - progression trigger: successful contest entry creation
  - lifecycle policy: auto-progress + auto-complete + auto-credit
  - reward mode: points-only
  - anti-double-credit: ledger idempotency key `quest:<questId>:user:<userId>`


## Phase 4 SOCIAL submit/review now live
- Social quest submit flow is active for:
  - `SOCIAL_FOLLOW_X`
  - `SOCIAL_ENGAGEMENT_X`
- User submit endpoint:
  - `POST /api/quests/:questId/submit`
- Admin review queue endpoints:
  - `GET /api/internal/quests/submissions`
  - `POST /api/internal/quests/submissions/:submissionId/review`
- Admin review UI:
  - `/admin/quests/submissions`
- User rewards UI (`/rewards`) now supports social quest proof submission and status display.

### Phase 4 lifecycle policy (MVP)
- No auto-verification against X APIs.
- Points-only rewards.
- User submits proof (`proofUrl`, `note`) for social quest types.
- Admin action `APPROVE` credits reward immediately through ledger.
- Admin action `REJECT` does not credit reward.
- Re-submission is allowed after rejection while quest remains active.
- Double-credit protection uses ledger idempotency key `quest-approval:<questId>:user:<userId>`.

## Runtime integration points
- Signup credit: `app/api/auth/x/callback/route.ts`
- Ledger primitives: `lib/domain/rewards/ledger.ts`
- Welcome helper: `lib/domain/rewards/welcome.ts`
- Quest runtime: `lib/domain/quests/runtime.ts`
- Contest trigger hook: `lib/domain/contests/runtime.ts` (`enterContestMvp`)

## Not implemented yet
- Auto-verification against external social APIs (X follow/engagement proof is manual review only).
- Dedicated claim flow endpoint/UI (social rewards credit on admin approval).
- Repeatable/daily social quests and anti-abuse automation.
- Reward packs or non-points quest rewards.

## Notes
- Legacy reward path (`RewardGrant`) remains active for contest settlement compatibility.
- Ledger introduction is additive and does not remove existing reward grant flows.


## Phase 5 MANUAL grants + analytics now live
- New admin-only manual grant API:
  - `POST /api/internal/rewards/manual-grant`
- Optional recent grants read:
  - `GET /api/internal/rewards/manual-grant`
- New admin UI:
  - `/admin/rewards`
- Manual grants are points-only and ledger-mandatory (`reasonType = ADMIN_GRANT`).
- Manual grants support explicit idempotency keys to avoid double-credit on retries/double-click.
- Internal quest listing now includes basic analytics per quest:
  - `progressCount`
  - `completedCount`
  - `pendingSubmissionCount`
  - `approvedSubmissionCount`
  - `rejectedSubmissionCount`
  - `totalPointsDistributed` (from ledger credits tied to quest rewards)


## Phase 6 Consolidation now live
- Admin rewards ergonomics improved with internal user lookup (`GET /api/internal/users/search`).
- `/admin/rewards` now supports searching/selecting users before issuing manual grants.
- Quest detail API (`GET /api/internal/quests/:questId`) now returns:
  - quest identity
  - analytics
  - latest submissions
  - recently completed users
  - latest ledger credits linked to quest rewards
- New admin quest detail page: `/admin/quests/:questId`.
- User `/rewards` view reorganized into clearer buckets: Available, Under review, Needs resubmission, Completed, Points history.

### Ledger conventions (stabilized)
Conventions are centralized in `lib/domain/rewards/conventions.ts`:
- Welcome reward:
  - `reasonRef = userId`
  - `idempotencyKey = welcome:<userId>`
- Pack open debit:
  - `reasonRef = packCode`
- Quest reward credit:
  - `reasonRef = questId`
  - milestone idempotency: `quest:<questId>:user:<userId>`
  - social approval idempotency: `quest-approval:<questId>:user:<userId>`
- Admin manual grant credit:
  - `reasonRef = manual-grant:<idempotencyKey>`
  - idempotency key required/recommended for retry safety
