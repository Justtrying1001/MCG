# Contest Pipeline Audit — 2026-03-16

Audit statique du code source. Aucune modification apportée.

---

## Étape 1 — Lifecycle automatique (transitions temporelles)

### Machine d'état (`lifecycle-reconciliation.ts`)

- **[✓] `reconcileContestLifecycleByTime` : machine d'état OPEN → LOCKED → LIVE → SETTLED**
  `deriveTargetStatus` calcule le statut cible en fonction de l'heure (`lockAt`, `liveAt`, `endsAt`).
  `nextStatus` avance d'un seul cran à la fois (OPEN→LOCKED, pas OPEN→LIVE en sautant LOCKED).
  La boucle `while(true)` itère jusqu'à ce qu'aucune transition ne soit requise.

- **[✓] `runAutomationBeforeTransition` : pas de CANCEL sur échec START snapshot**
  ```ts
  try { await captureStartSnapshot(contestId); }
  catch (error) {
    console.warn(`[lifecycle] START snapshot failed ... proceeding to LIVE anyway ...`);
    // pas de throw, pas de cancel
  }
  ```
  Confirmé : le catch loggue et continue. Fix récent bien en place.

- **[✓] `reconcileDueContestsByTime` : scanne tous les contests dus**
  Requête Prisma couvre exactement :
  - `OPEN` avec `lockAt <= now`
  - `OPEN | LOCKED` avec `liveAt <= now`
  - `OPEN | LOCKED | LIVE` avec `endsAt <= now`

### Jobs QStash (`app/api/internal/jobs/contest-*/`)

- **[✓] `contest-live/route.ts`** → appelle `reconcileContestLifecycleByTime(contestId)` ✓
- **[✓] `contest-settle/route.ts`** → appelle `reconcileContestLifecycleByTime(contestId)` ✓
- **[✓] `contest-open/route.ts`** → fait `updateMany` DRAFT→OPEN (logique directe, pas de réconciliation ; correct pour ce cas simple)

### Vérification signature QStash (`lib/qstash-verify.ts`)

- **[✓] Bypass si clés absentes**
  ```ts
  if (!current || !next) {
    console.warn("[qstash-verify] ... skipping signature verification (non-production mode)");
    return true;
  }
  ```
  Les jobs fonctionnent même sans `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY`. Fix de sécurité existant, bien en place.

### Planification QStash à la publication (`config-runtime.ts → publishContest`)

- **[✓] 3 jobs planifiés à la publication**
  ```ts
  if (hasQStash) {
    await Promise.all([
      qstash.publishJSON({ url: `.../contest-open`,   notBefore: openAt }),
      qstash.publishJSON({ url: `.../contest-live`,   notBefore: liveAt }),
      qstash.publishJSON({ url: `.../contest-settle`, notBefore: endsAt }),
    ]);
  }
  ```
  Les `messageId` sont stockés sur le contest (`qstashOpenJobId`, etc.).

- **[✓] `NEXT_PUBLIC_APP_URL` dans `.env.example`**
  Présent avec commentaire : `# Base URL used to build QStash job callback URLs`.

- **[✓] Scheduler in-process de fallback** (`lifecycle-scheduler.ts`)
  Si `ENABLE_CONTEST_LIFECYCLE_SCHEDULER=1`, lance `reconcileDueContestsByTime()` toutes les 60 s (configurable via `CONTEST_LIFECYCLE_SCHEDULER_INTERVAL_MS`).

- **[⚠] `ENABLE_CONTEST_LIFECYCLE_SCHEDULER` absent du `.env.example`**
  Si ni QStash ni ce flag ne sont configurés en prod, les transitions ne s'avancent jamais automatiquement. Voir Risque 1.

---

## Étape 2 — START Snapshot au passage en LIVE

### `snapshot-runtime.ts`

- **[✓] `captureStartSnapshot` → `captureSnapshot(contestId, START)`** Appel direct confirmé.

