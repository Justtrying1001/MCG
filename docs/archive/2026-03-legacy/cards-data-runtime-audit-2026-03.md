# 1. INVENTAIRE DES FICHIERS

## 1.1 Data files (cartes/templates/packs)

| Chemin | Type | Statut estimé | Description |
|---|---|---|---|
| `mcg_base_cards.json` | json | transitoire (actif UI + guest + bridge auth) | Catalogue massif de base cards (5692 entrées), utilisé pour guest draw, rendering UI et mapping `baseCardId` côté auth runtime. |
| `mcg_card_variants.json` | json | transitoire | Métadonnées variants/dropWeight legacy (8221 entrées), consommées par `lib/cards.ts` (guest + hydration UI). |
| `mcg_projects.json` | json | transitoire | Métadonnées projet/token (5692 entrées), utilisées pour enrichissement visuel/chains/faction dans `lib/cards.ts`. |
| `MCG_Set1_Edition1_v3.csv` | csv | incertain (non branché runtime) | Dataset éditorial 50 cartes (prompts/art direction). Aucune lecture runtime détectée. |
| `mcg_projects.json` + `mcg_base_cards.json` + `mcg_card_variants.json` | json (trio) | pivot legacy critique | Triple source legacy pour construire `BaseCard` et le rendu de carte; forte dépendance transverse UI/API. |

## 1.2 Prisma / seed / data-model

| Chemin | Type | Statut estimé | Description |
|---|---|---|---|
| `prisma/schema.prisma` | prisma | actif + hybride | Modèles cibles (`CardTemplate`, `OwnedCardInstance`, `PackDefinition`, `PackOpeningEvent`) + legacy (`UserCard`, `PackOpening`). |
| `prisma/seed-mvp-controlled-emission.mjs` | seed | actif | Bootstrap controlled-emission (50 tokens, 5 raretés, 5 éditions, 1250 templates, packs SALE/REWARD). |

## 1.3 Backend runtime (cartes/packs)

| Chemin | Type | Statut estimé | Description |
|---|---|---|---|
| `lib/domain/acquisition/open-pack.ts` | ts runtime | actif critique | Ouverture pack auth DB-native: sélection pondérée par `remainingSupply`, `issuedSupply++`, `OwnedCardInstance`, `PackOpeningEvent`, dual-write legacy. |
| `lib/domain/acquisition/constants.ts` | ts | actif | Codes canonisés `mvp_sale_pack` / `mvp_reward_pack`. |
| `lib/domain/acquisition/pack-foundations.ts` | ts | legacy/transitoire | Helper déprécié d’ensemencement bridge; non utilisé dans runtime auth actuel. |
| `lib/domain/cards/template-metadata.ts` | ts | transitoire critique | Extracteur `baseCardId` depuis `CardTemplate.metadata`; point de couplage fort DB→JSON. |
| `lib/cards.ts` | ts | transitoire critique | Lecture JSON, hydration card, tirage pondéré local `openBasePack` (guest), lookup `getCardsMap` utilisé aussi côté auth pour réponse payload. |
| `lib/serializers.ts` | ts | transitoire | Construit payload user collection via `baseCardId` + `cardsMap`; fallback legacy si pas d’instances. |
| `lib/domain/projections/collection.ts` | ts | actif hybride | Projection v2 template-aware mais expose aussi `byBaseCard` via metadata legacy. |
| `app/api/pack/open/route.ts` | api | actif | Endpoint auth branché sur `openSalePackMvpDbNative`. |
| `app/api/guest/pack/open/route.ts` | api | actif (local-only) | Endpoint guest, tirage `openBasePack(getBaseCards())`, hors inventaire DB controlled-emission. |
| `app/api/me/route.ts` | api | actif hybride | Read-model user: instances v2 first, fallback `UserCard`/`PackOpening`, sérialisation via JSON cards map. |
| `app/api/contests/[contestId]/lineup-options/route.ts` | api | actif | Expose `baseCardId` depuis `cardTemplate.metadata` pour lineup UI. |
| `lib/domain/contests/runtime.ts` | ts runtime | actif | Entrée contest verrouille `OwnedCardInstance`; settlement rewards peut référencer packs/points. |

## 1.4 Frontend/UI dépendant des données cartes

