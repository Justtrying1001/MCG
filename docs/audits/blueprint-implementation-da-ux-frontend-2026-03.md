# Blueprint d’implémentation frontend — Refonte DA / UX / Design System MCG

Date: 2026-03-13  
Scope: Frontend joueur uniquement (UI/UX/layout/styles/components).  
Hors scope: backend, API, logique métier packs/contests/cards, DB.

---

## 1) Ordre de refonte recommandé (exécutable)

## Ordre cible
1. **Design system foundations**
2. **Shell global**
3. **Home**
4. **Packs**
5. **Collection**
6. **Contests**
7. **Rewards**
8. **Profile**

## Justification opérationnelle

### 1) Design system foundations
- Sans tokens/primitives stables, les pages vont diverger et recréer la dette existante.
- Permet de retirer le hardcode CSS/inline dès le début.

### 2) Shell global
- `SiteShell` + styles globaux touchent toutes les pages (navigation, spacing, largeur max, densité).
- Corrige la première impression “dashboard” avant même la refonte écran par écran.

### 3) Home
- Plus gros impact perception DA (hub principal, vitrine de l’identité MCG).
- Sert de référence visuelle pour les autres écrans.

### 4) Packs
- Surface la plus émotionnelle (open/reveal) ; sécurise rapidement l’ADN TCG “cards first”.

### 5) Collection
- Cœur de la proposition de valeur collectible ; nécessite les composants cards stabilisés via Packs.

### 6) Contests
- Domaine plus complexe en composants; bénéficie des primitives + card patterns déjà migrés.

### 7) Rewards
- Dépend de patterns cards/states déjà posés (reward cards, progress, status).

### 8) Profile
- Dernière étape pour consolider la cohérence inter-pages et supprimer définitivement le style KPI-hub.

---

## 2) Mapping fichiers à modifier

## A. Fichiers existants à refactorer

### Fondations & shell
- `app/globals.css` → **à découper**, réduire legacy et migrer vers tokens/classes sémantiques.
- `app/design-system.css` → **à déprécier** (style contests clair incohérent), migrer vers nouvelles feuilles UI.
- `app/layout.tsx` → ajuster import order des nouvelles feuilles DS.
- `components/layout/SiteShell.tsx` → refonte nav/footer + suppression tonalité dashboard.

### Pages joueur
- `app/page.tsx` (Home)
- `app/packs/page.tsx`
- `app/collection/page.tsx`
- `app/contests/page.tsx`
- `app/rewards/page.tsx`
- `app/compte/page.tsx`

### UI partagée
- `components/ui/Button.tsx`
- `components/ui/Modal.tsx`
- `components/ui/CardZoomModal.tsx`
- `components/ui/ProgressBar.tsx`
- `components/ui/MvpCardTile.tsx`
- `components/ui/MvpCardTile.module.css`
- `components/ui/mvp-premium-card.css` (réduire effets permanents)

### Contests (composants existants à converger)
- `components/contests/ContestHero.tsx`
- `components/contests/ContestTile.tsx`
- `components/contests/ContestFiltersBar.tsx`
- `components/contests/ContestStatusBadge.tsx`
- `components/contests/LeaderboardCard.tsx`
- `components/contests/LineupSlot.tsx`
- `components/contests/CardSelectorModal.tsx`

### Rewards / Quests
- `components/quests/SocialQuestCard.tsx`
- `components/quests/MilestoneQuestCard.tsx`
- `components/quests/QuestCards.module.css`

## B. Nouveaux fichiers à créer

### Design system
- `styles/tokens.css`
- `styles/semantic.css`
- `styles/motion.css`
- `styles/layout.css`
- `styles/components.css`

### Primitives UI
- `components/ui/Surface.tsx`
- `components/ui/SectionHeader.tsx`
- `components/ui/StatusBadge.tsx`
- `components/ui/Chip.tsx`
- `components/ui/EmptyState.tsx`
- `components/ui/Drawer.tsx`

### Domain components (joueur)
- `components/home/HeroDrop.tsx`
- `components/home/RecentPullsRail.tsx`
- `components/home/RewardsMiniPanel.tsx`
- `components/packs/FeaturedPackStage.tsx`
- `components/packs/PackGallery.tsx`
- `components/packs/PackOddsDrawer.tsx`
- `components/collection/CollectionHeader.tsx`
- `components/collection/MissingCardsShelf.tsx`
- `components/contests/ContestHubHero.tsx`
- `components/rewards/RewardSpotlight.tsx`
- `components/profile/CollectorShowcase.tsx`

