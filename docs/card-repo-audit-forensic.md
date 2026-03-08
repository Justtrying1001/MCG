# MCG — Audit forensic du repo cartes
Status: AUDIT


## 1. Résumé exécutif

Le runtime cartes actuel est **plus simple que le repo ne le laisse penser**.

- La chaîne live repose surtout sur: `mcg_base_cards.json` + enrichissement dans `lib/cards.ts` + exposition API (`/api/me`, `/api/pack/open`) + consommation via `useSession` + rendu via `CardFrame` + styles `.mcg-*` dans `app/globals.css`.
- Le repo contient plusieurs couches périphériques qui donnent une impression de centralité (docs V1, pipeline futur, ancien MVP, alias API), mais ne pilotent pas le flux runtime principal visible.
- La confusion vient surtout du mélange:
  - source data carte
  - enrichissement produit visuel
  - usage gameplay PvE
  - rendu UI
  - docs d’ambition/refonte

Conclusion forensic: **le moteur live est unique et identifiable**, mais entouré de fichiers “bruit” (docs/spec/legacy) qui brouillent la lecture du système cartes.

---

## 2. Chaîne réelle du système cartes

Chaîne runtime observée (flow principal):

1) **Source data brute (fichiers)**
- `mcg_base_cards.json` (base card stats + identité)
- `mcg_projects.json` (métadonnées projet utilisées en fallback/enrichissement)
- `mcg_card_variants.json` (variantes, poids de drop, variant default)

2) **Hydratation + enrichissement mémoire**
- `lib/cards.ts`
  - charge les 3 JSON via `readFileSync`
  - crée cache mémoire
  - `hydrateCard()` fusionne base + metadata projet + variante par défaut + thème visuel chain
  - `getBaseCards()` filtre `isEligible !== false`
  - `getCardsMap()` sert de lookup runtime

3) **Utilisation serveur côté pack/gameplay**
- `app/api/pack/open/route.ts`
  - appelle `openBasePack(getBaseCards())`
  - persiste résultats en DB (`user`, `packOpening`, `userCard`)
  - retourne `pulledCards` (objets carte hydratés)
- `lib/pve/generateEnemyTeam.ts` / `lib/pve/executeBattle.ts`
  - utilisent `getBaseCards` / `getCardsMap` pour constituer équipes PvE

4) **Serialization / transport API front**
- `app/api/me/route.ts`
  - récupère `userCard` DB
  - appelle `buildUserPayload()` (`lib/serializers.ts`)
  - `buildUserPayload()` joint `userCard.baseCardId` -> carte hydratée (`getCardsMap`)
  - renvoie `collection[].card` au front

5) **Hydratation front session**
- `components/useSession.ts`
  - fetch `/api/me`
  - stocke `me.collection[].card` dans état client

6) **Rendu live**
- Pages consommatrices:
  - `app/collection/page.tsx`
  - `app/packs/page.tsx`
  - `app/combats/page.tsx`
- Renderer commun:
  - `components/ui/CardFrame.tsx`
- Styles effectifs:
  - `app/globals.css` (bloc “MCG PREMIUM CARD SYSTEM — live rendering path”, classes `.mcg-*`, `.vt-*`, `.tier-*`)

Chaîne secondaire (alias API):
- `POST /api/pve/run` ré-exporte `POST` de `/api/pve/battle` (`app/api/pve/run/route.ts`), donc pas de logique cartes additionnelle.

---

## 3. Noyau runtime critique

Fichiers indispensables pour que les cartes live fonctionnent:

- `lib/cards.ts` — source runtime de vérité pour chargement/hydratation/enrichissement/caches + tirage pack.
- `lib/serializers.ts` — jonction DB (`UserCard`) -> objet carte hydraté retourné au front.
- `app/api/me/route.ts` — endpoint principal qui alimente collection/front.
- `app/api/pack/open/route.ts` — endpoint de génération de pulls cartes.
- `components/useSession.ts` — hook d’entrée front de la donnée cartes.
- `components/ui/CardFrame.tsx` — renderer de carte effectif.
- `app/globals.css` — implémentation CSS active du renderer `.mcg-*`.
- `app/collection/page.tsx` / `app/packs/page.tsx` / `app/combats/page.tsx` — surfaces live où les cartes sont effectivement rendues.
- `types/cards.ts` — type transversal utilisé par API/front/PvE.
- `mcg_base_cards.json` / `mcg_projects.json` / `mcg_card_variants.json` — jeux de données sources runtime.

---

## 4. Fichiers runtime secondaires

Utiles mais non centraux au rendu carte “collection/packs”:

- `lib/pve/*` (`executeBattle`, `generateEnemyTeam`, `simulateBattle`, `serializeBattle`, `types`, etc.)
  - Connexe cartes via stats et sélection d’équipe.
  - Ne pilotent pas le renderer visuel de carte.
