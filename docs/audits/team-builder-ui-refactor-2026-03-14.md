# Team Builder UI Refactor

## 1. Audit UI actuel
- Le team builder n'était pas centré sur les vraies cartes MCG.
- Les slots donnaient une sensation de formulaire plutôt que de construction d'équipe tournoi.
- La hiérarchie visuelle du builder vs sidebar était trop faible.
- Le modal de sélection était utile mais pas assez orienté deck-building (filtres incomplets / densité visuelle faible).

## 2. Composants cartes réutilisés
- Réutilisation explicite de `MvpCardTile` (composant premium utilisé en pack opening / collection).
- Mapping `LineupOption -> MvpCardView` via `components/contests/lineupCardMapper.ts`.
- Le builder, les slots, la galerie bench et le modal utilisent désormais la même base visuelle carte que le reste du produit.

## 3. Nouveau layout
- Détail contest structuré en 2 colonnes nettes :
  - gauche = Hero + timeline + team builder (focus principal)
  - droite = lineup summary + leaderboard + reward + actions
- Team builder centré sur une grille de 5 slots cartes (horizontal desktop), responsive mobile.
- Placeholders stylisés “Add card” quand slot vide.

## 4. UX team builder
- Clic slot -> ouverture modal de sélection.
- Modal enrichi avec :
  - recherche
  - filtre rareté
  - filtre édition
  - tri (rareté / nom)
- Galerie “Bench / available cards” sous le builder pour sélection rapide.
- Statuts d’action conservés (editable en OPEN, verrouillé hors OPEN) sans modification du moteur contest.

## 5. Fichiers modifiés
- `components/contests/LineupCardTile.tsx`
- `components/contests/LineupSlot.tsx`
- `components/contests/CardSelectorModal.tsx`
- `components/contests/EligibleCardsPanel.tsx`
- `components/contests/TeamBuilder.tsx`
- `components/contests/lineupCardMapper.ts`
- `app/globals.css`

## 6. Résultat final
- Le Team Builder ressemble maintenant à une UI tournoi TCG/fantasy : cartes réelles MCG, focus lineup, lecture claire des slots, sélection visuelle premium.
- Cohérence visuelle avec pack opening et collection assurée par l’usage de `MvpCardTile`.
- Aucune logique scoring/snapshot/settlement modifiée.
