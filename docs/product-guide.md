# MCG Product Guide (single source of truth)

## Table of contents
1. [Introduction](#1-introduction)
2. [What is MCG](#2-what-is-mcg)
3. [Project positioning (current reality)](#3-project-positioning-current-reality)
4. [Core loop](#4-core-loop)
5. [Cards](#5-cards)
6. [Rarity, editions, variants](#6-rarity-editions-variants)
7. [Packs](#7-packs)
8. [Collection](#8-collection)
9. [Profile](#9-profile)
10. [Rewards](#10-rewards)
11. [Progression](#11-progression)
12. [Quests](#12-quests)
13. [Contests](#13-contests)
14. [Admin operations](#14-admin-operations)
15. [Glossary](#15-glossary)
16. [FAQ](#16-faq)
17. [Current state and limitations](#17-current-state-and-limitations)

---

## 1) Introduction
This document explains MCG from product/user/ops perspective, but only with behavior that is actually implemented in the repository runtime.

## 2) What is MCG
MCG (Meme Card Game) is a web app where users collect cards from packs and use owned card instances to enter contests. Rewards/quests and admin operations support the live loop.

## 3) Project positioning (current reality)
Current product reality:
- Collection-first flow (pack opening + owned cards).
- Contest-driven competitive loop.
- Rewards and quests linked to progression and moderation workflows.
- Admin operations available for contests, moderation, rewards, campaigns/quests.

Not current gameplay:
- PvE is retired from active gameplay (kept only as deprecated compatibility endpoints).

## 4) Core loop
1. User opens the app and can authenticate with X or start as guest.
2. User opens packs.
3. User views and grows collection.
4. Authenticated user enters contests with owned cards.
5. User tracks rewards and quests.
6. Admin team operates contest lifecycle, moderation, and compensation tools.

## 5) Cards
What users collect now:
- Card instances tied to account ownership (authenticated mode).
- Card identity and display data derived from canonical token dataset.

Current behavior:
- Cards obtained from authenticated pack opening are persisted.
- Cards obtained in guest mode are local-only session data.

## 6) Rarity, editions, variants
Rarity levels in active model:
- Common, Uncommon, Rare, Epic, Legendary.

Edition types in active model:
- Base, Reverse, Brillante, Holo, Full Art.

Runtime note:
- These dimensions are actively used in card DTO/rendering and pack slot weighting behavior.

## 7) Packs
Current pack experience (`/packs`):
- Pack open flow reveals 5 cards.

Authenticated pack open:
- Costs points.
- Consumes pack stock.
- Consumes card template supply.
- Persists opening + owned card instances.

Guest pack open:
- Simulates draw and updates browser-local guest state.
- No server persistence.

## 8) Collection
Current collection behavior:
- `/collection` shows cards from current session context.
- Authenticated users see DB-backed ownership.
- Guest users see temporary local collection state.

Collection visibility also feeds profile progression summaries.

## 9) Profile
Profile page (`/compte`) currently shows:
- account progression summary,
- collection progression summary,
- competitive progression summary,
- recent contest results when available.

Guest profile is explicitly marked as temporary/non-persistent.

## 10) Rewards
Implemented reward behavior:
- Welcome reward on first authenticated account creation.
- Pack opening point debit.
- Quest approval point credit.
- Admin manual grants and compensation flows.

User-facing reward visibility:
- `/rewards` includes ledger history.

## 11) Progression
Current progression model is composed of:
- account progression (level/xp oriented summary),
- collection progression (ownership/completion oriented summary),
- competitive progression (contest participation/results/rating oriented summary).

Progression is assembled from current runtime data, not from a separate standalone progression service.

## 12) Quests
User side:
- Users load quests on `/rewards`.
- Social quest proofs can be submitted (URL/note).

Admin side:
- Submissions are reviewed and approved/rejected through admin moderation/review endpoints.

Current implementation boundaries:
- Social verification is operationally moderated (manual decision), not fully automated external verification.
- Legacy review path and newer moderation path coexist.

## 13) Contests
User side:
- Contest list and detail pages are available for authenticated accounts.
- Authenticated user can submit lineup in open contests.
- Rankings are visible through contest APIs for authenticated accounts.

Runtime contest rules currently enforced:
- Entry window/state checks.
- Ownership validation of lineup card instances.
- Roster locking of used card instances.
- Optional entry fee debited in points when configured.

Admin dependency:
- Scoring/settlement outcomes depend on admin-run operations and run flows.

## 14) Admin operations
Main admin modules in current use:
- Dashboard (operational health summary)
- Contests (setup + lifecycle + scoring + settlement)
- Moderation (submission review decisions)
- Rewards (manual grants/compensations)
- Campaigns/Quests (catalog and definition tooling)
- Users context lookup
- Activity logs

Operational safety patterns currently present:
- validate/preview/execute for critical actions,
- idempotency on sensitive execution routes,
- audit logs for admin actions.

Legacy surfaces still visible:
- dedicated legacy contest and quest admin pages remain for compatibility.

## 15) Glossary
- **Owned card instance**: a persisted card ownership row tied to a user.
- **Card template**: card definition with rarity/edition/supply parameters.
- **Pack definition**: pack metadata including stock and cards-per-pack.
- **Ledger entry**: immutable reward economy movement (credit/debit).
- **Quest submission**: proof submitted by a user for review.
- **Contest entry**: user participation record in a contest.
- **Roster lock**: lock linking entry and owned card instance in active contest context.
- **Admin artifact**: temporary validation/preview payload token used in guarded admin flows.

## 16) FAQ
**Is PvE still available?**
- No. PvE gameplay is retired; compatibility routes return deprecation responses.

**Is guest mode persistent?**
- No. Guest mode uses browser session storage and is not account-persistent.

**Where can users see reward history?**
- `/rewards` shows ledger history for authenticated users.

**Can admins operate without UI?**
- Partially yes, through internal APIs with admin session or internal key.

**Are all admin pages equally current?**
- No. Some pages are explicit legacy/fallback surfaces.

## 17) Current state and limitations
Current implemented and stable:
- packs, collection, contests, rewards/quests, admin operational surfaces.

Partially implemented or transitional:
- admin analytics remains lightweight,
- some admin domains have legacy/current dual routes,
- naming still includes transitional terms (`MVP`, `v2/coexistence`) in technical contracts.

Legacy retained:
- old tables and deprecated endpoints remain for compatibility and historical continuity.
- dedicated admin legacy pages remain available as fallback surfaces.

Not implemented as first-class systems:
- dedicated autonomous anti-fraud social verification,
- full BI/analytics suite,
- full-stack e2e harness in repository as primary validation framework.
