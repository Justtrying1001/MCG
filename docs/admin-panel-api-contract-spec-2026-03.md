# MCG Admin Panel API Contract Spec (2026-03)

## 1. Scope

Ce document spécifie les contrats API admin cibles pour:
- Phase 0/1 (priorité haute): safety rails + auditabilité + normalisation acteur,
- phases suivantes: extension progressive sans rupture contractuelle.

Objectif: démarrer l’implémentation backend/front sans ambiguïté et limiter la dérive old/new pendant migration.

---

## 2. Global contract conventions

## 2.1 API versioning and compatibility
- Base path: `/api/internal/...`
- Contract versioning header (recommended): `x-admin-contract-version: 2026-03`
- Legacy endpoints remain active until parity signoff.

## 2.2 Authentication and actor normalization
- Existing auth gate remains: session admin OR internal key.
- New normalized actor object returned in critical responses and persisted in logs:

```json
{
  "actor": {
    "type": "admin_user",
    "id": "adm_01H...",
    "username": "ops.lead",
    "authMode": "session",
    "ip": "203.0.113.4",
    "userAgent": "Mozilla/5.0",
    "requestId": "req_01H..."
  }
}
```

If authenticated by internal key:

```json
{
  "actor": {
    "type": "service_key",
    "id": "internal-key:ops-batch",
    "username": null,
    "authMode": "key",
    "ip": "203.0.113.10",
    "userAgent": "cron/1.2",
    "requestId": "req_01H..."
  }
}
```

## 2.3 Idempotency standard (critical execute endpoints)
- Required header: `Idempotency-Key: <string>` for execute endpoints.
- Max length: 128 chars.
- Uniqueness window: 24h minimum (configurable).
- Duplicate request returns prior receipt with `idempotentReplay=true`.

## 2.4 Issue model (validation/preview)
All validate endpoints return consistent issues payload:

```json
{
  "ok": false,
  "blocking": true,
  "issues": [
    {
      "code": "SCORING_USER_NOT_ENTERED",
      "severity": "ERROR",
      "scope": "ROW",
      "field": "rows[3].userId",
      "rowIndex": 3,
      "message": "User is not entered in this contest",
      "operatorHint": "Remove this row or correct userId"
    }
  ],
  "warnings": [
    {
      "code": "SCORING_MISSING_ENTERED_USER",
      "severity": "WARN",
      "scope": "CONTEST",
      "field": null,
      "rowIndex": null,
      "message": "12 entered users have no score row",
      "operatorHint": "Confirm this is expected before execute"
    }
  ]
}
```

## 2.5 Action receipt standard
All execute endpoints return:

```json
{
  "ok": true,
  "receipt": {
    "actionId": "act_01H...",
    "actionType": "CONTEST_SCORING_EXECUTE",
    "status": "COMPLETED",
    "startedAt": "2026-03-20T10:00:00.000Z",
    "completedAt": "2026-03-20T10:00:01.230Z",
    "idempotencyKey": "score:contest_123:batch_7",
    "idempotentReplay": false,
    "actor": { "type": "admin_user", "id": "adm_01H...", "username": "ops.lead", "authMode": "session" },
    "summary": {
      "entitiesAffected": 42,
      "warningsCount": 1
    }
  }
}
```

## 2.6 Error response standard

```json
{
  "ok": false,
  "error": {
    "code": "CONTEST_TRANSITION_NOT_ALLOWED",
    "message": "Transition LOCKED -> SETTLED is not allowed",
    "category": "BUSINESS_RULE",
    "retryable": false,
    "details": {
      "fromPhase": "LOCKED",
      "toPhase": "SETTLED"
    }
  },
  "requestId": "req_01H..."
}
```

HTTP mapping:
- `400` invalid request/shape
- `401` unauthenticated
- `403` forbidden role
- `404` entity not found
- `409` state conflict/idempotency conflict
- `422` validation/business rule violations
- `429` throttled
- `500` internal

---

## 3. Role matrix (minimum)

