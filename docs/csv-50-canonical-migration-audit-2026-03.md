# 1. INVENTAIRE DES FICHIERS AUDITÉS

| Chemin | Type | Rôle | Statut estimé | Utilité pour la future source canonique |
|---|---|---|---|---|
| `MCG_Set1_Edition1_v3.csv` | csv | Liste éditoriale de 50 cartes (set S01) | actif (data candidate) | **Très élevée**: base de travail explicite pour les 50 tokens MVP. |
| `mcg_base_cards.json` | json | Catalogue legacy principal (`BaseCard`) avec IDs + stats + ranking + symbol/name/slug/coingecko | actif transitoire | **Très élevée**: meilleure source de complétion technique (IDs, slug, images, chain/faction, etc.). |
| `mcg_projects.json` | json | Métadonnées projet/token (marché, supply, image, éligibilité) | actif transitoire | **Élevée**: utile pour enrichir métadonnées produit/display/ops. |
| `mcg_card_variants.json` | json | Variants legacy (type/rarity/dropWeight/default) par `baseCardId` | actif transitoire | **Moyenne**: utile pour migration UI transitoire, mais beaucoup à ignorer côté canon DB-native. |
| `prisma/seed-mvp-controlled-emission.mjs` | seed script | Sélection top-50 depuis `mcg_base_cards.json`, création templates/packs controlled-emission | actif | **Très élevée**: révèle les champs réellement nécessaires au backend seed. |
| `prisma/schema.prisma` | prisma | Schéma runtime (`CardTemplate`, `PackDefinition`, `OwnedCardInstance`, etc.) | actif hybride | **Très élevée**: définit les champs canoniques backend réellement utilisés. |
| `lib/cards.ts` | ts | Chargement/hydration JSON legacy, tirage guest, lookup `getCardsMap` | actif transitoire | **Élevée**: montre les dépendances legacy à éliminer/migrer. |
| `lib/domain/acquisition/open-pack.ts` | ts | Tirage auth DB-native + bridge vers `baseCardId` JSON | actif | **Très élevée**: expose précisément le couplage DB→JSON restant. |
| `app/api/guest/pack/open/route.ts` | api | Endpoint guest basé 100% JSON | actif | **Moyenne**: important pour plan de découplage legacy. |
| `app/api/me/route.ts` + `lib/serializers.ts` | api/ts | Payload collection utilisateur via mapping `baseCardId` + JSON | actif hybride | **Élevée**: surface clé à migrer vers DTO template-native. |
| `lib/domain/projections/collection.ts` | ts | Projection v2 templates + `byBaseCard` via metadata legacy | actif hybride | **Élevée**: montre ce qui est déjà DB-native et ce qui reste bridge legacy. |
| `app/packs/page.tsx` + `components/ui/CardFrame.tsx` + `types/cards.ts` | ui/ts | UX pack + rendu carte basés `BaseCard` legacy | actif | **Élevée**: migration UI dépendra du mapping champs vers nouveau canon. |

---

# 2. AUDIT DU CSV DES 50 CARTES

## Chemin exact
- `MCG_Set1_Edition1_v3.csv`

## Nombre de lignes utiles
- 50 lignes data (hors header).

## Colonnes exactes
- `cardNumber`
- `masterCardId`
- `coingeckoId`
- `name`
- `symbol`
- `cardTitle`
- `cardSubtitle`
- `flavorText`
- `setCode`
- `collectionCode`
- `edition`
- `artist`
- `visualIdentityCore`
- `heroFocus`
- `allowedMotifs`
- `forbiddenMotifs`
- `colorCues`
- `artTone`
- `archetype`
- `cardworthiness`
- `primaryChain`
- `heroArtworkPrompt`

## Signification probable des colonnes
- **Identifiants éditoriaux**: `cardNumber`, `masterCardId`, `setCode`, `collectionCode`, `edition`.
- **Clés token**: `coingeckoId`, `name`, `symbol`.
- **Display/UI text**: `cardTitle`, `cardSubtitle`, `flavorText`, `artist`.
- **Direction créative/art**: `visualIdentityCore`, `heroFocus`, `allowedMotifs`, `forbiddenMotifs`, `colorCues`, `artTone`, `heroArtworkPrompt`.
- **Taxonomie produit**: `archetype`, `cardworthiness`, `primaryChain`.

