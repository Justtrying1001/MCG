# Audit complet de conformité DA / UI / UX — MCG

Date: 2026-03-13  
Scope: Frontend joueur (`/`, `/packs`, `/collection`, `/contests`, `/rewards`, `/compte`) + design system global + motion/reveal.

## 1) Executive summary

**Verdict global:** **Partiellement conforme (plutôt non conforme sur l’ADN visuel).**  
**Gravité globale:** **Élevée (P0/P1).**

Le site respecte plusieurs briques fonctionnelles produit (packs, collection, contests, rewards, profile) et des patterns de base cohérents (navigation, composants réutilisés, état vide, modals). En revanche, le rendu visuel et tonal tombe souvent dans une logique **dashboard premium sombre / KPI-first**, au lieu d’un univers **TCG collectible fun + illustration-first**.  
Les écarts les plus critiques concernent: 
- la base de tokens/couleurs (palette « Obsidian/Carbon/Graphite + red/gold »),
- la surcharge métrique sur des pages censées célébrer l’objet carte,
- un motion system trop chargé en loops et effets continus,
- l’absence de garde-fou `prefers-reduced-motion`.

---

## 2) MCG DA principles recap (référentiel)

Principes de référence extraits des docs DA (Brand Guidelines, UI/UX Direction, Motion & Reveal, Card System, Pack System):

1. **Cards first**: la carte est héroïne, l’illustration domine, l’UI s’efface.
2. **Ton MCG**: fun, collectible, énergie TCG, culture internet/meme intégrée avec tact.
3. **Base visuelle**: fond **Ink Deep**, hiérarchie sobre Ink Mid / Ink Light + Clay/Slate/Chalk/Fog.
4. **Texture**: organique subtile (papier/noise) ~3–6%, jamais décorative agressive.
5. **Anti-patterns**: éviter rendu SaaS / crypto dashboard / dark premium froid.
6. **Pack UX**: galerie de packs illustrés, théâtralité calibrée, signaux de disponibilité clairs.
7. **Collection UX**: binder digital, plaisir de complétion, cartes manquantes, focus card.
8. **Motion UX**: reveal lisible, rapide, au service de l’illustration; peu de bruit gratuit; hiérarchie de rareté lisible; respect accessibilité motion.

---

## 3) Audit global

## Ce que le site respecte bien

- L’architecture produit des pages clés est présente et exploitable (Home, Packs, Collection, Contests, Rewards, Profile). 
- Les flows cœur (ouvrir pack, révélation séquentielle, zoom carte, filtres collection, onglets rewards/contests) sont implémentés. 
- Il existe une intention TCG explicite dans les copywriting (binder, pull, reveal, rarity). 
- Les composants de base sont globalement cohérents (boutons, tabs, empty states, badges, modals).

## Ce qui trahit la DA

- **Positionnement tonal assumé “Premium Dark-Modern”** au lieu de “fun collectible TCG”.
- **Palette globale divergente** des tokens DA cibles (Ink Deep/Clay/Chalk…).
- **Multiplication de panneaux KPI/stats** qui prennent la vedette vs cartes/illustrations.
- **Surusage de gradients/effets lumières** donnant une signature “premium dashboard” plus que “galerie TCG”.
- **Peu de place dédiée à l’illustration réelle** sur plusieurs zones héro (icônes/emoji/metrics remplacent souvent l’art).

## Hors direction

- Contest surfaces de `design-system.css` utilisent des **fonds clairs crème** de type “sketch dashboard”, en forte rupture avec la base sombre Ink Deep.
- Home hero communique “Own the rarest / Dominate” dans une tonalité “performance & dominance” plus froide que “collection joy + charm”.

## Incohérences transversales

- Double système visuel: `globals.css` sombre premium + `design-system.css` clair crème (contest), ce qui casse l’unité.
- Répétition de styles inline (gradients, bordures, cards stats) qui contourne les tokens.
- Motion dispersé (nombreux keyframes/animations permanentes), sans stratégie de réduction du mouvement.

---

## 4) Audit écran par écran

## Home (`/`)
- **Conformité DA:** moyenne-faible.
- **Conformité UX:** bonne (on comprend vite l’accès packs/collection/contests/rewards).
- **Hiérarchie cards-first:** faible à moyenne (beaucoup de blocs UI vs vraies cartes).
- **Ton visuel:** trop “premium dark dashboard”.
- **Motion:** riche mais parfois décoratif.
- **Note qualitative:** **C-**

