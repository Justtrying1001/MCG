# Plan complet de refonte DA / UX / Design System — MCG

Date: 2026-03-13  
Auteur: Design Direction + Product Design + Frontend Architecture  
Périmètre: Frontend joueur uniquement (`/`, `/packs`, `/collection`, `/contests`, `/rewards`, `/compte`).

---

## 1) Vision DA MCG

### Signature visuelle cible
MCG doit devenir une **galerie TCG vivante**, où l’interface sert les cartes au lieu de les encadrer comme des lignes de données.

**Piliers émotionnels:**
- **Illustration first**: la carte est l’objet désiré.
- **Collectible charm**: plaisir de compléter, de chasser, de montrer.
- **TCG energy**: hiérarchie de rareté lisible, tension de reveal, satisfaction de pull.
- **Internet culture maîtrisée**: ton mémétique intelligent, jamais gimmick.
- **Dark base élégante**: Ink Deep + texture organique subtile, pas “premium fintech”.

### Objectif d’expérience
Transformer MCG de “dashboard de gestion de cartes” vers “**jeu de collection moderne**” en conservant la logique backend existante.

---

## 2) Principes design fondamentaux

1. **Cards First**  
   Toute page a une zone héro dédiée aux cartes/packs/illustrations.
2. **Illustration Dominant**  
   Les artworks dominent la lecture avant les métriques.
3. **Minimal UI Panels**  
   Réduire drastiquement les blocs KPI persistants.
4. **Collectible Energy**  
   Badges rareté, progression de set, cartes manquantes traitées comme objectifs désirables.
5. **Reveal Moments**  
   Les interactions critiques (open/flip/reward unlock) sont théâtrales mais rapides.
6. **Emotion > Data**  
   Les chiffres sont secondaires, contextualisés, jamais centre de gravité.
7. **Consistency over novelty**  
   Un seul langage visuel transversal sur toutes les pages.

---

## 3) Anti-patterns à bannir

- Layouts type **SaaS dashboard** (grilles KPI multi-cartes en haut de page).
- UI “crypto/fintech premium” (sur-gradients, halos permanents, verre décoratif).
- Densité data en first fold (odds détaillées, stats agressives, tables frontales).
- Motion décorative continue (shimmer loop, glow perpétuel, pulse partout).
- Multiplication de sous-thèmes visuels (ex: pages crème vs pages dark).

---

## 4) Architecture UX complète (inspirée Sorare, adaptée MCG)

## 4.1 Home (Hub)
**Objectif utilisateur:** comprendre le drop actif et entrer immédiatement dans la boucle de jeu.  
**Émotion recherchée:** excitation + promesse de collection.

**Contenu principal (ordre):**
1. Hero Drop (pack vedette + CTA Open Pack)
2. Recent Pulls (activité communautaire visuelle)
3. Active Contests (cartes contest compactes)
4. Collection Progress (set completion + missing highlights)
5. Rewards Available (quêtes actives)

**Contenu secondaire:** stats compte minimales, news patch/drop.

**Hiérarchie:**
- 60% visuel (pack/cards)
- 40% UI/infos

**Interactions clés:**
- Hover pack: micro-lift + foil hint
- CTA principal unique “Open Pack”
- Quick links secondaires sobres

## 4.2 Packs
**Objectif utilisateur:** ouvrir rapidement, ressentir la tension du tirage.  
**Émotion:** rituel + suspense + gratification.

**Contenu principal:**
1. Featured Pack (très grand, visuel dominant)
2. Pack Gallery (autres packs / états sold-out)
3. Open CTA sticky dans viewport
4. Reveal flow (flip séquentiel)

**Contenu secondaire:**
- Détails odds en drawer/modal (pas en surface principale)
- Disponibilité / countdown / stock simplifié

**Interactions clés:**
- Open → tearing → reveal sequence
- Click card to flip one-by-one
- End state: “Add to Collection” / “Open another”

## 4.3 Collection
**Objectif utilisateur:** contempler, trier, compléter.  
**Émotion:** fierté + envie de compléter.

**Contenu principal:**
1. Collection Header visuel (set identity + completion)
2. Filtres compacts (rarité, édition, faction, recherche)
3. Card Grid dominante
4. Missing Cards Strip (objectifs de chase)
5. Card Focus Modal

**Contenu secondaire:** métriques Owned/Unique en format discret.

**Interactions clés:**
- Multi-filters instantanés
- Zoom carte fullscreen
- Toggle “Owned only / All set (with missing placeholders)”

## 4.4 Contests
**Objectif utilisateur:** engager son équipe et suivre le ranking.  
**Émotion:** compétition lisible + tension contrôlée.

**Contenu principal:**
1. Contest Hub banner (featured live)
2. Contest Card list (état, timing, reward teaser)
3. Contest detail
4. Team builder centré cartes
5. Leaderboard simplifié
6. Results + rewards

**Contenu secondaire:** règles détaillées en collapse/drawer.

