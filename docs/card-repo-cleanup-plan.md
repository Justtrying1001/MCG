# MCG — Plan de nettoyage du repo cartes
Status: CLEANUP-PLAN


## 1. Objectif du nettoyage

Rendre le repo cartes lisible et opérable **sans refonte** en séparant explicitement:

- le noyau runtime réel (ce qui fait tourner les cartes aujourd’hui),
- le legacy/prototype (historique non branché),
- les docs/specs (référence, pas exécution),
- les zones de responsabilité mélangée.

Objectif opérationnel: permettre à une équipe de répondre immédiatement à “où agir” et “où ne pas agir” avant toute refonte cartes.

---

## 2. Noyau runtime à sanctuariser

Shortlist minimale à considérer comme cœur runtime cartes (à rendre explicite et protégée):

- Data source runtime:
  - `mcg_base_cards.json`
  - `mcg_projects.json`
  - `mcg_card_variants.json`
- Chargement/hydratation/transformation:
  - `lib/cards.ts`
  - `types/cards.ts`
- Transport API/serialization:
  - `app/api/me/route.ts`
  - `lib/serializers.ts`
  - `app/api/pack/open/route.ts`
- Transport front + rendu live:
  - `components/useSession.ts`
  - `components/ui/CardFrame.tsx`
  - `app/globals.css` (section renderer cartes `.mcg-*`)
  - `app/collection/page.tsx`
  - `app/packs/page.tsx`
  - `app/combats/page.tsx`

Actions de sanctuarisation (sans refactor):

1) Ajouter une doc “runtime-card-core” qui liste ce périmètre en tête de `docs/`.
2) Ajouter un marquage explicite dans docs: “toute évolution runtime cartes commence ici”.
3) Interdire mentalement les investigations “au hasard” hors de cette shortlist pour les incidents runtime cartes.

---

## 3. Legacy / archives à isoler

Périmètre legacy cartes à isoler clairement:

- `components/MvpApp.tsx`
- dossier `mvp/`:
  - `mvp/main.js`
  - `mvp/index.html`
  - `mvp/styles.css`
  - `mvp/README.md`

Constat:

- Fichiers liés aux cartes historiquement.
- Non branchés au runtime App Router actuel.
- Génèrent une fausse impression d’existence de 2e moteur cartes.

Plan d’isolation (progressif):

- Étape documentation immédiate: les marquer “legacy non-runtime” dans docs.
- Étape ultérieure: déplacer vers un dossier d’archive (`archive/legacy-mvp/`) ou tagger explicitement par convention de nommage.
- Étape finale (optionnelle): suppression différée uniquement après validation d’absence de besoin interne.

---

## 4. Docs / specs à reclasser

Docs cartes actuellement mélangées (audit, spec cible, pipeline futur, direction UX):

- `docs/card-system-audit-v1.md`
- `docs/card-system-v1-production-spec.md`
- `docs/card-pipeline-v1-semi-generatif.md`
- `docs/ux-redesign-spec.md`
- `docs/card-repo-audit-forensic.md`
- `docs/card-repo-audit-table.md`

Problème:

- Coexistence de documents runtime-forensic et documents vision/chantier sans séparation explicite.
- Risque de lire une spec future comme si elle pilotait le runtime actuel.

Reclassement recommandé (sans réécriture de fond):

1) Créer une taxonomie documentaire claire:
   - `docs/runtime-current/` (forensic + état réel)
   - `docs/future-specs/` (V1/pipeline/vision)
   - `docs/archive/` (anciens audits si obsolètes)
2) Ajouter en en-tête de chaque doc un badge statut:
   - `RUNTIME-CURRENT`, `VISION`, `SPEC-FUTURE`, `ARCHIVE`.
3) Ajouter un index `docs/cards-docs-index.md` avec colonne “pilote runtime ? oui/non”.

---

## 5. Fichiers trompeurs ou à centralité confuse

Fichiers qui brouillent la lecture runtime cartes:

1) `components/MvpApp.tsx`
- Semble être une app cartes active.
- En pratique: non branchée au runtime.

2) `mvp/*`
- Semble être une implémentation cartes exploitable.
- En pratique: prototype legacy hors flow Next actuel.

3) `docs/card-system-v1-production-spec.md` et `docs/card-pipeline-v1-semi-generatif.md`
- Semblent prescriptives pour l’implémentation actuelle.
- En pratique: docs chantier/futur.

4) `app/api/pve/run/route.ts`
- Semble endpoint PvE distinct.
- En pratique: alias vers `/api/pve/battle`.

