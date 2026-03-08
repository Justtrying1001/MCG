# MCG Card System V1 — Production Spec exécutable (asset-driven / semi-génératif)
Status: SPEC-FUTURE


Contexte de base utilisé pour cette spec (repo réel):
- Rendu carte live unique via `CardFrame.tsx` + bloc `.mcg-*` dans `globals.css`.
- Données cartes hydratées via `lib/cards.ts` depuis `mcg_base_cards.json`, `mcg_projects.json`, `mcg_card_variants.json`.
- Consommation live sur `collection`, `packs` et `combats`.
- Gameplay PvE consomme `ATK/DEF/SPD/CTRL` directement.
- Dataset actuel: 5692 base cards, 8221 variants, distribution tier dominée par `C`, default variant `standard/common` pour 100% des cartes.

Décision-cadre V1: **le rendu premium canonique sort du pipeline d’assets; le front live ne fait plus foi visuelle finale**.

---

## Structure exacte de la carte MCG V1

### Face avant canonique (8 blocs)

1) **Top Nameplate (collector-facing, dominance forte)**
- Contenu: `displayName`, `symbol`, `setCode`, `cardNumber`.
- Rôle: identité instantanée + ancrage produit collectible.
- Pourquoi non supprimable: sans nameplate fort, la carte retombe en “tile UI”.

2) **Rarity Crest (collector-facing, dominance moyenne haute)**
- Contenu: `baseRarity` (pas `variantRarity`) + `finishClass` mark.
- Rôle: signal de valeur immédiat.
- Pourquoi non fusionnable: rareté doit être lisible même si le reste est masqué/zoomé.

3) **Hero Zone (emotion-facing, dominance maximale)**
- Contenu: composition hero (background family + emblem/logo + aura contrôlée).
- Rôle: désirabilité et mémorisation.
- Pourquoi non supprimable: c’est le cœur de perception premium.

4) **Type Line (collector + navigation, dominance moyenne)**
- Contenu: `cardCategory` (nouveau), `primaryChain`, `faction`.
- Rôle: classification lisible en 1 ligne.
- Pourquoi non fusionnable: évite la redondance multi-zones actuelle.

5) **Combat Panel (gameplay-facing, dominance moyenne haute)**
- Contenu: `combatScore` canonique + `ATK/DEF/SPD/CTRL`.
- Rôle: lecture jeu immédiate.
- Pourquoi non supprimable: PvE existant dépend déjà de ces axes.

6) **Meta Footer (collector-facing discret)**
- Contenu: `collectorId`, `snapshotDate`, `rankSnapshot` (si présent), `editionStamp`.
- Rôle: authenticité collection et traçabilité.
- Pourquoi non fusionnable: données importantes mais secondaires.

7) **Finish Overlay Layer (material-facing, non textuel)**
- Contenu: traitements de surface par finish (`standard/holo/full_art/glitch/gold`).
- Rôle: exprimer la finition comme matière, pas comme simple badge.
- Pourquoi non supprimable: indispensable à la sensation premium.

8) **Security Microprint (collector-facing ultra discret)**
- Contenu: micro-ligne technique (`cardIdShort`, `renderVersion`).
- Rôle: anti-confusion entre versions.
- Pourquoi non fusionnable: ne doit pas polluer les zones primaires.

### Backend-only (interdit face avant)
- `projectId`, `coingeckoId`, `slug`, `dropWeight`, flags d’éligibilité, IDs internes de pipeline.
- Raison: non-value visuelle joueur + bruit.

### Collector-facing vs gameplay-facing
- Collector-facing: nameplate, rarity crest, hero, footer meta, finish overlay.
- Gameplay-facing: combat panel + type line.

---

## Hiérarchie visuelle exacte

### Ordre de lecture obligatoire
1. Hero Zone
2. Nameplate
3. Rarity Crest
4. Combat Panel (score puis 4 stats)
5. Type Line
6. Meta Footer

### Dominance imposée
- Hero zone: **50% du poids perceptif**.
- Header (name + rarity): **22%**.
- Combat panel: **20%**.
- Meta/type/footer: **8%**.

### Poids émotionnel vs fonctionnel
- Emotion: Hero + matière rareté (majoritaire).
- Fonction: score/stats + type line (secondaire mais clair).

### Ce qui doit être instantané (<1s)
- Identité carte (name + hero)
- Niveau de rareté
- Niveau de puissance global (combatScore)

### Ce qui doit être secondaire (1–3s)
- Répartition ATK/DEF/SPD/CTRL
- Taxonomie (category/chain/faction)

### Ce qui doit rester discret
- Collector id détaillé, date snapshot, rank snapshot.