**Interactions clés:**
- Compose lineup via card selection visuelle
- Locked state explicite
- Post-settlement CTA vers rewards

## 4.5 Rewards
**Objectif utilisateur:** comprendre “quoi faire maintenant” et ressentir les gains.  
**Émotion:** progression et satisfaction.

**Contenu principal:**
1. Reward spotlight (prochaine récompense visuelle)
2. Quests list (priorisées)
3. Milestones track
4. Reward claims / unlock moments

**Contenu secondaire:** ledger historique en section basse.

## 4.6 Profile
**Objectif utilisateur:** afficher son identité collectionneur.  
**Émotion:** statut + personnalisation.

**Contenu principal:**
1. Collector hero (avatar, tagline, set favori)
2. Featured cards (vitrine personnelle)
3. Completion by set
4. Contest achievements

**Contenu secondaire:** stats compte en mini-modules (pas hub KPI dominant).

---

## 5) Design System TCG (prêt à implémenter)

## 5.1 Tokens (fondation)

### Couleurs
```css
:root {
  --ink-deep: #0F1419;
  --ink-mid: #1B232C;
  --ink-light: #263240;

  --clay: #C4715A;
  --slate: #8FA1B3;
  --chalk: #E9F2FF;
  --fog: #B8C4CC;

  --success: #6FBF8F;
  --warning: #E3B05F;
  --danger: #D86D6D;

  --rarity-common: #9BA8A3;
  --rarity-uncommon: #6B8F71;
  --rarity-rare: #5C7A8B;
  --rarity-epic: #8B7FAB;
  --rarity-legendary: #D4A84B;
  --rarity-mythic-start: #6EE7FF;
  --rarity-mythic-end: #D8A6FF;
}
```

### Typographie
- **Display / titres forts:** Barlow Condensed (700–900)
- **UI / texte:** Inter (400–700)
- **Meta / codes / chiffres:** JetBrains Mono (400–600)

### Radius
- Button: 4px
- Input/Filter chip: 8px
- Panel/Card UI: 8px
- Modal/Drawer: 12px
- Pack/Card showcase: 14–16px

### Spacing (base 8)
- `space-1: 8`, `space-2: 16`, `space-3: 24`, `space-4: 32`, `space-5: 48`, `space-6: 64`

### Grid/layout
- Max content width: 1280px
- Page paddings: 24px mobile / 48px desktop
- Section gap: 48–80px

### Surfaces & texture
- Base: `ink-deep`
- Panels: `ink-mid`
- Borders: `fog` alpha 12–18%
- Texture: paper/noise opacity 3–6% max

## 5.2 Composants principaux

1. **MCGCardTile** (collection / contest / reward variants)
2. **PackCard** (featured / standard / sold-out)
3. **ContestCard** (open/live/locked/settled)
4. **RewardCard** (claimable/claimed/locked)
5. **Buttons** (primary clay, secondary ghost, tertiary text)
6. **Tabs** (pill minimal)
7. **Filters** (chips + compact selects)
8. **Badges** (rarité, statut, timer)
9. **ProgressBar** (set completion / quest progress)
10. **Modal** (reveal, card zoom, reward details)
11. **Drawer** (odds, advanced filters, rule details)
12. **Tooltip** (micro-infos)
13. **Navigation** (global nav + mobile drawer)

## 5.3 États visuels
- **hover:** elevation légère, border + fog/clay accent
- **active:** border accent + fond légèrement relevé
- **locked:** opacité réduite + lock icon + texte explicite
- **reward:** halo court au claim (non permanent)
- **rare/legendary/mythic:** codification couleur + frame treatment progressive

---

## 6) Motion System (simple, calibré)

## Motion autorisée
1. Pack reveal (tearing + flash court + flip séquentiel)
2. Card flip (250–420ms)
3. Rarity highlight (pulse court à la découverte)
4. Reward unlock (accent transitoire 500–900ms)

## Motion à éviter
- Loops décoratives constantes (shimmer permanent, glows infinis)
- Particules/confettis hors moments exceptionnels
- Animations concurrentes sur plusieurs zones de la page

## Timing standards
- Hover: 120–180ms
- Navigation transition: 160–220ms
- Reveal macro: 700–1000ms total
- Micro-feedback: 150–260ms

## Accessibilité
Ajouter un profil motion réduit:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 7) Écrans conceptuels détaillés (4 pages clés)

## 7.1 Concept Home

### Structure UI
1. **Top Nav** (logo + 6 entrées + profil compact)
2. **Hero Drop Section**
   - Col gauche: titre drop, set name, CTA principal
   - Col droite: visuel pack XXL + 2 cartes vedettes
3. **Active Contests Rail** (3 cards)
4. **Collection Progress Block**
   - Completion ring
   - 5 cartes manquantes “chase now”
5. **Recent Pulls Ticker (non-loop infini)**
6. **Rewards Available mini-list**

