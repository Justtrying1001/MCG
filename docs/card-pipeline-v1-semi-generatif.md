# Diagnostic : pourquoi le rendu live seul ne suffit pas
Status: SPEC-FUTURE


Le rendu live (HTML/CSS/React) est excellent pour **interface, états interactifs, et preview**, mais structurellement insuffisant pour livrer une perception “carte collectible premium” à grande échelle.

## Limites structurelles du live render

1. **Contrainte de temps réel**
   - Le live doit rester léger, responsive, composable, et maintenable.
   - Un rendu premium collectible demande souvent des couches coûteuses (matériaux, masques, textures de surface, effets de finition, hiérarchie microtypographique fine, calibrage colorimétrique stable) qui se gèrent mieux en pipeline d’asset qu’en composant runtime.

2. **Contrainte de cohérence perçue**
   - Une carte premium doit avoir une “signature matérielle” constante (frame, vernis, profondeur, zones éditoriales fortes).
   - En live, on tombe vite dans une esthétique “composant UI stylé”, surtout quand beaucoup d’informations dynamiques se superposent.

3. **Contrainte d’industrialisation**
   - 5k+ cartes nécessitent une logique de génération batch, QA visuelle automatisée, versioning des rendus, re-export partiel.
   - Le front ne remplace pas un pipeline de génération et d’export contrôlé.

4. **Contrainte produit collectible**
   - Le collectible se joue dans le détail: constance des familles, variation contrôlée, rareté lisible, traitements différenciants.
   - Sans séparation “render model + asset outputs”, la rareté devient cosmétique et incohérente.

## Frontière réelle composant live vs asset premium

- **Composant live** = preview, interaction, fallback, debug, overlays dynamiques.
- **Asset premium** = rendu final canonique de la carte (image/texture/couche versionnée), stable, diffusable, réutilisable cross-surfaces.

## Hypothèse V1 à assumer

- Le front live reste important, **mais il n’est plus le rendu final principal**.
- Le rendu final premium devient un produit de pipeline (semi-génératif), puis consommé par le front.

---

# Définition d’une V1 semi-générative premium

Une V1 semi-générative premium = système où la carte est toujours **data-driven**, mais le rendu final est produit via une **chaîne de composition visuelle modulaire** avec export d’assets canonisés.

## Ce qui reste dynamique

- Données métier: stats, rareté, chain/faction, rank snapshot, ID, disponibilité, prix, ownership.
- États runtime: reveal, hover, sélection équipe, badges contextuels app.

## Ce qui devient asset

- Frame premium finalisée (familles + variantes validées).
- Backgrounds et textures de matériaux.
- Overlays de rareté/finition.
- Hero composition rendue (pas juste logo brut).
- Rendu final master carte (et dérivés web).

## Ce qui est généré

- Assemblage de couches selon règles (template + mappings data).
- Variations contrôlées (palette, motif, halo, pattern, micro-détails) par seed stable.
- Exports multi-format (master + web + thumb + preview).

## Ce qui est modulaire

- Famille de frame, famille hero zone, famille stat panel, famille footer, overlays rareté, traitements de surface, iconographie.

## Ce qui est piloté par la data

- Choix de famille principale (ex: category/archetype), rareté, chain palette, intensité de treatment, badges, contenu textuel.

## Ce qui est préparé par le design system

- Grille canonique, hiérarchie de zones, tokens visuels, règles de spacing, règles de contraste, dictionnaire d’icônes, librairie de couches.

---

# Architecture de pipeline recommandée

## Couche 1 — Source Data (truth métier)

- **Rôle**: stocker vérité produit/gameplay/collection.
- **Inputs**: token/project data, gameplay stats, rarity tables, metadata d’édition.
- **Outputs**: enregistrements bruts versionnés (JSON/DB).
- **Doit contenir**: IDs stables, snapshot date, champs gameplay, taxonomie.
- **Ne doit pas contenir**: décisions visuelles détaillées (pas de couleur hex métier).
- **Pourquoi**: éviter le couplage produit ↔ design.

## Couche 2 — Card Model (truth carte)

- **Rôle**: normaliser la carte en entité produit.
- **Inputs**: source data.
- **Outputs**: `CardModelV1` (champs canoniques pour produit + gameplay).
- **Doit contenir**: baseRarity, variantClass, combatScore canonique, labels normalisés.
- **Ne doit pas contenir**: assets paths finaux ni effets CSS.
- **Pourquoi**: unifier collection/gameplay/opening.

## Couche 3 — Render Model (truth visuel)

- **Rôle**: traduire `CardModelV1` en instructions de composition.
- **Inputs**: `CardModelV1` + règles visuelles versionnées.
- **Outputs**: `CardRenderSpecV1` (templateId, paletteId, heroMode, overlay stack, text slots).
- **Doit contenir**: mapping explicite des drivers visuels.
- **Ne doit pas contenir**: logique de tirage pack ou combat.
- **Pourquoi**: découpler jeu et rendu.