5) `app/globals.css`
- Semble fichier de style homogène.
- En pratique: mélange styles app globaux + renderer cartes live + restes legacy potentiels.

6) `README.md`
- Base utile, mais peut induire en erreur sur certains points (variants flow, alias API) vs runtime réel observé.

---

## 6. Actions de nettoyage sûres immédiatement

Actions à faible risque exécutable maintenant (documentation/clarification):

1) Ajouter un “manifest noyau runtime cartes” dans `docs/`.
2) Ajouter un “manifest legacy cartes” listant explicitement `components/MvpApp.tsx` + `mvp/*`.
3) Ajouter un index docs avec statut runtime/futur/archive.
4) Ajouter des entêtes de statut en tête des docs cartes existantes.
5) Ajouter une note claire dans `README.md` vers la doc forensic pour “runtime actuel cartes”.
6) Ajouter une section “Card runtime boundaries” dans docs: runtime vs gameplay connexe vs docs vision.

Pourquoi c’est sûr:

- pas de changement fonctionnel,
- pas de déplacement de code,
- pas de suppression,
- réduction immédiate de l’ambiguïté.

---

## 7. Actions de nettoyage différées

Actions utiles mais à faire après clarification initiale:

1) Réorganiser physiquement la documentation en sous-dossiers (`runtime-current`, `future-specs`, `archive`).
2) Isoler les assets/fichiers legacy dans un dossier d’archive dédié.
3) Clarifier le chemin API PvE (`/api/pve/run` alias) via décision de compatibilité.
4) Scinder progressivement `app/globals.css` en blocs mieux bornés (sans changer le rendu).
5) Ajouter un mini schéma “card runtime path” maintenu au fil des évolutions.

---

## 8. Actions risquées / à confirmer

Actions à ne pas lancer sans vérification complémentaire:

1) Suppression de `components/MvpApp.tsx`.
- Risque: usage manuel/interne non détecté par imports statiques.

2) Suppression de `mvp/*`.
- Risque: dépendance d’onboarding interne ou démo historique.

3) Retrait de styles “legacy” dans `app/globals.css`.
- Risque: effet de bord sur des éléments encore utilisés indirectement.

4) Fusion/suppression d’endpoint alias `/api/pve/run`.
- Risque: clients externes ou scripts internes encore branchés dessus.

5) Changement des frontières de `lib/cards.ts` (multi-responsabilités).
- Risque: toucher le cœur runtime sans filet de tests dédié cartes.

Précondition obligatoire avant action risquée:

- validation d’usage (logs, recherche CI, scripts, check runtime),
- décision de compatibilité,
- rollback simple.

---

## 9. Ordre recommandé de nettoyage

Plan réaliste en étapes courtes:

### Étape 1 — Clarification immédiate (maintenant, faible risque)
- Publier manifest noyau runtime.
- Publier manifest legacy.
- Publier index docs runtime/futur/archive.
- Ajouter statuts explicites dans docs.

### Étape 2 — Structuration documentaire (après clarification)
- Réorganiser physiquement les docs par statut.
- Ajouter conventions de lecture (“start here”).

### Étape 3 — Isolation legacy (après audit complémentaire léger)
- Déplacer legacy dans `archive/` (sans suppression).
- Ajouter notice de non-runtime.

### Étape 4 — Réduction des ambiguïtés techniques (plus tard)
- Décider du statut de `/api/pve/run`.
- Élaguer styles legacy avec validation visuelle/régression.

### Étape 5 — Préparation refonte future (pendant pré-refonte)
- Poser les frontières stables runtime/data/render.
- Préparer backlog technique ciblé (sans implémenter la refonte).

---

## 10. Préparation du terrain pour la future refonte cartes

Ce plan prépare la suite sans lancer la refonte:

- Il fixe un **périmètre noyau incontestable**.
- Il retire le bruit principal (legacy/docs trompeuses) du chemin décisionnel.
- Il identifie les zones à haute densité de responsabilité (`lib/cards.ts`, `app/globals.css`, frontière type unique `BaseCard`) sans les casser maintenant.
- Il fournit un ordre d’exécution sûr, utile pour transformer plus tard une refonte en chantier maîtrisé plutôt qu’en big bang.

Résultat attendu après nettoyage:

- “ce qui fait foi runtime” devient évident,
- “ce qui est legacy/doc” devient explicite,
- les décisions de refonte futures partent d’un repo lisible, pas d’un terrain ambigu.
