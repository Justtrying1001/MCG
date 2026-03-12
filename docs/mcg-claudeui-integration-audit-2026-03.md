# Audit MCG + dossier `claudeui` — préparation migration visuelle cartes (sans rupture runtime)

## 1) Vue d’ensemble du système actuel

Pipeline actuel (auth):
1. Le backend pack/runtime alloue des templates (`CardTemplate`) et fabrique des `MvpCardView` via `toMvpCardViewFromTokenMasterRow` (fusion DB supply + token master).  
2. `/api/pack/open` retourne `pulledCardsMvp: MvpCardView[]`.  
3. `/api/me` retourne `mvpCollection: MvpCollectionItem[]` (agrégée depuis `OwnedCardInstance`, puis enrichie token-master).  
4. Frontend `/collection` et `/packs` rendent les cartes avec **le même composant** `components/ui/MvpCardTile.tsx` (seule la prop `variant` change: `collection` vs `reveal`).

Pipeline guest:
1. `/api/guest/pack/open` tire dans token-master localement (pas de DB stock), assigne rareté/édition aléatoires, et produit aussi des `MvpCardView`.  
2. La collection guest est tenue côté sessionStorage mais rendue par le même `MvpCardTile`.

Conclusion source of truth:
- **Source of truth UI rendering**: `components/ui/MvpCardTile.tsx` + `components/ui/MvpCardTile.module.css` + `components/ui/mvpCardTheme.ts`.
- **Source of truth données carte**: `types/cards.ts` + `lib/domain/cards/token-master.ts` (mapping DTO) + sérialisation `/api/me` et pack open runtime.

---

## 2) Cartographie des fichiers importants

### Rendu carte actuel (prod)
- `components/ui/MvpCardTile.tsx` (composant principal).
- `components/ui/MvpCardTile.module.css` (skin, zones, overlays, hover shimmer, variante reveal/collection).
- `components/ui/mvpCardTheme.ts` (mapping rareté/édition/faction/chain -> CSS variables).

### Pages qui utilisent ce rendu
- `app/collection/page.tsx` (grille + filtres, map `mvpCollection -> MvpCardTile`).
- `app/packs/page.tsx` (reveal modal, map `pulledCardsMvp -> MvpCardTile`, `variant="reveal"`).

### Données / DTO / mapping
- `types/cards.ts` (`MvpCardView`, `MvpCollectionItem`).
- `lib/domain/cards/token-master.ts` (chargement canonique + mapping `toMvpCardViewFromTokenMasterRow`).
- `lib/serializers.ts` (`buildUserPayload`, agrégation collection auth).
- `app/api/me/route.ts` (session payload auth).
- `lib/domain/acquisition/open-pack.ts` + `app/api/pack/open/route.ts` (pack auth DB-native).
- `app/api/guest/pack/open/route.ts` (pack guest simulé).

### Styles globaux impliqués
- `app/globals.css` gère layout conteneurs (`.card-grid`, reveal slots `.pack-reveal-grid`, `.reveal-slot`), mais le style interne carte est dans le CSS module de `MvpCardTile`.

### Dossier `claudeui`
- `claudeui/MvpCardTile.tsx`, `claudeui/mvpCardTheme.ts`, `claudeui/mvp-card.css` = proposition de skin composant.
- `claudeui/*.html` + `claudeui/MCGCard.jsx` = maquettes/références visuelles avec données hardcodées.
- `claudeui/CODEX_PROMPT_MCG_CARDS.md` = brief de redesign, pas runtime code.

---

## 3) Source réelle des données carte (table de vérité)

| Champ métier | Existe réellement ? | Source/champ exact | Fiabilité | Utilisation UI actuelle |
|---|---|---|---|---|
| nom | Oui | `MvpCardView.displayName` (issu token-master `displayName`) | Canonique | Header `MvpCardTile` |
| ticker/symbole | Oui | `MvpCardView.symbol` | Canonique | Header |
| image | Oui (nullable) | `MvpCardView.imageUrl` (token-master `imageUrl`) | Forte, peut être `null` | Zone art `<img>` |
| hero art | **Pas séparé dans DTO** | Token-master contient `editorial.heroFocus` / `heroArtworkPrompt` textuels, pas URL distincte | Partielle | Non rendu |
| texte carte | Oui (optionnel) | `MvpCardView.cardText` (`editorial.flavorText`) | Moyenne (optionnel) | Textbox + fallback |
| numéro | Oui (optionnel) | `MvpCardView.cardNumber` (`editorial.cardNumber`) | Moyenne | Footer |
| numéro dans set | Oui (fallback) | `MvpCardView.setOrder` | Forte | Fallback `S01-XXX` |
| set | Oui (optionnel) | `MvpCardView.setCode` (`collectionCode || setCode`) | Moyenne | Footer |
| édition du set | Oui (optionnel) | `MvpCardView.setEditionLabel` (`editorial.editionLabel`) | Moyenne | Footer |
| rareté | Oui | `MvpCardView.rarity` (DB `rarity.code`) | Forte | Couleurs + badges |
| édition visuelle / variant | Oui | `MvpCardView.edition` (DB `edition.code`) | Forte | Effets édition + badge |
| supply planifiée | Oui | `MvpCardView.plannedSupply` | Forte auth, simulée guest (=0) | Footer |
| supply émise | Oui | `MvpCardView.issuedSupply` | Forte auth, simulée guest (=0) | Footer/fallback index |
| quantité possédée | Oui | `MvpCollectionItem.instanceCount` et `MvpCardView.instanceCount` | Forte | Actuellement non affichée visuellement |
| masterCardId | **Pas dans DTO** | Présent en token-master: `editorial.masterCardId` | Réel mais non exposé UI | Non utilisé |
| metadata canonique | Oui | `data/token-master-50.json` (+ `editorial`, `legacyVariantBridge`) | Canonique | Mapping partiel vers DTO |
| frame/overlay/effet | Partiellement | Pas de champ dédié DTO; dérivé de `rarity` + `edition` via `mvpCardTheme.ts` | Dérivé | CSS variables + classes |

