# Data Architecture — Tokens & Cards

_Audited: 2026-03-16_

## Source de vérité unique

**`data/token-master-50.json`** — 50 tokens, généré par `scripts/build-token-master-50.mjs`

C'est le **seul fichier lu au runtime** et par le seed. Toutes les autres sources sont des inputs de build.

---

## Pipeline complet

```
data/sources/MCG_Set1_Edition1_v3.csv    ─┐
data/sources/mcg_base_cards.json         ─┤─→ scripts/build-token-master-50.mjs  ─→  data/token-master-50.json
data/sources/mcg_projects.json           ─┤                                               │
data/sources/mcg_card_variants.json      ─┘                                               │
                                                                                           ▼
                                                                          prisma/seed-mvp-controlled-emission.mjs
                                                                                           │
                                                                                           ▼
                                                                              DB: TokenProject.coingeckoId
                                                                              DB: CardTemplate.metadata.tokenIdentity.coingeckoId
                                                                              DB: CardTemplate (5 rarities × 5 editions × 50 tokens = 1250 rows)

data/sources/MCG_Set1_Edition1_v3.csv  ─┐
data/sources/mcg_base_cards.json       ─┤─→ scripts/build-mcg-cards-master.mjs ─→  data/mcg-cards-master.json
data/sources/mcg_projects.json         ─┤   (also reads data/token-master-50.json)      (build artifact, not used at runtime)
data/sources/mcg_card_variants.json    ─┘

lib/domain/cards/token-master.ts  ←── data/token-master-50.json  (runtime, cached in-process)
```

**Déclenchement du seed :** automatique à chaque deploy via `vercel-build`:
```
npm run prisma:deploy:schema && prisma generate && npm run bootstrap:mvp:cloud:deploy && next build
```
où `bootstrap:mvp:cloud:deploy` = `seed:mvp:controlled-emission` + `check:mvp:bootstrap:allow-exhausted`.

---

## Fichiers actifs (à garder tels quels)

| Fichier | Rôle | Utilisé par |
|---------|------|-------------|
| `data/token-master-50.json` | Source de vérité runtime — 50 tokens avec tous leurs champs | `prisma/seed-mvp-controlled-emission.mjs`, `lib/domain/cards/token-master.ts` (runtime), `scripts/build-mcg-cards-master.mjs` |
| `lib/domain/cards/token-master.ts` | Cache in-process du token master, expose lookup par slug/coingeckoId/symbol/tokenId | `lib/serializers.ts`, `lib/domain/acquisition/open-pack.ts`, `lib/domain/projections/collection.ts` |
| `prisma/seed-mvp-controlled-emission.mjs` | Seed DB : upsert TokenProject + CardTemplate (1250 rows) + PackDefinition | Déclenché par `vercel-build` |

---

## Fichiers build-only (dans `data/sources/`)

Ces fichiers sont des **inputs bruts** utilisés uniquement pour générer `data/token-master-50.json` et `data/mcg-cards-master.json`. Ils ne sont jamais lus au runtime.

| Fichier | Lignes | Rôle | Champs clés apportés |
|---------|--------|------|----------------------|
| `data/sources/MCG_Set1_Edition1_v3.csv` | 51 | CSV éditorial original — art, flavor text, coingeckoId source | `coingeckoId`, `cardTitle`, `cardSubtitle`, `flavorText`, `heroArtworkPrompt`, champs visuels |
| `data/sources/mcg_base_cards.json` | ~119 500 | Référentiel base cards — données techniques token | `slug`, `imageUrl`, `projectId`, `baseCardId`, `primaryChain`, `faction`, `marketCapRank`, `projectTier` |
| `data/sources/mcg_projects.json` | ~125 000 | Fallback pour les champs manquants dans mcg_base_cards | Mêmes champs, priorité secondaire |
| `data/sources/mcg_card_variants.json` | ~115 000 | Définitions des variants de cartes | `variantType`, `frameStyle`, `isDefaultVariant` |

---

## Artefacts de build générés (dans `data/`)

| Fichier | Généré par | Runtime ? | Notes |
|---------|-----------|-----------|-------|
| `data/token-master-50.json` | `scripts/build-token-master-50.mjs` | **OUI** | Source de vérité. Régénérer si les sources changent. |
| `data/mcg-cards-master.json` | `scripts/build-mcg-cards-master.mjs` | Non | Consolidation éditoriale complète. Non consommé par le runtime, usage documentaire/asset pipeline. |

---

## Coverage coingeckoId

**50/50 tokens ont un `coingeckoId` valide** dans `data/token-master-50.json`.

| Stratégie de résolution | Tokens |
|------------------------|--------|
| `coingeckoId` (depuis CSV directement) | 49 |
| `symbol+name` (fallback matching) | 1 |
| Manquants | **0** |

### Propagation en DB

Le seed `seed-mvp-controlled-emission.mjs` propage `coingeckoId` à deux niveaux :

1. **`TokenProject.coingeckoId`** (champ dédié) — dans le `upsert` :
   ```js
   create: { slug, displayName, isActive: true, coingeckoId: token.coingeckoId ?? null }
   update: { displayName, isActive: true, coingeckoId: token.coingeckoId ?? null }
   ```
   ✓ Présent dans `create` ET dans `update` — un re-seed met bien à jour le champ.