| Chemin | Type | Statut estimé | Description |
|---|---|---|---|
| `app/packs/page.tsx` | ui | actif avec incohérence | UX ouverture + odds statiques hardcodées (2/8/20/30/40), non synchronisées au draw runtime remainingSupply. |
| `app/collection/page.tsx` | ui | actif hybride | Affiche `me.collection` (baseCard-centric) + quelques métriques `coexistence.v2`. |
| `components/ui/CardFrame.tsx` | ui | actif dépendance legacy | Rendu fondé sur `BaseCard` (ATK/DEF/SPD/CTRL, variant, chain art), pas sur contrat template DB pur. |
| `types/cards.ts` | types | actif legacy-oriented | Contrat `BaseCard` riche (stats PvE-ish + variant flags) qui drive UI et payloads. |

## 1.5 Tests pertinents

| Chemin | Type | Statut estimé | Description |
|---|---|---|---|
| `tests/open-pack-runtime.test.ts` | test | actif | Vérifie invariants de débit points, stock pack, supply template, événements, dual-write. |
| `tests/bootstrap-seed-validation.test.ts` | test | actif | Valide dry-run seed controlled emission (comptages attendus). |
| `tests/api-me-read-model.test.ts` | test | actif | Vérifie priorité v2 + fallback legacy dans `/api/me`. |

## 1.6 Docs pertinentes

| Chemin | Type | Statut estimé | Description |
|---|---|---|---|
| `README.md` | doc | actif | Vue repo + routes + modèle; mentionne économie/ledger/quests et docs index. |
| `docs/README.md` | doc index | actif | Oriente lecture des docs (runtime truth vs historical). |
| `docs/current-runtime-architecture.md` | doc runtime | actif | Décrit architecture live, y compris controlled-emission auth et coexistence legacy. |
| `docs/mcg-pivot-product-foundation.md` | doc produit | actif (intent) | Spécifie cible produit (50×5×5, 16k packs, controlled emission). |
| `docs/reward-system-audit-2026-03.md` | doc audit ciblé rewards | actif partiel | Scope rewards/quests; peu de profondeur sur cartes/data canonique. |
| `docs/repo-cartography-2026-03.md` | doc cartographie | historique | Snapshot architecture large, contient hypothèses historiques (warning ajouté). |
| `docs/mvp-controlled-emission-transformation.md` | doc transfo | historique | Plan pré-implémentation controlled emission (warning ajouté). |
| `docs/repo-and-docs-consolidation-audit-2026-03.md` | doc audit transversal | actif récent | Audit global repo/docs; couvre moins profondément la gouvernance data cartes. |

---

# 2. AUDIT DES DOCS

## `README.md`
- **Ce qu’elle dit**: décrit runtime général, endpoints actifs, économie points-first, et mention docs principales.
- **Alignement runtime**: globalement aligné sur routes et features live.
- **Nature**: current-state opérationnel.
- **Contradictions**: ne détaille pas explicitement la dualité source cartes (DB templates + JSON base cards), donc vision simplifiée.

## `docs/README.md`
- **Ce qu’elle dit**: distingue docs source-of-truth courantes vs historiques.
- **Alignement runtime**: bon alignement sur rôle documentaire.
- **Nature**: gouvernance documentaire (meta-doc).
- **Contradictions**: pas de contradiction directe; manque un pointeur dédié audit cartes/data (corrigé dans ce pass).

## `docs/current-runtime-architecture.md`
- **Ce qu’elle dit**: runtime actuel (pack auth DB-native, guest local, coexistence legacy, rewards/quests/admin).
- **Alignement runtime**: bon sur l’architecture globale.
- **Nature**: current state.
- **Contradictions / manques**: n’explicite pas assez finement que la réponse `pulledCards` auth dépend encore d’un mapping `baseCardId` JSON via metadata template.

## `docs/mcg-pivot-product-foundation.md`
- **Ce qu’elle dit**: vision cible (50 tokens, 5 raretés, 5 éditions, 1250 templates, 16k packs, émission contrôlée DB).
- **Alignement runtime**: partiellement aligné (auth path oui, guest/JSON legacy encore présent).
- **Nature**: target state produit.
- **Contradictions**: pas une contradiction stricte, mais écart implicite avec runtime hybride actuel.