- `app/api/pve/battle/route.ts`, `app/api/pve/run/route.ts`
  - Transport PvE, pas pipeline de rendu carte.
- `components/layout/SiteShell.tsx`
  - Cadre applicatif, pas logique carte.
- `prisma/schema.prisma`
  - Persistance inventaire et historique, pas source visuelle carte.

---

## 5. Sources de données et transformation

### A. Source brute

- `mcg_base_cards.json`
  - Champs observés: `baseCardId`, `projectId`, `coingeckoId`, `name`, `symbol`, `slug`, `image`, `primaryChain`, `faction`, `subtitle`, `projectTier`, `marketCapRank`, `ATK`, `DEF`, `SPD`, `CTRL`, `powerScore`, `isEligible`, `snapshotDate`.
- `mcg_projects.json`
  - Métadonnées projet (incl. `image`, `faction`, `primaryChain`, `marketCapRank`, etc.).
- `mcg_card_variants.json`
  - Champs variants (`variantType`, `variantRarity`, `dropWeight`, `isDefaultVariant`, etc.).

### B. Source enrichie runtime (objet `BaseCard` hydraté)

Produit par `hydrateCard()` dans `lib/cards.ts`:

- Fallbacks/overrides:
  - `image` <- base ou project
  - `faction`, `primaryChain`, `marketCapRank` <- base ou project
- Injection variant default:
  - `variantId`, `variantType`, `variantRarity`, `frameStyle`, `variantLabel`
- Injection thème visuel:
  - `chainColor`, `chainGlow`, `chainArt`

### C. Source réellement visible front (`CardFrame`)

Champs effectivement consommés par le renderer:

- identité: `name`, `symbol`, `image`
- taxonomie: `primaryChain`, `faction`, `projectTier`, `marketCapRank`
- variante: `variantType`, `variantLabel`, `variantId`, `variantRarity`
- gameplay: `ATK`, `DEF`, `SPD`, `CTRL`, `powerScore` (ou fallback calculé)
- style injecté: `chainColor`, `chainGlow`, `chainArt`

### D. Champs source peu ou non consommés

- `subtitle`, `slug`, `snapshotDate`, `coingeckoId`, `projectId` ne pilotent pas directement le rendu live carte.
- Plusieurs champs de `mcg_projects.json` (supply/volume/flags) ne sont pas consommés par le runtime carte.

### E. Ambiguïtés / points à noter

- Le mapping du thème visuel (`CHAIN_THEME`) est indexé sur `faction` (pas `primaryChain`), ce qui peut produire des fallbacks `Other` selon la donnée.
- `README.md` dit “No variants product flow”, mais le runtime injecte et affiche des données de variante.

---

## 6. Rendu live actuel

### Renderer de vérité

- Renderer principal unique: `components/ui/CardFrame.tsx`.
- Utilisé explicitement par les 3 surfaces live cartes:
  - `collection`
  - `packs` (reveal)
  - `combats` (team selection)

### Nombre de renderers existants

- **1 renderer live branché**: `CardFrame`.
- **1 renderer legacy non branché**: `renderCard()` interne de `components/MvpApp.tsx`.

### Styles qui font foi

- `app/globals.css` contient le bloc déclaré explicitement comme “live rendering path” pour `CardFrame`.
- Les classes actives du renderer sont `.mcg-*`, `.vt-*`, `.tier-*`.

### Autres styles carte présents

- Présence de classes legacy (`.card`, etc.) corrélées à `MvpApp.tsx`, non branchées aux pages App Router live.

---

## 7. APIs, serializers et transport front

### Endpoints cartes clés

- `GET /api/me`
  - Source principale de la collection et des cartes affichées côté front.
  - Utilise `buildUserPayload` pour joindre la donnée DB vers les cartes hydratées.
- `POST /api/pack/open`
  - Génère des pulls de cartes à partir de `getBaseCards` + `openBasePack`.
  - Retourne directement les cartes tirées au front (`pulledCards`).

### Hooks / transport front

- `useSession` est le point d’entrée de session + collection.
- Les pages cartes consomment `me.collection[].card` depuis ce hook.

### Serialization réelle

- `buildUserPayload` est le serializer critique pour le flux collection.
- `serializeBattle` est spécifique au payload PvE, connexe mais secondaire pour le rendu carte.

---

## 8. Docs, specs et fichiers de chantier non branchés au runtime

Fichiers docs cartes identifiés:

- `docs/card-system-audit-v1.md`
- `docs/card-system-v1-production-spec.md`
- `docs/card-pipeline-v1-semi-generatif.md`
- `docs/ux-redesign-spec.md`

Constat forensic:

- Ces fichiers documentent audits, intentions V1, pipeline futur, vision UX.
- Ils ne sont pas importés/exécutés par le runtime applicatif.
- Ils peuvent donner une impression de centralité architecturale, mais restent **référence documentaire**.

---

