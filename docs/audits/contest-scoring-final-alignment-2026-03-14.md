# Contest Scoring Final Alignment

## 1. Expected Product Logic
- Snapshot START/END must be contest-rule driven (not user-roster driven), with END reusing START canonical population.
- Snapshot stores CoinGecko market fields needed for scoring (`current_price`, `total_volume`, `market_cap`, `market_cap_rank`, `last_updated`).
- Token score uses bounded component scores with target weights (price 45%, volume 25%, market cap 20%, rank 10%) + bounded rank bonus multiplier, then card/user aggregation.
- User score is sum of 5 card scores; ranking rebuilt; settlement and manual import fallback remain compatible.

## 2. Verification of Current Implementation

| expected | current status | files | action |
|---|---|---|---|
| START token universe from contest rules, not rosters | **Oui** (ANY/CARD_SET_ONLY resolved from `ContestRule` + `CardTemplate`/`TokenProject`) | `lib/domain/contests/eligibility-runtime.ts` | none |
| END uses exactly START canonical population | **Oui** (`resolveCanonicalTokensFromStart`) | `lib/domain/contests/snapshot-runtime.ts` | none |
| Snapshot fields include price/volume/market cap/rank/last_updated | **Partiel → Oui après fix** (`last_updated` missing before) | `lib/domain/contests/coingecko-client.ts`, `lib/domain/contests/snapshot-runtime.ts`, `prisma/schema.prisma` | added `marketDataUpdatedAt` persistence |
| Score formula = bounded product formula (45/25/20/10 + rank bonus) | **Non → Oui après fix** | `lib/domain/contests/scoring-engine-runtime.ts` | formula replaced/aligned |
| Card score uses rarity+edition multipliers | **Oui** | `lib/domain/contests/scoring-engine-runtime.ts` | none |
| User score = sum of 5 card scores (not average) | **Oui** (verified by test) | `lib/domain/contests/scoring-engine-runtime.ts`, `tests/contest-scoring-engine-runtime.test.ts` | strengthened tests |
| Rebuild ContestRanking after compute | **Oui** | `lib/domain/contests/scoring-engine-runtime.ts` | none |
| Settlement downstream compatibility | **Oui** (runtime + smoke) | `lib/domain/contests/runtime.ts`, `tests/contest-scoring-engine-real-smoke.test.ts` | none |
| Manual import fallback still available | **Oui** (legacy route still present) | `app/api/internal/contests/[contestId]/score/route.ts` | keep as fallback |
| CoinGecko mapping coverage for contest tokens | **Partiel → Oui après fix** (seed create/update/backfill behavior corrected) | `prisma/seed-mvp-controlled-emission.mjs` | fixed tokenProject coingeckoId backfill |

## 3. Fixes Applied
1. **Token scoring formula alignment**
   - Updated scoring engine to product formula with bounded components and rank bonus:
     - price 45%, volume 25%, market cap 20%, rank 10%
     - rank multiplier capped to +10%
     - final token score capped at 100.
2. **CoinGecko snapshot schema/runtime alignment**
   - Added snapshot persistence for CoinGecko `last_updated` as `marketDataUpdatedAt`.
   - Added safe handling for CoinGecko fetch failure (warn + continue with null metrics, no crash).
3. **Seed mapping hardening for `TokenProject.coingeckoId`**
   - Fixed upsert `create` and `update` to set `coingeckoId`.
   - Added post-template fallback pass to backfill missing `TokenProject.coingeckoId` from `CardTemplate.metadata.tokenIdentity.coingeckoId`.
4. **Tests strengthened**
   - Added component-level formula assertions and sum-of-cards assertions.
   - Added ingestion failure/partial coverage assertions.
   - Updated real smoke test to include CoinGecko `last_updated` and verify end-to-end persistence.

## 4. Formula Finalization
- `p = (priceEnd - priceStart) / max(priceStart, eps)`
- `priceScore = 50 + 50 * clamp(p / 0.50, -1, 1)`

- `v = (volumeEnd - volumeStart) / max(volumeStart, eps)`
- `volumeScore = 50 + 50 * clamp(v / 1.00, -1, 1)`

- `m = (marketCapEnd - marketCapStart) / max(marketCapStart, eps)`
- `marketCapScore = 50 + 50 * clamp(m / 0.50, -1, 1)`

- `r = (rankStart - rankEnd) / max(rankStart, 1)`
- `rankScore = 50 + 50 * clamp(r / 0.30, -1, 1)`

