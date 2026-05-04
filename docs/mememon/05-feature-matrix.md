# 05 — Feature Matrix

Status vocabulary: Current, Partial, Demo Required, Demo Excluded, Alpha Required, Beta Target, V1 Target, Post-V1, Not Implemented, Open Decision, Risk.

| Feature | Current Reality | Investor Demo | Alpha | Beta | V1 | Post-V1 | Notes / Risks |
|---|---|---|---|---|---|---|---|
| Landing page / public overview | Current | Demo Required | Alpha Required | Beta Target | V1 Target | Post-V1 | Keep scope-accurate messaging. |
| Demo login / wallet-free path | Partial | Demo Required | Alpha Required | Beta Target | V1 Target | Post-V1 | Controlled demo path exists behind demo mode. |
| Wallet login / Privy | Current | Demo Excluded | Alpha Required | Beta Target | V1 Target | Post-V1 | Available path, but demo should not depend on it. |
| User account | Current | Demo Required | Alpha Required | Beta Target | V1 Target | Post-V1 | Ownership and contest actions depend on account/session. |
| Genesis Collection | Current | Demo Required | Alpha Required | Beta Target | V1 Target | Post-V1 | Seed quality affects demo reliability. |
| Card templates | Current | Demo Required | Alpha Required | Beta Target | V1 Target | Post-V1 | Schema-backed model with supply tracking. |
| Owned card instances | Current | Demo Required | Alpha Required | Beta Target | V1 Target | Post-V1 | Created via pack open/reward flows. |
| Card editions | Current | Demo Required | Alpha Required | Beta Target | V1 Target | Post-V1 | Active scarcity direction. |
| Edition-based scarcity | Partial | Demo Required | Alpha Required | Beta Target | V1 Target | Post-V1 | Runtime still mixes rarity + edition. |
| Edition display | Partial | Demo Required | Alpha Required | Beta Target | V1 Target | Post-V1 | Present in collection/lineup card views. |
| Edition-based pack distribution | Partial | Demo Optional | Alpha Required | Beta Target | V1 Target | Post-V1 | Runtime distribution still depends on rarity + edition. |
| Edition-based scoring modifier | Partial | Demo Optional | Open Decision | Beta Target | V1 Target | Post-V1 | Runtime scoring uses rarity+edition; edition-only model undecided. |
| Legacy rarity field cleanup | Current (Mismatch) | Demo Required (Known mismatch) | Alpha Required | Beta Target | V1 Target | Post-V1 | Runtime still actively uses rarity in packs/scoring/UI. |
| Legacy rarity UI cleanup | Current (Mismatch) | Demo Required (Known mismatch) | Alpha Required | Beta Target | V1 Target | Post-V1 | Collection UI still exposes rarity controls/counts. |
| Legacy rarity scoring cleanup | Current (Mismatch) | Demo Required (Known mismatch) | Alpha Required | Beta Target | V1 Target | Post-V1 | `rarityMultiplier` still active in scoring runtime. |
| Legacy rarity odds cleanup | Current (Mismatch) | Demo Required (Known mismatch) | Alpha Required | Beta Target | V1 Target | Post-V1 | Odds runtime currently groups by rarity and rarity+edition. |
| Pack definitions | Current | Demo Required | Alpha Required | Beta Target | V1 Target | Post-V1 | Supply/config prep required before demo. |
| Sale packs | Current | Demo Required | Alpha Required | Beta Target | V1 Target | Post-V1 | Internal points model in current runtime. |
| Reward packs | Partial | Demo Optional | Alpha Required | Beta Target | V1 Target | Post-V1 | Supported but optional in core investor flow. |
| Guest pack opening | Partial | Demo Required | Alpha Required | Beta Target | V1 Target | Post-V1 | Via demo auth mode + authenticated open route. |
| Authenticated pack opening | Current | Demo Required | Alpha Required | Beta Target | V1 Target | Post-V1 | Backed by `/api/pack/open`. |
| Memedex | Partial | Demo Required | Alpha Required | Beta Target | V1 Target | Post-V1 | Must show post-open ownership progression. |
| Collection progress | Partial | Demo Required | Alpha Required | Beta Target | V1 Target | Post-V1 | Delta after open is required for demo credibility. |
| Card detail | Partial | Demo Optional | Alpha Required | Beta Target | V1 Target | Post-V1 | Depth varies by view/surface. |
| Weekly Tournament | Partial | Demo Required | Alpha Required | Beta Target | V1 Target | Post-V1 | First core competitive format. |
| Tournament lifecycle | Partial | Demo Required | Alpha Required | Beta Target | V1 Target | Post-V1 | Prepared lifecycle states are mandatory for demos. |
| Lineup builder | Partial | Demo Required | Alpha Required | Beta Target | V1 Target | Post-V1 | Exact team size + lock constraints apply. |
| Card locking | Partial | Demo Required | Alpha Required | Beta Target | V1 Target | Post-V1 | Active-lock conflicts enforced. |
| Token-performance scoring | Partial | Demo Optional | Alpha Required | Beta Target | V1 Target | Post-V1 | Snapshot-based scoring runtime exists. |
| Rankings | Partial | Demo Required | Alpha Required | Beta Target | V1 Target | Post-V1 | Tie-break chain implemented in runtime. |
| Rewards | Partial | Demo Required | Alpha Required | Beta Target | V1 Target | Post-V1 | Preview/settled context acceptable in demo. |
| Admin pack management | Current | Demo Required | Alpha Required | Beta Target | V1 Target | Post-V1 | Operator-only preparation surface. |
| Admin tournament management | Current | Demo Required | Alpha Required | Beta Target | V1 Target | Post-V1 | Required for contest prep/score/settlement. |
| Analytics | Partial | Demo Optional | Alpha Required | Beta Target | V1 Target | Post-V1 | Event ingestion exists; reporting quality needs validation. |
| Marketplace | Not Implemented | Demo Excluded | Demo Excluded | Open Decision | V1 Target | Post-V1 | Not currently live. |
| Paid packs | Not Implemented | Demo Excluded | Demo Excluded | Open Decision | V1 Target | Post-V1 | Real-money rails not currently live. |
| Paid tournaments | Not Implemented | Demo Excluded | Demo Excluded | Open Decision | V1 Target | Post-V1 | Future scope; policy/compliance required. |
| Prize pools | Not Implemented | Demo Excluded | Demo Excluded | Open Decision | V1 Target | Post-V1 | Future scope; settlement/refund rules required. |
| Sponsored tournaments | Not Implemented | Demo Excluded | Open Decision | Beta Target | V1 Target | Post-V1 | Partner/commercial model pending. |
| On-chain ownership | Not Implemented | Demo Excluded | Demo Excluded | Open Decision | Open Decision | Post-V1 | Directional only today. |
| Secondary market trading | Not Implemented | Demo Excluded | Demo Excluded | Open Decision | V1 Target | Post-V1 | Depends on marketplace readiness. |
