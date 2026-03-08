# MCG — Cleanup executed

## 1. Scope

Ce cleanup exécute uniquement des suppressions à forte confiance de bruit/legacy **sans toucher au noyau runtime cartes**.

Périmètre d’action:
- suppression de prototype legacy non branché,
- suppression d’un document d’audit ancien redondant,
- mise à jour documentaire minimale pour refléter les suppressions.

## 2. Files deleted

- `components/MvpApp.tsx`
- `mvp/main.js`
- `mvp/index.html`
- `mvp/styles.css`
- `mvp/README.md`
- `docs/card-system-audit-v1.md`

## 3. Why each deleted file was removed

- `components/MvpApp.tsx`
  - Aucun import runtime détecté.
  - Ancien renderer/flux MVP non branché à l’App Router live.

- `mvp/main.js`, `mvp/index.html`, `mvp/styles.css`, `mvp/README.md`
  - Prototype standalone legacy hors runtime Next actuel.
  - Aucun branchement au flux cartes live (`/collection`, `/packs`, `/combats`).

- `docs/card-system-audit-v1.md`
  - Audit ancien devenu redondant avec les documents plus récents et structurants:
    - `docs/card-repo-audit-forensic.md`
    - `docs/card-repo-audit-table.md`
    - `docs/card-runtime-core.md`
    - `docs/card-repo-cleanup-plan.md`

## 4. Files intentionally kept

Conservés volontairement (utiles comme référence claire du terrain actuel/futur):

- `docs/card-repo-audit-forensic.md`
- `docs/card-repo-audit-table.md`
- `docs/card-repo-cleanup-plan.md`
- `docs/card-repo-cleanup-actions.md`
- `docs/card-runtime-core.md`
- `docs/card-legacy-map.md`
- `docs/cards-docs-index.md`
- `docs/card-system-v1-production-spec.md`
- `docs/card-pipeline-v1-semi-generatif.md`
- `docs/ux-redesign-spec.md`

## 5. Files still ambiguous

Fichiers conservés par prudence (ambiguïté d’utilité future):

- `docs/card-system-v1-production-spec.md` (spec future potentiellement utile à la refonte)
- `docs/card-pipeline-v1-semi-generatif.md` (piste future, non runtime)
- `docs/ux-redesign-spec.md` (vision design non runtime)
- `app/api/pve/run/route.ts` (alias API potentiellement consommé hors front actuel)
- zones legacy potentielles dans `app/globals.css` (nettoyage risqué sans vérification visuelle dédiée)

## 6. Runtime core confirmed untouched

Confirmation explicite: aucun fichier du noyau runtime cartes n’a été supprimé ou modifié structurellement:

- `lib/cards.ts`
- `types/cards.ts`
- `lib/serializers.ts`
- `app/api/me/route.ts`
- `app/api/pack/open/route.ts`
- `components/useSession.ts`
- `components/ui/CardFrame.tsx`
- `app/globals.css`
- `app/collection/page.tsx`
- `app/packs/page.tsx`
- `app/combats/page.tsx`
- `mcg_base_cards.json`
- `mcg_projects.json`
- `mcg_card_variants.json`

## 7. Remaining cleanup candidates for later

Candidats différés (non exécutés ici):

- Décision explicite sur `app/api/pve/run/route.ts` (maintien alias vs décommission).
- Nettoyage CSS legacy potentiel dans `app/globals.css` après audit visuel/régression.
- Rationalisation documentaire future specs/vision si une politique d’archive est décidée.