- `baseTokenScore = 0.45*priceScore + 0.25*volumeScore + 0.20*marketCapScore + 0.10*rankScore`
- `rankMultiplier = 1 + 0.10 * clamp(r / 0.30, 0, 1)`
- `tokenScore = min(100, baseTokenScore * rankMultiplier)`

- `cardScore = tokenScore * rarityMultiplier * editionMultiplier`
- `userScore = somme(cardScore des 5 cartes)`

## 5. Multipliers Validation
- **Source canonique utilisée par scoring**: `lib/domain/contests/scoring-engine-runtime.ts`.
- Rarity multipliers:
  - COMMON=1
  - UNCOMMON=1.05
  - RARE=1.12
  - EPIC=1.22
  - LEGENDARY=1.35
- Edition multipliers:
  - BASE=1
  - REVERSE=1.03
  - BRILLANTE=1.08
  - HOLO=1.15
  - FULL_ART=1.25
- Intégration réelle validée: `ContestEntryScoreBreakdown` persiste `rarityMultiplier`, `editionMultiplier`, `finalScore` et montre bien l’impact multiplicatif en smoke DB.

## 6. Tests Added / Updated
- `tests/contest-scoring-engine-runtime.test.ts`
  - added bounded component-score checks
  - added rank bonus checks
  - added explicit user score sum-of-cards check (5-card rosters)
- `tests/contest-snapshot-runtime.test.ts`
  - verifies CoinGecko ingestion includes `last_updated` persistence path
- `tests/contest-snapshot-runtime-edgecases.test.ts`
  - verifies CoinGecko failure does not crash snapshot capture
  - verifies token without `coingeckoId` is handled with null metrics + missing counter
- `tests/contest-scoring-engine-real-smoke.test.ts`
  - DB-backed smoke kept and updated with realistic CoinGecko response including `last_updated`

## 7. Validation Results
- `npx prisma generate` → PASS.
- `npx prisma migrate dev` on clean DB → FAIL (`P3006`, legacy migration chain shadow issue remains).
- `npx prisma db push` + seed + DB-backed smoke (`tests/contest-scoring-engine-real-smoke.test.ts`) → PASS.
- Targeted runtime/route suite (snapshot/scoring/eligibility/route hardening/settlement plan + real smoke) → PASS.
- Real DB SQL verification confirms:
  - snapshot/tokenscore/breakdown objects exist and are written,
  - START/END counts align,
  - score/ranking/settlement artifacts persist,
  - `marketDataUpdatedAt` stored,
  - `TokenProject.coingeckoId` coverage fixed on seeded dataset.

### CoinGecko Data Ingestion Validation
- Mapping sources verified in runtime:
  - primary: `TokenProject.coingeckoId`
  - fallback: `CardTemplate.metadata.tokenIdentity.coingeckoId`
  - seed source: `data/token-master-50.json`
- `fetchCoinsMarkets` uses `/api/v3/coins/markets` with batched `ids=...` and `vs_currency=usd`.
- Parsed fields mapped to snapshot persistence:
  - `current_price -> priceUsd`
  - `total_volume -> volume24hUsd`
  - `market_cap -> marketCapUsd`
  - `market_cap_rank -> marketCapRank`
  - `last_updated -> marketDataUpdatedAt`
- Real DB seeded coverage after fixes:
  - total TokenProject: 50
  - with `coingeckoId`: 50
  - without `coingeckoId`: 0
  - active contest-eligible tokens without mapping: 0
- Partial/missing API data handling:
  - token not returned => snapshot row still upserted with null metrics
  - fetch/rate-limit failure => warning + continue without crash

**Conclusion:** CoinGecko data ingestion verified end-to-end (with graceful degradation on partial/failure responses).

## 8. Final Verdict
- **Alignment status:** Oui, l’implémentation est maintenant alignée avec la logique produit finale sur univers snapshot, formule token, score carte/user, ranking rebuild et compatibilité downstream.
- **Point restant à valider sur vraie DB de migration:** la chaîne historique `prisma migrate dev` échoue toujours sur shadow DB (`P3006` lié à migration legacy). Ce point reste un sujet de migration pipeline, pas du runtime scoring natif.
- **Chemin canonique visé:** le scoring natif peut être considéré comme chemin admin canonique visé.
- **Fallback:** l’import manuel doit rester fallback-only tant que la validation de chaîne de migration n’est pas régularisée en environnement cible.