### Hiérarchie visuelle
- Illustration/packs: 60%
- UI info/actions: 40%

## 7.2 Concept Packs

### Structure UI
1. **Featured Pack Stage**
   - Pack image hero
   - CTA Open
   - Stock + countdown compacts
2. **Pack Gallery**
   - Grid de packs (future drops inclus)
3. **Pack Detail Drawer**
   - Odds par rareté
   - Contenu exact
4. **Reveal Experience Modal**
   - Progression `1/5 ... 5/5`
   - Flip séquentiel
   - End actions

### Hiérarchie visuelle
- Pack/art: 65%
- Métadonnées: 35%

## 7.3 Concept Collection

### Structure UI
1. **Collection Hero Header**
   - Profil collectionneur
   - Completion set courant
2. **Filter Rail compact**
3. **Card Grid immersive**
4. **Missing Cards Shelf**
5. **Card Modal fullscreen**
   - Artwork dominant
   - Meta rareté/édition/footer

### Hiérarchie visuelle
- Cards/illustration: 70%
- Contrôles/panels: 30%

## 7.4 Concept Contests

### Structure UI
1. **Contest Hub Hero** (featured contest live)
2. **Contest List** (cards état + reward teaser)
3. **Contest Detail Layout 2 colonnes**
   - Gauche: team builder cartes
   - Droite: leaderboard + timing + actions
4. **Results State**
   - podium simplifié
   - claim reward CTA

### Hiérarchie visuelle
- Cards/team visuals: 60%
- HUD/infos: 40%

---

## 8) Hiérarchie visuelle par écran (règle 60/40)

| Écran | Illustration area | Card focus | UI panels | Navigation | Secondary info |
|---|---:|---:|---:|---:|---:|
| Home | 60% | Très forte | Faible | Stable | Moyenne |
| Packs | 65% | Très forte | Faible-moyenne | Stable | Moyenne |
| Collection | 70% | Maximale | Faible | Stable | Moyenne |
| Contests | 60% | Forte | Moyenne | Stable | Moyenne |
| Rewards | 50% | Moyenne | Moyenne | Stable | Moyenne |
| Profile | 55% | Forte | Faible-moyenne | Stable | Moyenne |

Règle d’or: **si une zone ne renforce pas la valeur de collection ou la décision d’action, elle est secondaire ou déplacée.**

---

## 9) Plan d’implémentation (frontend only)

## Phase 1 — Design System Foundations
- Créer `tokens.css` (palette/radius/spacing/typography/shadows)
- Migrer styles hardcodés vers tokens
- Introduire primitives: Surface, SectionHeader, Badge, Chip

**Livrables:** base DS, lint visuel, mapping tokens validé.

## Phase 2 — Layouts globaux
- Refonte `SiteShell` (nav/footer/containers)
- Unification fonds/surfaces/texture
- Normalisation grille responsive

**Livrables:** shell cohérent sur toutes pages.

## Phase 3 — Pages principales
- Refonte Home, Packs, Collection, Contests, Rewards, Profile
- Réduction KPI visibles
- Promotion zones illustration/cards

**Livrables:** pages alignées DA + UX target.

## Phase 4 — Polish UI
- Harmonisation badges/états/empty states
- Microcopy orientée collection/chase
- Accessibilité contraste/focus

**Livrables:** pass de cohérence complet.

## Phase 5 — Motion
- Motion tokens (durées/easing)
- Simplification animations
- Intégration `prefers-reduced-motion`

**Livrables:** motion calibrée, non bruitée, conforme accessibilité.

---

## 10) Mapping direct audit -> actions

1. “Trop dashboard premium” -> Refonte Home/Profile vers card-led layout.  
2. “Cartes pas assez centrales” -> Règle 60/40 + sections visuelles obligatoires.  
3. “Palette non alignée” -> Token refactor Ink/Clay/Chalk/Fog.  
4. “Motion trop décoratif” -> suppression loops non critiques + reduced-motion.  
5. “Incohérence styles globaux” -> un seul thème sombre TCG, suppression sous-thèmes divergents.

---

## 11) Critères d’acceptation (Definition of Done Design)

- Les 6 pages cœur suivent la hiérarchie 60/40.
- Les cartes/packs sont visuellement prioritaires above the fold.
- Les tokens DA (Ink/Clay/Slate/Chalk/Fog) sont la seule base couleur UI.
- Aucun bloc KPI massif n’est prioritaire sur Home/Profile/Rewards.
- Motion critique uniquement (reveal/flip/reward), loops décoratives supprimées.
- `prefers-reduced-motion` supporté.
- Ton visuel perçu “TCG collectible fun” par revue design interne.

---

## 12) Conclusion

Ce plan permet une transformation **sans toucher au backend**: la boucle produit reste intacte, mais l’expérience bascule vers une identité MCG réellement collectible, illustrée et désirable.  
Cible finale: un produit perçu comme **jeu de cartes moderne**, pas comme outil de gestion de cartes.
