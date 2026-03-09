# MCG Product Foundation — Pivot Documentation (MVP → V1)

## 1) Product Vision

### What MCG becomes
MCG evolves from a stat-card + PvE web game into a **collectible-first, contest-driven product** that combines:
- premium card desirability,
- collection and completion goals,
- team-building strategy,
- recurring competitive contests,
- dynamic scoring and rewards.

### Product promise
MCG promises players that each card is both:
1. a premium collectible object worth owning, and
2. a strategic roster unit used in time-bounded contests.

The core value is not “win PvE fights with fixed stats,” but rather:
- collect meaningful cards,
- deploy them in the right contests,
- compete on dynamic performance,
- progress account and collection over time.

### Positioning
MCG is positioned as a **hybrid collectible + fantasy contest product**:
- Not just a passive collector album.
- Not just an abstract fantasy dashboard.
- Not just a PvE game with deterministic card stats.

### Strategic change vs legacy model
Legacy MCG centered on fixed ATK/DEF/SPD/CTRL stats and PvE loops.
Pivoted MCG centers on:
- collectible identity (token / set / rarity / edition),
- contest participation,
- dynamic score systems,
- account + collection + competitive progression.

PvE is no longer the structural backbone of economy and product experience.

---

## 2) Core Product Loop

### Primary loop
1. **Acquire packs/cards** → player opens packs and obtains collectible cards.
2. **Build collection** → player tracks ownership, rarity/edition depth, memedex completion.
3. **Compose team(s)** → player selects cards based on contest format and expected scoring signals.
4. **Enter contest** → team is locked for contest duration.
5. **Receive dynamic score** → score evolves over contest period.
6. **Earn rewards** → points, packs, cards.
7. **Reinvest rewards** → more opening, stronger collection depth, better contest optionality.

### Why players open packs
- Obtain new tokens not yet owned.
- Upgrade quality of owned tokens (rarity/edition).
- Access constrained contest eligibility (when applicable).
- Increase status/desirability of collection.

### Why players collect
- Completion motivation (memedex/log progress).
- Prestige from rarer/edition-rich ownership.
- Better optionality for contest entry across formats.

### Why players build teams
- Contest outcomes depend on lineup quality and contest fit.
- Roster choices become strategic under lock constraints.

### Why players enter contests
- Competitive progression and leaderboard outcome.
- Reward acquisition (points/packs/cards).
- Recurring event cadence and social proof.

### Why players return
- New contest windows.
- Score/reward resolution cycles.
- Collection milestones and near-completion tension.
- Ongoing pack/drop updates and live product operations.

---

## 3) Role of Cards

### What a card is in the new product
A card is a **premium collectible instance** representing a token/project identity plus collectible attributes.

It is also an **eligible roster unit** for contests.

### What a card is no longer
A card is no longer a fixed gameplay stat sheet (ATK/DEF/SPD/CTRL) that directly defines deterministic battle outcomes.

### Collectible vs gameplay relationship
- Collectible layer drives desire, ownership, identity, and long-term value perception.
- Gameplay layer uses card identity in contest scoring contexts.
- Rarity and edition may influence access and small bonuses, but must avoid heavy pay-to-win effects.

---

## 4) Collectible Model

### Canonical card model
Each card should be modeled around:
- **Token / Project** (who the card represents),
- **Set** (release collection context),
- **Rarity** (power tier of scarcity),
- **Edition** (visual/premium variant),
- optional metadata (serial, release wave, tags, etc.).

### Pool logic (MVP)
- Curated pool of ~50–100 tokens.
- Deliberately selected for relevance, recognizability, and event potential.
- No “entire crypto market” ingestion in MVP.

### Desirability logic
Desirability comes from the intersection of:
- token cultural relevance,
- rarity scarcity,
- edition prestige,
- set narrative,
- utility in contest ecosystem.

### Collection logic
Collection should support:
- ownership tracking,
- missing vs owned views,
- completion %,
- milestone triggers,
- visibility of rarity/edition depth.

---

## 5) Rarity System

