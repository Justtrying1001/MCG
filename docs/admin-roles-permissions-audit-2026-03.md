# MCG Admin Roles & Permissions Audit (2026-03)

## Scope
- Admin auth/session helpers (`lib/admin-auth.ts`, `lib/internal-auth.ts`).
- Role enforcement helper (`lib/admin-ops.ts`).
- Critical admin APIs (rewards, contests, moderation, quests).
- Repo/config evidence for canonical admin identity.

## Findings

### 1) How admin auth actually works
- **Démontré:** Admin session auth is single-username based (`ADMIN_USERNAME`) with PBKDF2 password hash and signed cookie (`mcg_admin_session`).
- **Démontré:** Internal APIs accept either admin session cookie or `x-internal-admin-key` (`requireInternalAdminAccess`).
- **Démontré:** Role gating is centralized by `requireAdminRole` and role hierarchy is simple: explicit allowed roles + supervisor override.

### 2) Root cause of Rewards "Insufficient admin role"
- **Démontré:** Rewards APIs (`/api/internal/rewards/manual-grant`, `/api/internal/compensations/*`) require `ADMIN_FINANCE_OPS` or `ADMIN_SUPERVISOR`.
- **Démontré:** Session actor role was defaulted from `ADMIN_DEFAULT_ROLE ?? "ADMIN_OPS"`.
- **Impact:** If `ADMIN_DEFAULT_ROLE` is unset (common), logged-in canonical admin receives `ADMIN_OPS`, which is rejected by rewards finance checks, producing "Insufficient admin role".
- **Root cause:** Incorrect secure default for session role assignment in `requireInternalAdminAccess` relative to rewards route policy.

### 3) Verification for `carlitoonchain`
- **Démontré (code/config model):** The canonical admin username is whatever `ADMIN_USERNAME` is set to; there is no multi-user admin table in Prisma for session auth.
- **Partiel:** `carlitoonchain` is treated as principal admin only when env `ADMIN_USERNAME=carlitoonchain` in deployment.
- **Non prouvé (no DB/env access here):** Effective production env value and live session payload cannot be directly confirmed in this environment.

### 4) Other admin accounts
- **Démontré (repo model):** Session auth supports one canonical admin username via env.
- **Démontré (code path):** Additional privileged actors can exist via internal service key auth (`INTERNAL_ADMIN_KEY`), with configurable role.
- **Non prouvé:** Actual operational usage of additional service keys in live environment.

### 5) Cross-surface consistency
- **Démontré:** Most admin internal APIs consistently use `requireInternalAdminAccess` and `requireAdminRole`.
- **Partiel:** Required minimum roles vary by module (expected):
  - rewards: finance/supervisor
  - moderation: moderator/supervisor
  - contests lifecycle/settlement: ops/finance/supervisor depending on action.
- **Conclusion:** Rewards bug was primarily a **global session-role default mismatch** surfaced on finance-gated endpoints.

## Fix applied
- Changed session default role in `requireInternalAdminAccess` from `ADMIN_OPS` to `ADMIN_SUPERVISOR` to align with principal admin expectation and existing supervisor override model.
- Kept explicit role parsing and route-level checks unchanged (no bypass).

## Hardening/tests
- Updated internal-auth actor test to validate supervisor default.
- Added explicit test that env override still supports lower role (`ADMIN_OPS`) when intentionally configured.
- Added role-access regression tests for finance-gated rewards role checks (supervisor allowed; ops denied).