## C. Fichiers à supprimer / fusionner

- Fusionner les styles contests de `app/design-system.css` dans les nouvelles feuilles DS.
- Supprimer progressivement les styles inline dans pages joueur (cibles: `app/page.tsx`, `app/packs/page.tsx`, `app/rewards/page.tsx`, `app/compte/page.tsx`).
- Remplacer les classes legacy orientées “premium dashboard” par classes sémantiques DS.

---

## 3) Component architecture (nouveau système)

## 3.1 Primitives

### `Surface`
- **Rôle**: conteneur visuel standard (panel, card UI, shell block).
- **Props**: `variant: 'base'|'raised'|'highlight'|'danger'`, `padding`, `as`, `className`.
- **Variantes**: base/raised/highlight.
- **États**: hover/focus-visible/disabled.
- **Dépendances**: `tokens.css`, `semantic.css`.

### `SectionHeader`
- **Rôle**: titre + sous-titre + actions optional.
- **Props**: `eyebrow`, `title`, `subtitle`, `actions`.
- **Variantes**: `compact` / `default`.
- **États**: responsive collapse actions.

### `StatusBadge`
- **Rôle**: statut concours/quest/reward.
- **Props**: `tone: 'open'|'live'|'locked'|'settled'|'success'|'warning'|'danger'`, `size`.
- **Variantes**: sm/md.
- **États**: emphasis/live dot.

### `Chip`
- **Rôle**: filtres et tags.
- **Props**: `selected`, `onClick`, `icon`, `count`.
- **Variantes**: neutral/rarity.
- **États**: selected/hover/disabled.

### `Drawer`
- **Rôle**: infos secondaires (odds, règles, filtres avancés).
- **Props**: `open`, `onClose`, `side`, `title`.
- **États**: open/closing/reduced motion.

## 3.2 Layout components

### `PageContainer`
- **Rôle**: largeur max + gutters standard.
- **Props**: `size: 'default'|'wide'`.

### `PageHero`
- **Rôle**: section d’entrée visuelle page.
- **Props**: `media`, `content`, `actions`.

### `Rail`
- **Rôle**: listes horizontales (recent pulls, contests actifs).
- **Props**: `items`, `renderItem`.

## 3.3 Card-related components

### `MCGCardTile` (evolution de `MvpCardTile`)
- **Rôle**: affichage carte multi-contextes.
- **Props**: `card`, `variant: 'collection'|'contest'|'reward'|'zoom'`, `quantity`, `locked`, `interactive`.
- **États**: hover, selected, locked, revealed.
- **Dépendances**: rareté tokens + motion flip.

### `PackCard`
- **Rôle**: carte pack (galerie/store).
- **Props**: `pack`, `featured`, `soldOut`, `countdown`, `onOpen`.
- **États**: idle/hover/sold-out/opening.

## 3.4 Contest-related components

### `ContestCard`
- **Rôle**: item liste contests.
- **Props**: `contest`, `onEnter`, `onView`.
- **Variantes**: open/live/locked/settled.

### `TeamBuilder`
- **Rôle**: composer lineup visuellement.
- **Props**: `slots`, `selectedCards`, `onPick`, `onRemove`, `locked`.
- **États**: empty, partial, ready, locked.

### `LeaderboardList`
- **Rôle**: ranking simplifié.
- **Props**: `rows`, `highlightUserId`.
- **États**: me/podium/default.

## 3.5 Rewards-related components

### `RewardCard`
- **Rôle**: carte reward/quest.
- **Props**: `reward`, `status`, `progress`, `onClaim`.
- **États**: claimable, claimed, locked.

### `RewardSpotlight`
- **Rôle**: bloc top-priority “what to do now”.
- **Props**: `nextReward`, `nextAction`.

---

## 4) Page blueprint détaillé

## 4.1 Home (`app/page.tsx`)

### Structure finale (ordre)
1. `PageHero` (Hero Drop)
2. `RecentPullsRail`
3. `ActiveContestsRail`
4. `CollectionProgressBlock`
5. `RewardsMiniPanel`

### Composants utilisés
- `SectionHeader`, `PackCard`(featured), `ContestCard`, `MCGCardTile`, `ProgressBar`, `Surface`.

