# MCG — Annexe tableau forensic cartes
Status: AUDIT


| Fichier | Catégorie | Rôle | Utilisé par le runtime ? | Où / comment il est branché | Niveau d’importance | Observation | Action recommandée |
|---|---|---|---|---|---|---|---|
| `lib/cards.ts` | runtime critique | Chargement JSON, hydratation, enrichissement visuel, tirage pack | oui | Importé par `/api/pack/open`, `lib/serializers`, PvE | très élevé | Point d’entrée data cartes runtime | garder mais clarifier |
| `types/cards.ts` | runtime critique | Type `BaseCard` transversal | oui | Utilisé par components, hooks, PvE | très élevé | Source de type partagée data/UI/gameplay | garder mais clarifier |
| `lib/serializers.ts` | transport/api | Construit payload user+collection depuis DB | oui | Appelé par `/api/me` | élevé | Joint `UserCard` -> `BaseCard` hydratée | garder |
| `app/api/me/route.ts` | transport/api | Endpoint session+collection | oui | Consommé par `useSession` | très élevé | Flux principal vers front cartes | garder |
| `app/api/pack/open/route.ts` | transport/api | Ouverture pack + persistance + retour pulled cards | oui | Appelé par page packs | très élevé | Produit des cartes révélées front | garder |
| `components/useSession.ts` | runtime critique | Hook transport front `/api/me` | oui | Utilisé par `SiteShell`, `collection`, `packs`, `combats`, `compte` | élevé | Point d’entrée front de la collection | garder |
| `components/ui/CardFrame.tsx` | render/style | Renderer carte live | oui | Utilisé par `collection`, `packs`, `combats` | très élevé | Renderer de vérité actuel | garder |
| `app/globals.css` | render/style | Styles globaux + styles renderer `.mcg-*` | oui | Chargé globalement par `app/layout.tsx` | très élevé | Contient aussi du style non central/legacy | garder mais clarifier |
| `app/collection/page.tsx` | runtime critique | Vue collection cartes | oui | Route `/collection` | élevé | Consomme `me.collection[].card` + `CardFrame` | garder |
| `app/packs/page.tsx` | runtime critique | Vue ouverture/reveal cartes | oui | Route `/packs` | élevé | Consomme `/api/pack/open` + `CardFrame` | garder |
| `app/combats/page.tsx` | runtime secondaire | Vue sélection équipe PvE avec cartes | oui | Route `/combats` | élevé | Rend les cartes mais logique majoritairement gameplay | garder |
| `mcg_base_cards.json` | data source | Source brute cartes | oui | Chargée par `lib/cards.ts` | très élevé | Dataset principal cartes | garder |
| `mcg_projects.json` | data source | Métadonnées projet (fallback enrichissement) | oui | Chargée par `lib/cards.ts` | élevé | Enrichit image/faction/chain/rank | garder |
| `mcg_card_variants.json` | data source | Variantes + poids drop + variant default | oui | Chargée par `lib/cards.ts` | élevé | Utilisée malgré README “no variants flow” | garder mais clarifier |
| `prisma/schema.prisma` | gameplay connexe | Modèle persistance inventaire/ouvertures/PvE | indirectement | DB utilisée par routes API | élevé | Ne définit pas le rendu cartes | garder |
| `lib/pve/executeBattle.ts` | gameplay connexe | Pipeline battle PvE + consommation cartes sélectionnées | indirectement | Appelé par `/api/pve/battle` | moyen | Connexe cartes, pas renderer | garder |
| `lib/pve/generateEnemyTeam.ts` | gameplay connexe | Génération équipe ennemie depuis base cards | indirectement | Appelé par `executeBattle` | moyen | Utilise `getBaseCards` | garder |
| `lib/pve/simulateBattle.ts` | gameplay connexe | Simulation combat | indirectement | Appelé par `executeBattle` | moyen | Pure gameplay | garder |
| `lib/pve/serializeBattle.ts` | transport/api | Serializer payload battle | indirectement | Appelé par `executeBattle` | moyen | Pas lié au rendu carte principal | garder |
| `lib/pve/types.ts` | gameplay connexe | Types battle/team | indirectement | Importé dans PvE front/back | moyen | Reprend sous-ensemble de `BaseCard` | garder |
| `lib/pve/constants.ts` | gameplay connexe | Constantes PvE | indirectement | Importé modules PvE | faible | Non central cartes | garder |
| `lib/pve/helpers.ts` | gameplay connexe | Helpers simulation/power | indirectement | Importé par simulateBattle | faible | Connexe | garder |
| `lib/pve/availability.ts` | gameplay connexe | Validation sélection équipe/tickets | indirectement | Importé par executeBattle | faible | Connexe | garder |
| `lib/pve/rewards.ts` | gameplay connexe | Calcul récompenses PvE | indirectement | Importé par executeBattle | faible | Connexe progression | garder |
| `lib/pve/reset.ts` | gameplay connexe | Reset journalier PvE/exhaustion | indirectement | Importé par `/api/me`, `executeBattle` | moyen | Impacte état cartes disponibles PvE | garder |
| `app/api/pve/battle/route.ts` | transport/api | Endpoint PvE battle | indirectement | Appelé par page combats | moyen | Cartes en entrée/sortie battle, pas renderer | garder |
| `app/api/pve/run/route.ts` | redondant | Alias API vers `/api/pve/battle` | indirectement | Re-export de `POST` | faible | Redondance de chemin | surveiller |
| `components/layout/SiteShell.tsx` | runtime secondaire | Shell app + auth + nav | indirectement | Encapsule pages | moyen | Transporte `useSession`, pas logique carte | garder |
| `app/layout.tsx` | runtime secondaire | Root layout + import CSS global | indirectement | Entrée app router | moyen | Nécessaire pour styles cartes via globals | garder |
| `app/compte/page.tsx` | runtime secondaire | Vue profil (stats, pas renderer cartes) | indirectement | Route `/compte` | faible | Utilise `useSession` seulement | garder |
| `app/page.tsx` | runtime secondaire | Home marketing | non | Route `/` | faible | Ne consomme pas runtime cartes réelles | ignorer pour le runtime |
| `components/MvpApp.tsx` | potentiellement mort | Ancien mini-app cartes (renderer `renderCard`) | probablement non | Aucun import détecté | nul runtime | Donne impression d’un second système | archiver plus tard |
| `mvp/main.js` | potentiellement mort | Prototype frontend legacy | non | Hors app Next live | nul runtime | Bruit historique | archiver plus tard |
| `mvp/index.html` | potentiellement mort | Entrée prototype legacy | non | Hors app Next live | nul runtime | Non branché au runtime actuel | archiver plus tard |
| `mvp/styles.css` | potentiellement mort | Styles prototype legacy | non | Hors app Next live | nul runtime | Non appliqué au runtime Next | archiver plus tard |
| `mvp/README.md` | docs/spec | Doc prototype MVP | doc uniquement | Dossier prototype | faible | Référence historique | documenter |
| `docs/card-system-audit-v1.md` | docs/spec | Audit précédent + constats | doc uniquement | Non importé/exécuté | nul runtime | Peut sembler prescriptif | documenter |
| `docs/card-system-v1-production-spec.md` | docs/spec | Spec V1 cible | doc uniquement | Non importé/exécuté | nul runtime | Vision future, pas runtime | documenter |
| `docs/card-pipeline-v1-semi-generatif.md` | docs/spec | Pipeline futur semi-génératif | doc uniquement | Non importé/exécuté | nul runtime | Chantier/ambition | documenter |
| `docs/ux-redesign-spec.md` | docs/spec | Direction UX/UI | doc uniquement | Non importé/exécuté | nul runtime | Orientation design | documenter |
| `README.md` | docs/spec | Scope MVP + routes annoncées | doc uniquement | Racine repo | moyen | Légère divergence avec runtime (variants/alias API) | garder mais clarifier |
| `app/api/pve/run/route.ts` + `README.md` | trompeur | Legacy path mentionné et maintenu en alias | indirectement | Alias seulement | faible | Peut faire croire à 2 runtimes PvE | garder mais clarifier |