2. **`CardTemplate.metadata.tokenIdentity.coingeckoId`** (JSON embedé) — dans chacun des 1250 templates.

3. **Patch de sécurité post-seed** : le seed scanne tous les `TokenProject` avec `coingeckoId = null` et tente de patcher depuis `metadata.tokenIdentity.coingeckoId`.

La résolution dans `eligibility-runtime.ts` → `dedupeEligibleTokens()` lit `tokenProject.coingeckoId` en priorité, puis `cardTemplate.metadata.tokenIdentity.coingeckoId` en fallback.

---

## Problèmes identifiés

| # | Problème | Impact | Statut |
|---|---------|--------|--------|
| 1 | Si `DATABASE_URL` n'est pas configuré, le seed ne tourne pas et `TokenProject.coingeckoId` reste null en DB | Snapshots capturés avec `priceUsd = null`, scoring produit des 0 pour tous | À vérifier via `GET /api/internal/debug/token-coingecko-coverage` après un deploy |
| 2 | `data/mcg-cards-master.json` est commité dans le repo mais n'est pas utilisé au runtime | Bruit dans le repo, ~150 KB inutiles dans git | Peut être ajouté à `.gitignore` si régénéré à chaque build |
| 3 | Les 4 fichiers sources étaient à la racine du repo (pollution) | Navigation confuse | **Résolu** — déplacés dans `data/sources/` |

---

## Commandes utiles

```bash
# Régénérer data/token-master-50.json depuis les sources
node scripts/build-token-master-50.mjs

# Régénérer data/mcg-cards-master.json (consolidation éditoriale)
node scripts/build-mcg-cards-master.mjs

# Lancer le seed manuellement (nécessite DATABASE_URL)
npm run seed:mvp:controlled-emission

# Vérifier le bootstrap post-seed
npm run check:mvp:bootstrap

# Dry-run du seed (sans accès DB)
node prisma/seed-mvp-controlled-emission.mjs --dry-run

# Diagnostic coingeckoId en DB (nécessite l'app déployée)
GET /api/internal/debug/token-coingecko-coverage
GET /api/internal/debug/snapshot-health

# Diagnostic + patch coingeckoId directement depuis l'app admin
GET  /api/internal/admin/token-coingecko-patch   # état DB vs token master
POST /api/internal/admin/token-coingecko-patch   # patch les nulls (idempotent)
```

---

## Troubleshooting — coingeckoId null en DB

**Symptôme :** snapshots capturés avec `capturedCount = 0` ou `priceUsd = null` partout.

**Cause probable :** `TokenProject.coingeckoId` est null en DB — le seed n'a pas tournéou a échoué silencieusement lors d'un deploy précédent.

**Procédure de vérification et correction :**

### Étape 1 — Diagnostic

```
GET /api/internal/admin/token-coingecko-patch
```

Réponse attendue en état sain :
```json
{
  "ok": true,
  "db": { "withId": 50, "withoutId": 0 },
  "master": { "total": 50, "withCoingeckoId": 50, "patchable": 0 }
}
```

Si `withoutId > 0` ou `patchable > 0` → passer à l'étape 2.

### Étape 2 — Patch

```
POST /api/internal/admin/token-coingecko-patch
```

Réponse attendue :
```json
{
  "ok": true,
  "patched": 50,
  "skipped": 0,
  "errors": [],
  "after": { "withId": 50, "withoutId": 0 }
}
```

Le POST est **idempotent** : peut être appelé plusieurs fois sans risque. Il ne modifie que les lignes où `coingeckoId IS NULL`.

### Étape 3 — Confirmer

Rappeler le GET pour confirmer `withoutId === 0`.

### Étape 4 — Re-capturer le snapshot

Dans la page admin du contest LIVE (`/admin/contests/[id]`), dans la section **Pipeline status** :
- Si `hasStartSnapshot = false` → bouton **"Capture START snapshot now"**
- Si `hasStartSnapshot = true` mais `capturedWithPrice = 0` → bouton **"⚠ Re-capture START snapshot"**

Après capture, vérifier que `capturedWithPrice > 0` dans la réponse.

### Causes racines connues

| Cause | Détection | Fix |
|-------|-----------|-----|
| `DATABASE_URL` absent au moment du deploy | `GET /token-coingecko-patch` → `withId = 0` | Re-déclencher le seed ou utiliser le POST patch |
| Seed exécuté avant les migrations Prisma | Erreur dans les logs deploy | S'assurer que `prisma:deploy:schema` précède le seed dans `vercel-build` |
| TokenProject créé par un autre chemin sans coingeckoId | `patchable > 0` avec slugs inconnus | POST patch couvre ce cas aussi |

### Garanties après correction

Le seed (`seed-mvp-controlled-emission.mjs`) contient maintenant **3 niveaux de protection** :

1. **Niveau 1** — `tokenProject.upsert` inclut `coingeckoId` dans `create` ET `update`
2. **Niveau 2** — Patch post-upsert depuis `cardTemplate.metadata.tokenIdentity.coingeckoId`
3. **Niveau 3** — Patch de sécurité depuis `mvpTokens` (token-master-50.json en mémoire) pour tout slug encore null
