# MCG Product Foundation — Pivot Documentation (MVP → V1/V2)

## Document intent & certainty model

This document is the product-system source of truth for the MCG pivot direction. It is written to reduce ambiguity for Product, Design, and Engineering.

### Certainty tags used in this document
- **[DECIDED]**: validated product decision.
- **[MVP CORE]**: mandatory for strict MVP scope.
- **[MVP PRINCIPLE]**: guiding rule for MVP implementation; details may be tuned.
- **[INTENTIONALLY OPEN]**: explicitly left unspecified/configurable at this stage.
- **[FUTURE-READY]**: direction intentionally prepared but not guaranteed in MVP.
- **[POST-MVP]**: explicitly outside strict MVP scope.

---

## 1) Product Vision

### What MCG becomes
**[DECIDED]** MCG pivots from a stat-card + PvE web product to a **collectible-first, contest-driven hybrid** combining:
- premium collectible cards,
- collection progression,
- team construction,
- recurring contests,
- dynamic scoring and rewards.

### Product promise
MCG promises that cards are both:
1. desirable collectible objects,
2. usable competitive units in contests.

The value proposition is no longer “optimize fixed ATK/DEF/SPD/CTRL battles,” but “collect, compose, compete, and progress across recurring contest cycles.”

### Positioning guardrail
**[DECIDED]** MCG must not drift into:
- a collection-only album,
- a pure abstract fantasy dashboard,
- a PvE-first stat game.

### Strategic change vs legacy model
Legacy center of gravity:
- fixed printed gameplay stats,
- PvE loop as major structure for economy/UX.

Pivot center of gravity:
- collectible identity and ownership depth,
- contest participation and ranking output,
- dynamic scoring,
- multi-layer progression (account + collection + competition).

---

## 2) Core Product Loop

### Primary loop
1. Acquire packs/cards.
2. Expand and improve collection.
3. Build contest team.
4. Enter contest and lock lineup.
5. Receive dynamic contest score and rank outcome.
6. Earn rewards (points/packs/cards).
7. Reinvest rewards into collection depth and contest optionality.

### Why users open packs
- Fill collection gaps.
- Improve rarity/edition depth.
- Increase contest lineup options.
- Chase prestige variants.

### Why users collect
- Completion motivation (memedex).
- Prestige and ownership identity.
- Broader flexibility for contest entry.

### Why users build teams and enter contests
- Rankings are driven by lineup decisions under lock constraints.
- Contests are the primary competitive activity.
- Rewards are tied to contest lifecycle outcomes.

### Why users return
- Contest cadence (start/lock/live/finalize/reward).
- New pack outcomes and collection milestones.
- Ongoing progression and competitive history.

---

## 3) Role of Cards

### What a card is
A card is a collectible object with premium identity and contest utility.

### What a card is not anymore
**[DECIDED]** A card is not a fixed combat stat sheet (ATK/DEF/SPD/CTRL) governing deterministic PvE-style combat.

### Collectible vs gameplay relationship
- Collectible layer drives desire, progression, and ownership status.
- Contest layer uses owned cards as lineup inputs for dynamic scoring.
- **[MVP PRINCIPLE]** rarity/edition gameplay impact must stay moderate to avoid pay-to-win cliffs.

---

## 4) Collectible Model

### 4.1 Canonical model dimensions
**[DECIDED]** Card definition is structured around:
- Token / Project,
- Set,
- Rarity,
- Edition,
- optional metadata.

### 4.2 Card model layers (critical distinction)

#### Project Layer
- Token/Project identity and associated metadata.

#### Collectible Definition Layer (Card Template)
- Canonical collectible definition: a valid combination of token + set + rarity + edition.
- This layer defines what can exist in the collectible catalog.

#### Owned Instance Layer (Owned Card Instance)
- A concrete owned copy of a Card Template held by a user.
- **[MVP PRINCIPLE]** pull outcomes create instances, not just abstract quantity increments.
- Instance-level metadata can evolve over time (exact field set partially open).
- Even if the final MVP instance schema remains partially open, instance-aware ownership is a foundational architectural requirement of the pivoted product model.

#### Contest Participation Layer
- Ownership eligibility and lock state per contest.
- The same owned card instance cannot be entered into multiple active contests simultaneously.

