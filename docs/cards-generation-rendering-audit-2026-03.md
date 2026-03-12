# Audit complet — pipeline de génération / construction / rendu des cartes (MCG)

## 1. PIPELINE GLOBAL DES CARTES

### Vue d’ensemble « donnée → carte affichée »

1. **Source canonique d’identité carte** : `data/token-master-50.json` (50 tokens, champs éditoriaux, image, faction, chain, set metadata).  
2. **Source runtime inventory** (auth) : Prisma (`CardTemplate`, `OwnedCardInstance`, `PackDefinition`, `PackOpeningEvent`).  
3. **Transformation vers DTO UI** : `toMvpCardViewFromTokenMasterRow(...)` dans `lib/domain/cards/token-master.ts` fabrique `MvpCardView` avec fusion token-master + runtime stock/supply/owned/instanceCount.  
4. **Agrégation collection** : `buildUserPayload(...)` (`lib/serializers.ts`) produit `mvpCollection: MvpCollectionItem[]` depuis les instances DB, puis `/api/me` renvoie ce payload top-level + miroir `coexistence.v2.mvpCollection`.  
5. **Ouverture pack auth** : `/api/pack/open` → `openSalePackMvpDbNative` → tirage pondéré par `plannedSupply - issuedSupply` + incrément supply + création `OwnedCardInstance` + mapping en `pulledCardsMvp: MvpCardView[]`.  
6. **Ouverture pack guest** : `/api/guest/pack/open` ne touche pas la DB inventory ; tire aléatoirement dans le token master, assigne rarity/edition pseudo-aléatoire, synthétise un `templateId` guest, maintient la collection dans `sessionStorage` via `useSession`.  
7. **Rendu UI** : `MvpCardTile` (unique composant actif de carte) est utilisé dans `/packs` (reveal) et `/collection` (grille), stylé via `mvpCardTheme.ts` + classes CSS globales.

---

## 2. SOURCES DE DONNÉES UTILISÉES

### A. `data/token-master-50.json` — source principale d’identité visuelle/contenu
- **Rôle** : référentiel canonique des tokens (nom, symbole, slug, image, faction, chain, metadata éditoriale).  
- **Fichiers consommateurs** :
  - `lib/domain/cards/token-master.ts` (load + index + mapping DTO),
  - `app/api/guest/pack/open/route.ts` (pool guest).
- **Champs réellement exploités dans le rendu DTO** :
  - `tokenId`, `displayName`, `symbol`, `slug`, `imageUrl`, `primaryChain`, `faction`,
  - `editorial.flavorText` → `cardText`,
  - `editorial.cardNumber`, `editorial.collectionCode|setCode`, `editorial.editionLabel`,
  - `setOrder` (fallback card number).
- **Statut** : **principale** pour identité carte.

### B. Prisma DB — source principale runtime auth (stock, ownership, emission)
- **Rôle** : vérité d’inventaire et d’ownership pour utilisateurs authentifiés.  
- **Surfaces** :
  - ouverture pack auth : `lib/domain/acquisition/open-pack.ts`,
  - projection collection : `lib/serializers.ts`, `lib/domain/projections/collection.ts`,
  - session `/api/me` : `app/api/me/route.ts`.
- **Champs clés utilisés** :
  - `CardTemplate.id/plannedSupply/issuedSupply/rarity.code/edition.code/tokenProject.slug`,
  - `OwnedCardInstance.userId/cardTemplateId`,
  - `PackDefinition.code/source/cardsPerPack/plannedPackCount/openedPackCount/cardSetId`.
- **Statut** : **principale** pour auth runtime.

### C. `/api/me` — source session UI auth
- **Rôle** : délivre la collection UI-ready (`mvpCollection`) et statistiques de progression.  
- **Statut** : **principale côté frontend auth**.

### D. `/api/pack/open` — source reveal auth
- **Rôle** : délivre `pulledCardsMvp` après tirage DB-native.
- **Statut** : **contexte spécifique pack opening auth**.

