# Audit complet du rendu des cartes (référence = pack opening)

Date: 2026-03-17

## 1) Résumé exécutif

- **Source of truth visuelle identifiée**: le rendu carte du pack opening repose sur `MvpCardTile` en `variant="reveal"` (injecté par `app/packs/page.tsx`), combiné à son socle de styles globaux `mvp-premium-card.css` et à la couche d’animation de flip du reveal (`.reveal-slot*` dans `app/globals.css`).
- **Constat principal**: la base visuelle est déjà mutualisée via `MvpCardTile` sur la majorité des features "cartes collectibles" (collection, profil, contests, recent pulls, zoom). Les divergences proviennent surtout de:
  1. **variants différents** (`collection`, `compact`, `zoom`) ;
  2. **wrappers contextuels** (grilles, slots, modales) qui modifient perception/hover/scale ;
  3. **mapping de données fallback** en contest (`toMvpCardView`) qui altère textes/code/supply ;
  4. **styles legacy en doublon** autour des classes `lineup-card-*` dans `app/globals.css`.
- **Niveau de risque global**: **moyen** (pas de fragmentation massive du composant principal), avec **points critiques localisés** (contests + mapping fallback + variants compact/zoom).

## 2) Source of truth du pack opening (référence)

### 2.1 Chaîne technique de référence

1. Le pack opening construit les cartes révélées avec `<MvpCardTile ... variant="reveal" />` dans `app/packs/page.tsx`.
2. La carte elle-même est définie dans `components/ui/MvpCardTile.tsx` (structure complète: header/badges/art/textbox/footer/quantity, overlays édition/rareté).
3. Les thèmes visuels (rareté + édition + variables CSS) sont résolus dans `components/ui/mvpCardTheme.ts`.
4. Le style canonique de la carte est dans `components/ui/mvp-premium-card.css` (ratio 3:4, radius, bordures, glow, badges, overlays foil/holo/brillante/reverse/mcg art, typo, responsive).
5. Le contexte de reveal ajoute le flip/back-face/front-face via `.reveal-slot`, `.reveal-slot-inner`, `.reveal-slot-face`, etc. dans `app/globals.css`.

### 2.2 Contrat visuel de référence (ce qui doit devenir standard)

- **Proportions**: `aspect-ratio: 3 / 4`.
- **Cadre**: `border-radius: 10px`, double niveau de bordure/outline et glow paramétré par rareté.
- **Structure interne**: header (nom+ticker+badges), art shell, textbox, footer (code/set/supply).
- **Effets édition**: reverse/brillante/holo/mcg art via calques dédiés.
- **Effets rareté**: variables CSS (`--accent`, `--glow-col`, etc.) issues de `getRarityVars`.
- **Comportement reveal**: chargement eager image (`variant="reveal"`), flip 3D dans le modal reveal.

### 2.3 Pourquoi ce standard

- C’est déjà l’implémentation la plus riche et complète (tous overlays, hiérarchie typographique, traitement éditions).
- C’est la référence explicitement demandée côté produit.
- Elle est déjà centralisée (1 composant + 1 thème + 1 feuille de style principale), donc le meilleur candidat pour verrouiller l’uniformité.

## 3) Inventaire exhaustif des endroits où des cartes sont rendues

> Légende conformité vs pack opening (référence = `MvpCardTile variant="reveal"`)
> - **OUI** = identique
> - **PARTIEL** = même composant cœur mais variante/wrapper/données diffèrent
> - **NON** = autre implémentation visuelle