### Ce qui casse aujourd’hui l’effet “vraie carte” (constat à éliminer)
- Trop de micro-zones textuelles simultanées.
- Hero réduite à un médaillon centré.
- Rareté surtout textuelle au lieu d’être matérielle.
- Multiplication de tags redondants (chain/faction/symbol à plusieurs endroits).

---

## Grille de composition V1

### Grille verticale canonique (ratio 5:7 conservé)
- Zone A Header: **13% hauteur**
- Zone B Hero: **48% hauteur**
- Zone C Type Line: **7% hauteur**
- Zone D Combat Panel: **22% hauteur**
- Zone E Footer: **10% hauteur**

### Zones fixes
- Header, type line, combat panel, footer: positions fixes.
- Rarity crest: coin fixe (top-right), ancré header.

### Zones légèrement variables
- Hero composition interne (placement emblem/aura).
- Longueur de nom (2 tailles uniquement, pas plus).

### Limites de densité
- Maximum 2 lignes dans header.
- Type line: 1 ligne unique.
- Combat panel: score + 4 lignes strictes.
- Footer: 1 ligne principale + microprint secondaire.

### Interdits de composition V1
- Pas de troisième bande de méta intermédiaire.
- Pas de second panel stats.
- Pas de duplication de chain/faction ailleurs que type line.

---

## Système exact de hero zone V1

### Modèle retenu (ferme)
**Hybrid HZ-1**: `Background Family + Emblem/Logo Core + Controlled Aura + Rarity Amplification`.

### Couches de hero zone (ordre)
1. Hero Base Plate (asset fixe par famille)
2. Background Field (asset modulaire par famille)
3. Emblem/Logo Container (donnée image + masque unifié)
4. Accent Geometry (généré déterministe par seed)
5. Rarity Amplifier (overlay matériel dépendant rareté)
6. Depth/Light pass (asset overlay léger)

### Ce qui est fixe
- Masque emblem, gabarit de zone, positions limites, safe-areas.

### Ce qui est variable
- Background variant index, aura intensity tierée, angle d’accent.

### Ce qui est asset
- Plates, backgrounds, masks, lighting overlays, rarity amplifiers.

### Ce qui est généré
- Paramètres de variation contrôlée (seed = `baseCardId + renderVersion`).

### Ce qui est piloté par data
- `cardCategory` -> background family
- `baseRarity` -> rarity amplifier strength
- `primaryChain` -> palette accents secondaires

### Ce qui est piloté par famille visuelle
- Formes d’accent, style de halo, contour emblem.

### Traitement cartes normales
- Emblem propre + background family + aura faible + aucune exception.

### Traitement cartes premium
- Même structure, mais amplifier matériau + depth pass plus marqué + accent speculaire.

### Exceptions autorisées (strict)
- **Max 1% des cartes d’un set** en “Hero Signature Override”.
- Override limité au background et accent geometry, jamais à la grille globale.

### Interdits absolus V1
- Génération libre d’illustration.
- Variation non déterministe.
- Changement de layout par carte.

---

## Familles visuelles exactes à créer en V1

### Décision fermée V1
- **4 familles structurelles** (frame+hero style):
  1. Meme Core
  2. Infra/Protocol
  3. AI/Data
  4. Culture/Community

- **4 raretés visuelles**: Common, Rare, Epic, Legendary.
- **1 layout canonique** + **1 layout alt** (pour full_art uniquement).
- **1 hero system** (HZ-1), pas de second système en V1.
- **Exceptions max**: 1% signature cards/set.

### Drivers retenus
- Driver principal: `cardCategory` (nouveau champ canoniquement requis).
- Driver secondaire: `baseRarity`.
- Driver cosmétique: `primaryChain`.
- Driver exceptionnel: `editionEventTag` (whitelist).

### Pourquoi ce nombre est le bon
- 4 familles couvrent diversité sans explosion maintenance.
- 1 hero system garantit cohérence premium.
- 1 layout + 1 alt protège la productivité d’asset.

---

## Système de rareté visuelle exact

### Règles transversales stables (toutes raretés)
- Grille identique.
- Hiérarchie identique.
- Typo identique.
- Emplacements identiques.

### Common
- Frame: métal satiné sombre, faible contraste spéculaire.
- Surface: matte micrograin.
- Overlay: minimal.
- Hero amplification: faible.
- Signal collector: sobre.

### Rare
- Frame: contour lumineux contrôlé + accent chroma discret.
- Surface: satin + fine foil pass localisée.
- Overlay: streak léger diagonal.
- Hero amplification: moyenne.
- Signal collector: immédiatement visible sans agressivité.

### Epic
- Frame: double-layer border + inner glow coloré.
- Surface: spectral foil partielle + relief simulé.
- Overlay: pattern animé en export statique multi-pass (non runtime).
- Hero amplification: forte.
- Signal collector: premium net.