### E. `/api/guest/pack/open` + `sessionStorage` — source reveal/collection guest
- **Rôle** : simulation locale non persistée DB ; maintient `GuestState.mvpCollection`.
- **Statut** : **contexte spécifique guest**.

### F. Reward/Admin (pertinent)
- `POST /api/internal/rewards/pack-grant` peut aussi émettre `pulledCardsMvp` en mode `GRANT_AND_OPEN`, via le même moteur d’ouverture pack DB-native.
- **Statut** : **contexte admin/reward**.

---

## 3. DTO / CONTRATS UTILISÉS

### DTO principal carte : `MvpCardView`
- Défini dans `types/cards.ts`.
- Contient identité (`tokenId`, `displayName`, `symbol`, `slug`), visuel (`imageUrl`, `faction`, `primaryChain`), qualité (`rarity`, `edition`), supply (`plannedSupply`, `issuedSupply`, `remainingSupply`), ownership (`owned`, `instanceCount`), et métadonnées imprimées (`cardText`, `cardNumber`, `setCode`, `setEditionLabel`, `setOrder`).

### DTO collection : `MvpCollectionItem`
- Défini dans `types/cards.ts` : `{ templateId, instanceCount, card: MvpCardView }`.

### Session contracts
- `UserSessionPayload` et `GuestSessionPayload` dans `types/session.ts`.
- Les deux exposent `mvpCollection` + `openingsCount`.
- Auth ajoute `coexistence.v2` (projection collection + progression + copie `mvpCollection`).

### Où ils sont construits
- `toMvpCardViewFromTokenMasterRow(...)` : conversion brute token-master + runtime context → `MvpCardView`.
- `buildUserPayload(...)` : agrège les `OwnedCardInstance` par template et produit `MvpCollectionItem[]`.
- Pack auth/reward : `allocatePackCards(...)` pousse des `MvpCardView` dans `pulledCardsMvp`.
- Pack guest : `drawGuestMvpPack()` produit aussi des `MvpCardView`.

### Où ils sont consommés
- `/packs` : reveal modal mappe `pulledCardsMvp` vers `<MvpCardTile card={...} quantity={1} />`.
- `/collection` : mappe `mvpCollection` vers `<MvpCardTile card={item.card} quantity={item.instanceCount} />`.

---

## 4. RENDU UI ACTUEL

### `MvpCardTile` : fonctionnement précis

**Entrées** : `card: MvpCardView`, `quantity?: number`.

**Calculs runtime dans le composant** :
- Charge thèmes rarity/edition/frame/faction/chain via `mvpCardTheme.ts`.
- Détermine `isFullArt` (`edition === FULL_ART`).
- Détermine numéro imprimé :
  - priorité `card.cardNumber`,
  - fallback `S01-${setOrder pad}`,
  - sinon footer `TMP-${fallbackIndex}`.
- Génère `cardText` fallback si absent (`symbol + faction + chain + owned copies`).

**Injection style** :
- Passe une map de CSS variables inline (`--mvp-accent`, `--mvp-bg`, `--mvp-frame-shell`, `--mvp-footer`, etc.) sur `<article class="mvp-premium-card">`.
- Ces variables pilotent gradients, border, glow, foil, textbox/footer tone.

**Zones rendues** :
1. Overlay FX : `mvp-card-noise`, `mvp-card-gloss`.
2. Header : nom + symbole + chips rarity/edition.
3. Art shell : glow + image token (`img`) ou placeholder `MCG`.
4. Textbox : flavour text ou fallback string.
5. Footer : card code, set meta, compteur supply.

### Influence de la rareté
- `getRarityTheme` fournit accent, glow, border, badge, foil, frame gradients, ornament.
- Rareté change la couleur d’accent et donc la plupart des variables visuelles (bordure, halo, shimmer, séparateurs).