### MVP rarity hierarchy
- Common
- Uncommon
- Rare
- Epic
- Legendary

### Product role of rarity
Rarity structures:
- scarcity and chase behavior,
- ownership prestige,
- differentiated pack outcomes,
- long-tail engagement with opening.

### Economic role
Rarity is a controlled scarcity dial, not a pure power dial.
It should sustain:
- pack opening tension,
- progression pacing,
- reward economy elasticity.

### Desirability role
Higher rarity increases perceived value and achievement, especially on culturally major tokens.

### Gameplay impact principle
Rarity can have **moderate** gameplay implications (e.g., minor multipliers or gated contests), but cannot dominate outcomes to a pay-to-win degree.

### Weighted distribution for major tokens
Major tokens should:
- exist in higher rarities,
- but have significantly lower drop probability in Epic/Legendary than lower-tier tokens.

This preserves chase value while preventing top-token over-saturation.

---

## 6) Edition System

### Role of editions
Editions provide a second collectible axis orthogonal to rarity.
They amplify:
- visual differentiation,
- prestige and identity,
- limited contest utility knobs (if needed).

### MVP editions
- Base
- Reverse
- Brillante
- Holo
- Full Art

(Explicitly no Gold edition in MVP.)

### Rarity vs edition
- **Rarity** = scarcity tier.
- **Edition** = variant expression/style and prestige layer.

These dimensions are separate and combinable.

### Impact design
Edition impact priority:
1. visual wow and collection value,
2. prestige signaling,
3. optional moderate utility (small bonus or contest eligibility).

Edition should not create hard pay-to-win cliffs.

---

## 7) Pack Model

### Role of packs
Packs are the primary acquisition mechanism and emotional engagement engine.
They feed both collection goals and contest-readiness.

### Opening logic (MVP principles)
- Each pack yields a defined number of card instances.
- Pull outcomes are governed by weighted distributions:
  - token-level weights,
  - rarity-level weights,
  - edition-level weights.
- Major-token high-rarity pulls remain intentionally scarce.

### MVP pool logic
Pack outcomes are constrained to curated MVP token pool (50–100 tokens).

### Pack opening in core loop
Pack opening fuels:
- roster expansion,
- rarity/edition upgrades,
- memedex progression,
- rewards reinvestment loop.

### Drop philosophy
Drops should be:
- understandable,
- exciting,
- tunable by operations,
- compatible with transparent high-level odds communication while preserving anti-manipulation safeguards.

### Future configurability requirements
Later admin/runtime controls should include:
- per-set activation/deactivation,
- weight tuning by token/rarity/edition,
- limited-time drop tables,
- reward pack compositions.

---

## 8) Contest Model

### Contest structure
Contests are time-bounded competitions where users submit a lineup and receive a dynamic score over the active period.

### Roster rules
- Base team size in MVP: **5 cards**.
- Future: support variable team sizes by contest type.

### Lock rule
A submitted card is locked for that contest duration and cannot be simultaneously entered in another active contest.

### Duration
- Default duration: **7 days**.
- Duration should be contest-configurable.

### Contest categories (MVP-ready framing)
Potential categories for configuration:
- Open contests (broad eligibility),
- Format contests (e.g., rarity brackets),
- Thematic contests (token/set constraints),
- Special events (limited windows).

### Admin panel role
MVP should include a contest management panel enabling admins to:
- create/edit/publish contests,
- set lineup size and duration,
- define eligibility rules,
- configure reward structures,
- manage contest lifecycle states.

### Built-in-public logic
Contest cadence should support visible operations:
- predictable schedules,
- easy-to-understand formats,
- shareable results and winner narratives.

---

## 9) Scoring Model

### Scoring philosophy
Scoring must be:
- dynamic over time,
- composite across multiple signal families,
- robust against straightforward gaming.

### Signal families
At minimum, scoring can integrate weighted components from:
- financial signals,
- on-chain signals,
- social signals,
- additional custom signals.

### Opacity policy
The exact formula should remain partially opaque publicly to reduce exploitation/manipulation.