## `docs/mvp-controlled-emission-transformation.md`
- **Ce qu’elle dit**: plan de migration pre-implementation.
- **Alignement runtime**: historique, pas truth live.
- **Nature**: target/transformation historique.
- **Contradictions**: potentiellement trompeur sans bannière (bannière présente).

## `docs/repo-cartography-2026-03.md`
- **Ce qu’elle dit**: cartographie détaillée repo/domaines.
- **Alignement runtime**: partiellement stale sur certaines sections historiques.
- **Nature**: snapshot hybride/historique.
- **Contradictions**: certaines assertions ne doivent plus être prises comme “état live” sans recouper.

## `docs/reward-system-audit-2026-03.md`
- **Ce qu’elle dit**: état rewards/quests phases successives.
- **Alignement runtime**: globalement bon sur rewards/quests.
- **Nature**: audit thématique ciblé.
- **Contradictions**: hors scope cartes/templates; n’aide pas à gouverner les sources de vérité cartes.

## `docs/repo-and-docs-consolidation-audit-2026-03.md`
- **Ce qu’elle dit**: audit transverse repo/docs + dettes principales.
- **Alignement runtime**: correct globalement.
- **Nature**: current state + recommandations.
- **Contradictions**: ne descend pas au niveau inventaire data cartes fichier-par-fichier (objectif de ce nouveau rapport).

---

# 3. AUDIT DES DATA SOURCES

## 3.1 Data de base token/card

### `mcg_base_cards.json`
- **Format**: JSON array (5692).
- **Champs**: `baseCardId`, `projectId`, `coingeckoId`, `name`, `symbol`, `slug`, `image`, `primaryChain`, `faction`, `projectTier`, `marketCapRank`, `ATK/DEF/SPD/CTRL`, etc.
- **Rôle actuel**:
  - source primaire guest draw,
  - lookup pour transformer templates tirés en `BaseCard` côté auth,
  - matière première du seed controlled-emission (top 50 by rank).
- **Consommateurs**: `lib/cards.ts`, `open-pack.ts` (indirect via `getCardsMap`), `seed-mvp-controlled-emission.mjs`.
- **Problèmes**:
  - taille énorme vs pool MVP 50;
  - mélange data gameplay legacy + display + ranking;
  - runtime auth dépend toujours de `baseCardId` présent dans metadata template.
- **Niveau de confiance**: élevé pour existence/usage, moyen pour rôle canonique futur.

### `mcg_projects.json`
- **Format**: JSON array (5692).
- **Champs**: identité projet + métriques marché + flags.
- **Rôle actuel**: enrichissement hydration visuelle dans `lib/cards.ts`.
- **Consommateurs**: `lib/cards.ts`.
- **Problèmes**: duplication partielle avec `mcg_base_cards.json`; pas branché DB canonical.
- **Confiance**: élevée.

## 3.2 Data variant/template rendering

### `mcg_card_variants.json`
- **Format**: JSON array (8221).
- **Champs**: `variantId`, `baseCardId`, `variantType`, `variantRarity`, `dropWeight`, `isDefaultVariant`, etc.
- **Rôle actuel**: hydration UI + poids tirage guest legacy.
- **Consommateurs**: `lib/cards.ts`.
- **Problèmes**:
  - modèle variant legacy (standard/holo/full_art/glitch/gold) différent de l’axe DB `EditionType` (BASE/REVERSE/BRILLANTE/HOLO/FULL_ART);
  - pas de liaison canonique explicite avec `CardTemplate`.
- **Confiance**: élevée.

## 3.3 Data supply/emission/pack (DB-native)

### `prisma/seed-mvp-controlled-emission.mjs`
- **Format**: script seed.
- **Rôle actuel**:
  - fixe `MVP_TOKEN_COUNT=50`,
  - crée 1250 templates (`50*5*5`),
  - applique `plannedSupply` par matrice,
  - crée packs `mvp_sale_pack` (11000) et `mvp_reward_pack` (5000), `cardsPerPack=5`.
- **Consommateurs**: DB runtime (open-pack, projections, contests ownership).
- **Problèmes**:
  - sélection top 50 dérivée de `mcg_base_cards.json` (donc canon DB dépend JSON externes);
  - metadata template contient bridge legacy (`legacy.baseCardId`) requis par runtime auth actuel.