Constats clés:
- Hero orienté “Premium Dark-Modern TCG” avec slogan domination/perf.
- Beaucoup de sections “feature panels / quick actions / progress strips” à logique produit-SaaS.
- Présence de cartes mockées mais peu d’illustration expressive dominante en hero.

## Packs (`/packs`)
- **Conformité DA:** moyenne.
- **Conformité UX:** bonne sur le flow d’ouverture.
- **Hiérarchie cards-first:** moyenne (pack/révélation présents) mais info panels très forts.
- **Ton visuel:** mi TCG, mi tableau de bord (odds, supply, rates très exposés).
- **Motion:** reveal séquentiel intéressant; effets additionnels parfois trop nombreux.
- **Note qualitative:** **B-**

Constats clés:
- Bon point: image officielle de booster et modal reveal séquentielle.
- Écart: bloc latéral “live supply / transparent odds / rates table” prend une place majeure (ressenti analytics).

## Collection (`/collection`)
- **Conformité DA:** moyenne.
- **Conformité UX:** bonne (filtres, tri, zoom, empty states).
- **Hiérarchie cards-first:** moyenne à bonne dans la grille, faible dans l’en-tête stats.
- **Ton visuel:** trop utilitaire/management de données en haut.
- **Motion:** sobre (correct).
- **Note qualitative:** **B**

Constats clés:
- Bon: galerie de cartes cliquable + modal zoom.
- Écart: en-tête “Owned/Unique/Completion/Filtered” + batterie de filtres dense donne un rendu gestionnaire plutôt que binder émotionnel.

## Contests (`/contests`)
- **Conformité DA:** faible.
- **Conformité UX:** correcte (tabs, featured, cards contest).
- **Hiérarchie cards-first:** faible (contest cards = info blocks sans ancrage illustration).
- **Ton visuel:** dashboard compétitif classique.
- **Motion:** pulses/live bars répétitifs.
- **Note qualitative:** **C**

Constats clés:
- Le contenu est lisible mais très KPI/état (entries/roster/lock-at) et peu “cartes au centre”.
- Le style alternatif clair crème (dans DS contest) casse l’identité globale.

## Rewards / Quests (`/rewards`)
- **Conformité DA:** moyenne-faible.
- **Conformité UX:** bonne (tabs, progression, historique).
- **Hiérarchie cards-first:** faible (quasi absence de récompense-objet mise en scène).
- **Ton visuel:** mission dashboard.
- **Motion:** light, acceptable, mais pas de dramaturgie reward.
- **Note qualitative:** **C+**

Constats clés:
- Fonctionnellement solide.
- Visuellement, les récompenses ressemblent à des points/entrées de ledger, pas à des moments de gratification collectible.

## Profile (`/compte`)
- **Conformité DA:** faible.
- **Conformité UX:** bonne (progression lisible).
- **Hiérarchie cards-first:** faible.
- **Ton visuel:** page analytics/stats hub.
- **Motion:** limité.
- **Note qualitative:** **C**

Constats clés:
- Dominante “stats hub cards” (Account/Collection/Competitive), achievements, résultats récents.
- Faible sensation “galerie personnelle de collectionneur”.

---

## 5) Audit design system

## Tokens & palette
- Le système global utilise `--bg-base/#0B0B0D`, `--bg-1`, `--bg-2`, `--red`, `--gold`, etc.  
- Cette base n’exprime pas clairement les tokens nommés DA (Ink Deep/Ink Mid/Clay/Slate/Chalk/Fog) et entretient un biais dark-premium.

## Surfaces / radius / spacing
- Structure globalement propre et régulière.
- Mais nombreux gradients/panneaux qui renforcent un rendu tech premium.

## Composants partagés
- Boutons/modals/filtres sont stables.
- Plusieurs composants sont “UI panels first” au lieu de “art/card first”.

## Hardcodes / incohérences
- Beaucoup de styles inline (borders, gradients, opacités) => dilution du DS.
- `design-system.css` contest introduit une direction claire crème en contradiction avec le reste.

Verdict DS: **socle solide techniquement, non aligné artistiquement**.

---

## 6) Audit motion / reveal

## Conforme
- Reveal de pack séquentiel lisible.
- Quelques transitions courtes et compréhensibles.

