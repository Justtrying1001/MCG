# Mememon TCG Release Scope

## Version definitions

### Internal Demo
Goal: founder/investor demo of core loop with low operational risk.

Required features:
- Mememon branding on key user-facing surfaces.
- Genesis set seeded.
- Auth/session works.
- Pack open works with internal points.
- Opened cards become owned cards and appear in collection.
- One demo contest viewable and enterable.
- Admin can prepare/reset demo state.

### Alpha
Goal: controlled private alpha with credible core loop.

Required features:
- Clear Genesis card identity in product.
- Pack purchase/open via internal points.
- Collection/Memedex polished enough for repeat use.
- First tournament flow functional end-to-end (entry, lineup, lock, ranking, reward/placeholder).
- Basic analytics events (visits/signups/pack opens/contest entries).
- Admin runbook + stable deployment.
- Explicit disclaimer: no real-money marketplace/payments.

### Beta
Goal: controlled public beta/activation.

Required features:
- Economy/pricing clarity and supply controls.
- Improved collection UX/performance.
- Tournament operations more automated and stable.
- Reward flow stability.
- Engagement analytics instrumentation reviewed.
- Optional marketplace v1 foundation if quality allows.

### V1
Goal: first market-facing launch.

Required features:
- Live Genesis set, pack flow, collection, tournament loop.
- Marketplace v1 (list/cancel/buy/ownership transfer/history/fees).
- Operational analytics and admin readiness.
- Launch messaging + baseline legal/compliance review.

### Post-V1
Potential features:
- Additional sets and seasons.
- Expanded tournaments.
- Partner/community activations.
- Strategy depth and advanced lineup tools.
- Mobile and wallet/on-chain enhancements.

## Explicit out-of-scope for Alpha
- Real-money payments.
- Production secondary marketplace.
- On-chain settlement mechanics.

## Explicit out-of-scope for Beta (default)
- Full multi-chain tokenized ownership enforcement.
- Advanced creator economy tooling.

## Open product decisions
- Beta monetization mode (internal credits vs controlled checkout).
- Marketplace launch timing (late Beta vs V1).
- Token utility sequencing and regulatory posture.

## Dependencies
- Prisma schema/runtime stability.
- Contest scoring ops maturity.
- Admin/operator training and runbook discipline.

## Risks
- Contest/reward domain regressions (current failing tests).
- Scope creep into marketplace/on-chain too early.