## 9. Fichiers potentiellement morts, redondants ou trompeurs

### A. Legacy/non branché au runtime visible

1) `components/MvpApp.tsx`
- Pourquoi lié aux cartes: contient son propre renderer carte (`renderCard`) et logique collection/packs/pve.
- Pourquoi non runtime: aucune importation détectée dans `app/*` ou layout live.
- Diagnostic: **potentiellement mort runtime** (ou archive de phase MVP).
- Confiance: élevée.

2) `mvp/*` (`mvp/main.js`, `mvp/index.html`, `mvp/styles.css`, `mvp/README.md`)
- Pourquoi lié: prototype web MVP avec logique cartes.
- Pourquoi non runtime: hors App Router Next actuel, non branché aux routes/pages live.
- Diagnostic: **legacy/prototype**.
- Confiance: élevée.

### B. Trompeurs par positionnement documentaire

3) `docs/card-system-v1-production-spec.md`, `docs/card-pipeline-v1-semi-generatif.md`
- Pourquoi liés: specs détaillées “card system/pipeline”.
- Pourquoi non runtime: pas de connexion code/import/build.
- Diagnostic: **docs chantier/vision**, pas moteur actuel.
- Confiance: élevée.

### C. Redondance de chemin API

4) `app/api/pve/run/route.ts`
- Pourquoi lié: endpoint historique mentionné dans README.
- Pourquoi secondaire: simple alias de `/api/pve/battle`, sans logique propre.
- Diagnostic: **redondant léger** (compatibilité).
- Confiance: élevée.

### D. Bruit CSS potentiel

5) parties de `app/globals.css` orientées classes legacy (`.card` etc.)
- Pourquoi lié: style carte ancien probablement pour `MvpApp`.
- Pourquoi non central: renderer live actuel utilise `.mcg-*`.
- Diagnostic: **potentiellement redondant**.
- Confiance: moyenne (usage dynamique non détecté à confirmer).

---

## 10. Source de vérité actuelle du système cartes

### Type

- Type transversal de vérité: `BaseCard` (`types/cards.ts`) — utilisé côté data, API, front, PvE.

### Flow

- Flow canonique de vérité:
  - JSON source -> `lib/cards.ts` (hydrate/enrich) -> API (`/api/me`, `/api/pack/open`) -> `useSession` -> `CardFrame`.

### Objet

- Objet de vérité runtime front: `collection[].card` construit via `buildUserPayload`.

### Renderer

- Renderer de vérité: `CardFrame`.

### Style

- Style de vérité: bloc `.mcg-*` de `app/globals.css`.

---

## 11. Mélanges de responsabilités problématiques

1) `lib/cards.ts`
- Mélange: IO fichiers + cache + enrichissement métier + thème visuel + logique probabiliste pack.
- Impact: fichier central mais multi-responsabilités.

2) `types/cards.ts`
- Mélange implicite: même type `BaseCard` sert à la fois source data, vue UI, et besoins gameplay/PvE.
- Impact: frontière source/viewmodel/gameplay peu explicite.

3) `app/globals.css`
- Mélange: styles globaux app + renderer carte live + styles legacy potentiels.
- Impact: difficile d’isoler strictement ce qui fait foi pour la carte.

4) documentation vs runtime
- Plusieurs docs très prescriptives coexistent avec un runtime plus simple.
- Impact: perception de complexité supérieure au moteur réel.

---

## 12. Lecture minimale recommandée

Ordre de lecture court pour comprendre le système cartes actuel:

1. `lib/cards.ts`
2. `types/cards.ts`
3. `lib/serializers.ts`
4. `app/api/me/route.ts`
5. `app/api/pack/open/route.ts`
6. `components/useSession.ts`
7. `components/ui/CardFrame.tsx`
8. `app/globals.css` (section “live rendering path”)
9. `app/collection/page.tsx`
10. `app/packs/page.tsx`
11. `app/combats/page.tsx`

Puis seulement ensuite:
- `lib/pve/*`
- docs `docs/card-*.md`
- legacy `components/MvpApp.tsx` + `mvp/*`

---

## 13. Recommandation de nettoyage futur

Sans refonte (audit-only), points d’attaque ménage ultérieur:

1) **Documenter explicitement le noyau runtime** (liste courte ci-dessus) pour réduire le bruit de lecture.
2) **Tagger legacy** (`MvpApp`, `mvp/*`, styles legacy) comme archive/non-runtime.
3) **Distinguer docs “vision” vs “runtime actuel”** dans `docs/`.
4) **Clarifier les frontières de responsabilité** autour de `lib/cards.ts` (sans changer le flow maintenant).
5) **Valider les redondances API** (`/api/pve/run`) selon besoin compat.

Ambiguïté explicitement conservée: certains fichiers “potentiellement morts” peuvent encore servir à usage manuel/local non détecté par imports statiques; classification faite avec prudence.
