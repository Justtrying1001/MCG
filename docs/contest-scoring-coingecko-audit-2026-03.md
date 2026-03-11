# MCG Contest Scoring CoinGecko Audit

Date: 2026-03  
Scope: feasibility + architecture-readiness audit for automatic contest scoring from existing CoinGecko IDs

## 1. Executive summary

### 1.1 What exists today
- Contest scoring exists only as **manual admin score injection** (`POST /api/internal/contests/:contestId/score` with `scores` payload).
- Contest entry lineups are instance-aware (`OwnedCardInstance`) and roster locks already provide the exact per-entry card list needed for automatic scoring.
- CoinGecko IDs already exist in repository card sources and are injected into `CardTemplate.metadata.legacy.coingeckoId` by seed.

### 1.2 What is feasible now
- A fully automatic MVP scoring pipeline is feasible with current backend architecture by:
  1) reading locked lineup templates per entry,
  2) resolving CoinGecko IDs from template metadata,
  3) fetching market data for contest window (`lockAt` → `endsAt`),
  4) computing per-card /100 score,
  5) summing to per-entry score,
  6) writing via existing `ContestScore` + `ContestRanking` logic.
- No mandatory schema migration is required for a first MVP.

### 1.3 What is missing
- No existing CoinGecko client/runtime module.
- No persisted scoring-run/audit model.
- No per-card scoring snapshot storage.
- No built-in retry/backoff/rate-limit handling policy.
- No contest-scoring docs or dedicated tests existed before this work.

### 1.4 Main risks
- External API dependency (availability/rate limit/network failures).
- Data gaps for some assets/time windows (sparse points).
- Potential mapping drift if future templates are created outside current seed conventions.
- Operational ambiguity without explicit scoring-run audit trail.

### 1.5 Recommended MVP direction
- Implement a **minimal automatic scoring command** behind internal admin API using existing contest score persistence path.
- Keep formula simple + explainable.
- Use `lockAt`→`endsAt` as canonical window.
- Fail fast when CoinGecko mapping/data missing (do not silently partial-score).
- Add tests for mapping extraction/coverage and auto-score endpoint behavior.

## 2. Current contest scoring reality

### 2.1 What scoring exists today
- Manual score ingestion endpoint accepts array of `{ userId, score }`, upserts `ContestScore`, deletes/recreates `ContestRanking`, updates entry statuses to `SCORED`.

### 2.2 What is manual
- Score source is fully manual JSON pasted in admin panel.
- No automated data pull, no scoring formula runtime.

### 2.3 Where automatic scoring could fit
- Best integration point: contest runtime layer (`lib/domain/contests/runtime.ts`) as a new command that produces score rows and then reuses current `recordContestScoresMvp`.

## 3. CoinGecko mapping audit

### 3.1 Where CoinGecko IDs live in the repo
- `mcg_base_cards.json`: per-card `coingeckoId`.
- `mcg_projects.json`: per-project `coingeckoId`.
- `prisma/seed-mvp-controlled-emission.mjs`: injects `coingeckoId` into `CardTemplate.metadata.legacy.coingeckoId`.
- `types/cards.ts`: `BaseCard` type includes optional `coingeckoId`.

### 3.2 Coverage and quality of mapping
- Static audit script results:
  - base cards: 5692
  - eligible cards: 5692
  - top-50 eligible: 50
  - missing CoinGecko IDs in top-50: 0
  - missing CoinGecko IDs in eligible set: 0
  - missing CoinGecko IDs in project rows: 0
- For current MVP top-50 token set, coverage is complete.

### 3.3 Structural risks and drift risks
- Mapping currently lives in JSON + copied metadata; no DB-level explicit `coingeckoId` column on `TokenProject` or `CardTemplate`.
- Runtime helper originally extracted only baseCardId; CoinGecko extraction was implicit and scattered in metadata assumptions.
- If templates are inserted by new scripts without `legacy.coingeckoId`, scoring can fail.

## 4. Market data feasibility audit

### 4.1 Price movement feasibility
- Feasible using CoinGecko `/coins/{id}/market_chart/range` (`prices`).
- Metric: `(lastPrice - firstPrice) / firstPrice` over contest window.
- Reliability: generally high for listed/active tokens, but sparse data can happen.

### 4.2 Volume feasibility
- Feasible from same range endpoint (`total_volumes`).
- Metric: average USD traded volume over window.
- Reliability: varies by token/liquidity and exchange coverage.

### 4.3 Market cap feasibility
- Feasible from same endpoint (`market_caps`).
- Metric: average USD market cap over window.
- Reliability: acceptable for top memecoins, less robust for microcaps.

### 4.4 Fourth-signal feasibility
- Evaluated candidates:
  - volatility: feasible but noisier and harder to explain,
  - max drawdown: feasible from price path and intuitive,
  - BTC benchmark outperformance: feasible but doubles API calls and adds dependency,
  - liquidity proxy: partly overlaps with volume and may be unstable,
  - path bonus/malus: feasible but arbitrary.
- Recommended MVP 4th signal: **max drawdown (stability)**.

### 4.5 Rate-limit / cost / granularity considerations
- Free/demo CoinGecko usage is plausible for MVP contest sizes (top-50 universe) but requires conservative ops usage.
- One call per unique CoinGecko ID per scoring run is manageable at MVP scale.
- Granularity from range endpoint is sufficient for daily/contest-window aggregate metrics.
- Environment limitation noted in this audit run: outbound network to CoinGecko was unreachable in the current sandbox, so live endpoint verification could not be completed from this environment.

