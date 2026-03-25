# Authentication Audit (Privy) — 2026-03-25

## Scope verified
- Frontend auth entry points (`@privy-io/react-auth`, hooks, provider wrappers).
- Privy login flow and session exchange into backend session cookie.
- All `app/api/**/route.ts` endpoints checked for auth gate patterns.
- Privy-correctness checks: server-side token verification vs client-only trust.

## Current auth flow (as implemented)

```text
[Browser]
  └─ RootProviders mounts <PrivyProvider> with loginMethods = [twitter, wallet]
       └─ usePrivyLogin.loginWithPrivy() triggers Privy modal login
            └─ On authenticated state: getAccessToken()
                 └─ POST /api/auth/privy/exchange { accessToken }
                      └─ Server verifies token via PrivyClient.verifyAuthToken()
                           └─ Fetches Privy user via getUserById()
                                └─ Upserts internal user + linked identities
                                     └─ Creates app session token (random 32-byte)
                                          └─ Stores only SHA-256 hash in DB userSession
                                               └─ Sets cookies:
                                                    - mcg_session (HttpOnly, SameSite=Lax)
                                                    - mcg_has_session (non-HttpOnly hint)

[Subsequent API calls]
  └─ SessionProvider uses /api/me to hydrate `me`
       └─ Protected user routes call getSessionUser()/resolveSessionUser()
            └─ Session resolved from mcg_session cookie hash lookup
```

## Verified auth entry points

### Privy SDK usage
- `PrivyProvider` wrapper in `RootProviders` with app/client IDs and configured login methods (Twitter + wallet).  
- `usePrivy()` used in `usePrivyLogin` for `authenticated`, `ready`, `login`, `logout`, `getAccessToken`, and `user`.  
- `useLinkAccount()` + `usePrivy()` used in `SolanaWalletCard` for wallet/Twitter account linking and access-token exchange to backend link endpoints.  

### Login triggers
- Central trigger is `loginWithPrivy()` in `usePrivyLogin`: calls `login({ loginMethods: ["wallet", "twitter"] })`.
- If already Privy-authenticated but app session missing, it directly calls `/api/auth/privy/exchange` with a fresh access token.

## Backend verification status

### What is correct
1. **Privy token is verified server-side** before account provisioning/session creation. (`verifyAuthToken` + `getUserById`).
2. **Sensitive app APIs generally require server session**, not frontend `user` state.
3. **Session token design is decent**: random token in cookie, only hash stored in DB, TTL enforced.
4. **Link-wallet/link-twitter routes require BOTH**:
   - existing app session
   - fresh Privy access token verification
   - same-origin check

### All API route auth coverage (high level)
- Most internal/admin APIs use `requireInternalAdminAccess`.
- User-protected routes use `getSessionUser` / `resolveSessionUser`.
- Public-read endpoints exist (`contest ranking`, `reward preview`) intentionally.
- Job endpoints use Upstash signature verification helper.

## Findings

### Critical
1. **QStash signature verification can silently fail-open if env keys are missing.**
   - `verifyQStashSignature()` returns `true` when signing keys are absent, only logging a warning.
   - That means internal job routes become callable without valid signature whenever config is missing/mis-set.
   - A production misconfiguration would open privileged lifecycle actions to unauthorized calls.

### Warnings
1. **`/api/auth/privy/exchange` lacks same-origin CSRF enforcement** while setting auth cookies.
   - Route accepts raw `accessToken` JSON body and sets `mcg_session`.
   - Unlike logout/link/entry mutations, no `enforceSameOrigin()` check is present.
   - Risk: login CSRF / account confusion if attacker can cause cross-site POST with attacker token.

2. **`mcg_has_session` is intentionally non-HttpOnly.**
   - Used as a client hint to avoid `/api/me` fetches when absent.
   - Not directly auth-bearing, but writable by JS/XSS and should never be trusted for auth decisions.
   - Current implementation does not trust it alone (good), but this should remain documented.

3. **Some mutation endpoints rely on internal admin keys/sessions without explicit request signing beyond those controls.**
   - Acceptable for internal tooling, but service-to-service calls should prefer signed tokens + strict origin/network controls.

## Privy pattern mismatch analysis

- **No major mismatch found** in core user auth: frontend obtains Privy access token, backend verifies with Privy before issuing app session.
- **However**, backend security hygiene is inconsistent around mutation hardening:
  - link/logout use same-origin,
  - exchange does not.
- This inconsistency is a practical mismatch with “sensitive actions should not trust frontend-only state/request context.”

## Concrete fixes (code-level)

1. **Harden `/api/auth/privy/exchange` with same-origin enforcement.**
   - Add `const sameOriginError = enforceSameOrigin(request); if (sameOriginError) return sameOriginError;`
   - Optionally also require `Content-Type: application/json` to reduce cross-site abuse surface.

2. **Fail closed for QStash verification in production.**
   - In `verifyQStashSignature`, if keys missing and `NODE_ENV === "production"`, return `false` (or throw config error).
   - Keep skip behavior only for explicit dev/test mode.

3. **Optional stronger session hardening.**
   - Rotate session ID on privilege change/linking actions.
   - Add device/IP metadata and anomaly checks for suspicious session reuse.

4. **Document trust boundaries in one auth ADR/runbook.**
   - Explicitly state: Privy `user` client object is UX-only; backend authorization is session/token verification only.
   - Include endpoint matrix (public/user/admin/job) and required auth mechanism per route class.

## Bottom line
- The main Privy flow is properly verified server-side before creating app sessions.
- The two most important gaps are:
  1) fail-open QStash verification on missing keys,
  2) missing CSRF same-origin guard on Privy exchange endpoint.
