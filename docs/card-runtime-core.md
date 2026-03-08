# MCG — Card Runtime Core

## 1. Purpose

Ce document est le point d’entrée **start here** pour comprendre le runtime cartes actuel.
Il liste uniquement ce qui pilote réellement la donnée carte et son rendu live.

## 2. Current runtime chain

`mcg_base_cards.json` + `mcg_projects.json` + `mcg_card_variants.json`
→ `lib/cards.ts` (hydrate/enrich/cache)
→ `app/api/pack/open/route.ts` (pull cards) et `app/api/me/route.ts` + `lib/serializers.ts` (collection)
→ `components/useSession.ts` (transport front)
→ `app/collection/page.tsx`, `app/packs/page.tsx`, `app/combats/page.tsx`
→ `components/ui/CardFrame.tsx`
→ styles `.mcg-*` dans `app/globals.css`.

## 3. Runtime-critical files

- Data source:
  - `mcg_base_cards.json`
  - `mcg_projects.json`
  - `mcg_card_variants.json`
- Data runtime:
  - `lib/cards.ts`
  - `types/cards.ts`
- API / serialization:
  - `app/api/me/route.ts`
  - `lib/serializers.ts`
  - `app/api/pack/open/route.ts`
- Front transport / rendering:
  - `components/useSession.ts`
  - `components/ui/CardFrame.tsx`
  - `app/globals.css` (bloc renderer cartes)
  - `app/collection/page.tsx`
  - `app/packs/page.tsx`
  - `app/combats/page.tsx`

## 4. Secondary runtime files

- PvE connexe cartes (pas renderer principal):
  - `lib/pve/*`
  - `app/api/pve/battle/route.ts`
  - `app/api/pve/run/route.ts` (alias)
- Infra app autour du runtime cartes:
  - `components/layout/SiteShell.tsx`
  - `app/layout.tsx`
  - `prisma/schema.prisma`

## 5. What is NOT runtime

- Legacy/prototype supprimé:
  - `components/MvpApp.tsx` (retiré)
  - `mvp/*` (retiré)
- Docs/specs:
  - `docs/card-system-v1-production-spec.md`
  - `docs/card-pipeline-v1-semi-generatif.md`
  - `docs/ux-redesign-spec.md`
  - autres docs `docs/` non importées dans le code runtime.

## 6. Where to start reading

Ordre recommandé:

1. `lib/cards.ts`
2. `types/cards.ts`
3. `lib/serializers.ts`
4. `app/api/me/route.ts`
5. `app/api/pack/open/route.ts`
6. `components/useSession.ts`
7. `components/ui/CardFrame.tsx`
8. `app/globals.css` (renderer cartes)
9. `app/collection/page.tsx`
10. `app/packs/page.tsx`
11. `app/combats/page.tsx`

## 7. Notes / caveats

- Ce document ne propose **aucune refonte**.
- Ce document sert à clarifier l’existant, pas à redéfinir l’architecture cible.
- Des usages dynamiques non détectés statiquement restent possibles; les suppressions doivent rester différées et validées.