- **[✓] 0 tokens → retour vide sans throw** (fix récent confirmé)
  ```ts
  if (tokens.length === 0) {
    console.warn(`... No eligible tokens ... returning empty snapshot, LIVE transition will proceed`);
    return { contestId, phase, tokenCount: 0, capturedCount: 0, missingCount: 0, missingGeckoIdCount: 0 };
  }
  ```

- **[✓] 0 geckoIds → skip CoinGecko sans throw** (fix récent confirmé)
  ```ts
  if (geckoIds.length === 0) {
    console.warn(`... all missing geckoId. Snapshot rows will be stored with null price data ...`);
    // markets = []  ← CoinGecko non appelé
  }
  ```

- **[✓] `fetchMarketsWithRetry` : 3 tentatives 2s/4s/8s**
  `const delays = [2000, 4000, 8000]` — confirmé.

- **[✓] Upsert sur `ContestTokenSnapshot` avec `phase = START`**
  Clé unique : `contestId_tokenProjectId_phase`. Idempotent, supporte la re-capture.

### `eligibility-runtime.ts`

- **[✓] `coingeckoId` dans le select de `resolveEligibleTokensForContest`**
  ```ts
  tokenProject: { select: { slug: true, coingeckoId: true } }
  ```
  Confirmé dans les deux branches (`CARD_SET_ONLY` et `ANY`).

### `data/token-master-25.json`

- **[✓] 25/25 tokens avec `coingeckoId` non-null**
  Audit précédent confirmé : `withGeckoId = 25`, `missing = 0`.
  Stratégies : 25 depuis le CSV directement.

### `prisma/seed-mvp-controlled-emission.mjs`

- **[✓] Niveau 1 — `upsert` direct** : `coingeckoId: token.coingeckoId ?? null` dans `create` ET `update` ✓
- **[✓] Niveau 2 — patch depuis `metadata.tokenIdentity.coingeckoId`** : patch post-upsert sur les TokenProject encore null ✓
- **[✓] Niveau 3 — patch de sécurité depuis `mvpTokens`** (fix récent) :
  ```js
  for (const token of mvpTokens) {
    await prisma.tokenProject.updateMany({
      where: { slug: token.slug, coingeckoId: null },
      data: { coingeckoId: token.coingeckoId },
    });
  }
  console.log(`[seed] coingeckoId patch done — ${patchCount} rows updated`);
  ```

---

## Étape 3 — END Snapshot + Scoring au passage en SETTLED

### `snapshot-runtime.ts` — END snapshot

- **[✓] `captureEndSnapshot` → `resolveCanonicalTokensFromStart`**
  L'END snapshot utilise exactement les mêmes tokens que le START (même `tokenProjectId`), pas `resolveEligibleTokensForContest`.

- **[✓] Absence du START snapshot → throw explicite**
  ```ts
  if (startRows.length === 0) {
    throw new ContestRuntimeError("START snapshot is required before END snapshot", 409);
  }
  ```
  Cette erreur est catchée dans `runAutomationBeforeTransition` avec un warn — le contest passe quand même en SETTLED, mais sans END snapshot (scoring restera bloqué).

### `scoring-engine-runtime.ts`

- **[✓] Guard : les deux snapshots requis**
  ```ts
  if (startRows.length === 0 || endRows.length === 0) {
    throw new ContestRuntimeError("Both START and END snapshots are required", 409);
  }
  ```

- **[✓] Guard récent : 0 prix dans le START snapshot → throw 409** (fix récent confirmé)
  ```ts
  const startRowsWithPrice = startRows.filter((r) => r.priceUsd !== null);
  if (startRowsWithPrice.length === 0) {
    throw new ContestRuntimeError(
      `START snapshot exists but has no price data (${startRows.length} tokens, 0 with price). Re-capture the START snapshot before scoring.`,
      409
    );
  }
  ```
  Ce throw est catchée dans `runAutomationBeforeTransition` → warn + continuation.

- **[✓] Formule de score : `priceChange × rarityMultiplier × editionMultiplier`**
  `finalScore = baseScore * rarityMultiplier * editionMultiplier`
  avec pondérations : prix 45%, volume 25%, marketCap 20%, rank 10%.

