# Systems 12 — Web3, Wallets, and On-chain

## Purpose
Clarify web3-native strategy without overstating current implementation.

## Current runtime reality
- Privy-based auth routes exist.
- A demo auth entry route exists and should be used for reliability when presenting investor demo.
- Current collectible/tournament loop does not require mandatory on-chain ownership enforcement.

## Investor demo requirement
- Wallet must not be a hard blocker.
- Demo should use controlled demo user path or reliable pre-authenticated session.

## Future scope (not implemented now)
- Mandatory wallet-only access.
- On-chain ownership enforcement for all card utility.
- On-chain marketplace settlement.

## Runtime references
- `app/api/auth/privy/exchange/route.ts`
- `app/api/auth/privy/link-wallet/route.ts`
- `app/api/auth/demo/enter/route.ts`
- `lib/demo-mode.ts`

## Open decisions
- Timeline for wallet requirement by stage.
- Scope of on-chain authority vs off-chain gameplay authority.
- Chain/vendor sequencing and compliance posture.
