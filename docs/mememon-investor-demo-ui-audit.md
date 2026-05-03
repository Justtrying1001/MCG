# Mememon Investor Demo UI Audit

| Route | Status | Auth requirement | Visible branding issues | UI/DA issues | Functional issues | Recommended action | Files involved |
|---|---|---|---|---|---|---|---|
| `/` | Needs polish | Optional (demo mode supports no-wallet entry) | Fixed top-level brand; remaining tone mixed in legacy class names | Hero/panel quality acceptable after copy pass | Wallet-only login was blocker; now demo bypass added | Show in demo | `app/page.tsx`, `components/home/HomeHeroLanding.tsx`, `components/layout/SiteShell.tsx` |
| `/packs` | Demo-ready | Session required | Pack copy updated | Good for demo; reveal experience present | Depends on session + seeded points/supply | Show in demo | `app/packs/page.tsx`, `app/api/pack/open/route.ts` |
| `/collection` | Demo-ready | Session required | Memedex terminology already present | Acceptable desktop presentation | Requires owned cards data | Show in demo after pack open | `app/collection/page.tsx`, `components/collection/*` |
| `/contests` | Needs polish | Public | Mostly neutral branding | Dense but acceptable | Quality depends on seeded contest statuses | Show selectively | `app/contests/page.tsx`, `components/contests/*` |
| `/contests/[contestId]` | Needs polish | Public | No blocker found in branding sweep | Information heavy; use prepared contest | Status-dependent actions can confuse | Show with scripted state only | `app/contests/[contestId]/page.tsx` |
| `/contests/[contestId]/lineup` | Needs polish | Session required | Branding acceptable | Usable but operator must guide flow | Can fail if contest status/eligibility mismatch | Show only if seeded OPEN + eligible cards | `app/contests/[contestId]/lineup/page.tsx` |
| `/rewards` | Needs polish | Session required | Mostly neutral | Functional, but lower demo priority | Not core investor path | Optional backup | `app/rewards/page.tsx` |
| `/profile` | Needs polish | Session required | Some legacy mention may remain in long-tail copy | Acceptable, not critical | Non-core for demo | Optional only | `app/profile/page.tsx` |
| `/admin/(protected)/contests` | Avoid (investor view) | Admin auth required | Admin labels not polished for investor | Operational UI only | Auth-gated + operator-only | Operator-only prep, not primary investor screen | `app/admin/(protected)/contests/*` |
| `/docs` | Demo-ready | Public | Updated to Mememon | Redirect screen acceptable | External docs may still include old brand | Avoid unless asked | `app/docs/page.tsx` |
| `/twitter` | Demo-ready | Public | Updated to Mememon | Redirect screen acceptable | N/A | Avoid unless asked | `app/twitter/page.tsx` |

## Notes
- No-wallet investor entry is now supported via demo mode (`MEMEMON_DEMO_MODE=true`) and `Enter Demo (No Wallet)` CTA.
- Demo should focus on `/` -> `/packs` -> `/collection` -> `/contests/[contestId]` flow.