## Qualité de remplissage
- 22/22 colonnes remplies à 50/50 (aucune cellule vide détectée).

## Colonnes utiles UI
- `cardTitle`, `cardSubtitle`, `flavorText`, `colorCues`, `artTone`, `artist`, `heroArtworkPrompt`, `primaryChain`, `archetype`.

## Colonnes utiles backend
- Directement utiles: `coingeckoId`, `name`, `symbol`, `setCode`, `collectionCode`.
- Partiellement utiles après normalisation: `cardworthiness` (pour mapping tier/rarity policy éventuelle), `primaryChain`.

## Colonnes éditoriales
- `visualIdentityCore`, `heroFocus`, `allowedMotifs`, `forbiddenMotifs`, `heroArtworkPrompt`, `colorCues`, `artTone`.

## Colonnes inutiles / ambiguës pour runtime actuel
- `edition` (valeur texte “Edition 1” non alignée avec enum runtime `EditionType`).
- `cardworthiness` (format ex. `S+` ambigu vs `projectTier` runtime `S/A/B/C/D`).
- `masterCardId` (interne CSV, non branché runtime).
- `cardNumber` (utile collection print/editorial, pas runtime pack/template).

## Conclusion : le CSV peut-il devenir la base officielle ?
- **Oui, mais pas seul en l’état.**
- Le CSV est excellent pour la sélection 50 + couche éditoriale, mais il manque plusieurs champs runtime/ID stables nécessaires (slug, projectId, baseCardId, image, flags éligibilité, etc.).
- Il doit être **enrichi automatiquement** depuis JSON legacy (et/ou générer un fichier canonique dérivé).

---

# 3. AUDIT DES JSON LEGACY

## `mcg_base_cards.json`
- **Chemin exact**: `mcg_base_cards.json`
- **Rôle actuel dans le repo**:
  - source principale `BaseCard` pour guest runtime,
  - lookup de rendu pour pack auth (`open-pack.ts` via `getCardsMap`),
  - source seed top-50 (`seed-mvp-controlled-emission.mjs`).
- **Champs utiles**:
  - identifiants: `baseCardId`, `projectId`, `coingeckoId`, `slug`, `symbol`, `name`
  - metadata runtime/display: `image`, `primaryChain`, `faction`, `marketCapRank`, `projectTier`, `isEligible`
  - legacy UI stats: `ATK`, `DEF`, `SPD`, `CTRL`, `powerScore`.
- **Champs à récupérer potentiellement**:
  - `baseCardId`, `projectId`, `slug`, `image`, `projectTier`, `marketCapRank`, `isEligible`.
- **Champs à ignorer (canon futur backend)**:
  - stats PvE (`ATK/DEF/SPD/CTRL`) si architecture template-native n’en dépend plus.
- **Niveau de confiance**: **élevé** (champs clés uniques: `coingeckoId`, `slug`, `projectId`, `baseCardId`).

## `mcg_projects.json`
- **Chemin exact**: `mcg_projects.json`
- **Rôle actuel**: enrichissement projet/token dans `lib/cards.ts`.
- **Champs utiles**:
  - `projectId`, `coingeckoId`, `slug`, `name`, `symbol`, `primaryChain`, `faction`, `image`, `isEligible`
  - ops/analytics potentiels: `marketCap`, `marketCapRank`, `totalVolume`, `circulatingSupply`, `maxSupply`, `eligibilityFlags`.
- **Champs à récupérer potentiellement**:
  - `eligibilityFlags`, `isMultiChain` (si utiles ops), métriques marché (si voulues pour admin analytics).
- **Champs à ignorer**:
  - métriques marché volatiles si on veut un canon “stable produit” plutôt que “market snapshot”.
- **Niveau de confiance**: **élevé** pour identité token; **moyen** pour métriques marché (nature snapshot).

## `mcg_card_variants.json`
- **Chemin exact**: `mcg_card_variants.json`
- **Rôle actuel**:
  - hydration variant UI legacy,
  - dropWeight legacy utilisé dans `lib/cards.ts` guest pool.
- **Champs utiles**:
  - `variantId`, `baseCardId`, `variantType`, `variantRarity`, `isDefaultVariant`, `frameStyle`.