- **Confiance**: élevée.

### `prisma/schema.prisma` (models data)
- **Format**: Prisma schema.
- **Rôle**: vérité runtime persistence (templates/instances/packs/events).
- **Problèmes**:
  - coexistence de modèles legacy et cibles;
  - `DropTable/DropTableRow` présents mais non utilisés par open runtime.
- **Confiance**: élevée.

## 3.4 Data legacy

### `UserCard` + `PackOpening` (DB)
- **Rôle**: continuité historique/fallback.
- **Consommateurs**: dual-write auth (`open-pack.ts`), fallback `/api/me`.
- **Problèmes**: double vérité et coût de migration mentale/technique.
- **Confiance**: élevée.

### `MCG_Set1_Edition1_v3.csv`
- **Rôle**: manifestement éditorial/art direction.
- **Consommateurs**: aucun détecté.
- **Problèmes**: présence peut être confondue avec source runtime cartes Set1.
- **Confiance**: moyenne (pas de consommation runtime observée).

---

# 4. AUDIT DU RUNTIME ACTUEL

## 4.1 Comment les cartes guest sont tirées
1. `POST /api/guest/pack/open` lit l’état guest fourni par le client.
2. Vérifie points >= pack cost.
3. Exécute `openBasePack(getBaseCards())` dans `lib/cards.ts`.
4. `getBaseCards()` lit `mcg_base_cards.json` puis hydrate via `mcg_projects.json` + `mcg_card_variants.json`.
5. Tirage pondéré local (non DB), puis mutation collection guest en mémoire/session.

**Conclusion**: guest path = JSON source-of-truth, hors controlled-emission DB.

## 4.2 Comment les cartes authenticated sont tirées
1. `POST /api/pack/open` appelle `openSalePackMvpDbNative`.
2. Récupère pack `mvp_sale_pack` en DB.
3. Débite points via ledger.
4. Réserve stock pack (`openedPackCount < plannedPackCount`).
5. Pour chaque slot (5):
   - charge templates actifs du cardSet,
   - filtre `issuedSupply < plannedSupply`,
   - sélectionne pondéré sur `remainingSupply`,
   - incrémente `issuedSupply`,
   - crée `OwnedCardInstance` + `PackOpeningEvent`.
6. Bridge legacy: extrait `baseCardId` depuis metadata template, lookup dans `getCardsMap()` (JSON), dual-write `UserCard` + `PackOpening`, et renvoie `BaseCard[]`.

**Conclusion**: auth draw = DB truth pour stock/émission, MAIS payload utilisateur final dépend encore du mapping JSON legacy.

## 4.3 Où la DB est source de vérité
- Stock packs (`plannedPackCount`/`openedPackCount`).
- Stock templates (`plannedSupply`/`issuedSupply`).
- Propriété carte (`OwnedCardInstance`).
- Événement ouverture (`PackOpeningEvent`).
- Eligibilité lineup contest (instances et locks).

## 4.4 Où JSON/CSV restent source de vérité
- Définition/rendu `BaseCard` de la plupart des surfaces UI.
- Mapping `baseCardId -> carte affichable` dans ouverture auth.
- Seed sélection top 50 via ranking depuis `mcg_base_cards.json`.
- CSV non branché runtime (aucune vérité active détectée).

## 4.5 Dual systems / fallback legacy
- Dual write auth: `OwnedCardInstance` + `UserCard`, `PackOpeningEvent` + `PackOpening`.
- `/api/me` fallback legacy si user sans instances v2.
- Projection v2 calcule aussi `byBaseCard` via metadata legacy.

---

# 5. AUDIT PRISMA / BACKEND

## 5.1 Modèles centraux

### `CardTemplate`
- Correct: porte clés dimensionnelles (token/set/rarity/edition), `plannedSupply`, `issuedSupply`, `isActive`.
- Couplage legacy: metadata contient `legacy.baseCardId` utilisé par runtime.

### `OwnedCardInstance`
- Correct: ownership instance-aware, lien optionnel vers opening event, lock state contest.
- Couplage legacy: UI grand public ne consomme pas encore directement un contrat template-native complet.

