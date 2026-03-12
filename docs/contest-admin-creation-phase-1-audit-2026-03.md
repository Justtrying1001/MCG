# MCG Contest Admin Creation Phase 1 Audit

> Stabilization note: the blocker test failures referenced in this audit were addressed in a follow-up stabilization pass (enum runtime mismatch + API/runtime validation hardening). Keep this document as the pre-stabilization critical snapshot.

## 1. Executive summary

### 1.1 What Phase 1 successfully delivers
- **Réussi**: une vraie séparation `draft / validate / publish` côté backend via le runtime dédié `config-runtime` et des endpoints admin dédiés (`/api/internal/contest-configs/*`).
- **Réussi**: persistance relationnelle des policies rewards/distribution (`ContestRewardPolicy`, bundles, components, distribution rules), au lieu d’un simple JSON libre.
- **Réussi**: intégration entry fee au runtime d’entrée avec débit ledger et message d’erreur explicite pour points insuffisants.
- **Réussi**: coexistence de transition visible côté UI (`/admin/contests` met en avant le nouveau create, legacy explicitement déprécié).

### 1.2 What is improved
- **Amélioration nette UX** par rapport au legacy: flow sectionné, aucun champ JSON brut exposé dans la nouvelle page create.
- **Amélioration produit/backend**: le setup stocke désormais explicitement team policy, entry policy, eligibility et policy rewards/distribution.
- **Amélioration ops**: publication est bloquée par des validations métier serveur (timing, team size, entry fee, distribution/rules minimales).

### 1.3 What is still weak or confusing
- **Confus/fragile UX**: le wizard est en réalité un formulaire unique multi-step avec presets hardcodés (rank1/top10/top25%) plutôt qu’un vrai builder de règles génériques.
- **Confus produit**: certains labels restent techniques (`cardSetId`, `CARD_SET_ONLY`) et pas orientés admin non-tech.
- **Fragile backend**: validations DB encore surtout applicatives (peu de contraintes relationnelles empêchant des états invalides si insertion hors runtime).
- **Fragile qualité**: les tests Phase 1 ajoutés ne passent pas actuellement dans cet état du repo (voir section tests).

### 1.4 What must be corrected before Phase 2
1. Stabiliser immédiatement la base de tests Phase 1 (actuellement cassée).
2. Durcir la validation/normalisation des payloads API (schéma strict + erreurs champ par champ).
3. Rendre le builder rewards/distribution réellement configurable (pas preset déguisé).
4. Ajouter contraintes DB minimales pour prévenir les états incohérents hors runtime.
5. Clarifier la stratégie de coexistence legacy (garde-fous plus stricts sur create legacy).

---

## 2. Phase 1 implementation reality

### 2.1 Admin create flow
- **Réussi**:
  - flow en 6 sections claires (Basics, Timing, Entry, Team & Eligibility, Rewards & Distribution, Review & Publish),
  - actions explicites `Save draft`, `Validate`, `Publish`.
- **Partiel**:
  - logique de wizard “stateful” basique, sans validation étape par étape côté UI,
  - feedback d’erreur consolidé en simple string, pas de mapping champ -> erreur.
- **Confus**:
  - la section rewards/distribution est pilotée par presets (`rank_1_bundle`, `top_10_pack_bundle`, `top_25_percent_xp`) plus que par une modélisation libre réellement guidée.

### 2.2 API contracts
- **Réussi**: séparation claire des responsabilités par endpoint (`create`, `read/update`, `validate`, `publish`).
- **Partiel**: payloads sont structurés mais pas contractés par schéma explicite (pas de zod/DTO validés ligne à ligne).
- **Fragile**: `PATCH` remplace des blocs larges (rebuild policy), ce qui peut générer des surprises en édition concurrente ou partielle.

### 2.3 Runtime behavior
- **Réussi**:
  - `createContestDraft` / `updateContestDraft` / `validateContestDraft` / `publishContest` existent et s’enchaînent proprement,
  - validation métier couvre les invariants de base.
- **Partiel/fragile**:
  - forte confiance dans la couche runtime pour l’intégrité; contraintes DB limitées,
  - remplacement complet des bundles/rules à chaque update (simple, mais potentiellement destructif pour historique/édition fine).

### 2.4 Data model reality
- **Réussi**: direction relationnelle conforme à l’architecture cible Phase 1.
- **Partiel**: `ContestRule` devient un agrégat très chargé (legacy + nouveau), ce qui crée une double sémantique (`maxRosterSize` vs `teamSizeValue`).
- **Fragile**: certaines contraintes de validité métier n’existent pas au niveau DB (ex. quantités > 0, topPercent borné, etc.).

