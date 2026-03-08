# MCG — Complete Card System Redesign Spec
Status: DECIDED-SPEC

## Périmètre et méthode

Cette spec est basée sur le runtime réel (données, APIs, renderer, PvE) et les audits déjà produits. Elle tranche le nouveau système cartes **produit + gameplay + collection + opening + rendu** sans implémentation complète dans cette tâche.

---

## 1) Diagnostic complet du système cartes actuel

### 1.1 Problèmes produit

1. La carte mélange des couches qui doivent être séparées: identité collectible, stats de combat, métadonnées techniques, et logique de variante.
2. `projectTier` sert à la fois de signal perçu, de proxy de puissance, et de poids de distribution (`lib/cards.ts`), ce qui crée une ambiguïté structurelle.
3. La hiérarchie visuelle actuelle empile trop de micro-zones (header + type strip + footer meta + stats dashboard), au lieu d’une lecture carte premium.
4. Les cotes affichées en page packs (`ODDS`) ne correspondent pas au tirage réel implémenté.

### 1.2 Problèmes gameplay

1. ATK/DEF/SPD/CTRL existent mais la boucle PvE favorise surtout des cartes à somme brute élevée:
   - tri “power” = somme simple,
   - génération enemy team pondérée par somme stats,
   - score affiché sur carte = moyenne/fallback,
   - ce qui réduit la lisibilité des archétypes.
2. La progression gameplay n’est pas découplée de la désirabilité collection: aujourd’hui le rang market cap et le tier contaminent directement la force.
3. Le système n’a pas de “combat score” canonique unique partagé partout.

### 1.3 Problèmes rareté

1. Le système confond plusieurs notions:
   - rareté de base de la carte,
   - finition/variant,
   - puissance,
   - chase desirability.
2. `variantRarity` sert de rareté affichée, alors qu’elle décrit en réalité une finition de variant.
3. `projectTier` est perçu comme rareté alors qu’il vient d’une logique de ranking projet.
4. La plupart des cartes sont `standard/common` par défaut, ce qui écrase la perception collector.

### 1.4 Problèmes rendu

1. Le rendu actuel de `CardFrame` est “dashboard card” plutôt que “TCG premium”.
2. Hero zone sous-dimensionnée (médaillon central) et noyée dans des segments UI.
3. Footer trop technique (`variantId`, labels techniques) et pas assez collector.
4. La rareté est textuelle avant d’être matérielle.

### 1.5 Problèmes collection / opening

1. Le pack opening n’a pas de slots de rareté garantis (simple tirage pondéré global 5 fois).
2. Duplicates intra-pack possibles sans contrainte d’unicité.
3. Affichage d’odds marketing (40/30/20/8/2) non aligné sur l’algorithme réel (poids tier + rank + variant default).
4. Les variants premium existent dans le dataset mais ne sont pas réellement tirés dans `openBasePack` (tirage au niveau base card hydratée default variant).

### 1.6 Ce qui peut être conservé

1. Le pipeline runtime simple et lisible: JSON → `lib/cards.ts` → API → `CardFrame`.
2. Le modèle 4 stats (ATK/DEF/SPD/CTRL) comme base de combat.
3. Les surfaces existantes (collection/packs/combats) et le transport (`/api/me`, `useSession`).
4. Le dataset source (base cards + projects + variants) comme matière première.

---

## 2) Rôle cible d’une carte MCG

Une carte MCG est un **asset produit unifié** avec 5 rôles explicites:

1. **Identité collectible**: objet collectionnable, traçable, rareté claire, finition claire.
2. **Unité gameplay**: stats lisibles et exploitables en PvE sans ambiguïté.
3. **Lot de valeur en opening**: chaque pull doit porter un niveau de satisfaction (base rarity + chance de finish).
4. **Brique de progression**: acquisition progressive de puissance et de diversité d’archétypes.
5. **Support visuel premium**: perception TCG premium dès la première seconde.

Décision ferme: la carte ne doit plus être hybride/confuse. Elle devient une entité à double face logique:
- **Face avant** = expérience joueur/collector.
- **Backend metadata** = distribution, analytics, IDs internes.

---

## 3) Structure cible de la carte

### 3.1 Architecture front (face avant) — blocs obligatoires

1. **Header Identity (haut)**
   - rôle: identification immédiate.
   - contenu: `name`, `symbol`, `setCode`, `cardNumber`.
   - hiérarchie: élevée.