### 4.6 Recommended market data strategy
- Use range endpoint per token for lock→end window.
- Compute all 4 signals from one payload.
- Cache/reuse per-scoring-run in-memory for that run.
- Keep scoring trigger admin-internal initially (button/endpoint), then automate later via scheduler.

## 5. Candidate scoring formulas

### 5.1 Simple formula
- `score = clamp(50 + 2 * movementPct, 0, 100)`
- Pros: extremely simple, cheap, transparent.
- Cons: ignores liquidity/size/stability; easy to game by volatile spikes.

### 5.2 Robust MVP formula
- Movement score: `clamp(50 + 2 * movementPct, 0, 100)`.
- Volume score: percentile rank among contest tokens (avg volume).
- Market cap score: percentile rank among contest tokens (avg market cap).
- Stability score: `100 - maxDrawdownPct`.
- Final score: `0.5*movement + 0.2*volume + 0.2*marketCap + 0.1*stability`.

### 5.3 Normalization strategy
- Movement: affine transform around neutral 50.
- Volume + market cap: within-contest percentile normalization to avoid huge absolute-scale distortion.
- Stability: direct bounded inversion of drawdown percentage.

### 5.4 Why the recommended formula wins
- Stays explainable and implementable with one market endpoint.
- Avoids complex infra and external benchmark dependency.
- Better robustness than movement-only while still lightweight.

## 6. Backend integration audit

### 6.1 Schema impact
- MVP feasible **without schema changes** using existing `ContestScore` and `ContestRanking`.
- Optional future models for hardening:
  - `ContestScoringRun`
  - `ContestCardScoreSnapshot`
  - `ContestMarketSnapshot`

### 6.2 Runtime impact
- Add CoinGecko auto-score command in contest runtime.
- Guardrails:
  - contest must be `LOCKED|LIVE`,
  - `lockAt` and `endsAt` required,
  - default block before `endsAt` (with optional force override).

### 6.3 API impact
- Add internal endpoint to trigger automatic scoring:
  - `POST /api/internal/contests/:contestId/score/auto`

### 6.4 Admin ops impact
- Keep manual scoring route for fallback.
- Add explicit “Auto score (CoinGecko)” action in contest admin detail.
- Display outcome summary (entries scored, tokens scored, rankings count).

### 6.5 Idempotency / recompute / auditability
- Recompute is naturally supported by existing score upsert + ranking rebuild logic.
- Idempotency is practical at score-row level for same inputs.
- Auditability is currently limited (no scoring run persisted) and should be Phase 2 hardening.

## 7. Docs truth audit
- No dedicated scoring architecture doc existed for contests.
- Existing docs mention contest scoring/ranking conceptually, but not market-data-based automatic implementation details.
- Required docs for next step:
  - this audit (`contest-scoring-coingecko-audit-2026-03.md`),
  - runtime section updates in architecture docs,
  - admin ops runbook for scoring trigger and failure handling.

## 8. Test coverage audit

Before this work:
- no dedicated contest auto-scoring tests,
- no explicit mapping extraction tests for CoinGecko,
- no endpoint tests for automatic scoring trigger.

Recommended/added direction:
- mapping extraction unit tests,
- mapping coverage tests on source JSON,
- internal API auto-score route tests,
- future Phase-2 tests for formula determinism and retry/error behavior.

## 9. Recommended implementation plan

### Phase 1 — Minimal viable implementation
- Add metadata CoinGecko extractor.
- Add runtime command to auto-score from CoinGecko data and feed existing score/ranking pipeline.
- Add internal auto-score endpoint.
- Add admin button for auto-score trigger.
- Add baseline tests (mapping + route).

### Phase 2 — Hardening
- Add scoring-run persistence model and explicit audit trail.
- Add retries/backoff + clear error taxonomy for external failures.
- Add deduplicated token-level market data cache table for repeated recomputes.
- Add richer tests (formula invariants, recompute idempotence, failure recovery).

### Phase 3 — Future scoring evolution
- Optional benchmark-relative component (vs BTC).
- Optional mode-specific formulas per contest config.
- Optional scheduled auto-run (cron/queue) + post-run settlement automation.

## 10. File-by-file evidence appendix

### Mapping/data sources
- `mcg_base_cards.json`
- `mcg_projects.json`
- `types/cards.ts`
- `prisma/seed-mvp-controlled-emission.mjs`

### Contest backend
- `prisma/schema.prisma`
- `lib/domain/contests/runtime.ts`
- `app/api/internal/contests/[contestId]/score/route.ts`
- `app/api/internal/contests/[contestId]/score/auto/route.ts`
- `app/admin/(protected)/contests/[contestId]/page.tsx`

### Supporting domain/reward/progression/docs
- `lib/domain/cards/template-metadata.ts`
- `lib/domain/progression/profile-summary.ts`
- `lib/domain/rewards/ledger.ts`
- `docs/current-runtime-architecture.md`
- `docs/repo-cartography-2026-03.md`
- `README.md`

### Tests
- `tests/template-metadata-coingecko.test.ts`
- `tests/coingecko-mapping-coverage.test.ts`
- `tests/api-internal-contest-auto-score-route.test.ts`