### 2.5 Entry fee integration
- **Réussi**: lecture des nouveaux champs, débit ledger idempotent par clé `contest-entry-fee:<contestId>:<userId>`, erreur insuffisance points explicite.
- **Partiel**: fallback legacy correct, mais la dette de compatibilité reste non triviale.

### 2.6 Rewards/distribution configuration reality
- **Réussi**: policy persistée en tables dédiées et validée.
- **Partiel/confus**: UI actuelle ne reflète pas encore toute la puissance du modèle; elle impose une forme de policy prédéfinie.

### 2.7 Legacy coexistence
- **Réussi**: dépréciation visible, nouveau flow mis en avant.
- **Risque**: le legacy create reste pleinement opérable et peut continuer d’introduire des contests moins structurés.

---

## 3. Code audit by layer

### 3.1 Admin UI surfaces
- `app/admin/(protected)/contests/create/page.tsx`
  - **Réussi**: structure en étapes lisibles, payload sans JSON brut visible.
  - **Confus**: builder rewards non générique, presets hardcodés (rank1/top10/top25).
  - **Partiel**: review step informative mais pas de synthèse “impact ops” (ex: nombre estimé de gagnants selon top%).
- `app/admin/(protected)/contests/page.tsx`
  - **Réussi**: CTA vers nouveau flow + legacy marqué deprecated.
- `app/admin/(protected)/contests/legacy/page.tsx`
  - **Réussi**: avertissement de dépréciation.
  - **Risque**: la page reste utilisable sans garde-fou fort.

### 3.2 Admin APIs
- `POST /contest-configs` / `GET|PATCH /contest-configs/:id` / `POST validate` / `POST publish`
  - **Réussi**: endpoints bien séparés.
  - **Partiel**: pas de contrat formel versionné des payloads; validation implicite par runtime + erreurs textuelles.
  - **Fragile**: absence de granularité d’erreurs structurées “field path” sur endpoints (contrairement au besoin d’un wizard robuste).

### 3.3 Runtime/domain logic
- `lib/domain/contests/config-runtime.ts`
  - **Réussi**: encode l’essentiel des invariants Phase 1.
  - **Partiel**: update policy = stratégie “delete/recreate”, simple mais pas idéale pour audit diff/versioning.
  - **Fragile**: quelques règles restent “best effort” applicatif sans garde DB.
- `lib/domain/contests/runtime.ts`
  - **Réussi**: team policy canonique + entry fee ledger + fallback legacy.
  - **Partiel**: robustesse dépend de la présence/qualité de `ContestRule` unique de fait, non explicitement contrainte par unicité en DB.

### 3.4 Prisma/data model
- `prisma/schema.prisma` + migration SQL
  - **Réussi**: modèles relationnels nécessaires sont là.
  - **Partiel**: manque de contraintes DB métier (check constraints) sur quantités bornées.
  - **Confus**: coexistence `maxRosterSize` (legacy) et `teamSizeValue` (canonique) garde une ambiguïté conceptuelle.

### 3.5 Docs
- **Réussi**: docs Phase 1 existent et couvrent intention + réalisation.
- **Partiel**: docs globales restent optimistes sur “wizard” alors que le builder rewards est encore preset-heavy.
- **Manque**: runbook opérateur concret “comment configurer un contest type” et “erreurs fréquentes / remediation”.

### 3.6 Tests
- **Réussi**: bonnes intentions de couverture sur validation runtime, routes et entry fee.
- **Critique/fragile**: dans l’état actuel audité, les tests Phase 1 ciblés ne passent pas (5 échecs sur 14) avec erreurs sur `ContestTeamSizeMode.EXACT` undefined et régression de tests de validation/runtime.
- **Conclusion qualité**: la fondation est prometteuse, mais la fiabilité de la suite de tests n’est pas encore au niveau attendu pour enchaîner sereinement sur Phase 2.

---

## 4. Strengths and reusable foundations
- Runtime `config-runtime` dédié et conceptuellement propre.
- Modèle relationnel rewards/distribution réutilisable pour settlement-plan auto.
- Lifecycle create/validate/publish bien séparé.
- Intégration entry fee via ledger (choix cohérent avec traçabilité).
- Transition UI visible et progressive depuis legacy.