- **Champs à récupérer potentiellement**:
  - uniquement pour migration UI transitoire (`variantId`, `frameStyle`, `isDefaultVariant`).
- **Champs à ignorer (canon cible)**:
  - `dropWeight` legacy (incompatible avec draw DB-native remainingSupply).
- **Niveau de confiance**: **moyen** (utile legacy UI, faible alignement avec modèle cible editions/rarities DB).

---

# 4. MAPPING ENTRE LE CSV ET LES JSON

## Clé de mapping recommandée
1. **Primaire**: `coingeckoId` (unique dans `mcg_base_cards.json` / `mcg_projects.json`).
2. **Fallback**: `slug` (si présent dans CSV futur; aujourd’hui absent).
3. **Fallback de secours**: `name` + `symbol` (à utiliser seulement avec revue manuelle).

## Résultats de matching observés (CSV 50 → `mcg_base_cards.json`)
- Par `coingeckoId` seul: **46 clean / 50**, **0 ambigu**, **4 sans match**.
- Par `symbol` seul: **15 clean / 50**, **33 ambigus**, **2 sans match**.
- Par `name` seul: **35 clean / 50**, **10 ambigus**, **5 sans match**.
- Stratégie combinée (`coingeckoId` → `symbol` → `name`): **47 clean**, **1 ambigu**, **2 sans match**.

## Cas propres
- 46 lignes matchent proprement par `coingeckoId`.
- 1 ligne match fallback (non-coingecko) mais avec risque (voir Banana Gun ci-dessous).

## Cas ambigus
- **Hachiko** (`coingeckoId=hachiko`) n’existe pas tel quel; `symbol=HACHI` retourne 5 candidats dans legacy.

## Cas sans match
- **Terra Luna Classic** (`coingeckoId=terra-luna`) sans match (legacy semble utiliser autre ID historique).
- **SATS** (`coingeckoId=sats-ordinals`) sans match.

## Cas nécessitant correction manuelle
- `terra-luna` → probablement migration vers ID actuel legacy (incertain sans règle métier explicite).
- `hachiko` → choisir explicitement le bon actif (`hachiko-3`? `hachiko-sol`? etc.) via arbitrage produit.
- `sats-ordinals` → déterminer ID canon attendu dans l’écosystème legacy.
- `banana-gun` → **attention**: fallback symbol match pointe vers `banana-for-scale`, probablement faux match.

## Tableau des cas problématiques

| Ligne CSV | Token CSV | coingeckoId CSV | Match JSON trouvé | Clé utilisée | Confiance | Problème |
|---:|---|---|---|---|---|---|
| 9 | Terra Luna Classic | `terra-luna` | aucun | n/a | faible | Pas de match direct sur coingecko/name/symbol. |
| 35 | Banana Gun | `banana-gun` | `banana-for-scale` (via symbol) | symbol | faible | Faux positif probable, collision sémantique. |
| 46 | Hachiko | `hachiko` | 5 candidats (`hachiko-3`, `hachiko-sol`, …) | symbol | faible | Ambigu fort, arbitrage manuel requis. |
| 51 | SATS | `sats-ordinals` | aucun | n/a | faible | Pas de match direct, besoin mapping manuel. |

---

# 5. CHAMPS MANQUANTS DANS LE CSV

Champs manquants pour en faire une vraie source canonique runtime + seed + UI:

- `projectId` (ID stable interne legacy/bridge)
- `baseCardId` (bridge critique actuel pour runtime auth/UI)
- `slug` (identifiant lisible unique)
- `image` / `imageUrl` (asset principal)
- `isEligible` (gating seed/runtime)
- `marketCapRank` (si logique de sélection/tri conservée)
- `projectTier` (actuellement utilisé dans legacy card framing/weighting)
- `snapshotDate` (provenance temporelle data legacy)
- `variantDefaultId` (si transition UI variants nécessaire)
- `faction` normalisée (CSV en a une logique implicite via texte, pas champ dédié fiable)
- `tokenId` canon futur (nouvel ID recommandé, non présent)

Champs semi-manquants (présents mais non normalisés pour runtime):
- `primaryChain` (présent mais besoin normalisation enum/taxonomie).
- `cardworthiness` (présent mais non aligné au modèle `projectTier` runtime).

---

