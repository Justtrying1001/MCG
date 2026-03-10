# MCG — Audit Repository + Transformation Docs-First (MVP Controlled Emission)

## 0) Scope de ce document

Ce document devient la référence de transformation **avant implémentation** pour aligner le repo actuel avec la cible produit MVP suivante :

- produit collectible-first, contest-driven ;
- 50 tokens, 5 raretés, 5 éditions ;
- catalogue théorique = 50 × 5 × 5 = 1 250 templates ;
- 16 000 packs total (11 000 vente, 5 000 rewards) ;
- 5 cartes/pack ;
- plafond émission cartes = 80 000 ;
- passage d’un drop pondéré JSON vers un **controlled emission model** en base.

---

## 1) LIVRABLE 1 — Audit repo ultra complet

## 1.1 Overview réel du repo

- Stack cohérente pour MVP web : Next.js App Router + TypeScript + Prisma/Postgres.
- Base technique splitée entre couches :
  - API routes sous `app/api/*` ;
  - logique métier sous `lib/domain/*` ;
  - projections/session sous `lib/domain/projections` + `/api/me` ;
  - UI pages sous `app/*` et composants sous `components/*`.
- Le repo porte une stratégie explicite de coexistence legacy/v2 (modèles legacy `UserCard`, `PackOpening` + modèles instance-aware `OwnedCardInstance`, `PackOpeningEvent`).

## 1.2 Forces (à garder)

1. **Pivot contest déjà opérationnel côté backend**
   - runtime `lib/domain/contests/runtime.ts` proprement isolé ;
   - validations ownership + lock cross-contests ;
   - cycle entry/score/ranking/settlement déjà implémenté.

2. **Fondations v2 réelles dans Prisma**
   - présence de `CardTemplate`, `OwnedCardInstance`, `PackDefinition`, `RewardGrant`, blocs contest/progression.

3. **UI déjà orientée parcours cible**
   - pages Packs / Collection / Contests / Profile présentes ;
   - `/combats` redirigé vers `/contests` (pivot UX explicite).

4. **Retrait PvE déjà cadré runtime**
   - endpoints PvE répondent `410 Gone` ;
   - évite le faux support fonctionnel.

## 1.3 Faiblesses structurantes

1. **Acquisition runtime encore legacy-first sur la vérité économique**
   - tirage `openBasePack()` repose sur JSON local + pondération aléatoire ;
   - aucun stock de templates ni budget d’émission décrémenté à l’ouverture ;
   - dual-write persiste mais le “v2” est alimenté depuis résultat legacy, pas depuis un moteur d’émission DB-native.

2. **Modèle Prisma incomplet pour émission contrôlée**
   - absence de tables explicites pour :
     - budget émission par template,
     - stock restant,
     - lot de supply MVP,
     - stock packs par source (sale vs reward),
     - réservation/consommation atomique par ouverture.

3. **Projection collection ambiguë**
   - `buildCollectionProjectionV2` calcule la completion par `baseCardId` via metadata template ;
   - la cible 1 250 templates (token×rareté×édition) n’est pas mesurée ;
   - dépendance critique à `cardTemplate.metadata.baseCardId` (fragile, non typée).

4. **Incohérences produit/UI**
   - Home mentionne “Six rarity tiers” alors que la base est à 5 ;
   - odds packs en UI hardcodées ;
   - termes XP/points encore mélangés dans le shell (`points` affichés comme XP).

5. **Docs encore insuffisantes pour opérer la migration**
   - docs actuelles décrivent bien le pivot mais pas le plan d’exécution controlled emission ;
   - pas de doc source-of-truth pour migration data + rollout + cleanup.

## 1.4 Incohérences et ambiguïtés critiques

- **Contradiction produit/données** : la cible “toutes les cartes dans toutes les raretés/éditions” n’existe pas au runtime actuel, qui mappe une carte tirée vers une seule rareté/édition dérivée du JSON.
- **Contradiction “DB source of truth”** : la DB enregistre l’issue d’un tirage local, elle ne gouverne pas réellement l’émission.
- **Contradiction progression** : progression collection affichée en “templates” mais calculée sur `baseCardId` legacy.
- **Ambiguïté supply rewards** : `RewardGrant` peut pointer vers `PackDefinition`, mais il n’existe pas de stock packs reward distinct et décrémentable.

## 1.5 Dette technique / legacy à expliciter

- Legacy encore actif : `UserCard`, `PackOpening`, `lib/cards.ts`, JSON cards/projects/variants.
- Couches transitoires : `ensurePackFoundations` seed “à la volée” pendant l’ouverture (couplage fort runtime/seed).
- API session `/api/me` renvoie simultanément legacy collection et coexistence v2 ; utile court terme, mais entretient double vérité.

## 1.6 Écarts avec la cible MVP controlled emission

Écarts majeurs à combler :