| Endpoint family | Allowed roles |
|---|---|
| Admin action log read | `admin_ops`, `admin_supervisor`, `admin_finance_ops`, `admin_moderator` |
| Contest transitions validate/execute | `admin_ops`, `admin_supervisor` |
| Contest scoring validate/preview/execute | `admin_ops`, `admin_supervisor` |
| Contest settlement validate/preview/execute | `admin_ops`, `admin_supervisor`, `admin_finance_ops` |
| Compensation validate/preview/execute | `admin_finance_ops`, `admin_supervisor` |
| Moderation context/decide | `admin_moderator`, `admin_supervisor` |
| User admin context | `admin_ops`, `admin_moderator`, `admin_finance_ops`, `admin_supervisor` |

---

## 4. Endpoint contracts

## 4.A Admin action log

### A1. `GET /api/internal/admin-actions`

#### Identity
- Method: `GET`
- Purpose: list admin actions with filtering for audit and investigation.
- Phase: 0 (foundation)
- Roles: all admin roles (read-only)

#### Request contract
Query params:
- `cursor` (optional string)
- `limit` (optional int, default 50, max 200)
- `actionType` (optional enum)
- `actorId` (optional string)
- `module` (optional enum: `CONTESTS|QUESTS|MODERATION|REWARDS|USERS|SYSTEM`)
- `status` (optional enum: `STARTED|COMPLETED|FAILED|REJECTED`)
- `from` / `to` (optional ISO datetime)
- `entityType` / `entityId` (optional)

Example:
`GET /api/internal/admin-actions?module=CONTESTS&status=FAILED&limit=20`

#### Response contract
```json
{
  "ok": true,
  "items": [
    {
      "actionId": "act_01H...",
      "actionType": "CONTEST_SETTLEMENT_EXECUTE",
      "module": "CONTESTS",
      "status": "COMPLETED",
      "actor": {
        "type": "admin_user",
        "id": "adm_01H...",
        "username": "ops.lead",
        "authMode": "session"
      },
      "entityRefs": [
        { "type": "CONTEST", "id": "contest_123" }
      ],
      "startedAt": "2026-03-20T10:00:00.000Z",
      "completedAt": "2026-03-20T10:00:02.000Z",
      "severity": "INFO",
      "summary": {
        "message": "Settlement executed",
        "effects": { "rewardsApplied": 25 }
      }
    }
  ],
  "nextCursor": "cur_01H..."
}
```

#### Error model
- `400 INVALID_QUERY_PARAM`
- `403 FORBIDDEN_ROLE`

#### Side effects
- none (read)

#### Legacy compatibility
- New endpoint. No existing equivalent.

---

### A2. `GET /api/internal/admin-actions/{actionId}`

#### Identity
- Method: `GET`
- Purpose: fetch full action detail payload, validation snapshot and effects.
- Phase: 0
- Roles: all admin roles (read-only)

#### Response contract
```json
{
  "ok": true,
  "action": {
    "actionId": "act_01H...",
    "actionType": "CONTEST_SCORING_EXECUTE",
    "status": "COMPLETED",
    "actor": {
      "type": "admin_user",
      "id": "adm_01H...",
      "username": "ops.lead",
      "authMode": "session",
      "requestId": "req_01H..."
    },
    "request": {
      "idempotencyKey": "score:contest_123:batch_7",
      "payloadHash": "sha256:...",
      "payloadSummary": { "rows": 250 }
    },
    "validation": {
      "blocking": false,
      "issues": [],
      "warnings": [
        { "code": "SCORING_MISSING_ENTERED_USER", "count": 2 }
      ]
    },
    "effects": {
      "entitiesAffected": [
        { "type": "ContestScore", "count": 250 },
        { "type": "ContestRanking", "count": 250 }
      ],
      "accounting": null
    },
    "startedAt": "2026-03-20T10:00:00.000Z",
    "completedAt": "2026-03-20T10:00:01.230Z"
  }
}
```

#### Errors
- `404 ADMIN_ACTION_NOT_FOUND`

#### Side effects
- none

#### Legacy compatibility
- New endpoint.

---

## 4.B Contest transitions

### B1. `POST /api/internal/contest-runs/{id}/transitions/validate`

#### Identity
- Purpose: validate transition feasibility and return blocking/warning issues.
- Phase: 1
- Roles: `admin_ops`, `admin_supervisor`