| Feature / page | Composant utilisé | Fichiers | Rôle | Conforme pack ? | Écarts visuels / techniques | Sévérité |
|---|---|---|---|---|---|---|
| Pack opening modal reveal | `MvpCardTile` + flip wrapper reveal | `app/packs/page.tsx`, `components/ui/MvpCardTile.tsx`, `components/ui/mvpCardTheme.ts`, `components/ui/mvp-premium-card.css`, `app/globals.css` (`.reveal-slot*`) | Révélation séquentielle des pulls | **OUI (référence)** | N/A (source) | Réf |
| Zoom depuis pack opening | `CardZoomModal` -> `MvpCardTile variant="zoom"` | `components/ui/CardZoomModal.tsx`, `app/packs/page.tsx`, `app/globals.css` (`.card-zoom-*`) | Inspection agrandie d’une carte révélée | PARTIEL | variant `zoom` neutralise hover + scale conteneur externe | Moyen |
| Collection grid | `CardGrid` -> `MvpCardTile variant="collection"` | `app/collection/page.tsx`, `components/collection/CardGrid.tsx` | Affichage principal de collection | PARTIEL | variant `collection` (hover actif), pas de wrapper flip reveal | Moyen |
| Zoom depuis collection | `CardZoomModal` -> `variant="zoom"` | `app/collection/page.tsx`, `components/ui/CardZoomModal.tsx` | Détail carte collection | PARTIEL | identique au zoom pack (pas reveal context) | Mineur |
| Profil / Featured cards | `FeaturedCardsStrip` -> `variant="collection"` | `app/compte/page.tsx`, `components/profile/FeaturedCardsStrip.tsx` | Mise en avant cartes profil | PARTIEL | rendu carte idem collection, densité différente via strip horizontal | Mineur |
| Home / Recent pulls | `RecentPullsRail` -> `variant="compact"` | `app/page.tsx`, `components/home/RecentPullsRail.tsx` | Feed live des pulls | PARTIEL | variant compact: header/textbox/footer compressés + clamp plus agressif | Moyen |
| Contest detail / lineup slots (résumé) | `MvpCardTile variant="compact"` direct | `app/contests/[contestId]/page.tsx` | Cartes sélectionnées dans lineup | PARTIEL | compact + wrapper contest (hover/contour local) | Moyen |
| Contest builder modal | `MvpCardTile variant="compact"` direct | `components/contests/LineupBuilderModal.tsx` | Choix des cartes pour lineup | PARTIEL | compact + données transformées via mapper | **Critique** |
| Contest reusable tile | `LineupCardTile` -> `MvpCardTile` (`compact` ou `collection`) | `components/contests/LineupCardTile.tsx`, `components/contests/LineupSlot.tsx`, `components/contests/EligibleCardsPanel.tsx`, `components/contests/CardSelectorModal.tsx` | Tuile de sélection/aperçu carte contest | PARTIEL | wrappers/states selected/disabled + footer additionnel contest | **Critique** |
| Contest mapper | `toMvpCardView` fallback | `components/contests/lineupCardMapper.ts` | Conversion données contest -> vue carte | NON (données) | fallback modifie symbol, cardText, cardNumber, supply; peut casser parité visuelle perçue | **Critique** |
| Dev preview | `MvpCardTile` variants `collection`, `reveal`, `compact` | `app/dev/cards-preview/page.tsx` | Banc de validation visuelle | PARTIEL | page de test (pas prod), utile pour verrouiller standards | Mineur |

## 4) Écarts détaillés (visuels + techniques)

### 4.1 Variants non alignés à la référence reveal

1. `variant="collection"`
   - Hover identique au reveal, mais **contexte d’affichage sans flip/back-face**.
   - Utilisé en collection/profil/lineup slots.

2. `variant="compact"`
   - Diminue radius/rows typographiques (`grid-template-rows`, `font-size`, `line-clamp`).
   - Utilisé massivement en contests et recent pulls.
   - Impact direct sur lisibilité, perception premium, équilibre header/textbox/footer.

3. `variant="zoom"`
   - Désactive hover interne ; agrandissement géré par `.card-zoom-container { transform: scale(...) }`.
   - Cohérent pour modal, mais n’est pas strictement identique au reveal.

### 4.2 Wrappers contextuels qui modifient le rendu perçu

- **Reveal wrapper** (`.reveal-slot*`) ajoute une back-face, un flip 3D, des états `is-next`, `is-revealed`.
- **Contest wrappers** (`.lineup-card-tile`, `.contest-modal-grid.visual`, `.lineup-slot-v2`) ajoutent bordures, ombres, états selected/disabled, hover externes.
- **Zoom wrapper** (`.card-zoom-container`) applique scale fixe responsive.

### 4.3 Divergences de données injectées

- `toMvpCardView` fallback (contest) reconstruit artificiellement:
  - `symbol` tronqué,
  - `cardText` / `flavorText` synthétiques,
  - `cardNumber` basé sur `instanceId`,
  - `plannedSupply=0` etc.
- Même composant visuel, mais contenu structurel différent -> rendu final perçu différent (footer/chips/text).

### 4.4 Styles legacy / duplication

- `app/globals.css` contient des blocs `lineup-card-*` historiques (styles `lineup-card-art`, `lineup-card-body`) en parallèle de l’usage actuel `MvpCardTile`.
- Risque de confusion et dette: présence de styles non/peu utilisés + surcharge locale des tuiles lineup.

### 4.5 Cas “cartes” non-collectibles (nomenclature UI)

Composants nommés `*Card` mais ne représentant pas les cartes collectibles MCG (contest/reward/quest/packs/podium):
- `components/rewards/RewardCard.tsx`
- `components/contests/ContestCard.tsx`, `ContestHistoryCard.tsx`, `ContestPremiumCard.tsx`, `LeaderboardCard.tsx`
- `components/packs/PackGallery.tsx` (`PackCard`)
- `components/quests/*Card*.tsx`