- **[✓] Rankings générés et stockés en `ContestRanking`**
  `createMany` sur les rankings triés par score décroissant.

### `settlement-plan-runtime.ts` — auto-settle

- **[✓] `executeAutoSettlementForContest` appelé par `tryAutoSettle`** dans `runAutomationBeforeTransition`.
  `tryAutoSettle` catch toute erreur avec `console.error` → le contest avance quand même en SETTLED.

- **[✓] Reward policy auto-publiée à la publication du contest**
  ```ts
  await tx.contestRewardPolicy.updateMany({ where: { contestId }, data: { status: 'PUBLISHED' } });
  ```
  `publishContest` fait ça automatiquement → la condition `policy.status !== "PUBLISHED"` ne sera jamais vraie dans le flow normal.

- **[⚠] 0 rankings → settlement silencieusement skippé**
  `generateSettlementPlan` throw `"Cannot generate settlement plan without ranking rows"` si `rankings.length === 0`.
  Ce throw est catchée par `tryAutoSettle` → warning dans les logs → contest passe en SETTLED sans distribution de récompenses.
  **C'est le comportement attendu** pour un contest sans participants, mais il n'y a aucune notification admin.

---

## Étape 4 — Visibilité admin des snapshots

### `app/api/internal/contest-runs/[contestId]/snapshots/route.ts`

- **[✓] Retourne `hasStartSnapshot`, `hasEndSnapshot`**
- **[✓] Retourne `capturedWithPrice` par phase** (fix récent)
- **[✓] Retourne la liste des tokens avec `priceUsd`, `geckoId`, `hasCoingeckoId`**

### `app/admin/(protected)/contests/[contestId]/page.tsx`

- **[✓] Chargement parallèle overview + snapshots**
  `await Promise.all([fetch(.../overview), loadSnapshots()])` ✓

- **[✓] Bloc "Pipeline status" avec ✓/⚠/✗ par étape**
  Icônes : vert ✓ si ok, orange ⚠ si snapshot existe mais 0 prix, rouge ✗ si absent.

- **[✓] Bouton "Capture START snapshot now"**
  Conditionnel : `status === "LIVE" && !hasStartSnapshot` ✓

- **[✓] Bouton "⚠ Re-capture START snapshot"**
  Conditionnel : `status === "LIVE" && hasStartSnapshot && capturedWithPrice === 0` ✓

- **[✓] Bouton "Capture END snapshot now"**
  Conditionnel : `status === "LIVE" && hasStartSnapshot && !hasEndSnapshot` ✓

---

## Risques identifiés

### Risque 1 — Lifecycle non automatique si QStash ET scheduler absents ⚠ (MODÉRÉ)

**Condition** : `QSTASH_TOKEN` vide (jobs non planifiés) ET `ENABLE_CONTEST_LIFECYCLE_SCHEDULER` non à `1`.

**Impact** : les transitions temporelles ne se déclenchent jamais automatiquement. Le contest reste bloqué en OPEN même après `liveAt`. Seul un appel manuel à `GET /api/internal/contests` (liste admin) ou à `POST /api/internal/contests/reconcile-lifecycle` déclencherait la réconciliation.

**Mitigation existante** :
- `GET /api/internal/contests` appelle `reconcileDueContestsByTime()` à chaque chargement (side-effect de la liste admin).
- Lifecycle control panel dans l'admin permet des transitions manuelles.

**Risque résiduel** : si personne ne charge la page admin ni ne déclenche manuellement entre `liveAt` et le test → les snapshots ne se capturent jamais.

**Fix recommandé** : ajouter `ENABLE_CONTEST_LIFECYCLE_SCHEDULER=""` dans `.env.example` avec commentaire, ou confirmer que QStash est bien configuré en prod.

---

### Risque 2 — `NEXT_PUBLIC_APP_URL` configuré à `localhost:3000` en prod ⚠ (MODÉRÉ)

**Condition** : variable copiée telle quelle depuis `.env.example`.

