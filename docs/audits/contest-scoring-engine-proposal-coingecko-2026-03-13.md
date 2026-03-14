# Contest Scoring Engine Proposal

## 1. Mapping Token → CoinGecko

### 1.1 Chaîne relationnelle réelle dans le repo
Le chemin relationnel contest vers carte est bien présent :

`ContestEntry -> RosterLock -> OwnedCardInstance -> CardTemplate`

- `ContestEntry` contient `contestId`, `userId`.
- `RosterLock` relie `contestEntryId` et `ownedCardInstanceId`.
- `OwnedCardInstance` relie `cardTemplateId`.
- `CardTemplate` relie `tokenProjectId` (et contient `metadata`).

### 1.2 Où se trouve CoinGecko ID aujourd’hui
Il n’existe pas de champ `geckoId` / `coingeckoId` en dur dans le schéma Prisma `TokenProject` ou `CardTemplate`.
Le mapping CoinGecko est aujourd’hui injecté dans `CardTemplate.metadata.tokenIdentity.coingeckoId` au seed, et le `slug` `TokenProject` est aligné avec le token master.

Concrètement :
- seed controlled emission écrit `metadata.tokenIdentity.coingeckoId`.
- côté runtime user, la collection est reconstruite via `tokenProject.slug` -> lookup `token-master-50.json`.

### 1.3 Mapping recommandé canonique pour le moteur scoring
Pour un moteur contest robuste, il faut un mapping stable et requêtable SQL sans parser JSON à chaque run.

Recommandation :
- ajouter `coingeckoId` (nullable au départ) sur `TokenProject`.
- garder `CardTemplate.metadata.tokenIdentity.coingeckoId` pour rétrocompat, mais ne plus l’utiliser comme source primaire du scoring.

## 2. Contest eligibility → tokens

### 2.1 Modes réellement implémentés
Dans le repo actuel, les modes d’éligibilité disponibles sont :
- `ANY`
- `CARD_SET_ONLY`

Les modes `RARITY` / `COLLECTION` ne sont pas implémentés dans le domaine contest (ni enum, ni validation, ni runtime).

### 2.2 Règle pour déterminer "tous les tokens éligibles"
Objectif demandé : inclure tous les tokens du pool contest, même non possédés.

Proposition alignée repo :
- si `eligibilityMode=ANY` : tokens = tous les `TokenProject` actifs ayant au moins un `CardTemplate` actif compatible contest set (ou global si contest cross-set).
- si `eligibilityMode=CARD_SET_ONLY` : tokens = `TokenProject` des `CardTemplate` actifs filtrés par `cardSetId` de la règle.

Important : ne pas dériver la liste depuis `ContestEntry`/`RosterLock` (sinon biais vers tokens possédés/utilisés).

## 3. Data available from CoinGecko

### 3.1 Ce qui existe déjà dans le repo
- dataset local `data/token-master-50.json` contient `coingeckoId`, `marketCapRank`, etc.
- scripts/seed exploitent ce mapping.

### 3.2 Service CoinGecko runtime existant
Aucun service runtime CoinGecko n’existe aujourd’hui dans `lib/` / `app/api/` pour contest scoring.
Il n’y a pas de wrapper API, ni worker market data dédié contest.

### 3.3 Endpoints CoinGecko proposés (design)
Pour capturer START/END avec métriques homogènes :
- Endpoint principal recommandé : `/coins/markets`
  - permet d’obtenir prix, market cap, volume 24h, rank, etc.
  - requête par lot (`ids=...`) utile pour snapshot massifs.

Option fallback : `/simple/price` + endpoint complémentaire rank/market.

## 4. Metrics sélectionnées

Contrainte : 4-5 métriques max, récupérables START et END.

Sélection proposée (4 métriques) :
1. `priceUsd` (performance prix)
2. `marketCapUsd` (croissance capitalisation)
3. `volume24hUsd` (traction liquidité/activité)
4. `marketCapRank` (amélioration de rang)

Pourquoi ce choix :
- présentes dans le dataset interne et compatibles CoinGecko markets.
- capturables en snapshot ponctuel START/END.
- couvrent momentum + profondeur + position relative.

## 5. Formule scoring (0-100)

### 5.1 Normalisation
On calcule des variations relatives START->END, puis bornage/normalisation composante par composante.

Notations :
- `p = (priceEnd - priceStart) / max(priceStart, eps)`
- `m = (mcapEnd - mcapStart) / max(mcapStart, eps)`
- `v = (volEnd - volStart) / max(volStart, eps)`
- `r = (rankStart - rankEnd) / max(rankStart, 1)` (positif si rank s’améliore)

Normalisation robuste (anti-outliers) :
- `np = clamp((p + 1.0) / 2.0, 0, 1)` avec cap implicite via clamp
- `nm = clamp((m + 1.0) / 2.0, 0, 1)`
- `nv = clamp((v + 1.0) / 2.0, 0, 1)`
- `nr = clamp((r + 1.0) / 2.0, 0, 1)`