### Hiérarchie visuelle
- 60% hero visuel (pack + cartes)
- 40% informations/action.

### Interactions
- CTA principal unique: Open Pack.
- Quick actions en secondaire.
- Ticker remplacé par rail piloté (pas de loop infinie auto).

### Responsive
- Mobile: hero stack (media au-dessus), rails scroll-snap, actions full-width.

## 4.2 Packs (`app/packs/page.tsx`)

### Structure finale
1. `FeaturedPackStage`
2. `PackGallery`
3. `PackOddsDrawer` (déclenché sur action)
4. `RevealModal` (séquentiel)

### Composants
- `PackCard`, `Button`, `Modal`, `Drawer`, `MCGCardTile`, `StatusBadge`.

### Hiérarchie
- Pack/illustration dominante; données odds/supply en secondaire.

### Interactions
- Open -> tearing (court) -> reveal one-by-one.
- Fin reveal: actions “Open another / View Collection”.

### Responsive
- Drawer bottom-sheet mobile.
- Grille gallery 1/2/3 colonnes selon breakpoints.

## 4.3 Collection (`app/collection/page.tsx`)

### Structure finale
1. `CollectionHeader`
2. `FilterBar` (chips + search)
3. `CardGrid`
4. `MissingCardsShelf`
5. `CardZoomModal`

### Composants
- `Chip`, `SectionHeader`, `MCGCardTile`, `EmptyState`, `ProgressBar`.

### Hiérarchie
- Grille cartes dominante (70%).

### Interactions
- Filtre live.
- Toggle owned/all-set.
- Click carte -> zoom modal.

### Responsive
- Filters en drawer mobile.
- Grid minmax adaptatif.

## 4.4 Contests (`app/contests/page.tsx` + composants `components/contests/*`)

### Structure finale
1. `ContestHubHero`
2. `ContestList` (cards)
3. `ContestDetail` (2 colonnes)
4. `TeamBuilder`
5. `LeaderboardList`
6. `ResultsPanel`

### Composants
- `ContestCard`, `StatusBadge`, `TeamBuilder`, `LeaderboardList`, `Drawer` (rules).

### Hiérarchie
- Cards lineup/contest > chiffres.

### Interactions
- Entrée contest guided.
- États locked/live explicites.

### Responsive
- Detail collapse en sections accordéon mobile.

## 4.5 Rewards (`app/rewards/page.tsx`)

### Structure finale
1. `RewardSpotlight`
2. `QuestTabs`
3. `RewardCardGrid`
4. `MilestoneTrack`
5. `HistoryList` (section basse)

### Composants
- `RewardCard`, `ProgressBar`, `StatusBadge`, `EmptyState`.

### Hiérarchie
- “Prochaine récompense” prioritaire, ledger relégué en bas.

### Interactions
- Claim CTA clair.
- Milestones avec progression visible.

### Responsive
- Cartes rewards en single column mobile.

## 4.6 Profile (`app/compte/page.tsx`)

### Structure finale
1. `CollectorShowcase` (hero profil)
2. `FeaturedCardsStrip`
3. `SetCompletionSection`
4. `ContestAchievements`
5. `RecentResults`

### Composants
- `SectionHeader`, `MCGCardTile`, `ProgressBar`, `Surface`, `StatusBadge`.

### Hiérarchie
- Identité collectionneur > stats.

### Interactions
- Quick links vers Collection/Contests.

### Responsive
- Hero compact + strips horizontaux.

---

## 5) Design system execution layer (prêt à coder)

## 5.1 Tokens globaux
- Fichier: `styles/tokens.css`
- Contient: couleurs raw (Ink/Clay/Slate/Chalk/Fog), spacing 8pt, radius, shadows, z-index, breakpoints.

## 5.2 Tokens sémantiques
- Fichier: `styles/semantic.css`
- Mapping:
  - `--color-bg-page`, `--color-surface-1`, `--color-border-subtle`, `--color-text-primary`, `--color-accent-primary`.
- Rareté: `--color-rarity-*`.
- États: `--color-state-success/warn/error/info`.

## 5.3 UI components
- Fichier: `styles/components.css`
- BEM léger ou utility namespaced (`mcg-btn`, `mcg-badge`, `mcg-card`, `mcg-tab`).