Notes strictes:
- `MvpCardView` **n’expose pas** `masterCardId`, `heroArtworkUrl`, `editionNumber`, `flavorText` brut (uniquement `cardText`).
- Le fichier `claudeui/MvpCardTile.tsx` référence des champs non existants (`card.flavorText`, `card.editionNumber`, `card.rarity?.code`) -> adaptation obligatoire.

---

## 4) Pipeline image/rendu actuel

### Pipeline exact
`CardTemplate + TokenMasterRow` -> `toMvpCardViewFromTokenMasterRow` -> `mvpCollection/pulledCardsMvp` -> `<MvpCardTile card={...}>` -> `mvpCardTheme` (maps) + `MvpCardTile.module.css` (zones/overlays) -> image finale affichée.

### Nature de l’image
- L’image affichée vient de `card.imageUrl` (token icon/project image externe, souvent coingecko).
- Le composant affiche cette image dans une zone art avec `object-fit: contain`.
- La frame n’est **pas baked dans l’image**: elle est construite en CSS/UI (header/footer/borders/gloss/noise/gradients).

### Gestion rareté/édition aujourd’hui
- Rareté (`COMMON..LEGENDARY`) influe les tokens visuels: accent, border, glow, badge, foil, ornament.
- Édition (`BASE, REVERSE, BRILLANTE, HOLO, FULL_ART`) influe traitement fond/sheen/finish/artOverlay/footer.
- `FULL_ART` a une classe dédiée (`.fullArt`) qui augmente le scale art.
- Pas de shader/canvas/webgl; effets = gradients CSS/pseudo-elements/hover shimmer.

### Collection vs packs
- Même composant, mais `variant` change des variables de taille/espacement (`variantCollection` vs `variantReveal`).
- Le reveal ajoute surtout un conteneur flip 3D autour de la carte, sans changer le moteur de rendu interne.

---

## 5) Audit détaillé de `claudeui`

## A. Réutilisable tel quel (structure/skin)
- Architecture visuelle 4 zones (`header/art/text/footer`) claire et proche du composant actuel.
- Beaucoup de patterns CSS premium réutilisables: grains, borders fines, badges, overlays édition, effets holo/brillante.
- `mvp-card.css` contient une structuration isolable de skin (bonne base pour V2).

## B. Réutilisable après adaptation
- `claudeui/MvpCardTile.tsx` doit être adapté au vrai DTO MCG:
  - retirer accès `card.rarity?.code`, `card.edition?.code`, `card.flavorText`, `card.editionNumber`.
  - harmoniser fallback texte/footer avec champs réels.
  - conserver le `variant` (`collection|reveal`) pour coexistence avec les pages actuelles.
- `claudeui/mvpCardTheme.ts` doit mapper aux enums MCG réelles:
  - rareté MCG = `COMMON/UNCOMMON/RARE/EPIC/LEGENDARY` (pas `B/A/S/S+` exposé dans DTO).
  - édition MCG = `BASE/REVERSE/BRILLANTE/HOLO/FULL_ART` (pas `HOLOGRAPHIQUE`/`MCG_ART` côté runtime).

## C. À supprimer/remplacer
- Données hardcodées dans les HTML de démonstration (`S01-001`, `GENESIS · ED.1`, `Dogecoin`, `Brett just vibes`, URLs fixes, etc.).
- `MCGCard.jsx` est un playground standalone avec defaults mockés, non branché runtime.
- Tout mapping édition `MCG_ART` / `HOLOGRAPHIQUE` non aligné avec enum runtime doit être normalisé vers `FULL_ART` / `HOLO`.

---