### 5.2 Pondération proposée
- 40% price
- 30% market cap
- 20% volume
- 10% rank

`scoreToken = 100 * (0.40*np + 0.30*nm + 0.20*nv + 0.10*nr)`

### 5.3 Agrégation équipe / user
- chaque `RosterLock` -> `OwnedCardInstance` -> `CardTemplate` -> `TokenProject` -> token score.
- `scoreUser = somme(scoreToken des cartes lockées)`.
- ranking tri desc sur `scoreUser`.

## 6. Modèle Prisma snapshots

### 6.1 Table snapshot demandée
```prisma
model ContestTokenSnapshot {
  id            String   @id @default(cuid())
  contestId      String
  tokenProjectId String
  geckoId        String
  phase          ContestSnapshotPhase
  priceUsd       Decimal? @db.Decimal(20,8)
  marketCapUsd   Decimal? @db.Decimal(30,8)
  volume24hUsd   Decimal? @db.Decimal(30,8)
  marketCapRank  Int?
  capturedAt     DateTime @default(now())
  provider       String   @default("COINGECKO")

  contest      Contest      @relation(fields: [contestId], references: [id], onDelete: Cascade)
  tokenProject TokenProject @relation(fields: [tokenProjectId], references: [id], onDelete: Restrict)

  @@unique([contestId, tokenProjectId, phase])
  @@index([contestId, phase])
  @@index([geckoId])
}

enum ContestSnapshotPhase {
  START
  END
}
```

### 6.2 Tables scoring recommandées (complément)
Pour auditabilité complète :
- `ContestTokenScore` (contestId, tokenProjectId, score, inputs start/end).
- `ContestEntryScoreBreakdown` (entryId, tokenProjectId, contribution, lockId).

## 7. Flow backend complet

### 7.1 contest.start -> snapshot START
1. Transition vers phase live (ou hook start explicite).
2. Résolution des tokens éligibles à partir de `ContestRule` (ANY / CARD_SET_ONLY).
3. Fetch CoinGecko batch.
4. Upsert `ContestTokenSnapshot(phase=START)`.

### 7.2 contest.end -> snapshot END
1. Sur fin contest (transition / job).
2. Reprendre strictement la même population token (via START snapshot + guard).
3. Fetch CoinGecko batch.
4. Upsert `ContestTokenSnapshot(phase=END)`.

### 7.3 scoring job
1. Charger START + END.
2. Calculer `scoreToken`.
3. Persister `ContestTokenScore`.
4. Charger lineups lockées (`ContestEntry` + `RosterLock`).
5. Calculer `scoreUser` et `ContestRanking`.
6. Continuer flux settlement existant (plan policy-based recommandé).

### 7.4 Services à créer
- `lib/domain/contests/eligibility-runtime.ts` (resolve eligible tokens)
- `lib/domain/contests/snapshot-runtime.ts` (capture START/END)
- `lib/domain/contests/coingecko-client.ts` (API wrapper + retry/rate-limit)
- `lib/domain/contests/scoring-engine-runtime.ts` (compute token/user scores)

### 7.5 Orchestration/API/jobs
- Admin routes à ajouter :
  - `POST /api/internal/contest-runs/:contestId/snapshots/start/capture`
  - `POST /api/internal/contest-runs/:contestId/snapshots/end/capture`
  - `POST /api/internal/contest-runs/:contestId/scoring/compute`
- Jobs optionnels :
  - scheduler auto sur `startsAt` / `endsAt`.

## 8. Changements nécessaires dans le repo

### 8.1 Schéma
- Ajouter `TokenProject.coingeckoId` (canonique).
- Ajouter `ContestTokenSnapshot` + `ContestSnapshotPhase`.
- Ajouter tables de score détaillé (token + breakdown entry) si on veut audit trail complet.

### 8.2 Runtime
- Garder `recordContestScoresMvp` en fallback legacy.
- Ajouter nouveau pipeline natif snapshot->compute ranking.
- Conserver settlement plan runtime existant comme downstream du ranking.

### 8.3 Data migration
- backfill `TokenProject.coingeckoId` depuis:
  1) `CardTemplate.metadata.tokenIdentity.coingeckoId` (source seed actuelle),
  2) fallback `data/token-master-50.json` via `tokenProject.slug`.

### 8.4 Tests prioritaires
- tests d’intégration DB réels:
  - capture START/END,
  - compute token score,
  - aggregation entry/user,
  - idempotence snapshot/compute,
  - cohérence ranking après recompute,
  - settlement downstream inchangé.

---

## Résumé factuel de l’audit repo utilisé pour cette proposition
- Contest scoring actuel = import manuel `userId/score` puis ranking; pas de moteur token native.
- Eligibility contest actuelle = `ANY` et `CARD_SET_ONLY` uniquement.
- Mapping CoinGecko présent dans dataset/seed (token master + metadata), pas en service runtime contest.
- Settlement plan policy-based existe déjà et peut être conservé en aval du nouveau scoring.