#### Request
```json
{
  "targetPhase": "LIVE",
  "reasonCode": "SCHEDULED_ADVANCE",
  "note": "Starting live phase after lock verification"
}
```

Fields:
- `targetPhase` required enum: `DRAFT|OPEN|LOCKED|LIVE|SETTLED|CANCELED`
- `reasonCode` optional string (required for exceptional transitions)
- `note` optional string max 1000

Idempotency: not required for validate.

#### Response
```json
{
  "ok": true,
  "blocking": false,
  "currentPhase": "LOCKED",
  "targetPhase": "LIVE",
  "issues": [],
  "warnings": [],
  "impactSummary": {
    "entryMutations": 0,
    "scoreMutations": 0,
    "settlementMutations": 0,
    "message": "Phase transition will update contest status only"
  },
  "validationToken": "val_01H...",
  "actor": {
    "type": "admin_user",
    "id": "adm_01H...",
    "username": "ops.lead",
    "authMode": "session"
  }
}
```

#### Errors
- `404 CONTEST_NOT_FOUND`
- `422 CONTEST_TRANSITION_NOT_ALLOWED`
- `422 CONTEST_TRANSITION_PREREQUISITE_FAILED`

#### Side effects
- writes `AdminActionLog` entry type `CONTEST_TRANSITION_VALIDATE` (status completed/rejected)

#### Legacy compatibility
- Wraps legacy transition semantics currently in `/api/internal/contests/{contestId}/status`.
- Must preserve same eventual status state when execute accepted.

---

### B2. `POST /api/internal/contest-runs/{id}/transitions/execute`

#### Identity
- Purpose: execute validated phase transition.
- Phase: 1
- Roles: `admin_ops`, `admin_supervisor`

#### Request
Headers:
- `Idempotency-Key` required

Body:
```json
{
  "targetPhase": "LIVE",
  "validationToken": "val_01H...",
  "reasonCode": "SCHEDULED_ADVANCE",
  "note": "Approved by shift lead"
}
```

Rules:
- `validationToken` recommended; if absent, server validates synchronously.

#### Response
```json
{
  "ok": true,
  "receipt": {
    "actionId": "act_01H...",
    "actionType": "CONTEST_TRANSITION_EXECUTE",
    "status": "COMPLETED",
    "idempotencyKey": "transition:contest_123:live:2026-03-20",
    "idempotentReplay": false,
    "actor": { "type": "admin_user", "id": "adm_01H...", "username": "ops.lead", "authMode": "session" },
    "summary": {
      "fromPhase": "LOCKED",
      "toPhase": "LIVE",
      "entitiesAffected": 1
    }
  }
}
```

#### Errors
- `409 IDEMPOTENCY_REPLAY_CONFLICT`
- `422 CONTEST_TRANSITION_NOT_ALLOWED`

#### Side effects
- updates contest phase/status
- writes admin action log

#### Legacy compatibility
- Execute path may internally call existing `updateContestStatusMvp` until refactor complete.

---

## 4.C Contest scoring

### C1. `POST /api/internal/contest-runs/{id}/scoring/validate`

#### Identity
- Purpose: validate tabular scoring payload and return row-level issues.
- Phase: 1
- Roles: `admin_ops`, `admin_supervisor`

#### Request
```json
{
  "source": {
    "type": "TABLE",
    "label": "week12-manual-sheet"
  },
  "rows": [
    { "rowId": "r1", "userId": "usr_1", "score": 102.5 },
    { "rowId": "r2", "userId": "usr_2", "score": 98 }
  ],
  "options": {
    "allowPartial": true,
    "dedupePolicy": "LAST_WINS"
  }
}
```

Fields:
- `source.type` enum: `TABLE|CSV|API_IMPORT`
- `rows[]` required non-empty
- `rowId` optional string for UI mapping
- `userId` required string
- `score` required finite number
- `options.allowPartial` optional bool default false
- `options.dedupePolicy` enum: `LAST_WINS|ERROR_ON_DUPLICATE`