1. **Pas de catalogue MVP 1 250 provisionné en base**.
2. **Pas de plan d’émission par template**.
3. **Pas de stock packs global/source avec compteurs restants**.
4. **Pas d’algorithme d’ouverture DB-first avec consommation atomique du stock**.
5. **Pas de projections/UX alignées sur completion template réelle**.

## 1.7 Priorités immédiates

P0 (immédiat docs-first) :
- fixer source-of-truth produit+runtime+migration (ce document) ;
- figer les invariants supply et nomenclature.

P1 (pré-implémentation) :
- cadrer cible Prisma + seed/bootstrap MVP ;
- définir stratégie d’API migration non cassante.

P2 (implémentation) :
- acquisition controlled emission ;
- adaptation UI + projection.

P3 (stabilisation) :
- cleanup legacy + retrait dual-write.

---

## 2) LIVRABLE 2 — Cartographie Current State vs Target State

| Surface | Current state (repo réel) | Target state (MVP) |
|---|---|---|
| Docs | Pivot + runtime snapshot, mais pas de playbook migration controlled emission. | Corpus docs-first avec architecture cible, migration séquencée, cleanup plan explicite. |
| Prisma | Fondations v2 présentes + legacy actif ; pas de budget émission/stock packs sources. | Modèle d’émission contrôlée (template supply, pack stock sale/reward, journal d’allocation). |
| Backend | Pack opening = tirage JSON pondéré puis dual-write DB. | Pack opening = allocation DB-native depuis stock restant, transactionnel et traçable. |
| Acquisition | `openBasePack()` probabiliste, sans plafond template. | Consommation d’inventaire réel par template + garde-fous de déplétion. |
| Contests | Runtime globalement sain, instance-aware, lock actif. | Conserver la base actuelle, brancher progressivement sur ownership truth post-migration. |
| Progression | V2 summary présent mais completion adossée `baseCardId` metadata. | Completion et depth calculées sur catalogue template officiel (1 250). |
| UI | Flux principal en place ; textes/metrics partiellement legacy. | UI branchée sur endpoints DB-truth + wording/odds/supply cohérents. |
| Legacy | Coexistence assumée mais non bornée dans le temps. | Legacy isolé puis retiré après cutover validé. |

---

## 3) LIVRABLE 3 — Proposition de documentation source-of-truth

## 3.1 Fichiers de référence (décision)

- `docs/mcg-pivot-product-foundation.md` = **source-of-truth produit**.
- `docs/current-runtime-architecture.md` = **source-of-truth état runtime actuel** (constat, pas cible).
- `docs/mvp-controlled-emission-transformation.md` (ce fichier) = **source-of-truth transformation** (audit + target + plan d’exécution).

## 3.2 Invariants MVP fixés (à considérer “DECIDED”)

- Tokens: 50
- Raretés: 5 (`COMMON`, `UNCOMMON`, `RARE`, `EPIC`, `LEGENDARY`)
- Éditions: 5 (`BASE`, `REVERSE`, `BRILLANTE`, `HOLO`, `FULL_ART`)
- Toutes les combinaisons token×rareté×édition existent
- Catalogue: 1 250 templates
- Packs: 16 000 total = 11 000 sale + 5 000 reward
- Cartes/pack: 5
- Émission max: 80 000 cartes
- Base de distribution token moyenne: 1 558 × 50 = 77 900, marge 2 100 cartes.

## 3.3 Règles runtime cibles (docs-first)

1. La DB est la vérité de l’émission (pas le JSON runtime).
2. L’ouverture consomme des unités d’émission restantes.
3. Chaque ouverture écrit un événement auditable (entrée → allocation templates → instances créées).
4. Les packs sont stockés et décrémentés par source (sale/reward).
5. Les projections utilisateur lisent exclusivement les tables runtime officielles.

---

## 4) LIVRABLE 4 — Plan de transformation séquencé

## Phase A — Docs / recadrage / naming
- **Objectif**: stabiliser langage, invariants MVP, frontières actif/transitoire/legacy.
- **Changements**: docs index, fondation produit, doc de transformation (ce fichier).
- **Dépendances**: aucune.
- **Risques**: faible.
- **Résultat attendu**: équipes alignées avant mutation data/runtime.

## Phase B — Prisma model alignment
- **Objectif**: introduire le modèle d’émission contrôlée sans casser l’existant.
- **Changements ciblés**:
  - ajout modèles `TemplateEmissionBudget` / `TemplateEmissionLedger` (naming à valider),
  - ajout modèles `PackInventory` (source sale/reward) + ledger consommation,
  - ajout champs de statut/version migration.
- **Dépendances**: Phase A.
- **Risques**: migration relationnelle et volumétrie seed.
- **Résultat attendu**: schéma compatible double-run legacy+new runtime.