# 6. CHAMPS À RÉCUPÉRER DEPUIS LES JSON

| Champ cible | Fichier source | Champ source | Justification | Usage futur |
|---|---|---|---|---|
| `projectId` | `mcg_base_cards.json` / `mcg_projects.json` | `projectId` | ID stable déjà utilisé par legacy toolchain | seed, migration bridge |
| `baseCardId` | `mcg_base_cards.json` | `baseCardId` | Nécessaire tant que runtime/serializer dépend du bridge metadata | backend transitoire, UI transitoire |
| `slug` | `mcg_base_cards.json` / `mcg_projects.json` | `slug` | Clé lisible stable, bonne fallback de matching | canon data, ops |
| `imageUrl` | `mcg_base_cards.json` / `mcg_projects.json` | `image` | Rendu UI, seed template display | UI, backend display |
| `isEligible` | `mcg_base_cards.json` / `mcg_projects.json` | `isEligible` | Filtrage pool MVP/seed | seed, ops |
| `faction` | `mcg_base_cards.json` / `mcg_projects.json` | `faction` | Utilisé en UI actuelle et segmentation produit | UI, analytics |
| `projectTier` | `mcg_base_cards.json` | `projectTier` | Utilisé dans legacy framing/weights; utile temporairement | UI transitoire |
| `marketCapRank` | `mcg_base_cards.json` / `mcg_projects.json` | `marketCapRank` | Tri/diagnostic sélection top tokens | ops, migration audit |
| `variantDefault` | `mcg_card_variants.json` | `isDefaultVariant` + `variantId` + `frameStyle` | Préserver rendu UI durant transition | UI migration |
| `eligibilityFlags` | `mcg_projects.json` | `eligibilityFlags` | Gouvernance/exclusions explicites | ops/pipeline data |

---

# 7. CHAMPS À NE PAS REPRENDRE

À ne **pas** importer dans la future base canonique runtime (ou seulement archive):

- `dropWeight` de `mcg_card_variants.json` (legacy draw, incompatible avec émission DB-native remainingSupply).
- Variants legacy `glitch` / `gold` en tant que vérité runtime, car non alignés à l’axe `EditionType` DB.
- Stats PvE legacy (`ATK/DEF/SPD/CTRL`) si le runtime cible reste contest/template-centric.
- Données marché volatiles (`marketCap`, `totalVolume`, `circulatingSupply`, etc.) comme champs canoniques obligatoires.
- Champs prompt/art extrêmement verbeux (`heroArtworkPrompt`, `allowedMotifs`, etc.) dans le noyau backend canonical (à garder en annexe éditoriale séparée).
- Toute clé de matching faible (`symbol` seul, `name` seul) sans garde-fou manuel.

---

# 8. RECOMMANDATION DE STRUCTURE CIBLE

## Recommandation tranchée
**Utiliser le CSV comme input de travail, puis générer un JSON canonique versionné.**

### Pourquoi
- CSV est lisible par contenu/editorial, mais fragile pour pipelines stricts (types, nested fields, normalisation).
- JSON canonique peut porter structure typed/normalisée pour seed/backend/UI sans ambiguïté.
- Permet de séparer proprement payload éditorial et payload runtime.

## Format recommandé
- `data/mvp50-canonical.cards.json` (généré, versionné)
- + optionnel `data/mvp50-editorial.csv` (source auteur)

## Séparation recommandée
- **core runtime block** (backend/seed): IDs, slug, symbol, coingeckoId, chain/faction, image, eligibility.
- **ui block**: titre/sous-titre/flavor/artist/color cues.
- **editorial block**: prompts/motifs/notes créatives.
- **migration block**: provenance/mapping quality/manual overrides.

## Champs finaux recommandés (exemple)
- `tokenId` (new stable id)
- `coingeckoId`
- `projectId` (legacy bridge, nullable à terme)
- `baseCardId` (legacy bridge, nullable à terme)
- `slug`
- `symbol`
- `displayName`
- `primaryChain`
- `faction`
- `imageUrl`
- `isEligible`
- `setCode`
- `collectionCode`
- `editorial.cardTitle`
- `editorial.cardSubtitle`
- `editorial.flavorText`
- `editorial.artist`
- `editorial.visualIdentityCore`
- `editorial.heroFocus`
- `editorial.allowedMotifs`
- `editorial.forbiddenMotifs`
- `editorial.colorCues`
- `editorial.artTone`
- `editorial.heroArtworkPrompt`
- `migration.matchStatus`
- `migration.matchKey`
- `migration.matchConfidence`