### Legendary
- Frame: signature frame (même grille), dorure/polar spec marquée.
- Surface: multi-pass foil + depth highlights.
- Overlay: crest distinctif + edge shimmer.
- Hero amplification: maximale.
- Signal collector: statut flagship.

### Finition (finishClass) vs rareté
- `finishClass` (standard/holo/full_art/glitch/gold) modifie la surface.
- `baseRarity` gouverne la structure de valeur.
- Interdit: laisser `finishClass` remplacer le signal de rareté de base.

---

## Système de modularité exact

### Modulaire structurel (autorisé)
- Frame family (4)
- Hero background family (4)
- Layout (2 max)

### Modulaire visuel (autorisé)
- Rarity treatment stack (4)
- Finish overlays (5 classes)
- Chain palette accents (set limité)

### Modulaire cosmétique (autorisé)
- Micro-patterns
- Badge styles secondaires
- Accent geometry params

### Modulaire exceptionnel (whitelist)
- Signature override packs
- Event badge overlays

### Figé impérativement
- Grille verticale
- Ordre de lecture
- Position des zones gameplay
- Typographie système

### Ce qu’il ne faut PAS rendre modulaire
- Structure stats
- Emplacement rarity crest
- Nombre de zones de texte
- Règles de hiérarchie

---

## CardRenderSpecV1 exact

### Champs obligatoires
- `renderSpecVersion` (string)
- `baseCardId` (string)
- `cardFace` (`front`)
- `layoutId` (`core_v1` | `fullart_v1`)
- `frameFamilyId` (`meme_core` | `infra_protocol` | `ai_data` | `culture_community`)
- `heroSystemId` (`hz1`)
- `baseRarity` (`common`|`rare`|`epic`|`legendary`)
- `finishClass` (`standard`|`holo`|`full_art`|`glitch`|`gold`)
- `chainPaletteId` (enum contrôlé)
- `nameText`, `symbolText`
- `categoryText`, `chainText`, `factionText`
- `combatScore` (number)
- `stats` ({ATK, DEF, SPD, CTRL})
- `collectorMeta` ({setCode, cardNumber, collectorId, snapshotDate})
- `hero` ({logoUrl, seed, backgroundVariant})

### Champs optionnels
- `rankSnapshot` (number|null)
- `editionEventTag` (string|null)
- `signatureOverrideId` (string|null; whitelist uniquement)

### Champs dérivés (pipeline)
- `rarityOverlayStack`
- `finishOverlayStack`
- `textScaleProfile`
- `contrastProfile`
- `exportProfiles`

### Champs interdits dans RenderSpec
- Champs business runtime: `dropWeight`, `isEligible`, prix live, ownership state.
- Champs de simulation PvE détaillée.
- CSS/DOM tokens front.

### Source de vérité attendue
- `CardModelV1` produit le RenderSpec via mapper déterministe versionné.

---

## Asset library V1 exacte

### Obligatoire pour V1
1. **Frame masters**
- 4 familles x 4 raretés = 16 master frame bases.
2. **Hero packs**
- 4 familles x 6 backgrounds = 24 hero backgrounds.
- 1 emblem mask system commun.
3. **Rarity stacks**
- 4 overlays rares + 5 finish overlays.
4. **Combat panel kit**
- 1 panel base + 4 accent styles de stats.
5. **Footer/meta kit**
- 1 base + 2 densités typographiques.
6. **Icon/badge kit**
- Rarity crest icons, chain icons, finish icons.

### Recommandé pour V1
- Microtexture library (grain, brushed, foil noise).
- Signature card pack (max 1% whitelist).
- Contrast accessibility profiles (dark/bright asset variants).

### Optionnel plus tard
- Event-exclusive overlays saisonniers.
- Personalized owner stamp.
- Animated reveal-only FX sprites.

### Formats recommandés
- Source: SVG + PSD/Figma masters.
- Export intermédiaire: PNG 16-bit alpha pour composition.
- Web final: AVIF/WebP + PNG fallback.

### Versioning assets
- `assetPackVersion` obligatoire.
- Changement de frame/overlay => bump minor.
- Changement de grille/layout => bump major.

---

## Export system exact

### Outputs canoniques
1. `card_master_front` (haute résolution, canon)
2. `card_web_front` (app display)
3. `card_thumb_front` (grilles collection)
4. `card_preview_front` (QA/debug)

### Outputs dérivés
- `card_pack_reveal_front` (crop/ratio reveal)
- `card_social_front` (optionnel plus tard)

### Nommage imposé
`{baseCardId}__{renderSpecVersion}__{assetPackVersion}__{outputType}.{ext}`