## Phase C — Seed / supply bootstrap
- **Objectif**: matérialiser catalogue 1 250 et budgets d’émission.
- **Changements ciblés**:
  - script bootstrap transactionnel,
  - seed références rareté/édition/token,
  - génération budgets template,
  - seed stock packs 11k/5k.
- **Dépendances**: Phase B.
- **Risques**: erreurs de répartition et idempotence.
- **Résultat attendu**: état initial deterministic, rejouable.

## Phase D — New acquisition runtime
- **Objectif**: remplacer tirage JSON par allocation DB.
- **Changements ciblés**:
  - nouveau service `openPackControlled()` transactionnel,
  - décrément stock pack + consommation budgets template,
  - création `OwnedCardInstance` depuis allocation DB,
  - journalisation complète (event + rows).
- **Dépendances**: Phase C.
- **Risques**: contention/concurrence à l’ouverture.
- **Résultat attendu**: émission plafonnée, auditable, sans dépassement supply.

## Phase E — API route migration
- **Objectif**: basculer endpoints sans rupture frontend.
- **Changements ciblés**:
  - `/api/pack/open` branché sur nouveau runtime,
  - contrat API enrichi (stock restant/metadata ouverture),
  - stratégie guest clarifiée (simulée ou limitée hors économie réelle).
- **Dépendances**: Phase D.
- **Risques**: divergence payloads.
- **Résultat attendu**: clients compatibles, backend DB-truth.

## Phase F — UI adaptation
- **Objectif**: aligner UX sur vérité controlled emission.
- **Changements ciblés**:
  - wording rareté/édition/supply,
  - stats collection basées templates réels,
  - affichage inventaire packs (sale/reward si pertinent),
  - suppression mentions héritées (ex: six tiers).
- **Dépendances**: Phase E.
- **Risques**: incohérences temporaires si endpoints mixtes.
- **Résultat attendu**: UI fidèle au modèle runtime.

## Phase G — Legacy cleanup
- **Objectif**: réduire double vérité.
- **Changements ciblés**:
  - freeze puis retrait `UserCard`/`PackOpening` de la voie principale,
  - arrêt dual-write,
  - dépréciation progressive de `lib/cards.ts` pour acquisition.
- **Dépendances**: Phases D-F stabilisées.
- **Risques**: perte historique si migration analytics incomplète.
- **Résultat attendu**: runtime unifié.

## Phase H — Validation / smoke tests / rollout
- **Objectif**: sécuriser mise en production.
- **Changements ciblés**:
  - tests d’invariants supply (jamais >80 000 émis),
  - tests concurrence ouverture pack,
  - smoke tests contest ownership locks,
  - checklist cutover et rollback.
- **Dépendances**: toutes phases précédentes.
- **Risques**: défauts de concurrence tardifs.
- **Résultat attendu**: release contrôlée, mesurable, réversible.

---

## 5) LIVRABLE 5 — Cleanup plan explicite

## 5.1 À garder (actif)
- `lib/domain/contests/runtime.ts` + routes contests (socle solide).
- `OwnedCardInstance`, `Contest*`, `RewardGrant`, couches progression/projections (à réaligner, pas à jeter).
- UI structure (pages et shell), globalement compatible avec migration backend.

## 5.2 À réécrire prioritairement
- `app/api/pack/open/route.ts` (source de vérité acquisition).
- `lib/domain/acquisition/pack-foundations.ts` (ne plus “seed à la volée” par tirage).
- `lib/domain/projections/collection.ts` (completion template-first).

## 5.3 À déplacer / isoler
- Logique JSON-based acquisition de `lib/cards.ts` vers zone `legacy/acquisition` (ou marquage explicite legacy).
- Conventions de compatibilité dual-write regroupées dans une couche “coexistence” bornée temporellement.

## 5.4 À supprimer plus tard (après cutover)
- dépendance runtime acquisition sur `mcg_base_cards.json`, `mcg_projects.json`, `mcg_card_variants.json` pour le tirage ;
- `UserCard`/`PackOpening` en tant que source runtime active ;
- surfacage `/api/me` des champs legacy dès que UI migrée.

## 5.5 Legacy à isoler temporairement
- guest pack opening (simulé local) : conserver uniquement comme sandbox UX, explicitement hors économie réelle.
- endpoints PvE `410` : garder tant que liens externes historiques existent, puis retirer si plus aucun trafic utile.

---

## 6) Décisions et inconnues restantes

## Décidé (bloquant implémentation)
- Invariants supply MVP listés section 3.2.
- Controlled emission DB-first obligatoire.

## À arbitrer vite (avant Phase B/C)
- Stratégie exacte de répartition des 77 900 + marge 2 100 entre raretés/éditions/templates.
- Politique d’épuisement (comportement quand un bucket/template atteint 0).
- Niveau de transparence utilisateur sur odds dynamiques vs budget restant.
- Règle pack reward : mêmes tables d’émission que sale ou stock dédié partiellement différent.