---

# 9. PLAN D’ACTION

1. **Nettoyer le CSV**
   - Normaliser `coingeckoId`, `symbol`, `name` (trim/case policy).
   - Marquer explicitement les 4 lignes problématiques (`terra-luna`, `banana-gun`, `hachiko`, `sats-ordinals`).

2. **Faire le mapping**
   - Pipeline deterministic: `coingeckoId` -> `slug` -> manual override table (pas de fallback auto `symbol/name` sans validation).

3. **Enrichir les champs manquants**
   - Injecter depuis JSON: `projectId`, `baseCardId`, `slug`, `image`, `faction`, `isEligible`, etc.
   - Ajouter colonnes de provenance/confiance.

4. **Générer le fichier canonique final**
   - Produire `data/mvp50-canonical.cards.json` strictement validé (schema).
   - Générer un rapport de qualité (completeness, unmatched, ambiguous).

5. **Valider les 50 tokens**
   - Gate CI: 50/50 lignes, 0 ambigu, 0 unmatched.
   - Forcer review manuelle pour overrides.

6. **Brancher seed/backend/UI dessus**
   - Seed lit uniquement JSON canonique.
   - API pack/me/collection migrent vers DTO template-native, plus dépendance directe JSON legacy.
   - UI card rendering lit API DTO (pas les anciens JSON).

---

## BONUS — Tableau cible des champs

| final_field_name | required? | source | notes |
|---|---|---|---|
| `tokenId` | oui | manual/generated | ID canon stable (`tok_<slug>` recommandé). |
| `coingeckoId` | oui | csv | Clé primaire de mapping recommandée. |
| `slug` | oui | `mcg_base_cards.json` / `mcg_projects.json` | Fallback mapping robuste, lisible. |
| `displayName` | oui | csv (`name`) | Nom produit principal. |
| `symbol` | oui | csv | À valider unicité sur set MVP50. |
| `projectId` | oui (transitoire) | `mcg_base_cards.json`/`mcg_projects.json` | Bridge legacy utile migration. |
| `baseCardId` | oui (transitoire) | `mcg_base_cards.json` | Requis tant que runtime bridge JSON existe. |
| `primaryChain` | oui | csv + JSON reconcile | Normaliser taxonomie. |
| `faction` | oui | JSON | Absent de manière structurée dans CSV. |
| `imageUrl` | oui | JSON (`image`) | Asset UI principal. |
| `isEligible` | oui | JSON | Gating seed/runtime. |
| `setCode` | oui | csv | Ex: `S01`. |
| `collectionCode` | oui | csv | Ex: `GENESIS`. |
| `editionLabel` | non | csv (`edition`) | Éditorial, pas enum runtime. |
| `editorial.cardTitle` | non | csv | UI/storytelling. |
| `editorial.cardSubtitle` | non | csv | UI/storytelling. |
| `editorial.flavorText` | non | csv | UI/storytelling. |
| `editorial.artist` | non | csv | Métadonnée créative. |
| `editorial.visualIdentityCore` | non | csv | Brief artistique. |
| `editorial.heroFocus` | non | csv | Brief artistique. |
| `editorial.allowedMotifs` | non | csv | Brief artistique. |
| `editorial.forbiddenMotifs` | non | csv | Brief artistique. |
| `editorial.colorCues` | non | csv | UI/art direction. |
| `editorial.artTone` | non | csv | UI/art direction. |
| `editorial.heroArtworkPrompt` | non | csv | Prompt pipeline art. |
| `legacy.projectTier` | non | `mcg_base_cards.json` | Conserver temporairement si UI legacy en dépend. |
| `legacy.marketCapRank` | non | JSON | Ops/tri/migration, pas canon gameplay. |
| `migration.matchStatus` | oui | generated | `clean/ambiguous/unmatched`. |
| `migration.matchKey` | oui | generated | `coingeckoId/slug/manual`. |
| `migration.matchConfidence` | oui | generated | `high/medium/low`. |
| `migration.overrideReason` | non | manual | Trace d’arbitrage humain. |