## Couche 4 — Visual Archetype Mapping

- **Rôle**: assigner une famille visuelle contrôlée.
- **Inputs**: render model + taxonomie.
- **Outputs**: archetype key + paramètres.
- **Doit contenir**: règles simples et testables (priorités, fallback).
- **Ne doit pas contenir**: exceptions ad hoc par carte (hors whitelist limitée).
- **Pourquoi**: scaler sans explosion combinatoire.

## Couche 5 — Composition Engine

- **Rôle**: assembler les couches graphiques.
- **Inputs**: render spec + librairie assets.
- **Outputs**: scène de rendu + logs de composition.
- **Doit contenir**: ordre de couches, masques, contraintes de lisibilité, seed deterministic.
- **Ne doit pas contenir**: logique business.
- **Pourquoi**: reproductibilité + QA.

## Couche 6 — Export Engine

- **Rôle**: générer les outputs finalisés.
- **Inputs**: scène de rendu.
- **Outputs**:
  - Master print/web hi-res
  - Web display
  - Thumbnail
  - Preview debug
- **Doit contenir**: naming convention, versioning, checksum, manifest.
- **Ne doit pas contenir**: manip manuelles non tracées.
- **Pourquoi**: traçabilité et rollback.

## Couche 7 — Asset Registry

- **Rôle**: référencer assets publiés.
- **Inputs**: exports + manifest.
- **Outputs**: URLs/version IDs/metadata de rendu.
- **Doit contenir**: cardId, renderVersion, asset hashes.
- **Ne doit pas contenir**: duplications non normalisées.
- **Pourquoi**: servir front/back de façon cohérente.

## Couche 8 — Front Consumption

- **Rôle**: consommer asset canonique + overlays dynamiques.
- **Inputs**: asset registry + runtime state.
- **Outputs**: expérience app (collection, packs, pve).
- **Doit contenir**: fallback preview si asset absent.
- **Ne doit pas contenir**: recréation complète du rendu premium.
- **Pourquoi**: cohérence visuelle et perf.

---

# Couches visuelles à modulariser

Les briques modulaires à forte valeur (ordre de priorité):

1. **Frame Core Family (priorité haute)**
   - Définit présence premium globale.
   - Peu de familles (3–5 max), très maîtrisées.

2. **Hero Zone System (priorité haute)**
   - Principal driver de désirabilité.
   - Variantes de composition, pas uniquement couleur.

3. **Rarity Treatment Stack (priorité haute)**
   - Différenciation perçue immédiate.
   - Overlays + matériaux + accent lumineux calibrés.

4. **Stat Panel System (priorité moyenne haute)**
   - Lisibilité gameplay et crédibilité produit.
   - Une base unique + quelques variantes de surface.

5. **Footer/Meta System (priorité moyenne)**
   - Collector info lisible sans polluer.

6. **Palette & Material Tokens (priorité moyenne)**
   - Chain/faction influence contrôlée, jamais structurelle.

7. **Icon/Badge Language (priorité moyenne)**
   - Icônes robustes pour rarity/type/edition.

8. **Texture/Microdetail Layers (priorité basse à moyenne)**
   - Grain, noise, emboss subtil, uniquement si stable en batch.

Ce qu’il ne faut pas modulariser fortement en V1: la grille de base, la position des blocs principaux, et la typographie structurante.

---

# Stratégie premium scalable

## Objectif
Monter fortement la qualité perçue sans full bespoke.

## Méthode

1. **Templates premium contraints**
   - 1 layout canonique + 2 variantes max par type de carte.

2. **Familles visuelles contrôlées**
   - 3–5 familles de frame, pas plus.

3. **Hero enrichie par système**
   - logo + traitement spatial + couches background + accents symboliques.

4. **Rareté matérielle, pas seulement colorielle**
   - common: flat premium
   - rare: accent foil léger
   - epic: layer spectral + emboss simulé
   - legendary: traitement fort + signature visuelle unique

5. **Variations déterministes**
   - seed par `cardId + renderVersion` pour diversité stable et reproductible.

6. **Edition package**
   - pour chaque set: palette pack, motif pack, texture pack, badge pack.

## Le levier de valeur perçue

- Hiérarchie claire + hero forte + matériau cohérent + rareté lisible + constance de fabrication.
- Pas “plus d’effets”, mais **meilleure architecture visuelle**.

---

# Hero zone : options et recommandation

## Option A — Logo + Medallion Premium

- **Faisabilité**: très haute
- **Qualité perçue**: moyenne à bonne
- **Scalabilité**: excellente
- **Maintenance**: faible
- **Intérêt produit/collection**: correct
- **Limites**: peut rester “badge centré” trop statique