### User-facing display
For users, expose:
- a simple normalized score (target presentation: /100),
- placement/ranking context,
- optional past-score history.

### Product guardrails
- Keep scoring explainable at a high level, not fully reverse-engineerable.
- Avoid sudden unexplained swings via smoothing/capping where necessary.
- Prevent single-signal dominance.
- Preserve competitive trust via consistent rules per contest.

---

## 10) Progression Model

### Multi-layer progression target
MCG progression should span:
1. **Account progression** (user-level journey),
2. **Collection progression** (ownership/completion),
3. **Competitive progression** (contest performance trajectory).

### Account progression
Account should become a persistent progression object (levels/XP/tiers as appropriate for MVP simplicity).

### Collection progression
Collection progression includes:
- memedex completion,
- rarity/edition depth goals,
- milestones and lightweight rewards.

### Competitive progression
Competitive progression includes:
- contest participation history,
- ranking evolution,
- recurring performance streaks.

### Memedex role
Memedex acts as collection log:
- seen/owned/missing,
- completion percentages,
- milestone unlock triggers.

### MVP scope discipline
Progression should be meaningful but not overdesigned:
- prefer a compact XP/milestone model,
- defer elaborate talent trees or deep RPG systems.

---

## 11) Rewards Model

### Contest rewards
MVP contest rewards prioritize:
- points,
- packs,
- cards.

### Progression rewards
Progression milestones can grant:
- points,
- packs,
- occasional card grants.

### Reward principles
- Reinforce core loop (collect → contest → reward → collect).
- Reward both participation and performance.
- Preserve economy balance with controlled issuance.

### Post-MVP extensions
Later rewards can include:
- badges,
- cosmetics,
- profile prestige layers,
- advanced seasonal reward tracks.

---

## 12) MVP Scope

### In MVP
- Signup/auth,
- Pack opening,
- Collection views,
- Basic user progression,
- Contest participation,
- Contest scoring display,
- Reward distribution,
- Admin contest management.

### Out of MVP
- Full-market token coverage,
- deep PvE systems,
- highly complex progression trees,
- advanced cosmetic ecosystems,
- overly granular economic mechanics.

### Deferred to V1/V2
- richer contest mode matrix,
- advanced drop ops tooling,
- expanded reward catalogs,
- enhanced social/community layers,
- deeper analytics and anti-abuse instrumentation.

---

## 13) Product Architecture Implications

### Structural implications of pivot
This direction requires moving from a **template-stat combat architecture** to an **instance-collectible + contest architecture**.

Key conceptual shifts:
- From fixed card stats → to card identity + dynamic external scoring.
- From PvE-centric reward sinks/sources → to contest-centric lifecycle.
- From quantity ownership semantics only → to instance-aware collectible semantics.
- From combat resolution pipeline → to contest submission/lock/scoring pipeline.

### What this replaces conceptually
Legacy constructs centered on deterministic combat outcomes become secondary or deprecated.
Primary system pillars become:
- collectible catalog integrity,
- pack/drop configuration,
- contest orchestration,
- scoring computation,
- progression/reward accounting.

### Product-level non-functional priorities
- Configurability for live operations,
- economy safety and anti-manipulation posture,
- clarity of UX around contest states and locks,
- traceability of rewards and score outcomes.

---

## 14) V1 / V2 Evolution

### V1 evolution targets
- Broader contest segmentation and formats,
- deeper progression layers (still lightweight),
- more sets and controlled pool expansion,
- better player-facing performance history.

### V2 evolution targets
- Seasonal competitive structures,
- sophisticated live-ops drop scheduling,
- stronger social mechanics (sharing, rivalries, leagues),
- richer identity systems (badges/cosmetics/profile prestige),
- deeper anti-abuse and scoring governance tooling.

### Scale-up philosophy
Scale in phases:
1. validate collectible + contest loop health,
2. tune economy/scoring fairness,
3. expand content and format complexity,
4. add long-term retention layers.

This sequencing minimizes overbuilding and keeps MVP highly iterable.