### `PackDefinition`
- Correct: `source` SALE/REWARD, `plannedPackCount`, `openedPackCount`, `cardsPerPack`.
- Limite: runtime ouverture implémenté uniquement pour sale pack (`mvp_sale_pack`), pas de flow reward pack runtime actif constaté.

### `PackOpeningEvent` vs `PackOpening`
- Correct: `PackOpeningEvent` cible runtime.
- Couplage legacy: `PackOpening` maintenu pour compatibilité historique.

### `UserCard`
- Legacy: agrégat par `baseCardId`, alimenté encore en dual-write.

### Référentiels `Rarity`, `Edition`, `TokenProject`, `CardSet`
- Correct et utilisés par seed/runtime.
- `DropTable/DropTableRow` présents mais non branchés à l’algorithme d’ouverture actif.

## 5.2 Ce qui est déjà correct
- Controlled emission auth: stock pack + stock template transactionnels.
- Invariants de non-dépassement supply et stock pack.
- Scope MVP seed explicite (50 tokens / 1250 templates / 16k packs).

## 5.3 Ce qui reste couplé au legacy
- Dépendance `CardTemplate.metadata -> baseCardId` obligatoire pour répondre `pulledCards`.
- Dépendance `lib/cards.ts` dans runtime auth (pas seulement guest).
- Contrat UI basé `BaseCard` au lieu de `CardTemplate` enrichi côté API.

## 5.4 Ce qui manque pour une architecture propre
- Contrat API canonical template-native pour packs/collection (sans lookup JSON).
- Source master unique de token metadata alimentant seed + UI + runtime.
- Politique claire de retrait dual-write (`UserCard`, `PackOpening`).
- Clarification/activation/suppression de `DropTable` selon stratégie odds.

---

# 6. INCOHERENCES / DETTES / RISQUES

## 6.1 Incohérences docs vs code
- Docs produit décrivent modèle target pur controlled emission; runtime reste hybride (auth DB + bridge JSON, guest full JSON).
- Docs runtime mentionnent coexistence mais sous-documentent encore la dépendance hard au `baseCardId` metadata pour payload auth.

## 6.2 Incohérences JSON vs DB
- JSON variants (`standard/holo/full_art/glitch/gold`) et DB editions (`BASE/REVERSE/BRILLANTE/HOLO/FULL_ART`) non isomorphes.
- DB template catalog MVP = 1250; JSON base cards = 5692 (écart d’échelle et de scope).

## 6.3 Incohérences UI vs backend
- UI odds hardcodées sur page packs, alors que backend auth tire sur remainingSupply dynamique.
- UI collection rend `BaseCard` legacy-centric (stats/variants), pas contrat template native.

## 6.4 Champs redondants / mappings fragiles
- Redondance identité token à travers JSON multiples + DB metadata.
- Mapping fragile `extractBaseCardIdFromTemplateMetadata` (si metadata absente/incohérente, pack auth échoue).
- `DropTable` schema non utilisé => confusion opérationnelle.

## 6.5 Dépendances legacy dangereuses
- `lib/cards.ts` est pivot critique partagé guest + auth serializer + auth open payload.
- Tant que dual-write reste actif, risques de drift entre `OwnedCardInstance` et `UserCard`.

## 6.6 Risques si on continue sans cleanup
- Multiplication des vérités cartes (JSON/DB/UI) => incohérences produit et dette de migration croissante.
- Incapacité à faire évoluer rapidement contrats API template-native.
- Risque d’incident runtime auth si metadata legacy des templates n’est pas maintenue rigoureusement.

---

# 7. SOURCE OF TRUTH CIBLE

## Proposition tranchée
**Cible recommandée: 2 sources canoniques maximum, séparées par responsabilité.**

1. **`data/token-master.json` (canon métier éditorial/token)**
   - Scope: identité token/projet + attributs UI stables.
   - Utilisé pour bootstrap `TokenProject` et enrichissement display.
2. **DB Prisma comme canon runtime opérationnel**
   - `CardTemplate`, `PackDefinition`, `OwnedCardInstance`, `PackOpeningEvent` = vérité d’émission/inventaire/propriété.

> Recommandation: ne pas garder CSV/JSON multiples comme runtime sources parallèles.