**Impact** : les callbacks QStash pointent vers `http://localhost:3000/api/internal/jobs/...` → QStash ne peut pas joindre le serveur → jobs silencieusement perdus → même symptôme que Risque 1.

**Détection** : vérifier la valeur dans le dashboard Upstash QStash (messages planifiés → URL du callback).

---

### Risque 3 — Reward policy non publiée (FAIBLE)

**Condition** : contest créé par un chemin qui n'utilise pas `publishContest()`.

**Impact** : `generateSettlementPlan` throw → settlement skippé silencieusement → contest SETTLED sans distribution de récompenses.

**Mitigation** : `publishContest()` auto-publie la reward policy. Dans le flow normal (create → publish via l'admin), ce cas ne peut pas se produire.

---

### Risque 4 — CoinGecko rate limit ou panne au moment de `liveAt` (FAIBLE, mitigé)

**Impact** : START snapshot capturé avec 0 prix → scoring bloqué par le guard (ContestRuntimeError 409).

**Mitigation complète** :
1. `fetchMarketsWithRetry` : 3 tentatives (backoff 2s/4s/8s) ✓
2. Contest passe quand même en LIVE si les 3 tentatives échouent ✓
3. Bouton admin "⚠ Re-capture START snapshot" visible dans Pipeline status ✓
4. Scoring guard empêche des scores de 0 d'être calculés ✓

---

### Risque 5 — Contest sans entries (ACCEPTABLE)

**Comportement** : 0 entries → scoring produit 0 rankings → `generateSettlementPlan` throw → catchée par `tryAutoSettle` → contest avance en SETTLED sans distribution.

**Verdict** : comportement attendu et correct. Aucun blocage, aucune donnée corrompue.

---

### Risque 6 — `coingeckoId` null en DB malgré le seed ⚠ (MODÉRÉ, outillé)

**Condition** : seed n'a pas tourné, ou a échoué silencieusement sur un deploy précédent.

**Impact** : `resolveEligibleTokensForContest` retourne 25 tokens avec `coingeckoId = null` → `geckoIds = []` → snapshot stocké avec `priceUsd = null` → scoring bloqué.

**Mitigation** : endpoint `POST /api/internal/admin/token-coingecko-patch` créé pour patcher les nulls de façon idempotente. Voir `docs/data-architecture.md#troubleshooting`.

---

## Verdict

### **PRÊT POUR TEST** — avec 2 vérifications préalables obligatoires

Avant le premier test en prod/staging :

**[Action 1]** Confirmer le mécanisme de lifecycle automatique :

```
Option A : QSTASH_TOKEN est configuré ET NEXT_PUBLIC_APP_URL pointe vers l'URL publique
Option B : ENABLE_CONTEST_LIFECYCLE_SCHEDULER=1 est défini dans l'env
```

Sans l'une des deux, déclencher les transitions manuellement via le lifecycle control panel.

**[Action 2]** Vérifier que les `TokenProject.coingeckoId` sont bien peuplés en DB :

```
GET /api/internal/admin/token-coingecko-patch
→ "db": { "withId": 50, "withoutId": 0 }  ← état attendu

Si withoutId > 0 :
POST /api/internal/admin/token-coingecko-patch
```

---

### Checklist de test complet

```
[ ] Contest créé avec openAt, liveAt, endsAt cohérents
[ ] Contest publié → reward policy auto-publiée
[ ] GET /api/internal/admin/token-coingecko-patch → withoutId = 0
[ ] Transition → LIVE : vérifier START snapshot dans Pipeline status
    [ ] tokenCount > 0
    [ ] capturedWithPrice > 0  (les prix sont non-null)
[ ] Quelques joueurs soumettent des lineups avant liveAt
[ ] Transition → SETTLED : vérifier dans Pipeline status
    [ ] hasEndSnapshot = true avec capturedWithPrice > 0
    [ ] Scoring = READY
    [ ] Ranking = Generated
    [ ] Settlement = Done
[ ] Vérifier les rewards dans les wallets des joueurs
```
