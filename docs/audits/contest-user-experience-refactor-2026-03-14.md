# Contest User Experience Refactor

## 1. Audit of Current UX
- problèmes visuels
  - contest cards trop plates, hiérarchie faible, CTA secondaire peu visible.
  - détail contest avec blocs utiles mais sans storytelling lifecycle premium.
  - team builder majoritairement textuel, peu de visuels cartes.
- problèmes structurels
  - manque de distinction explicite entre statut technique backend et phase produit lisible user.
  - timeline user basée sur OPEN/LOCKED/LIVE/SETTLED sans phase End/Computing explicite.
- problèmes métier
  - lineup éditable uniquement avant première soumission (`OPEN && !userEntry`) : impossible de ré-éditer avant lock.
  - la soumission initiale figeait l'entrée trop tôt (entry `LOCKED` dès enter) au lieu d'un mode modifiable en phase OPEN.

## 2. Product Logic Clarification
- comportement attendu Open / Lock / Start / End / Result
  - OPEN: lineup librement modifiable, sauvegardable plusieurs fois.
  - TEAM_LOCK / START: lineup figée au lock.
  - END: fin de contest + computing/scoring.
  - RESULT: classement final visible.
- mapping statuts backend -> statuts user
  - OPEN -> Open.
  - LOCKED -> Team Lock / Start.
  - LIVE -> Live.
  - SETTLED -> Result.
  - End/Computing représenté dans la timeline UX comme phase intermédiaire explicite.

## 3. UI Refactor
- pages refondues
  - `/contests`: cards premium + featured hero plus marquant + badges de phase produit.
  - `/contests/[contestId]`: hero premium + actionability claire + timeline enrichie.
- composants refondus
  - `ContestTile`, `ContestHubHero`, `ContestHero`, `ContestProgressTimeline`, `TeamBuilder`, `LineupSlot`, `EligibleCardsPanel`, `CardSelectorModal`, `EnteredLineupPanel`, `LineupSummaryPanel`, `ContestResultPanel`.
- patterns UX retenus
  - slots fixes + galerie visuelle + modal de sélection (pattern hybride rapide + lisible).
  - rendu carte visuel (image + métadonnées rareté/édition/projet/set).
- justification
  - meilleure lecture immédiate: phase, action possible maintenant, urgence temporelle, état lineup.

## 4. Team Builder Rework
- ancien comportement
  - rendu très textuel, faible sensation TCG premium.
  - verrouillage logique après première soumission (pas d'ajustements avant lock).
- nouveau comportement
  - slots visuels avec art carte.
  - galerie visuelle de cartes éligibles + modal filtrable.
  - CTA “Save lineup” réutilisable en OPEN.
- logique d’édition / lock
  - OPEN: création OU mise à jour d'entrée autorisée.
  - LOCKED/LIVE/SETTLED: édition impossible côté UI et backend (contest non OPEN).

## 5. Functional Fixes
- corrections métier faites
  - `enterContestMvp` gère désormais l'upsert fonctionnel d'entrée en OPEN: 
    - première soumission = create `SUBMITTED`.
    - nouvelle soumission en OPEN = update rosterLocks + maintien éditabilité.
  - protection lock conflicts maintenue pour éviter les conflits inter-contests.
  - sécurité fee/quest: débit et progression appliqués uniquement sur première entrée.
- fichiers modifiés
  - `lib/domain/contests/runtime.ts`
  - `app/contests/[contestId]/page.tsx`
  - `app/api/contests/[contestId]/lineup-options/route.ts`
  - composants UI contest + nouveaux helpers lifecycle + nouveaux styles globaux.
- invariants préservés
  - scoring/snapshots/ranking/settlement non modifiés dans leur logique native.

## 6. Tests Added / Updated
- fichiers
  - `tests/contest-runtime-stateful-flow.test.ts` (updated for OPEN re-edit flow).
  - `tests/contest-entry-fee-runtime.test.ts` (validated unchanged).
- scénarios
  - OPEN = soumission initiale possible.
  - OPEN = re-soumission possible (lineup modifiable plusieurs fois).
  - scoring/settlement natifs inchangés.
- résultats
  - tests ciblés contest runtime pass.
  - typecheck pass.

## 7. Final Verdict
- l’expérience contest user est-elle maintenant premium et cohérente ?
  - Oui: refonte UI majeure orientée TCG premium (hero, cards, galerie visuelle, états d’action).
- le comportement team editable -> locked est-il correct ?
  - Oui: modifiable en OPEN, figé à partir de LOCKED.
- les statuts visibles reflètent-ils correctement le contest réel ?
  - Oui: mapping backend->UX clarifié, phase Team Lock/Start et Result explicites, End/Computing rendu visible dans timeline UX.