2. **Rarity Crest (coin haut-droit)**
   - rôle: signal de rareté de base.
   - contenu: `baseRarity` (pas variant).
   - hiérarchie: élevée.
3. **Hero Zone (zone dominante)**
   - rôle: désirabilité collector.
   - contenu: image + traitement art/fond selon famille visuelle.
   - hiérarchie: maximale.
4. **Type Line (intermédiaire)**
   - rôle: classification utile.
   - contenu: `archetype` + `primaryChain` + `faction`.
   - hiérarchie: moyenne.
5. **Combat Panel (bas principal)**
   - rôle: lisibilité gameplay.
   - contenu: `combatScore` + ATK/DEF/SPD/CTRL.
   - hiérarchie: haute (après hero + identity).
6. **Collector Footer (bas discret)**
   - rôle: authenticité et collection.
   - contenu: `collectorId`, `edition`, `finish` badge court.
   - hiérarchie: basse.

### 3.2 Ce qui ne doit plus être visible face avant

- `projectId`, `coingeckoId`, `slug`, `snapshotDate`, `variantId`, `dropWeight`, flags techniques.
- rang brut `marketCapRank` (sort de la face avant; possible en vue détaillée).
- labels techniques UI (“POW”, “STD/HOLO” surdimensionnés).

### 3.3 Répartition collector/gameplay/backend

- **Collector-facing**: header, rarity crest, hero, footer.
- **Gameplay-facing**: combat panel, archetype.
- **Backend-only**: IDs, règles distribution, source ranking, snapshots.

---

## 4) Refonte des données affichées

### 4.1 Décisions champ par champ

- `name`: **garder** (header principal).
- `symbol`: **garder** (header secondaire).
- `chain`/`primaryChain`: **garder** (type line).
- `faction`: **garder** (type line, pas en double ailleurs).
- `tier`/`projectTier`: **retirer face avant**, conserver backend de migration seulement.
- `rarity` (nouveau `baseRarity`): **ajouter** et afficher.
- `variant`: **renommer en `finish`**, afficher discretement en footer.
- `rank`/`marketCapRank`: **sortir face avant**, garder en data et filtre collection.
- `ATK/DEF/SPD/CTRL`: **garder**.
- `powerScore`: **remplacer** par `combatScore` canonique.
- `image/logo`: **garder** dans hero zone (sans médaillon obligé).
- IDs (`baseCardId`, `variantId`): **backend-only** (sauf `collectorId` formaté).
- metadata diverse (`snapshotDate`, `coingeckoId`, etc.): **backend-only**.

### 4.2 Nouveau schéma logique carte (cible)

- Core identity: `cardId`, `baseCardId`, `name`, `symbol`, `setCode`, `cardNumber`.
- Taxonomy: `archetype`, `primaryChain`, `faction`.
- Gameplay: `ATK`, `DEF`, `SPD`, `CTRL`, `combatScore`.
- Rarity product: `baseRarity`, `finish`, `edition`, `collectorId`.
- Backend distribution: `dropBucket`, `finishWeight`, `eligibility`, `sourceRank`.

Décision: `projectTier`, `variantRarity`, `powerScore` sont dépréciés comme concepts front canonique.

---

## 5) Refonte complète des stats

### 5.1 Doctrine stats

1. On conserve 4 stats (ATK, DEF, SPD, CTRL).
2. On normalise l’échelle à **0–99** (bornes strictes).
3. On introduit `combatScore` canonique (0–100) calculé côté runtime.
4. On évite les cartes “plates” via règles d’archétype et contraintes de distribution.

### 5.2 Formule canonique

- `combatScore = round(0.34*ATK + 0.27*DEF + 0.21*SPD + 0.18*CTRL)`.
- Raison: la boucle PvE actuelle valorise ATK/DEF, SPD/CTRL restent déterminants en initiative/variance/crit.

### 5.3 Règles de génération/distribution stats (cible)

1. Chaque carte appartient à 1 archétype:
   - **Bruiser** (ATK/DEF hauts),
   - **Striker** (ATK/SPD),
   - **Controller** (CTRL/DEF),
   - **Tempo** (SPD/CTRL),
   - **Balanced**.
2. Contraintes anti-plat:
   - écart max-min ≥ 12,
   - au moins 1 stat ≥ 70 pour rares+,
   - max 2 stats > 85.
3. Distribution combatScore par base rarity:
   - Common: 32–52,
   - Rare: 46–66,
   - Epic: 60–80,
   - Legendary: 74–92.