## 6) Compatibilité entre `claudeui` et pipeline réel MCG

### Ce qui match bien
- Le contrat minimal requis par le skin (`displayName`, `symbol`, `imageUrl`, `cardText`, `rarity`, `edition`, infos footer) existe déjà dans `MvpCardView`.
- Le pipeline runtime peut alimenter un nouveau composant sans modifier backend.

### Ce qui ne match pas
- `claudeui` utilise des codes/thèmes non strictement alignés (`HOLOGRAPHIQUE`, `MCG_ART`, échelle B/A/S/S+).
- `claudeui/MvpCardTile.tsx` attend des champs absents du DTO runtime.
- Les HTML de référence sont des maquettes hardcodées, pas des composants branchables directement.

### Ce qui manque (si on veut le visuel maximal)
- Pas de champ DTO pour `masterCardId`/`artist`/hero art URL dédié (si on veut les afficher).
- Pas de numéro d’édition unitaire “print #x of y” hors supply actuel/fallback existant.

---

## 7) Mapping rareté / édition recommandé (MCG -> langage visuel Claude)

### Rareté
- `COMMON` -> palette slate discrète, glow minimal, pas de foil agressif.
- `UNCOMMON` -> accent teal léger, glow soft.
- `RARE` -> accent blue plus marqué + border plus vive.
- `EPIC` -> violet premium + micro-shimmer discret.
- `LEGENDARY` -> gold premium + glow plus présent (sans animation excessive continue).

### Éditions
- `BASE` -> aucun effet spécial (skin de base).
- `REVERSE` -> overlay foil hors zone art (ou art remasqué), effet subtil lisible.
- `BRILLANTE` -> shimmer métallique léger + glitter contrôlé (éviter surcharge).
- `HOLO` -> iridescence animée lente + badge HOLO (modération sur mobile perf).
- `FULL_ART` -> priorité à l’art (zone art agrandie, chrome carte allégé).

Principe produit: effets UI doivent représenter le code réel sans surpromesse (pas de faux metadata implicite).

---

## 8) Risques d’intégration

1. **Risque DTO mismatch**: importer `claudeui/MvpCardTile.tsx` tel quel casse TypeScript (champs absents).
2. **Risque enum mismatch**: `HOLOGRAPHIQUE/MCG_ART` vs `HOLO/FULL_ART` peut produire mauvais styles.
3. **Risque CSS collision**: injecter `mvp-card.css` globalement peut impacter d’autres composants si noms trop génériques.
4. **Risque perf**: effets animés continus (holo/brillante) dans des grilles denses `/collection`.
5. **Risque cohérence**: `/packs` reveal a un wrapper 3D existant; un V2 non dimensionné correctement peut casser le flip layout.

---

## 9) Plan d’intégration progressive recommandé

1. **Audit verrouillé** (fait) + mapping enums/champs documenté.
2. **Créer `components/ui/MvpCardTileV2.tsx`** (nouveau composant, pas de remplacement direct).
3. **Créer `components/ui/MvpCardTileV2.module.css`** (ou CSS isolé scoped), inspiré `claudeui/mvp-card.css`.
4. **Créer un adaptateur thème V2** aligné strictement sur enums MCG (`COMMON..LEGENDARY`, `BASE..FULL_ART`).
5. **Brancher V2 sur vraies props** (`card: MvpCardView`, `variant`, `quantity?`) sans toucher APIs.
6. **A/B local via feature flag UI** (ex: query param ou constante dev) sur `/collection` seulement.
7. **Valider `/packs` reveal** (dimensions card + flip wrapper + perf).
8. **Corriger écarts visuels/perf** (surtout mobile).
9. **Basculer progressivement** (`collection` puis `packs`), garder V1 rollbackable 1 release.
10. **Suppression V1** uniquement après stabilité confirmée.

---

## 10) Conclusion opérationnelle

### Est-ce faisable proprement ?
Oui. Le pipeline runtime est déjà proprement découplé du skin UI: les pages consomment un DTO stable (`MvpCardView`) et un composant carte unique.

### Quels composants créer ?
- `MvpCardTileV2` + thème V2 + style V2 scoped.
- Optionnel: `mapMvpCardToV2ViewModel(card)` pour clarifier dérivations footer/badges.

### Quels fichiers modifier à terme (migration) ?
- Nouveaux fichiers UI V2 sous `components/ui/`.
- Branchement progressif dans `app/collection/page.tsx` puis `app/packs/page.tsx`.
- Aucun changement requis dans routes backend, DTO existants, DB runtime.

### Qu’est-ce qui doit rester intact ?
- `types/cards.ts` (contrat pivot).
- `lib/domain/cards/token-master.ts` (mapping runtime canonical).
- Routes `/api/me`, `/api/pack/open`, `/api/guest/pack/open` (pipeline métier).
- Logique d’émission/supply DB-native.