#### Response
```json
{
  "ok": true,
  "blocking": false,
  "issues": [],
  "warnings": [
    {
      "code": "SCORING_MISSING_ENTERED_USER",
      "severity": "WARN",
      "scope": "CONTEST",
      "field": null,
      "rowIndex": null,
      "message": "3 entered users are not present in scoring rows",
      "operatorHint": "If expected, proceed with allowPartial=true"
    }
  ],
  "normalized": {
    "rowCountInput": 2,
    "rowCountAccepted": 2,
    "deduped": false
  },
  "importId": "imp_01H...",
  "actor": {
    "type": "admin_user",
    "id": "adm_01H...",
    "username": "ops.lead",
    "authMode": "session"
  }
}
```

#### Errors
- `422 SCORING_INVALID_ROW`
- `422 SCORING_USER_NOT_ENTERED`
- `422 SCORING_DUPLICATE_USER`
- `422 CONTEST_PHASE_INVALID_FOR_SCORING`

#### Side effects
- persists temporary normalized scoring import artifact (TTL 24h)
- writes admin action log `CONTEST_SCORING_VALIDATE`

#### Legacy compatibility
- Validates contract compatible with existing `recordContestScoresMvp` payload generation.

---

### C2. `GET /api/internal/contest-runs/{id}/scoring/preview/{importId}`

#### Identity
- Purpose: preview ranking changes before execute.
- Phase: 1
- Roles: `admin_ops`, `admin_supervisor`

#### Response
```json
{
  "ok": true,
  "contestId": "contest_123",
  "importId": "imp_01H...",
  "preview": {
    "beforeTop": [
      { "rank": 1, "userId": "usr_1", "score": 100 }
    ],
    "afterTop": [
      { "rank": 1, "userId": "usr_2", "score": 105 }
    ],
    "rankMovements": [
      { "userId": "usr_2", "from": 4, "to": 1 }
    ],
    "entriesToMarkScored": 250,
    "warnings": [
      { "code": "SCORING_MISSING_ENTERED_USER", "message": "3 entered users not scored" }
    ]
  }
}
```

#### Errors
- `404 SCORING_IMPORT_NOT_FOUND`
- `410 SCORING_IMPORT_EXPIRED`

#### Side effects
- none (read)

#### Legacy compatibility
- none; preview is new capability.

---

### C3. `POST /api/internal/contest-runs/{id}/scoring/execute`

#### Identity
- Purpose: execute validated scoring import.
- Phase: 1
- Roles: `admin_ops`, `admin_supervisor`

#### Request
Headers:
- `Idempotency-Key` required

Body:
```json
{
  "importId": "imp_01H...",
  "allowWarnings": true,
  "reasonCode": "OFFICIAL_RESULTS_UPLOAD",
  "note": "Official sheet from esports partner"
}
```

#### Response
```json
{
  "ok": true,
  "receipt": {
    "actionId": "act_01H...",
    "actionType": "CONTEST_SCORING_EXECUTE",
    "status": "COMPLETED",
    "idempotencyKey": "score:contest_123:sheetA",
    "idempotentReplay": false,
    "actor": { "type": "admin_user", "id": "adm_01H...", "username": "ops.lead", "authMode": "session" },
    "summary": {
      "scoresUpserted": 250,
      "rankingRowsRebuilt": 250,
      "entriesMarkedScored": 250,
      "warningsCount": 1
    }
  }
}
```

#### Errors
- `422 SCORING_BLOCKING_ISSUES`
- `422 CONTEST_PHASE_INVALID_FOR_SCORING`
- `409 IDEMPOTENCY_REPLAY_CONFLICT`

#### Side effects
- upsert contest scores
- rebuild rankings
- update contest entries status to scored
- log admin action

#### Legacy compatibility
- internally calls existing scoring runtime until dedicated service extraction.

---

## 4.D Contest settlement

### D1. `POST /api/internal/contest-runs/{id}/settlement/plan/validate`

#### Identity
- Purpose: validate reward plan rows before settlement execute.
- Phase: 1
- Roles: `admin_ops`, `admin_finance_ops`, `admin_supervisor`