### Influence de l’édition
- `getEditionTheme` fournit treatment, sheen, textBox, footer et label display.
- `FULL_ART` déclenche classe `mvp-full-art` qui augmente la taille de l’image et modifie le fond art-shell.

### Image / texte / footer
- Image placée dans `.mvp-card-art-shell`, centrée, `object-fit: contain`, ratio 1:1.
- Texte dans `.mvp-card-textbox p` avec line clamp (2 lignes desktop, 1 ligne très petit mobile).
- Footer en grid 3 colonnes + séparateurs verticaux pseudo-elements.

---

## 5. DIFFÉRENCES ENTRE CONTEXTES

### Pack opening (auth)
- API : `/api/pack/open`.
- Source : DB (controlled emission, supply réelle).
- Output : `pulledCardsMvp`.
- UI : reveal séquentiel modal (`pack-reveal-grid`, cartes face/back).

### Collection (auth)
- API : `/api/me`.
- Source : DB ownership agrégée + mapping token master.
- Output : `mvpCollection`.
- UI : grille filtrable search/faction.

### Guest
- Source : `sessionStorage` + tirage local token-master (pas de DB ownership, pas de vraie supply).
- API guest renvoie état recalculé (`state`) et `pulledCardsMvp`.
- UI de rendu carte identique (toujours `MvpCardTile`), pipeline data différent.

### Reward/Admin
- Endpoint interne admin peut distribuer des packs reward.
- En `GRANT_AND_OPEN`, pipeline identique à l’auth pack DB-native, avec `pulledCardsMvp` renvoyé.
- En `GRANT_ONLY`, pas de rendu carte immédiat (pas de cartes ouvertes).

---

## 6. LAYOUT / DIMENSIONS / LAYERS

### Dimensions / ratio
- Reveal slot dimensionne la carte avec `--slot-width` et `height = slot-width * 1.4`.
- Le style « bloc principal carte » apparaît défini explicitement surtout sous le sélecteur contextualisé `.reveal-slot-front .mvp-premium-card` :
  - `aspect-ratio: 63 / 88`,
  - `min-height: 342px`,
  - `grid-template-rows` strictes (header/art/text/footer).

### Positionnement interne
- Le layout interne est un `display: grid` sur la carte, zones séparées via classes `mvp-zone`, `mvp-card-header`, `mvp-card-art-shell`, `mvp-card-textbox`, `mvp-card-footer`.
- Plusieurs effets/layers sont en pseudo-elements (`::before`, `::after`) + overlays (`noise`, `gloss`, `art glow`, shimmer hover).

### Template strict vs flexible
- **Intention** : template relativement strict (zones fixes, ratio fixe, grid rows définies).
- **Réalité** : partiellement flexible parce que:
  - des dimensions critiques sont contextualisées dans `.reveal-slot-front .mvp-premium-card`,
  - le même composant en dehors du reveal dépend d’un style global de `.mvp-premium-card` non défini explicitement au niveau racine (hors media queries), ce qui peut créer des dérives inter-contexte.

### Où ça dérive
- Collection vs reveal n’ont pas le même conteneur CSS ; or la règle la plus structurante de `.mvp-premium-card` est scoped reveal.
- Responsive ajuste seulement `min-height/padding/gap` (media queries), pas un template complet indépendant de contexte.

---

## 7. POINTS FAIBLES / DETTES / LIMITES

### Ce qui marche bien
1. **Séparation identité vs inventaire** claire : token-master pour contenu carte, DB pour émission/ownership auth.
2. **DTO unique UI (`MvpCardView`)** partagé entre auth/guest/reward open, réduit la fragmentation front.
3. **Pipeline auth transactionnel** robuste (Serializable, vérif stock pack, vérif stock templates, incréments contrôlés).
4. **Thématisation centralisée** (`mvpCardTheme.ts`) propre pour rarity/edition/faction/chain.