### 4.3 Pool logic (MVP)
**[DECIDED]** MVP pool is curated to ~50–100 tokens.

### 4.4 Collection logic
Collection UX/system should support:
- owned vs missing tracking,
- completion %,
- rarity/edition depth visibility,
- milestone hooks.

---

## 5) Rarity System

### Rarity hierarchy
**[DECIDED]**
- Common
- Uncommon
- Rare
- Epic
- Legendary

### Product role of rarity
Rarity is primarily a scarcity/desirability framework:
- chase behavior,
- prestige differentiation,
- differentiated pack outcomes.

### Economic role
**[MVP PRINCIPLE]** Rarity is a scarcity and pacing dial, not a hard power dial.

### Gameplay impact stance
**[DECIDED]** Gameplay impact of rarity is moderate only.

### Weighted treatment for major tokens
**[DECIDED]** Major tokens can exist at high rarities, but Epic/Legendary availability should be materially rarer than for lower-importance tokens.

---

## 6) Edition System

### Edition role
Edition is a collectible axis distinct from rarity, focused on visual identity and prestige.

### MVP editions
**[DECIDED]**
- Base
- Reverse
- Brillante
- Holo
- Full Art

No Gold edition in MVP.

### Naming coherence note
“Brillante” is kept intentionally as the **official product edition name** for now; this is a naming decision, not a translation inconsistency.

### Rarity vs edition distinction
- Rarity = scarcity tier.
- Edition = variant expression/presentation layer.

### Gameplay impact stance
**[DECIDED]** Edition can support moderate utility (e.g., small bonus or access constraints), but must avoid strong pay-to-win outcomes.

---

## 7) Pack Model

### Role of packs
Packs are the primary acquisition and excitement mechanism feeding collection and contest readiness.

### MVP pack model principles
- **[MVP PRINCIPLE] Set-aware system:** pulls are generated within active set configuration, not a flat global bucket.
- **[MVP PRINCIPLE] Instance generation:** opening produces **Owned Card Instances** tied to valid Card Templates.
- **[MVP PRINCIPLE] Weighted outcomes:** token/rarity/edition probabilities are weighted and tunable.
- **[MVP PRINCIPLE] Controlled transparency:** high-level odds communication can be exposed, while exact low-level weighting may remain non-fully public.

### What is decided vs left open
- **[DECIDED]** MVP uses a curated 50–100 token pool.
- **[DECIDED]** major-token high-rarity results are intentionally harder to pull.
- **[INTENTIONALLY OPEN]** exact drop formulas, table granularity, and publication detail level remain configurable.

### Live-ops configurability (future-ready)
**[FUTURE-READY]** pack operations should be admin-configurable for:
- active/inactive sets,
- weight adjustments,
- limited-time drop profiles,
- reward-pack composition.

---

## 8) Contest Model

### Contest structure
**[DECIDED]** Contests are time-bounded competitions where users submit a lineup and receive dynamic scoring output during the active period.

### Core contest rules (MVP)
- **[DECIDED]** Default lineup size: 5 cards.
- **[DECIDED]** Lineup lock for contest duration.
- **[DECIDED]** The same owned card instance cannot be entered into multiple active contests simultaneously.
- **[DECIDED]** Default contest duration: 7 days.
- **[MVP PRINCIPLE]** Duration remains contest-configurable.

### Contest format taxonomy (certainty clarified)
- **[MVP CORE]** at least one general contest format is required.
- **[FUTURE-READY]** format variants (rarity brackets, thematic constraints, special events) are targetable categories, not all guaranteed at MVP launch.

### Admin panel role
**[MVP PRINCIPLE]** include contest operations tooling for:
- create/edit/publish contests,
- set duration and lineup size,
- define eligibility constraints,
- configure rewards,
- manage lifecycle states.

### Built-in-public operations stance
Contest cadence should be predictable and communicable without overpromising simultaneous support for all format variants.

---

## 9) Scoring Model

### Product role of score
The score is the primary competitive output used to rank lineups within a contest and determine reward outcomes.

### Scoring characteristics
**[DECIDED]** scoring is:
- dynamic during contest lifetime,
- composite across multiple signal families,
- normalized for user readability (target simple score display, ideally /100).