#### Request
```json
{
  "plan": {
    "planId": "plan_tmp_01H...",
    "rows": [
      {
        "rowId": "p1",
        "userId": "usr_1",
        "rewardPackageId": "pkg_points_500",
        "overrides": {
          "points": 500
        },
        "reasonCode": "RANK_REWARD"
      }
    ]
  },
  "options": {
    "strictUserResolution": true,
    "allowUnrankedRecipients": false
  }
}
```

#### Response
```json
{
  "ok": true,
  "blocking": false,
  "issues": [],
  "warnings": [],
  "normalized": {
    "rowsAccepted": 1,
    "distinctUsers": 1,
    "totalPoints": 500
  },
  "planId": "plan_01H...",
  "impactSummary": {
    "rewardActionsCount": 1,
    "pointsCreditTotal": 500,
    "packageBreakdown": [
      { "rewardPackageId": "pkg_points_500", "count": 1 }
    ]
  }
}
```

#### Errors
- `422 SETTLEMENT_DUPLICATE_USER_ROW`
- `422 SETTLEMENT_INVALID_PACKAGE`
- `422 SETTLEMENT_USER_NOT_ELIGIBLE`
- `422 CONTEST_NOT_READY_FOR_SETTLEMENT`

#### Side effects
- optional persisted validated plan artifact (TTL)
- admin action log write

#### Legacy compatibility
- bridges current raw rewards array of contest settle endpoint.

---

### D2. `GET /api/internal/contest-runs/{id}/settlement/preview/{planId}`

#### Identity
- Purpose: show pre-execution accounting and rewards preview.
- Phase: 1
- Roles: `admin_ops`, `admin_finance_ops`, `admin_supervisor`

#### Response
```json
{
  "ok": true,
  "contestId": "contest_123",
  "planId": "plan_01H...",
  "preview": {
    "perUser": [
      {
        "userId": "usr_1",
        "displayName": "alice",
        "rewardComponents": [
          { "type": "POINTS", "amount": 500 }
        ],
        "pointsDelta": 500
      }
    ],
    "totals": {
      "usersCount": 1,
      "pointsCreditTotal": 500,
      "rewardActionsCount": 1
    },
    "accounting": {
      "ledgerCreditsToCreate": 1,
      "grantRowsToCreate": 1
    },
    "warnings": []
  }
}
```

#### Errors
- `404 SETTLEMENT_PLAN_NOT_FOUND`

#### Side effects
- none

#### Legacy compatibility
- no legacy equivalent

---

### D3. `POST /api/internal/contest-runs/{id}/settlement/execute`

#### Identity
- Purpose: execute settlement plan.
- Phase: 1
- Roles: `admin_ops`, `admin_finance_ops`, `admin_supervisor`

#### Request
Headers:
- `Idempotency-Key` required

Body:
```json
{
  "planId": "plan_01H...",
  "allowWarnings": false,
  "reasonCode": "OFFICIAL_SETTLEMENT",
  "note": "Approved by finance ops"
}
```

#### Response
```json
{
  "ok": true,
  "receipt": {
    "actionId": "act_01H...",
    "actionType": "CONTEST_SETTLEMENT_EXECUTE",
    "status": "COMPLETED",
    "idempotencyKey": "settle:contest_123:v1",
    "idempotentReplay": false,
    "summary": {
      "settlementId": "stl_01H...",
      "rewardActionsApplied": 25,
      "pointsCreditedTotal": 12000,
      "contestPhaseAfter": "SETTLED"
    },
    "actor": {
      "type": "admin_user",
      "id": "adm_01H...",
      "username": "finance.ops",
      "authMode": "session"
    }
  }
}
```

#### Errors
- `409 CONTEST_ALREADY_SETTLED`
- `422 SETTLEMENT_BLOCKING_ISSUES`
- `409 IDEMPOTENCY_REPLAY_CONFLICT`

#### Side effects
- creates contest settlement
- creates reward grant rows and/or ledger entries according to migration phase
- updates contest and entries status
- writes admin action log

#### Legacy compatibility
- may internally route to existing `settleContestMvp` during phase 1.
- parity requirement: identical contest final status semantics.

---

## 4.E Compensation

### E1. `POST /api/internal/compensations/validate`