Ils créent du bruit lexical mais ne doivent pas être fusionnés avec la carte collectible.

## 5) Causes racines

1. **Variants visuels non gouvernés** (`collection`, `compact`, `zoom`, `reveal`) sans matrice claire de conformité.
2. **Surcharges contextuelles locales** dans `app/globals.css` (contests, reveal, zoom) qui modifient l’apparence perçue.
3. **Transformation de données hétérogène** (fallback contest) au lieu d’un contrat de data view unique.
4. **Legacy CSS coexistante** (`lineup-card-*` ancien modèle) augmentant le risque de divergences futures.
5. **Mélange logique métier + présentation** dans certains écrans (contests) avec mapping + rendu + interaction dans les mêmes zones.

## 6) Plan de normalisation (architecture cible)

### 6.1 Composant unique de référence

- Conserver `MvpCardTile` comme **unique composant collectible**.
- Définir explicitement que la **référence canonique** = style `reveal` (pack opening).

### 6.2 Contrat de variants strict

- Réduire à un set minimal contrôlé:
  - `canonical` (ex-`reveal`, sans dépendance au flip wrapper),
  - `interactive` (hover autorisé),
  - `zoom` (modal).
- Requalifier `compact` en **exception fonctionnelle** (ex: densité mobile) avec spécification stricte et tests visuels.

### 6.3 Centralisation style/tokens

- Extraire constants de dimensions/radius/rows/typographies dans tokens dédiés.
- Éviter les overrides dans `globals.css` qui touchent la carte interne.
- Wrappers contextuels (contests/reveal) doivent styliser uniquement le conteneur externe (pas la carte).

### 6.4 Uniformisation data contract

- Interdire le fallback “inventé” de `toMvpCardView` en prod.
- Exiger que les APIs contests renvoient `cardView` complet aligné pack opening.
- Ajouter garde-fous runtime + logs si `cardView` absent.

### 6.5 Anti-régression

- Mettre en place snapshots visuels (ou Playwright) sur: pack reveal, collection grid, contest lineup, recent pulls, zoom.
- Créer une checklist PR “card rendering parity with pack opening”.
- Utiliser `app/dev/cards-preview/page.tsx` comme page de référence QA.

## 7) Risques / points d’attention

- **Responsive**: changement de `compact` peut casser densité en grilles contests/home mobile.
- **Performance**: effets holo/brillante/reverse peuvent coûter si imposés partout sans stratégie lazy.
- **Animation**: conserver flip reveal propre au pack opening sans imposer ce comportement en collection.
- **Dépendances API**: contests doit fournir `cardView` fiable pour éviter fallback.
- **Admin / rewards / quests**: nombreux composants nommés *Card* mais hors scope collectible — éviter régressions de design system général.

## 8) Liste priorisée des fichiers à corriger (phase refactor suivante)

### Priorité P0 (critique)

1. `components/contests/lineupCardMapper.ts` — supprimer fallback non canonique / fiabiliser `cardView`.
2. `components/contests/LineupCardTile.tsx` — limiter les surcouches visuelles, aligner variant cible.
3. `components/contests/LineupBuilderModal.tsx` — harmoniser rendu cartes avec standard pack.
4. `app/contests/[contestId]/page.tsx` — normaliser affichage slots sur composant standard.

### Priorité P1 (moyen)

5. `components/home/RecentPullsRail.tsx` — valider besoin réel du `compact` vs standard.
6. `components/ui/MvpCardTile.tsx` — clarifier API variants (renommage + docs de contrat).
7. `components/ui/mvp-premium-card.css` — extraire tokens + réduire variations implicites.
8. `app/globals.css` — nettoyage des styles legacy `lineup-card-*` et isolement wrappers.

### Priorité P2 (mineur)

9. `components/ui/CardZoomModal.tsx` + styles `card-zoom-*` — vérifier cohérence de scale avec rendu canonique.
10. `components/profile/FeaturedCardsStrip.tsx` / `components/collection/CardGrid.tsx` — convergence finale des contextes non reveal.
11. `app/dev/cards-preview/page.tsx` — compléter la matrice de tests visuels de parité.

## 9) Vérifications de couverture de l’audit

- Recherche globale des usages `MvpCardTile` et des composants *Card*.
- Vérification des wrappers CSS impactant la carte (`reveal-slot`, `lineup-card-tile`, `card-zoom`).
- Inventaire des composants nommés Card non-collectibles pour éviter faux positifs de refactor.