## 5.4 Variants
- Buttons: `primary`, `secondary`, `ghost`, `danger`.
- Badges: `status-*`, `rarity-*`.
- Surfaces: `base`, `raised`, `highlight`.

## 5.5 States
- `:hover`, `:active`, `:focus-visible`, `[aria-disabled=true]`, `.is-locked`, `.is-selected`, `.is-revealed`.

## 5.6 Responsive rules
- Breakpoints:
  - `--bp-sm: 640px`
  - `--bp-md: 860px`
  - `--bp-lg: 1120px`
  - `--bp-xl: 1280px`
- Container max width 1280.
- Sections stack sous `md`.

---

## 6) Motion implementation plan

## 6.1 Animations à garder
- Pack reveal (tearing + flash)
- Card flip reveal
- Rarity highlight court
- Reward unlock short accent

## 6.2 Animations à supprimer
- Ticker scroll infini auto
- Glows/pulses permanents décoratifs
- Shimmer permanent sur panels
- Multiples animations concurrentes en above-the-fold

## 6.3 Placement
- Motion uniquement sur actions utilisateur ou événements significatifs (open, reveal, claim).
- Pas d’animation d’ambiance continue au chargement global.

## 6.4 Timings
- Hover: 120–180ms
- Reveal item: 250–420ms
- Séquence reveal pack: 700–1000ms
- Drawer/modal open: 180–240ms

## 6.5 Reduced motion
- `styles/motion.css` inclut:
  - `@media (prefers-reduced-motion: reduce)`
  - désactivation loops
  - transitions réduites à minimum

---

## 7) Risk map (refonte)

1. **Incohérences visuelles résiduelles**
   - Risque: mélange ancien/nouveau styles.
   - Mitigation: migration par feature flags CSS + suppression sections legacy par lot.

2. **Dette CSS persistante**
   - Risque: `globals.css` monolithique continue à surcharger.
   - Mitigation: split `styles/*` + ordre d’import strict dans `app/layout.tsx`.

3. **Pages encore trop dashboard**
   - Risque: conservation des blocs KPI historiques.
   - Mitigation: checklist “cards-first” en PR review (section 8).

4. **Doublons composants**
   - Risque: coexistence anciens `Contest*` et nouveaux wrappers.
   - Mitigation: matrice de remplacement + dépréciation explicite.

5. **Conflits tokens vs hardcodes inline**
   - Risque: variations couleurs/spacing.
   - Mitigation: ESLint custom rule/grep CI sur styles inline critiques.

6. **Régression responsive**
   - Risque: sections hero complexes cassées mobile.
   - Mitigation: snapshots viewport (mobile/tablet/desktop) par page.

---

## 8) Acceptance checklist finale

## Cards first / illustration dominance
- [ ] Chaque page place un visuel carte/pack dominant dans le first fold.
- [ ] La hiérarchie respecte ~60/40 visuel/UI (sauf Rewards tolérance 50/50).

## Suppression KPI excessifs
- [ ] Home/Profile n’ont plus de grilles KPI dominantes en tête.
- [ ] Odds/règles détaillées sont secondaires (drawer/modal/collapse).

## Cohérence tokens
- [ ] Toutes couleurs proviennent des tokens Ink/Clay/Slate/Chalk/Fog + états.
- [ ] `app/design-system.css` legacy contest est retiré ou neutralisé.

## Motion propre
- [ ] Aucune loop décorative permanente above-the-fold.
- [ ] Motion uniquement contextuelle (reveal/flip/claim/status).
- [ ] `prefers-reduced-motion` validé sur les pages joueur.

## Responsive
- [ ] Home/Packs/Collection/Contests/Rewards/Profile validés en 360, 768, 1280.
- [ ] Navigation mobile + drawers fonctionnels.

## Cohérence inter-pages
- [ ] Même grammaire de composants (Surface, SectionHeader, Badge, Chip, Button).
- [ ] Ton visuel homogène “TCG collectible”, sans sous-thème dashboard.

---

## 9) Sprinting recommandé (facultatif mais exécutable)

- **Sprint A (1 semaine)**: DS foundations + Shell global.
- **Sprint B (1 semaine)**: Home + Packs.
- **Sprint C (1 semaine)**: Collection + Profile.
- **Sprint D (1 semaine)**: Contests + Rewards + motion final + cleanup legacy CSS.

Livrable final: frontend joueur cohérent DA MCG, sans changement backend.