#### Identity
- Purpose: validate manual compensation request.
- Phase: 1
- Roles: `admin_finance_ops`, `admin_supervisor`

#### Request
```json
{
  "userId": "usr_1",
  "rewardPackageId": "pkg_points_500",
  "reasonCode": "SUPPORT_COMPENSATION",
  "note": "Match outage compensation",
  "metadata": {
    "ticketId": "SUP-1204"
  }
}
```

Rules:
- `userId` required
- either `rewardPackageId` OR explicit `customRewardComponents[]` (phase 2)
- `reasonCode` required
- note optional max 1000

#### Response
```json
{
  "ok": true,
  "blocking": false,
  "issues": [],
  "warnings": [],
  "requiresSupervisorApproval": false,
  "validationToken": "cmp_val_01H...",
  "impactSummary": {
    "pointsDelta": 500,
    "rewardComponents": [
      { "type": "POINTS", "amount": 500 }
    ]
  }
}
```

#### Errors
- `404 USER_NOT_FOUND`
- `422 COMPENSATION_REASON_REQUIRED`
- `422 COMPENSATION_POLICY_LIMIT_EXCEEDED`

#### Side effects
- action log write (`COMPENSATION_VALIDATE`)

#### Legacy compatibility
- maps to current manual grant constraints (userId/amount/reason) while extending contract.

---

### E2. `GET /api/internal/compensations/preview/{token}`

#### Identity
- Purpose: preview compensation effect before execute.
- Phase: 1
- Roles: `admin_finance_ops`, `admin_supervisor`

#### Response
```json
{
  "ok": true,
  "token": "cmp_val_01H...",
  "preview": {
    "user": {
      "id": "usr_1",
      "displayName": "alice",
      "pointsBefore": 1800,
      "pointsAfter": 2300
    },
    "rewardComponents": [
      { "type": "POINTS", "amount": 500 }
    ],
    "accounting": {
      "ledgerCreditsToCreate": 1,
      "reasonType": "ADMIN_GRANT"
    },
    "requiresSupervisorApproval": false,
    "warnings": []
  }
}
```

#### Errors
- `404 COMPENSATION_TOKEN_NOT_FOUND`
- `410 COMPENSATION_TOKEN_EXPIRED`

#### Side effects
- none

#### Legacy compatibility
- no legacy equivalent.

---

### E3. `POST /api/internal/compensations/execute`

#### Identity
- Purpose: execute validated compensation.
- Phase: 1
- Roles: `admin_finance_ops`, `admin_supervisor`

#### Request
Headers:
- `Idempotency-Key` required

Body:
```json
{
  "validationToken": "cmp_val_01H...",
  "reasonCode": "SUPPORT_COMPENSATION",
  "note": "Approved and applied",
  "approval": {
    "required": false,
    "approvedBy": null
  }
}
```

#### Response
```json
{
  "ok": true,
  "receipt": {
    "actionId": "act_01H...",
    "actionType": "COMPENSATION_EXECUTE",
    "status": "COMPLETED",
    "idempotencyKey": "comp:usr_1:sup-1204",
    "idempotentReplay": false,
    "summary": {
      "userId": "usr_1",
      "pointsDelta": 500,
      "ledgerEntryId": "led_01H..."
    },
    "actor": {
      "type": "admin_user",
      "id": "adm_01H...",
      "username": "finance.ops",
      "authMode": "session"
    }
  }
}
```

#### Errors
- `422 COMPENSATION_APPROVAL_REQUIRED`
- `409 IDEMPOTENCY_REPLAY_CONFLICT`

#### Side effects
- writes ledger credit (ADMIN_GRANT or target reason)
- updates user balance
- writes admin action log

#### Legacy compatibility
- during phase 1, execute may call `grantManualPointsMvp` under adapter.

---

## 4.F Moderation

### F1. `GET /api/internal/moderation/submissions/{id}/context`

#### Identity
- Purpose: fetch enriched review context for a submission.
- Phase: 1
- Roles: `admin_moderator`, `admin_supervisor`