## Non conforme / risqué
- Trop de loops simultanées (ticker, pulse, shimmer, glow, floating, live bars) sur plusieurs surfaces.
- Effets décoratifs parfois autonomes, pas toujours au service de la carte/illustration.
- **Absence de `prefers-reduced-motion`**: non conformité accessibilité et philosophie motion calibrée.

Verdict motion: **intention présente, orchestration à simplifier fortement**.

---

## 7) Top 10 écarts critiques

1. Positionnement visuel “Premium dark-modern” explicite au lieu de “fun collectible TCG”.
2. Palette/tokens non arrimés explicitement aux tokens DA de référence.
3. Dominance KPI/stats sur Home, Profile, Rewards, Contests.
4. Conflit majeur de direction visuelle entre `globals.css` (sombre premium) et `design-system.css` contest (crème clair).
5. Home hero insuffisamment centré illustration/carte héroïne.
6. Packs: surpoids des données odds/supply vs théâtralité visuelle du pack.
7. Collection: header trop analytics, pas assez binder émotionnel/completion charm.
8. Rewards: récompenses vécues comme “points ledger”, pas “objets reward”.
9. Motion trop bruitée (trop de loops), hiérarchie des cues de rareté brouillée.
10. Absence de `prefers-reduced-motion`.

---

## 8) Priorisation

## P0 — Non conforme à l’ADN MCG
- Recentrer le ton visuel global (abandonner le framing dark-premium / domination).
- Ré-aligner la palette et tokens sur Ink Deep + Ink Mid/Clay/Slate/Chalk/Fog.
- Réduire radicalement le poids des panneaux KPI au profit des cartes/illustrations.
- Supprimer incohérence majeure contest “crème clair” vs DA globale.

## P1 — Fort manque de cohérence
- Recomposer Home, Profile, Rewards avec narratif collectionneur + cartes en hero.
- Rebalancer Packs: plus galerie visuelle, moins tableau d’odds en permanence.
- Rationaliser motion (moins de loops, plus de cues contextuels).

## P2 — Polish
- Unifier radii/ombres/badges via tokens uniques.
- Réduire hardcodes inline.
- Améliorer microcopy pour ton meme-culture plus chaleureux.

---

## 9) Recommandations concrètes

1. **Refonte token layer** (global CSS): renommer et réaligner variables sur nomenclature DA (Ink/Clay/Slate/Chalk/Fog), puis mapper toutes surfaces via tokens.
2. **Home hero**: remplacer le bloc message “premium dominance” par un hero orienté “drop + illustration + collectible delight”; limiter KPI visibles above-the-fold.
3. **Packs**: déplacer odds détaillées en panneau secondaire (drawer/modal), conserver en surface principale la face pack + CTA + disponibilité.
4. **Collection**: transformer le header stats en bandeau discret, renforcer la sensation binder (sections set/rarity, placeholders cartes manquantes plus émotionnels).
5. **Contests**: intégrer davantage les cartes lineup dans les cards concours; réduire densité de chiffres dans les vignettes liste.
6. **Rewards**: scénariser la récompense (objet/badge/card reward) avant le ledger.
7. **Profile**: transformer “stats hub” en “collector gallery profile” (featured cards, set completion showcases).
8. **Motion cleanup pass**: inventorier toutes animations, ne garder que celles qui supportent reveal, rareté, feedback action.
9. **Accessibilité motion**: ajouter couche `@media (prefers-reduced-motion: reduce)` pour neutraliser loops/non essentielles.
10. **Cohérence style**: éliminer les styles inline fréquents au profit de classes DS versionnées.

---

## 10) Verdict final

**Le site actuel n’est pas vraiment aligné avec la DA MCG.**  
Il est **fonctionnellement solide**, mais **artistiquement dérivé** vers une esthétique dashboard premium sombre (et parfois crème “sketch”), au lieu d’une expérience TCG collectible centrée illustration/carte.

---

## Bonus — Quick wins DA

- Retirer immédiatement le wording “Premium Dark-Modern TCG”.
- Réduire de 30–50% les cartes KPI visibles sur Home/Profile.
- Uniformiser contests sur base sombre Ink Deep.
- Diminuer loops animées visibles en continu (ticker/glow/pulse non critiques).
- Mettre une “featured card strip” illustrée réelle sur Home et Profile.

## Bonus — Structural refactors needed

- Refonte DS tokens + surfaces.
- Re-design de Home/Profile/Rewards autour du modèle “illustration first”.
- Re-orchestration motion globale (système centralisé + reduced-motion).