## Option B — Logo + Background Family (plein cadre)

- **Faisabilité**: haute
- **Qualité perçue**: bonne à très bonne
- **Scalabilité**: très bonne
- **Maintenance**: moyenne
- **Intérêt produit/collection**: élevé
- **Limites**: nécessite bibliothèque de backgrounds bien conçue

## Option C — Logo + Aura générative contrôlée

- **Faisabilité**: moyenne
- **Qualité perçue**: variable (peut être excellente)
- **Scalabilité**: bonne
- **Maintenance**: moyenne à élevée
- **Intérêt produit/collection**: élevé
- **Limites**: risque “génératif cheap” si mal calibré

## Option D — Emblem/Icon-driven Composition

- **Faisabilité**: haute
- **Qualité perçue**: bonne
- **Scalabilité**: excellente
- **Maintenance**: faible à moyenne
- **Intérêt produit/collection**: bon
- **Limites**: moins émotionnel qu’une hero plus “portrait-like”

## Option E — Hybrid (B + C léger + D)

- **Faisabilité**: moyenne haute
- **Qualité perçue**: très bonne
- **Scalabilité**: très bonne
- **Maintenance**: maîtrisable
- **Intérêt produit/collection**: très élevé
- **Limites**: nécessite un système de règles strict

## Recommandation V1

- Adopter **Option E hybride** mais contrainte:
  - Base: Background family plein cadre (driver principal)
  - Centre: logo/emblem clean (driver secondaire)
  - Enrichissement: aura/pattern léger déterministe (driver cosmétique)
  - Exceptions premium (top cartes): traitement héro spécial whitelist (driver exceptionnel)

---

# Familles visuelles et logique de segmentation

## Principe
Segmenter peu, clairement, avec priorité stricte des drivers.

## Driver principal (structure)

- **Card Category / Archetype visuel** (ex: Meme Core, Infra, AI, DeFi, Culture)
- Pilote: frame family + hero layout family.
- Raison: donne silhouette visuelle forte et lisible.

## Driver secondaire (identité)

- **Rarity**
- Pilote: material treatment stack + accent framing + glow policy.
- Raison: valeur collectible et impact perceptif immédiat.

## Driver cosmétique (colorimétrie)

- **Faction/Chain**
- Pilote: palette accents, icône de contexte, micro motifs.
- Raison: diversité sans casser la structure.

## Driver exceptionnel (édition/événement)

- **Edition / Event / Signature cards**
- Pilote: overlay limité, badge spécial, motif dédié.
- Raison: créer moments collection sans exploser le système.

## Anti-complexité

- Max 4 drivers actifs.
- Max 1 driver structurel fort.
- Table de priorités fixe (principal > secondaire > cosmétique > exceptionnel).

---

# Système d’assets recommandé

## 1) Assets master

- Frame masters (par famille)
- Hero background masters (par famille)
- Material masters (rarity stack)
- Icon/badge masters
- Typography kit

**Format**: source éditable (Figma/PSD/AI/SVG selon pipeline), versionné.

## 2) Assets modulaires

- Overlays PNG/WebP alpha
- Masks
- Pattern tiles
- Gradient maps
- Emblems/icons vector

**Format**: SVG + PNG 16-bit/8-bit selon besoin.

## 3) Assets générés

- Hero composites
- Full card composites
- Rarity-treated variants

**Format**: master lossless + web derivés.

## 4) Assets exportés

- `card_master` (haute résolution)
- `card_web` (affichage app)
- `card_thumb`
- `card_preview_debug`

**Format recommandé V1**:
- Master: PNG lossless (ou AVIF lossless si toolchain stable)
- Web: AVIF/WebP + fallback PNG
- Thumb: WebP/AVIF

## 5) Assets preview

- Rendus “quick preview” pour QA et admin.
- Non canoniques pour distribution publique.

## 6) Assets front

- URL du rendu canonique + overlays runtime légers.

## Versioning

- Versionner:
  - render ruleset
  - template pack
  - asset library
  - export profile
- Dériver automatiquement:
  - tailles web/thumb
  - compression variants
- Rester éditorial/manuels:
  - set direction
  - familles masters
  - exceptions “hero cards” limitées

---

# Rôle du rendu live en V1/V2

## V1

Le live render garde un rôle central mais **secondaire au rendu premium**:

1. Preview instantanée en dev/admin
2. Debug de mapping data -> render spec
3. Fallback si asset non généré
4. États interactifs (flip/reveal/select/hover)
5. Inspection metadata (tooltips, logs)

## V2

- Le live peut évoluer vers:
  - overlays dynamiques contextuels (buffs, event badges)
  - personnalisation légère utilisateur
  - rendu adaptatif pour surfaces low-end
