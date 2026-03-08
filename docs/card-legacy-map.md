# MCG — Card Legacy Map

## 1. Purpose

Lister explicitement les éléments cartes legacy/prototype pour éviter qu’ils soient confondus avec le runtime actuel.

## 2. Legacy files identified

- `components/MvpApp.tsx` (supprimé dans ce cleanup)
- `mvp/main.js` (supprimé dans ce cleanup)
- `mvp/index.html` (supprimé dans ce cleanup)
- `mvp/styles.css` (supprimé dans ce cleanup)
- `mvp/README.md` (supprimé dans ce cleanup)

## 3. Why they are not part of current runtime

- `components/MvpApp.tsx` n’était pas branché dans les pages App Router actuelles.
- `mvp/*` était un prototype séparé, hors du flow runtime Next.js live.
- Le rendu cartes actif passe par `CardFrame` + `app/globals.css` + pages `collection/packs/combats`, pas par ces fichiers.

## 4. Caution before deletion

- Ne pas supprimer sans vérification complémentaire (usage interne, démos, onboarding).
- Privilégier d’abord le marquage documentaire “legacy non-runtime”.
- Toute suppression éventuelle doit être planifiée séparément et validée.

## 5. Future archival candidates

Candidats d’archivage futur (sans action physique immédiate):

- Aucun candidat immédiat supplémentaire après suppression exécutée.

Statut recommandé actuel: conserver ce document comme trace de cleanup legacy exécuté.