### Versioning imposé
- `renderSpecVersion` + `assetPackVersion` + `exportProfileVersion` dans manifest.
- Hash binaire de chaque output.

### Manifest imposé (par carte)
- `baseCardId`
- `renderSpecVersion`
- `assetPackVersion`
- `exportProfileVersion`
- `outputs[]` (type, path, width, height, format, hash)
- `generatedAt`

### Ce qu’il ne faut pas multiplier
- Pas de 10 tailles web.
- Pas de multiples masters redondants.
- Pas de variantes non déclarées en manifest.

### Anti-pipeline lourd
- Re-export incrémental par diff de manifest.
- Caching par hash de RenderSpec.
- Batch stratifié avant full batch.

---

## Contrat exact entre pipeline et front

### Doctrine
- **Front affiche l’asset canonique par défaut**.
- **Live renderer n’est jamais vérité premium**.

### Quand afficher asset canonique
- Collection, pack reveal, deck builder, vues detail.

### Quand afficher preview live
- Admin tooling, QA mapping, cartes sans export prêt en environnement dev.

### Quand afficher fallback live
- Asset manquant en prod (incident) avec alerte monitoring.

### Overlays runtime autorisées
- États interactifs: selected, hover, locked, new, in-team.
- Badges contextuels gameplay temporaires (buff/debuff) hors face canonique.

### Overlays runtime interdites
- Modification de frame
- Modification hero
- Modification rarity treatment
- Réécriture du panel stats canonique

### Éviter deux vérités visuelles
- Le front reçoit `canonicalAssetUrl` + `renderSpecVersion`.
- Toute divergence preview/canonique est loggée et visible en debug.
- Le renderer live lit le **même RenderSpec** mais reste marqué `non-canonical`.

---

## Roadmap concrète de production

### Ordre exact de travail

#### Phase 0 (Semaine 1) — Verrouillage spec
- Valider ce document.
- Geler dictionnaire champs `CardModelV1`/`CardRenderSpecV1`.
- Décider mapping `projectTier -> baseRarity` provisoire V1.

#### Phase 1 (Semaines 2-3) — Data model & mapping
- Créer couche model dédiée (sans casser APIs existantes).
- Implémenter mapper `CardModelV1 -> CardRenderSpecV1`.
- Corriger incohérences critiques: score canonique unique, taxonomie category.

#### Phase 2 (Semaines 3-6) — Asset library V1
- Produire 16 frame masters, 24 hero backgrounds, rarity/finish stacks, kits stats/footer/icons.
- Livrer `assetPackVersion: v1.0.0`.

#### Phase 3 (Semaines 5-7) — Pipeline export
- Composer + exporter 4 outputs canoniques par carte.
- Générer manifests versionnés.
- Batch test 500 cartes stratifiées.

#### Phase 4 (Semaines 7-8) — Intégration front
- Introduire contrat `canonicalAssetUrl` + fallback.
- Restreindre renderer live au mode preview/fallback.
- Instrumenter erreurs d’asset.

#### Phase 5 (Semaines 8-9) — Validation produit
- Échantillon validation: 240 cartes (4 familles x 4 raretés x 3 chain groups x 5 repeats).
- Tests:
  - lisibilité à tailles collection
  - perception rareté (blind test)
  - cohérence gameplay (combatScore vs stats)
  - temps de chargement et cache hit

#### Phase 6 (Semaines 10-11) — Scale 5692 cartes
- Full batch export.
- Contrôle qualité automatique + revue humaine sur 3%.
- Verrouillage `renderSpecVersion v1.0`.

### Premiers éléments à implémenter dans le repo (ordre)
1. `docs/card-system-v1-production-spec.md` (ce document)
2. `types/card-model-v1.ts` (cible)
3. `lib/cards/model-v1.ts` (mapper cible)
4. `lib/cards/render-spec-v1.ts` (contrat cible)
5. `lib/cards/asset-manifest.ts` (contrat cible)
6. `components/ui/CardPreviewLive.tsx` (renderer live explicitement non-canonique)

### Ce qu’on garde / refactor / abandonne
- **Garder**: sources JSON, endpoints principaux, boucle PvE, logique collection.
- **Refactor**: hydratation carte, score canonique, mapping rareté, consommation front asset-first.
- **Abandonner**: `CardFrame` comme vérité premium finale.

### Critères de go/no-go avant généralisation
- 95% cartes du batch test sans défaut critique de lisibilité.
- Différence preview/canonique < 2% cas (et justifiée).
- Perception de rareté correcte dans tests utilisateurs (>=80% de classification correcte).
- Aucun blocage perf majeur sur pages `collection` et `packs`.