### Fragilités structurelles
1. **Couplage slug DB ↔ token-master** (`findTokenMasterBySlug`) : toute dérive de slug casse mapping et peut générer 500 sur pack open auth.
2. **Projection collection triée par `displayName` UI-only** : pas de tri métier (rarity/order set), rendu perçu « catalogue web » plutôt que binder TCG.
3. **Guest pipeline non isomorphe auth** : rarity/edition tirées via poids statiques, `plannedSupply/issuedSupply = 0`, templateId synthétique ; comportement très différent de la réalité d’émission.
4. **Double logique collection auth/guest dans `collection/page.tsx`** (branches proches, duplication légère).

### Limites visuelles / rendu
1. **Règle structurante de carte scindée par contexte** : définition complète de `.mvp-premium-card` visible surtout sous `.reveal-slot-front .mvp-premium-card`.
2. **CSS global massif + héritage implicite** : difficile de garantir invariance parfaite du template entre surfaces.
3. **Mélange d’anciens styles carte (`.tcg-card`, `.vt-*`) et nouveau flux MVP** dans `globals.css`, ce qui augmente la dette cognitive et le risque de collisions.
4. **Composant encore “web card”** : texte fallback généré runtime, absence de grille print-grade stricte, pas de système de safe-zones/bleed/print-line indépendant du contexte conteneur.

### Ce qui explique les problèmes visuels actuels
- Architecture CSS essentiellement globale + sélecteurs contextualisés reveal.
- Pas de « card shell primitive » encapsulée avec dimensions/ratio invariants quel que soit le parent.
- Coexistence d’artefacts legacy dans la même feuille.

---

## 8. RECOMMANDATION TECHNIQUE

### Ce qu’il faut préserver
1. **Contrat `MvpCardView`** comme DTO pivot unique.
2. **Moteur d’émission auth DB-native** (pondération par supply restante + transaction Serializable).
3. **Séparation token-master (identité) / DB (ownership-stock)**.
4. **Theme maps rarity/edition/faction/chain** existantes (bonne base DA systémique).

### Ce qu’il faut refactorer
1. **Créer un layout de carte invariant** (base `.mvp-premium-card` non contextualisée reveal, ratio/rows/spacing source de vérité unique).
2. **Extraire styles carte hors `globals.css`** vers module dédié (ex: `mvp-card.css` / CSS module / tokens de layout) pour réduire effets de bord.
3. **Nettoyer legacy CSS non actif** (`.tcg-card`, `.vt-*` si réellement inutilisé) ou documenter explicitement leur statut.
4. **Harmoniser guest/auth DTO semantics** (au moins flags explicites “simulated”, supply semantics cohérentes) pour éviter ambiguïtés produit.
5. **Durcir mapping slug/token** (validation bootstrap + monitoring mismatch).

### Ordre recommandé d’amélioration
1. **Stabiliser le template CSS invariant** (pré-requis avant toute refonte visuelle).  
2. **Isoler/industrialiser tokens de layout + layers** (header/art/text/footer safe-zones).  
3. **Nettoyer dette CSS legacy + conventions de nommage**.  
4. **Ensuite seulement pousser la DA (textures, foil, animation) sur base stable**.  
5. **Enfin aligner guest simulation sur règles produit souhaitées** pour cohérence UX/runtime.

---

## Références runtime/doc utilisées
- Data/type/runtime/UI demandés dans le brief :
  - `data/token-master-50.json`
  - `types/cards.ts`, `types/session.ts`
  - `app/api/me/route.ts`, `app/api/pack/open/route.ts`, `app/api/guest/pack/open/route.ts`
  - `lib/serializers.ts`, `lib/domain/projections/collection.ts`, `lib/domain/acquisition/open-pack.ts`, `lib/domain/cards/token-master.ts`
  - `components/ui/MvpCardTile.tsx`, `components/ui/mvpCardTheme.ts`
  - `app/collection/page.tsx`, `app/packs/page.tsx`, `app/globals.css`
  - docs: `docs/cards-system-source-of-truth.md`, `docs/current-runtime-architecture.md`