## Justification format
- **JSON** pour token master: lisible, versionnable, compatible seed Node.
- **DB** pour émission/stock: transactionnel, concurrence-safe, auditabilité.

## Séparation claire attendue
- **Token master data**: nom/symbol/slug/chains/faction/assets branding.
- **Card template emission data**: dimensions rarity/edition + supply dans DB.
- **UI display data**: dérivée API depuis DB + token master, pas lecture directe de JSON par le client runtime.
- **Backend/runtime data**: 100% DB pour tirage et inventaire.

## Champs recommandés (minimum)

### Token master (`token-master.json`)
- `tokenId` (stable string)
- `slug`
- `displayName`
- `symbol`
- `coingeckoId` (nullable)
- `primaryChain`
- `faction`
- `imageUrl`
- `isMvpEligible` (bool)
- `rankSource` (optional metadata)

### CardTemplate (DB)
- `templateId` (DB)
- `tokenProjectId`
- `cardSetId`
- `rarityId`
- `editionId`
- `plannedSupply`
- `issuedSupply`
- `isActive`
- `displayName`
- `imageUrl`

### PackDefinition (DB)
- `code` (`mvp_sale_pack`, `mvp_reward_pack`)
- `source` (SALE/REWARD)
- `plannedPackCount`
- `openedPackCount`
- `cardsPerPack`

## Conventions d’ID recommandées
- `tokenId`: `tok_<slug>`
- `pack code`: invariant explicite (`mvp_sale_pack`, `mvp_reward_pack`)
- Ne plus faire dépendre le runtime d’un `baseCardId` legacy opaque dans metadata template.

---

# 8. RECOMMANDATION FINALE

## Garder
- Runtime auth controlled emission DB-native actuel.
- Modèles Prisma cibles (`CardTemplate`, `OwnedCardInstance`, `PackDefinition`, `PackOpeningEvent`).
- Seed controlled emission comme base de bootstrap.

## Migrer
- Contrats API packs/collection vers objets template-native (plus `BaseCard` lookup JSON obligatoire).
- UI `CardFrame` vers DTO API dérivé DB + token master.

## Remplacer
- Trio `mcg_base_cards.json` + `mcg_projects.json` + `mcg_card_variants.json` comme dépendance runtime auth.
- Mapping metadata `baseCardId` obligatoire.

## Supprimer (à terme)
- Dual-write `UserCard` / `PackOpening`.
- Fallback legacy `/api/me` dépendant `userCard`/`packOpening`.
- `pack-foundations.ts` déprécié.
- CSV non utilisé du flux runtime (ou déplacer en `assets/` hors ambiguity runtime).

## Ordre recommandé
1. Canon data défini et figé.
2. APIs/template DTO en place.
3. UI migrée.
4. Retrait dépendances JSON legacy auth.
5. Retrait dual-write/fallback legacy.

---

# 9. PLAN D’EXECUTION

## Phase 0 — Audit final et freeze
- Geler changements structure cartes/packs hors bugfix.
- Ajouter ownership explicite des sources de vérité (doc + CODEOWNERS si souhaité).
- Produire checklist de migration `baseCardId` dependencies.

## Phase 1 — Définir la source canonique
- Introduire `data/token-master.json` (ou équivalent) unique.
- Écrire validateurs schéma (script CI) pour token master.
- Aligner seed pour ne plus dépendre de plusieurs JSON hétérogènes.

## Phase 2 — Migrer seed/backend
- Générer templates/metadata runtime depuis token master + matrices DB.
- Ajouter DTO pack-open template-native (`templateId`, `token`, `rarity`, `edition`, `imageUrl`).
- Conserver compat payload legacy temporaire derrière feature flag.

## Phase 3 — Migrer l’UI
- Faire consommer `/api/me` et `/api/pack/open` en DTO template-native.
- Désengager `CardFrame` du type `BaseCard` legacy.
- Supprimer odds statiques hardcodées ou les remplacer par données exposées par backend.

## Phase 4 — Supprimer les dépendances legacy
- Retirer dual-write `UserCard`/`PackOpening`.
- Retirer fallback `/api/me` legacy.
- Retirer mapping `extractBaseCardIdFromTemplateMetadata` du runtime critique auth.
- Archiver ou déplacer JSON/CSV legacy en dossier clairement non-runtime.