#### Response
```json
{
  "ok": true,
  "submission": {
    "id": "sub_01H...",
    "status": "SUBMITTED",
    "createdAt": "2026-03-20T09:00:00.000Z",
    "proofUrl": "https://x.com/...",
    "note": "Done",
    "quest": {
      "id": "q_01H...",
      "code": "FOLLOW_X_001",
      "title": "Follow MCG on X",
      "rewardPackageId": "pkg_points_300",
      "validationMode": "MANUAL_REVIEW"
    },
    "user": {
      "id": "usr_1",
      "displayName": "alice",
      "xUsername": "alice_x"
    }
  },
  "context": {
    "userRecentSubmissions": [
      { "id": "sub_prev", "status": "REJECTED", "createdAt": "2026-03-19T10:00:00.000Z" }
    ],
    "userModerationSignals": {
      "rejectionsLast30d": 3,
      "duplicateProofHint": false
    },
    "approvalImpactPreview": {
      "pointsDelta": 300,
      "ledgerEntryWouldBeCreated": true
    }
  }
}
```

#### Errors
- `404 SUBMISSION_NOT_FOUND`

#### Side effects
- optional audit read log

#### Legacy compatibility
- extends existing submissions read capabilities.

---

### F2. `POST /api/internal/moderation/submissions/{id}/decide`

#### Identity
- Purpose: v2 decision contract for moderation.
- Phase: 1
- Roles: `admin_moderator`, `admin_supervisor`

#### Request
Headers:
- `Idempotency-Key` required

Body:
```json
{
  "decision": "REJECT",
  "decisionCode": "PROOF_NOT_VALID",
  "note": "URL does not show required action",
  "requestAdditionalProof": false
}
```

Fields:
- `decision` enum: `APPROVE|REJECT|ESCALATE` (ESCALATE phase 2)
- `decisionCode` required for REJECT/ESCALATE, optional for APPROVE
- `note` optional/required depending on policy
- `requestAdditionalProof` optional bool

#### Response
```json
{
  "ok": true,
  "receipt": {
    "actionId": "act_01H...",
    "actionType": "MODERATION_DECISION_EXECUTE",
    "status": "COMPLETED",
    "idempotencyKey": "mod:sub_01H...:reject",
    "idempotentReplay": false,
    "summary": {
      "submissionId": "sub_01H...",
      "decision": "REJECT",
      "questProgressUpdated": true,
      "rewardApplied": false
    },
    "actor": {
      "type": "admin_user",
      "id": "adm_01H...",
      "username": "moderator.1",
      "authMode": "session"
    }
  }
}
```

#### Errors
- `422 MODERATION_DECISION_INVALID`
- `422 MODERATION_DECISION_CODE_REQUIRED`
- `409 SUBMISSION_ALREADY_REVIEWED`

#### Side effects
- updates submission status/review fields
- updates quest progress
- approval may trigger reward credit
- writes admin action log

#### Legacy compatibility
- Adapter maps to existing `/api/internal/quests/submissions/{submissionId}/review` and runtime `reviewQuestSubmissionMvp`.
- Parity requirement: approval idempotency behavior maintained.

---

## 4.G Users

### G1. `GET /api/internal/users/{id}/admin-context`

#### Identity
- Purpose: minimal context bundle for safe admin actions.
- Phase: 1
- Roles: all admin roles

#### Response
```json
{
  "ok": true,
  "user": {
    "id": "usr_1",
    "displayName": "alice",
    "xUsername": "alice_x",
    "createdAt": "2025-10-01T12:00:00.000Z"
  },
  "context": {
    "balances": {
      "points": 2300
    },
    "recentRewards": [
      {
        "type": "LEDGER_CREDIT",
        "reasonType": "ADMIN_GRANT",
        "amount": 500,
        "createdAt": "2026-03-20T09:59:00.000Z"
      }
    ],
    "recentContestParticipation": [
      {
        "contestId": "contest_123",
        "status": "SCORED",
        "rank": 12
      }
    ],
    "recentQuestStatus": [
      {
        "questId": "q_01H...",
        "status": "IN_PROGRESS"
      }
    ],
    "moderationSignals": {
      "rejectionsLast30d": 2
    }
  }
}
```

#### Errors
- `404 USER_NOT_FOUND`