- Le canon visuel reste asset-driven.

---

# Plan de transition MVP -> V1

## Étape 1 — Cadrage canonique (2-3 semaines)

- Définir `CardModelV1` et `CardRenderSpecV1`
- Fixer grille carte V1 + hiérarchie zones
- Définir drivers visuels et priorités
- Livrables:
  - schema models
  - style bible V1
  - mapping rules v1

## Étape 2 — Design system visuel modulaire (3-4 semaines)

- Produire frame families (3-5)
- Produire hero background families
- Produire rarity treatment stacks
- Produire icon/badge set
- Livrables:
  - asset library v1
  - tokens visuels
  - QA checklist lisibilité

## Étape 3 — Pipeline génération/export (3-5 semaines)

- Implémenter composition engine deterministic
- Implémenter export profiles (master/web/thumb/preview)
- Implémenter asset registry + manifest
- Livrables:
  - render CLI/service
  - export manifests
  - batch test pack (500 cartes)

## Étape 4 — Intégration front + fallback (2-3 semaines)

- Front consomme asset canonique
- Live renderer devient preview/fallback/debug
- Reveal flow utilise assets pré-générés
- Livrables:
  - pipeline->front contract
  - fallback rules
  - perf report

## Étape 5 — Validation produit avant scale complet (2-3 semaines)

- QA visuelle sur échantillon stratifié (rarity x chain x archetype)
- QA perception collectible (tests utilisateurs ciblés)
- QA cohérence rareté/distribution
- Livrables:
  - validation deck
  - issue list priorisée
  - go/no-go scale

## Étape 6 — Généralisation 5k+ (itératif)

- Batch rendering complet
- Monitoring erreurs et ré-export partiel
- Verrouillage version set

---

# Risques et pièges à éviter

1. **Explosion combinatoire**
   - Garde-fou: limiter familles et drivers, whitelist exceptions.

2. **Effet “génératif cheap”**
   - Garde-fou: variations faibles mais qualitatives, règles strictes, QA humaine.

3. **Confusion data model / render model**
   - Garde-fou: schémas séparés et ownership clair (product vs design system).

4. **Rareté artificielle**
   - Garde-fou: rareté basée sur modèle produit + traitement visuel cohérent + odds alignées.

5. **Hero zone pauvre**
   - Garde-fou: hero plein cadre et système hybride, pas simple médaillon uniforme.

6. **Front trop différent du final**
   - Garde-fou: preview live branchée sur render spec + mêmes tokens + comparaison snapshot.

7. **Pipeline trop lourd**
   - Garde-fou: batch incrémental, cache, re-render ciblé, profiles d’export clairs.

8. **Coût maintenance élevé**
   - Garde-fou: moins de familles, plus de qualité dans chaque famille.

9. **Incohérence d’édition**
   - Garde-fou: set package versionné (assets + rules + export profile).

10. **Qualité non mesurée**
   - Garde-fou: KPI visuels et produit (CTR reveal, temps d’inspection carte, perception rareté, taux de confusion).

---

# Recommandation finale très concrète

## Architecture V1 recommandée (décision)

- **Oui** à un pipeline en 8 couches: Source Data -> Card Model -> Render Model -> Archetype Mapping -> Composition -> Export -> Registry -> Front.
- **Non** au front live comme rendu final premium principal.

## Briques à construire en priorité

1. `CardModelV1` (produit/gameplay)
2. `CardRenderSpecV1` (visuel)
3. Asset library modulaire (frame/hero/rarity/icons)
4. Composition/export deterministic
5. Asset registry + manifest

## Ce qui reste live

- preview/debug/fallback/états interactifs/overlays runtime.

## Ce qui devient asset

- rendu carte canonique (master + dérivés web) et traitements de rareté.

## Comment générer les cartes

- Mapping data -> render spec -> composition par couches -> export multi-profils -> publication registry.
- Variation déterministe contrôlée par seed stable.

## Organisation des familles visuelles

- Driver principal: archetype/category
- Driver secondaire: rarity
- Driver cosmétique: chain/faction
- Driver exceptionnel: edition/event
- Limite: 3–5 familles structurelles max en V1.

## Traitement hero zone

- Choix V1: **hybride** (background family plein cadre + emblem/logo + aura légère déterministe + exceptions premium limitées).

## Préparation V2

- Ajouter personnalisation contextuelle et variants événementiels sans toucher la structure.
- Étendre bibliothèque hero/background par set, pas par carte individuelle.
- Introduire éventuellement un niveau de génération plus avancé uniquement après métriques V1 positives.

## Décision exécutive

- Construire un **système semi-génératif asset-driven** avec live renderer en support.
- Prioriser qualité systémique (hiérarchie, hero, rareté matérielle, cohérence pipeline) plutôt que multiplication d’effets.