## 5. Weaknesses, risks, and debt
- Wizard encore partiellement “backend-ish” sur rewards/distribution.
- Contrats API pas assez explicitement typés/validés pour éviter ambiguïtés.
- Manque de contraintes DB métier fortes.
- Dette de coexistence legacy encore opérationnelle.
- Instabilité tests Phase 1 (signal de risque majeur avant Phase 2).

## 6. Required corrections before Phase 2
1. **Stabiliser les tests Phase 1 immédiatement** (corriger causes de `ContestTeamSizeMode` undefined en contexte test + restaurer green suite).
2. **Introduire validation d’input structurée (zod)** dans les routes `contest-configs` avec erreurs par champ.
3. **Rendre le builder rewards/distribution réellement éditable** (ajout/suppression de bundles/rules, pas seulement presets).
4. **Ajouter contraintes DB minimales**:
   - quantités positives (pack/points/xp),
   - topPercent (0,100],
   - cardinalité rule<->bundle mieux contrainte.
5. **Réduire ambiguïté legacy**:
   - soft-block create legacy pour nouveaux contests ou feature flag,
   - bannière plus forte + redirection recommandée.
6. **Ajouter tests manquants critiques**:
   - publish bloque si policy absente,
   - patch partiel ne casse pas bundles/rules inattendus,
   - validations API détaillées,
   - scénario e2e minimal create->validate->publish.

## 7. Documentation truth audit
- `docs/contest-admin-creation-phase-1-implementation-2026-03.md` est globalement fidèle sur le scope livré.
- L’assertion “wizard” est correcte sur la forme, mais **surestime** la maturité produit du builder rewards/distribution.
- `README.md` et `docs/current-runtime-architecture.md` reflètent correctement l’ajout des endpoints/surfaces Phase 1.
- Manque important: guide opérateur orienté usage réel admin.

## 8. File-by-file evidence appendix

### UI
- `app/admin/(protected)/contests/create/page.tsx`
- `app/admin/(protected)/contests/page.tsx`
- `app/admin/(protected)/contests/legacy/page.tsx`

### APIs
- `app/api/internal/contest-configs/route.ts`
- `app/api/internal/contest-configs/[contestId]/route.ts`
- `app/api/internal/contest-configs/[contestId]/validate/route.ts`
- `app/api/internal/contest-configs/[contestId]/publish/route.ts`

### Runtime
- `lib/domain/contests/config-runtime.ts`
- `lib/domain/contests/runtime.ts`

### Data model
- `prisma/schema.prisma`
- `prisma/migrations/20260312114000_contest_config_phase1/migration.sql`

### Docs
- `docs/contest-admin-creation-audit-2026-03.md`
- `docs/contest-admin-creation-architecture-2026-03.md`
- `docs/contest-admin-creation-phase-1-implementation-2026-03.md`
- `README.md`
- `docs/current-runtime-architecture.md`

### Tests
- `tests/contest-config-runtime.test.ts`
- `tests/api-internal-contest-configs-routes.test.ts`
- `tests/contest-entry-fee-runtime.test.ts`
- `tests/admin-contest-workbench.test.ts`

---

## Direct answers to the 10 explicit questions
1. **Fidèle à l’architecture prévue ?** → **Oui, majoritairement**, sur modèle, runtime et APIs; **partiel** sur maturité UX builder.
2. **Nouveau flow create meilleur et opérable ?** → **Oui, nettement meilleur**, mais encore perfectible en guidage/validation UI.
3. **Rewards/distribution clairs et configurables ?** → **Partiel**: techniquement persistés, UX encore trop preset/technique.
4. **Entry fee correctement intégrée ?** → **Oui, côté runtime/ledger**, avec message insuffisance points; bonne base.
5. **Modèle data suffisamment bon pour Phase 2 ?** → **Oui, mais** nécessite contraintes DB supplémentaires avant extension critique.
6. **Problèmes UX/admin ops restants ?** → feedback erreurs pauvre, builder non générique, langage partiellement technique.
7. **Problèmes backend/data restants ?** → validations non schématisées API, contraintes DB incomplètes, update policy destructif.
8. **Corrections ciblées avant Phase 2 ?** → voir section 6 (tests, validation API, builder, contraintes DB, legacy guardrails).
9. **Coexistence legacy/nouveau acceptable ?** → **Acceptable court terme**, mais potentiellement dangereuse si legacy continue d’être utilisé sans restriction.
10. **Fondation saine ?** → **Oui, fondation exploitable mais pas encore “safe enough” pour accélérer Phase 2 sans corrections immédiates.**