#### Side effects
- none

#### Legacy compatibility
- built from existing search + quests + ledger data sources.

---

## 5. Error code catalog (phase 0/1 minimum)

## 5.1 Contest
- `CONTEST_NOT_FOUND`
- `CONTEST_TRANSITION_NOT_ALLOWED`
- `CONTEST_TRANSITION_PREREQUISITE_FAILED`
- `CONTEST_PHASE_INVALID_FOR_SCORING`
- `CONTEST_NOT_READY_FOR_SETTLEMENT`

## 5.2 Scoring
- `SCORING_INVALID_ROW`
- `SCORING_USER_NOT_ENTERED`
- `SCORING_DUPLICATE_USER`
- `SCORING_IMPORT_NOT_FOUND`
- `SCORING_IMPORT_EXPIRED`
- `SCORING_BLOCKING_ISSUES`

## 5.3 Settlement
- `SETTLEMENT_PLAN_NOT_FOUND`
- `SETTLEMENT_DUPLICATE_USER_ROW`
- `SETTLEMENT_INVALID_PACKAGE`
- `SETTLEMENT_USER_NOT_ELIGIBLE`
- `SETTLEMENT_BLOCKING_ISSUES`

## 5.4 Compensation
- `COMPENSATION_REASON_REQUIRED`
- `COMPENSATION_POLICY_LIMIT_EXCEEDED`
- `COMPENSATION_TOKEN_NOT_FOUND`
- `COMPENSATION_TOKEN_EXPIRED`
- `COMPENSATION_APPROVAL_REQUIRED`

## 5.5 Moderation
- `SUBMISSION_NOT_FOUND`
- `MODERATION_DECISION_INVALID`
- `MODERATION_DECISION_CODE_REQUIRED`
- `SUBMISSION_ALREADY_REVIEWED`

## 5.6 System
- `INVALID_QUERY_PARAM`
- `FORBIDDEN_ROLE`
- `IDEMPOTENCY_REPLAY_CONFLICT`
- `INTERNAL_ERROR`

---

## 6. Side-effect and logging requirements by family

| Family | AdminActionLog required | Accounting side effects | Notes |
|---|---|---|---|
| Admin action read APIs | No (optional read access log) | None | read-only |
| Contest transitions | Yes | None expected | contest phase state mutation |
| Contest scoring execute | Yes | None direct | ranking and entry status mutated |
| Contest settlement execute | Yes | Yes | contest rewards + status finalization |
| Compensation execute | Yes | Yes | ledger credit + user points |
| Moderation decide | Yes | Conditional | reward only on APPROVE |
| User admin context | No | None | read bundle |

---

## 7. Legacy migration plan by endpoint

## 7.1 Phase 0
- Add `AdminActionLog` storage + writer middleware for existing critical endpoints.
- Normalize actor payload in internal auth utility.

## 7.2 Phase 1
- Introduce new validate/preview/execute endpoints.
- Execute endpoints may call legacy runtime functions:
  - transitions -> `updateContestStatusMvp`
  - scoring -> `recordContestScoresMvp`
  - settlement -> `settleContestMvp`
  - compensation -> `grantManualPointsMvp`
  - moderation -> `reviewQuestSubmissionMvp`

## 7.3 Parity requirements before legacy deprecation
- Same or stricter business invariants.
- No loss of idempotency guarantees.
- Full action receipt + audit log available.
- Operator-facing errors mapped for UI.

---

## 8. Open decisions for phase 2+

1. Should contest settlement points path write both `RewardGrant` and ledger, or ledger-only with derived grant view?
2. Final supervisor approval model (inline vs dedicated approval endpoint).
3. Canonical catalog and lifecycle for `RewardPackage`.
4. Batch moderation decisions endpoint (phase 2).

---

## 9. Implementation readiness checklist

- [ ] Shared TypeScript types for issue model, actor model, action receipt.
- [ ] Shared error code registry.
- [ ] Idempotency middleware for execute endpoints.
- [ ] AdminActionLog persistence + query endpoints.
- [ ] Endpoint contract tests (request/response/error snapshots).
- [ ] Frontend mock fixtures aligned with examples in this spec.