4. Finishes **n’affectent pas** les stats (strict).

### 5.4 Affichage

- Afficher: ATK/DEF/SPD/CTRL + `combatScore`.
- Ne plus afficher: `powerScore` historique.

---

## 6) Refonte complète de la rareté

### 6.1 Doctrine ferme

Séparation stricte en 4 dimensions:

1. **Base Rarity** (structure produit): Common / Rare / Epic / Legendary.
2. **Finish** (cosmétique): Standard / Holo / Full Art / Glitch / Gold.
3. **Power band** (gameplay): bornes de `combatScore` ci-dessus.
4. **Chase desirability** (collection): combinaison base rarity + finish + card popularity.

### 6.2 Décisions de migration concepts existants

- `projectTier`: retiré du produit final; conservé temporairement en migration/débogage.
- `variantRarity`: supprimé comme concept primaire; remappé vers `finish` odds internes.
- `projectTier` ≠ rareté; `finish` ≠ rareté; `combatScore` ≠ rareté.

### 6.3 Grille finale rareté

- Common: base de collection et onboarding.
- Rare: cœur de satisfaction pack.
- Epic: premium régulier.
- Legendary: chase majeur.

Décision: pas de 5e rareté dans cette refonte (pas de “Mythic” maintenant).

---

## 7) Refonte complète de la distribution / pack opening

### 7.1 Diagnostic de l’actuel

- Tirage actuel: 5 tirages pondérés indépendants sur base cards (`openBasePack`), sans slot garanti.
- Poids mélangés: tier + marketCapRank + default variant weight.
- Variants premium non réellement distribués au tirage final de pack.

### 7.2 Nouveau modèle de pack (ferme)

Pack standard = 5 slots verrouillés:

1. Slot A: Common
2. Slot B: Common
3. Slot C: Rare+
4. Slot D: Rare+
5. Slot E: Epic+ (legendary chance)

### 7.3 Probabilités exactes

- Slot A/B: 100% Common.
- Slot C/D:
  - 78% Rare
  - 20% Epic
  - 2% Legendary
- Slot E:
  - 72% Epic
  - 28% Legendary

Résultat pack global moyen:
- 2 Commons fixes,
- ~1.56 Rare,
- ~1.12 Epic,
- ~0.32 Legendary.

### 7.4 Règles de tirage

1. Unicité intra-pack sur `baseCardId` obligatoire.
2. Tirage en 2 temps:
   - tirage base card par bucket de base rarity,
   - tirage finish selon table finish par rareté.
3. Table finish (par carte tirée):
   - Common: 94% Standard, 6% Holo,
   - Rare: 78% Standard, 18% Holo, 4% Full Art,
   - Epic: 55% Standard, 28% Holo, 12% Full Art, 5% Glitch,
   - Legendary: 30% Standard, 35% Holo, 20% Full Art, 10% Glitch, 5% Gold.

### 7.5 Cohérence produit

- Les odds affichées UI doivent être générées depuis les tables runtime, jamais hardcodées manuellement.

---

## 8) Refonte complète du rendu visuel cible

### 8.1 Direction visuelle ferme

Objectif: carte “TCG premium” lisible en 1 seconde.

- Hero zone dominante (~50% hauteur utile).
- Header fort (name/symbol + rarity crest).
- Combat panel compact et robuste (pas dashboard analytique).
- Footer collector minimal.

### 8.2 Ce qui est banni définitivement

- segmentation en trop de bandeaux techniques,
- duplication chain/faction/symbol à plusieurs endroits,
- badges techniques agressifs (`STD`, IDs) en zones primaires,
- style “widget” (barres UI froides sur toute la carte).

### 8.3 Structure de layout cible

- Header: 12–14%
- Hero: 46–50%
- Type line: 6–8%
- Combat panel: 22–24%
- Footer: 8–10%

---

## 9) Logique visuelle des raretés et variants

### 9.1 Matrice stable

Invariants (toutes raretés):
- même grille,
- mêmes zones,
- même typographie,
- mêmes positions des informations.

Variables par base rarity:

- Common: matière matte, contour sobre, glow minimal.
- Rare: contour accentué, highlights contrôlés.
- Epic: profondeur frame + halo interne net.
- Legendary: signature material premium (dorure/foil multi-pass) sans saturation criarde.

Variables par finish:

- Standard: aucune couche spéculaire.
- Holo: sheen angle discret.
- Full Art: hero étendue, frame allégée.
- Glitch: micro-pattern numérique maîtrisé (faible amplitude).
- Gold: accent or sélectif (pas full-gold cheap).

### 9.2 Anti “faux premium cheap”

1. Premium par matière/relief, pas par néon/saturation.
2. Contraste texte toujours prioritaire à l’effet.
3. Légendaire lisible à distance sans clignotement ni bruit.

---

## 10) Conséquences concrètes sur le repo

### 10.1 Fichiers à réécrire fortement

1. `lib/cards.ts`
   - nouveau modèle rareté/finish,
   - génération buckets pack,
   - tirage slots + unicité intra-pack,
   - abandon logique tier/rank comme moteur principal de drop.
2. `components/ui/CardFrame.tsx`
   - nouvelle architecture de face avant.
3. `app/globals.css`
   - réécriture du système `.mcg-*` pour layout premium cible.

### 10.2 Fichiers à adapter (modéré)

1. `types/cards.ts` (nouveaux champs canon: baseRarity, finish, combatScore, archetype).
2. `lib/serializers.ts` (payload aligné nouveau schéma).
3. `app/api/pack/open/route.ts` (nouveau moteur d’ouverture).
4. `app/packs/page.tsx` (odds dynamiques, reveal enrichi).
5. `app/collection/page.tsx` (filtres par rareté/base rarity/finish).
6. `app/combats/page.tsx` (utilisation `combatScore` canonique + tri archétype).

### 10.3 Fichiers largement conservables

- `app/api/me/route.ts` (structure générale),
- transport session (`useSession`),
- endpoints PvE globalement (mais équilibrage formulas à retoucher).

### 10.4 Zones à refactorer ensuite

- `lib/pve/generateEnemyTeam.ts` et `lib/pve/simulateBattle.ts` pour aligner complètement les archétypes et la nouvelle pondération combatScore.

---

## 11) Plan d’implémentation recommandé

### Étape 1 — Data contract canonique

- Ajouter nouveaux champs types (`baseRarity`, `finish`, `combatScore`, `archetype`, `collectorId`).
- Créer mapping de migration depuis `projectTier`/`variantType` existants.
- Geler backward compatibility API pendant transition.

### Étape 2 — Runtime distribution

- Implémenter buckets de rareté + slots pack.
- Implémenter finish rolls par rareté.
- Implémenter unicité intra-pack.
- Exposer odds runtime via endpoint dédié.

### Étape 3 — Stats & gameplay alignment

- Calcul canonique `combatScore`.
- Normalisation bornes stats.
- Attribution archétypes et validation anti-cartes plates.
- Ajuster PvE enemy generation pour cesser d’utiliser tier legacy.

### Étape 4 — Renderer V2

- Refaire `CardFrame` selon layout cible.
- Refaire CSS cartes et styles rareté/finish.
- Introduire mode visual QA (common/rare/epic/legendary × finish matrix).

### Étape 5 — Surfaces produit

- Collection: filtres base rarity / finish / archetype.
- Packs: odds dynamiques, affichage slots.
- Combats: tri, comparateurs, lisibilité team power via combatScore.

### Étape 6 — Stabilisation

- tests unitaires de distribution,
- tests de non-régression API,
- vérification économique (coût pack vs gain PvE),
- suppression des champs legacy affichés.

---

## 12) Recommandation finale nette

1. **Structure carte recommandée**: Header identity + Rarity crest + Hero dominant + Type line + Combat panel + Collector footer.
2. **Système stats recommandé**: conserver ATK/DEF/SPD/CTRL, créer `combatScore` canonique, imposer archétypes + contraintes anti-plat.
3. **Système rareté recommandé**: 4 base rarities (Common/Rare/Epic/Legendary) strictement séparées des finishes.
4. **Distribution recommandée**: packs à slots verrouillés, unicité intra-pack, tirage en 2 temps (base rarity puis finish).
5. **Rendu visuel recommandé**: direction TCG premium matérialisée, bannissement du style dashboard/widget.
6. **Ordre de mise en œuvre recommandé**: data contract → distribution runtime → stats/gameplay → renderer V2 → surfaces produit → stabilisation.

Décision finale: MCG passe d’un système hybride “tier/rank/variant confondus” à un système canonique à responsabilités séparées, industrialisable, testable, et défendable côté produit, gameplay, collection et opening.
