# Admin maintenance: Reset user data

A new supervisor-only control is available at `/admin/maintenance/reset-users` to clear player data while preserving system catalogs.

## What it does

When `ENABLE_USER_RESET=true` and an `ADMIN_SUPERVISOR` executes the action:

- Deletes all `User` rows (`prisma.user.deleteMany()`), relying on cascade rules to remove user-related child records (sessions, owned cards, rewards, quests, contests, progression, season ratings, etc.).
- Deletes `UserInvite` rows explicitly for safety.
- Resets `RewardPackSupply.distributed` to `0` (keeps `totalSupply` unchanged).
- Writes an audit entry in `AdminActionLog` (`module=admin.resetUsers`, `actionType=RESET_USERS`).

## What it does not delete

Global/system entities remain untouched, including (non-exhaustive):

- `TokenProject`
- `CardTemplate`
- `PackDefinition`
- `QuestDefinition`
- `Contest`

## Safety controls

- API route: `POST /api/internal/admin/reset-users`
- Requires internal admin auth and role check with minimum `ADMIN_SUPERVISOR`.
- `ROOT_ADMIN_X_USERNAME` (or `OWNER_X_USERNAME`) can be set to force the owner account to resolve as `ADMIN_SUPERVISOR` even when `ADMIN_DEFAULT_ROLE` is lower.
- Feature flag gate: action is blocked unless `ENABLE_USER_RESET=true`.
- UI requires explicit typed confirmation: `RESET USERS`.

## Operational precautions

- Use only during controlled maintenance windows.
- Communicate planned downtime and irreversible impact.
- Verify environment variables before enabling in production.
