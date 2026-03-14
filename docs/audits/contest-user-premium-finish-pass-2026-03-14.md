# Contest User Premium Finish Pass

## 1. Current Gaps vs Premium Quality
- ce qui reste trop basique
  - hiérarchie des informations tournoi trop plate (hero + rail) et manque d’un bloc “stats” dense.
  - timeline lisible mais pas assez éditorialisée (phases sans contexte actionnable).
- ce qui reste trop vide
  - états pending (ranking/result) peu incarnés visuellement.
  - summary lineup trop fonctionnelle, pas assez “lineup command center”.
- ce qui manque en hiérarchie
  - manque de gradient d’attention entre hero → stats → builder → support rail.
  - rail droit peu priorisé autour de “what you can do now”.
- ce qui manque en sensation produit premium
  - composition encore correcte mais pas assez “tournament intelligence + roster assembly”.

## 2. Design Direction
- principes retenus
  - card-first, tournament-first, dense mais lisible.
  - surfaces cohérentes (borders/contrast/radius/shadows) dans un langage premium unique.
- composition retenue
  - Hero fort + timeline explicative + bloc stats dense + builder central + support rail décisionnel.
- logique UX retenue
  - décision rapide: phase active, action autorisée, deadline, état lineup et contexte reward visibles immédiatement.

## 3. Contest Detail Refactor
- nouveau layout
  - ajout d’une section `Tournament intelligence` sous timeline.
  - ré-ordonnancement du contenu: à gauche builder + résultat, à droite action panel + summary + reward + leaderboard.
- nouvelles sections
  - `ContestStatsGrid` (phase, entries, roster size, reward, starts/lock/ends, next milestone).
  - `ContestActionPanel` (editable/locked mode, readiness, countdown).
- hiérarchie visuelle
  - hero/timeline/stats/builder/rail harmonisés avec gradients contrôlés et états visuels nets.
- détails tournoi
  - informations clés visibles d’un coup d’œil (timing, phase, reward, entries, roster, état action).

## 4. Team Builder Refinement
- structure retenue
  - team builder central conservé, mais mieux encadré par contexte stats + action panel.
- interactions
  - flow slot -> selector modal conservé, avec lecture de readiness continue dans la rail.
- why this is better
  - l’utilisateur voit clairement: où il en est, ce qu’il peut faire, et combien de temps il reste.

## 5. Card Selector Refinement
- filtres
  - rareté + édition + recherche conservés.
- tri
  - tri par rareté / nom conservé pour sélection rapide.
- états
  - selected/locked/pending renforcés par style modal premium + focus visuel.
- confort d’usage
  - modal plus “deck builder room” (contraste, densité, grille lisible, feedback sélection).

## 6. Visual Cohesion
- comment les sections ont été harmonisées
  - mêmes fondations visuelles (surfaces, bordures, glow subtils, micro-contrastes, typographies).
- comment la page gagne en cohérence
  - progression claire: Hero -> Timeline -> Stats -> Builder -> Rail décisionnelle.
  - less noise, plus de contexte utile à chaque zone.

## 7. Files Modified
- `app/contests/[contestId]/page.tsx` — composition page, intégration stats/action panels.
- `components/contests/ContestStatsGrid.tsx` — nouvelle section stats tournoi premium.
- `components/contests/ContestActionPanel.tsx` — nouvelle section actionability user.
- `components/contests/ContestProgressTimeline.tsx` — timeline enrichie avec hints phase.
- `components/contests/LineupSummaryPanel.tsx` — summary plus premium et informative.
- `components/contests/LeaderboardCard.tsx` — pending/result states plus qualitatifs.
- `components/contests/ContestRewardPreview.tsx` — reward panel enrichi.
- `app/globals.css` — passe de finition premium globale (layout, hierarchy, visual cohesion).

## 8. Final Verdict
- est-ce que la page atteint maintenant un niveau premium ?
  - Oui, avec une composition plus éditée, dense et lisible, orientée décision tournoi.
- qu’est-ce qui a été amélioré précisément ?
  - hiérarchie, clarté d’action, qualité des pending states, cohérence visuelle inter-sections, lisibilité des stats.
- en quoi l’expérience se rapproche d’un standard fantasy / TCG premium ?
  - par une page card-first + tournament intelligence, une rail actionnable, et une narration visuelle claire des phases de contest.