### Signal families
Financial, on-chain, social, and additional custom signals may contribute via weighted composition.

### Explainability vs opacity
- **High-level explainability (required):** players should understand the broad signal families and contest logic.
- **Low-level opacity (required):** exact formulas/weights should remain partially opaque to reduce manipulation risk.

### Trust, coherence, and stability guardrails
- Consistent scoring rules per contest instance.
- Avoid abrupt unexplained volatility through smoothing/bounds where needed.
- Avoid single-signal dominance.
- Preserve auditability internally even if full formula is not publicly disclosed.

### User-facing output
- simple current score,
- ranking position,
- optional score history snapshot.

---

## 10) Progression Model

### Progression layers (target)
**[DECIDED]** progression should cover:
1. account progression,
2. collection progression,
3. competitive progression.

### Strict MVP progression scope
- **[MVP CORE]** lightweight account XP/level or milestone track.
- **[MVP CORE]** memedex basics (owned/missing/completion %).
- **[MVP CORE]** contest participation and performance history basics.

### Explicitly not in strict MVP progression
- deep RPG/talent trees,
- complex class/build systems,
- heavy multi-currency progression graphs.

### Post-MVP progression direction
**[POST-MVP]** richer seasonal ladders, deeper progression surfaces, and advanced long-term mastery structures.

---

## 11) Rewards Model

### MVP reward priorities
**[DECIDED]**
- points,
- packs,
- cards.

### Reward sources
- contest outcomes,
- progression milestones.

### Reward principles
- reinforce loop: collect → contest → reward → collect,
- balance participation and performance incentives,
- keep issuance controlled and economy-safe.

### Post-MVP reward expansion
**[POST-MVP]** badges, cosmetics, profile prestige systems, and richer seasonal tracks.

---

## 12) MVP Scope

### MVP Core (must-have)
- Signup/auth,
- pack opening,
- collection view + memedex basics,
- lightweight account progression,
- contest entry + lineup lock,
- dynamic score/ranking display,
- reward distribution,
- baseline contest admin management.

### MVP Optional / Stretch (if capacity allows)
- additional contest variants beyond primary format,
- richer score history views,
- more advanced reward rule configuration UI.

### Out of MVP
- full crypto market coverage,
- PvE-first gameplay systems,
- deep RPG progression systems,
- advanced cosmetic economies,
- high-complexity market/economic feature sets.

### Post-MVP (V1/V2 direction)
- broader contest mode portfolio,
- deeper live-ops/drop tooling,
- expanded social layers,
- richer long-term progression and identity systems,
- advanced anti-abuse and analytics tooling.

---

## 13) Product Architecture Implications

### Structural shift
Pivot implies moving from **template-stat combat architecture** to **instance-collectible + contest architecture**.

### Core conceptual replacements
- Fixed gameplay stats on cards → collectible template + dynamic contest scoring.
- PvE-centric economy loop → contest lifecycle-centric loop.
- Quantity-only ownership model → owned-instance-aware model.
- Combat resolution pipeline → submission/lock/scoring/reward pipeline.

### Product-system priorities
- instance integrity and ownership traceability,
- configurable pack/drop operations,
- reliable contest state management,
- internally auditable scoring outcomes,
- economy safety and anti-manipulation safeguards.

---

## 14) V1 / V2 Evolution

### V1 focus (after MVP validation)
- broaden contest segmentation pragmatically,
- expand sets/pool under controlled curation,
- improve history/performance UX,
- strengthen live-ops controls.

### V2 focus
- seasonal competitive structures,
- richer social/league dynamics,
- deeper identity/prestige systems,
- more advanced governance and anti-abuse frameworks.

### Evolution sequencing principle
1. Validate MVP loop health (collectible desirability + contest engagement).
2. Tune fairness/economy/scoring trust.
3. Expand formats and content.
4. Add deeper retention layers.

---

## Appendix — MVP Principles (cross-cutting)

- Keep collectible desirability high without making gameplay pay-to-win.
- Keep MVP curated (pool and feature set) to preserve focus.
- Keep progression lightweight and understandable.
- Keep contest operations configurable but not over-complex at launch.
- Keep documentation explicit about certainty levels to avoid false commitments.
