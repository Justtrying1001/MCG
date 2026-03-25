# Authentication Audit (Privy) — 2026-03-25

## Scope verified
- Frontend auth entry points (`@privy-io/react-auth`, hooks, provider wrappers).
- Privy login flow and session exchange into backend session cookie.
- Wallet/Twitter identity linking routes and profile linking UI.
- Env + tests + docs consistency for the web auth path.

## Current target architecture (cleaned)

```text
[Browser - Next.js web app]
  └─ RootProviders mounts <PrivyProvider>
       - appId only (no clientId on web path)
       - loginMethods = [wallet, twitter]
       - showWalletLoginFirst = true
       - walletChainType = solana-only
       - walletList = [phantom, solflare, backpack, wallet_connect]
       - embedded wallets disabled
       └─ usePrivyLogin.loginWithPrivy() triggers modal
            └─ getAccessToken()
                 └─ POST /api/auth/privy/exchange
                      └─ Server verifies token with Privy server SDK
                           └─ Upserts user/identities
                                └─ Issues app session cookies
```

## What is clean
- Server-side token verification (`verifyAuthToken` + `getUserById`) before session creation.
- Session model remains stable and robust (hashed token persisted server-side).
- Wallet + Twitter linking flows are explicit and protected (`resolveSessionUser` + Privy token verification).
- Shared wallet config is centralized in `lib/privy-config.ts` and consumed by provider/login/linking flows.

## What was fragile / redundant before cleanup
- Redundant login method constants (`PRIVY_PROVIDER_LOGIN_METHODS` vs `PRIVY_TRIGGER_LOGIN_METHODS`) created config drift risk.
- Frontend had `clientId` + `NEXT_PUBLIC_PRIVY_DISABLE_CLIENT_ID` debug branch in provider boot path.
- Provider emitted debug logs/warnings tied to temporary rollout checks.
- Docs were inconsistent (some pages still described Twitter-only auth).

## Cleanup applied
- Removed `clientId` usage from web provider path.
- Removed temporary debug flag/branching for `NEXT_PUBLIC_PRIVY_DISABLE_CLIENT_ID`.
- Removed provider debug console logging.
- Unified login methods into one shared constant (`PRIVY_LOGIN_METHODS = ["wallet", "twitter"]`).
- Updated tests to enforce no `clientId` usage and to lock wallet-first + solana-only config.
- Updated env/docs to match the real production-ready web auth architecture.

## `clientId` decision (web path)
- **Decision**: `clientId` is not used for this Next.js web app path.
- **Why**: React SDK requires `appId`; `clientId` is optional and mainly useful when intentionally overriding app defaults per client. For this repo, the override introduced complexity/debug branching without clear product value.
- **Outcome**: keep a single source of truth via app settings + explicit provider config in code.

## Final expected env vars for auth (web path)
- `NEXT_PUBLIC_PRIVY_APP_ID` (required)
- `PRIVY_APP_SECRET` (required)
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (required for reliable mobile wallet fallback)

