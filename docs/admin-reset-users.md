# Admin maintenance: Reset user data

A supervisor-only control is available at `/admin/maintenance/reset-users` to clear player data while preserving system catalogs.

## Preconditions (UI + API)

The reset action is available only when **both** conditions are true:

1. Caller is `ADMIN_SUPERVISOR` (owner/root mapping can force this via `ROOT_ADMIN_X_USERNAME` or `OWNER_X_USERNAME`).
2. `ENABLE_USER_RESET=true` in runtime environment.

If `ENABLE_USER_RESET` is missing or any value other than `true`, the UI shows an environment lock diagnostic and the API rejects with:

`User reset is disabled because ENABLE_USER_RESET must be "true" (current value: <value>).`

## What it does

When enabled and executed by a supervisor:

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

## Configuration

### Local

Set in `.env.local`:

```bash
ENABLE_USER_RESET=true
ROOT_ADMIN_X_USERNAME=carlitoonchain
```

Restart the local Next.js server after changing env vars.

### Vercel

1. Go to **Project Settings → Environment Variables**.
2. Add `ENABLE_USER_RESET` with value `true` for the target environment(s).
3. Ensure `ROOT_ADMIN_X_USERNAME` is set to your owner account (e.g. `carlitoonchain`).
4. Redeploy so runtime picks up the new env values.

## Safety controls recap

- API route: `POST /api/internal/admin/reset-users`
- Requires internal admin auth and role check with minimum `ADMIN_SUPERVISOR`.
- Feature flag gate: action is blocked unless `ENABLE_USER_RESET=true`.
- UI requires explicit typed confirmation: `RESET USERS`.
- UI diagnostics expose current role, root-admin status, env flag value, and whether API access is currently allowed.

## Operational precautions

- Use only during controlled maintenance windows.
- Communicate planned downtime and irreversible impact.
- Disable `ENABLE_USER_RESET` again after maintenance.
