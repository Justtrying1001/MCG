# Admin Phase 0/1 Review and Hardening (2026-03)

## 1. Verdict global

**Verdict: increment utile mais base encore fragile pour Phase 2.**

Le patch Phase 0/1 apporte de vraies avancées (log MVP, endpoints validate/preview, début de normalisation actor), mais la base n’est **pas encore suffisamment fiable** pour empiler un nouveau shell/workbench sans hardening préalable.

Le principal problème n’est pas l’absence de features; c’est la **cohérence d’exécution**:
- validate/preview existent,
- mais les execute legacy restent souvent indépendants,
- donc des écarts preview↔execute restent possibles,
- et l’audit/logging est encore best-effort et facilement contournable.

---

## 2. Strengths (à préserver)

1. **Phase 0 réellement amorcée**
   - `AdminActionLog` + `AdminOpArtifact` posent des primitives réelles de traçabilité et d’artefacts.  
2. **Actor identity mieux structurée qu’avant**
   - `requireInternalAdminAccess` retourne un objet actor (`admin_user` / `service_key`) au lieu de la simple chaîne `session|key`.  
3. **Safety rails introduits sur les flows critiques**
   - contest transitions/scoring/settlement: validate + preview endpoints présents.
   - compensation: validate + preview + execute présents.
4. **UI legacy branchée au moins partiellement**
   - contests/rewards/moderation appellent désormais des étapes intermédiaires avant execute.

Ces éléments constituent une base réutilisable, mais nécessitent une consolidation forte avant Phase 2.

---

## 3. Design flaws (critiques)

## 3.1 Actor identity normalization: amélioration partielle, pas encore robuste

### Constats
- L’actor session est construit depuis username (`admin:<username>`), ce qui reste fragile si on veut plusieurs admins nominativement traçables à terme.
- Le mode key accepte un `x-internal-admin-key-id` fourni par le client; cette valeur est déclarative et peut être spoofée.

### Risques
- Audit trail contestable en incident review.
- Attribution actor non fiable côté service-key.

### Must-fix
- Introduire un mapping serveur des key IDs autorisés (pas de valeur libre depuis header).
- Ajouter un `actorFingerprint` (derived server-side) et `requestId` corrélable persisté.

## 3.2 Logging model: utile mais trop permissif

### Constats
- `safeLogAdminAction` swallow toutes erreurs (best effort silencieux).
- Pas de contrat strict sur `actionType`/`module` (string libre).
- Peu de corrélation inter-étapes (validate/preview/execute pas reliés par operationId commun garanti).

### Risques
- Perte silencieuse d’audit events.
- Impossible de garantir la complétude du journal en incident critique.

### Must-fix
- Logging durable avec fallback d’alerte en cas d’échec d’écriture.
- Enum stricte module/actionType minimales (ou registry centralisé typé).
- `operationId` obligatoire partagé entre validate/preview/execute.

## 3.3 Validate/preview/execute: incohérence structurelle majeure

### Constats
- Les endpoints validate/preview créent des artifacts (`importId`, `planId`), **mais les execute legacy n’exécutent pas ces artifacts**:
  - scoring execute legacy prend `scores` bruts,
  - settlement execute legacy prend `rewards` bruts,
  - status execute legacy peut contourner transition validate.

### Risques
- Divergence preview↔execute (plus grave défaut actuel).
- Safety rails essentiellement “advisory”, pas “enforced”.

### Must-fix
- Ajouter execute endpoints qui consomment explicitement `importId`/`planId`/`validationToken`.
- Ou faire que les execute legacy vérifient un token validate récent + hash payload.

## 3.4 Idempotency: non homogène

### Constats
- Compensation execute impose `Idempotency-Key`.
- Contest status/score/settle legacy execute n’imposent pas l’idempotency key.

### Risques
- Replays involontaires possibles sur endpoints contest critiques.

### Must-fix
- Idempotency key obligatoire pour tous execute critiques (au moins score + settlement).

## 3.5 Permissions: modèle de rôle absent

### Constats
- Toutes routes utilisent le même gate `requireInternalAdminAccess`; aucun contrôle fin par domaine/action.

### Risques
- Un admin/mode ayant accès global peut exécuter toutes actions sensibles.

### Must-fix
- RBAC minimal côté API (ops/moderator/finance/supervisor) avant extension Phase 2.

---

## 4. Prisma/schema review

## 4.1 Nommage / structure

### Points positifs
- `AdminActionLog` et `AdminOpArtifact` sont compréhensibles et ciblés.

### Problèmes
- `actionType`/`module` en `String` non contraints.
- Pas de `updatedAt` (moins critique), mais surtout pas de `operationId` indexé.
- `AdminOpArtifact` stocke payload JSON potentiellement volumineux sans garde taille.

## 4.2 Index / volume

### Points positifs
- Index présents sur `module`, `actionType`, target refs, `expiresAt`.

### Risques volume
- `AdminOpArtifact` peut grossir vite (imports/plan previews) sans purge active.
- `AdminActionLog` croissance continue sans stratégie de rétention/partition.

### Must-fix
- Job de purge artifacts expirés.
- Politique de rétention logs (hot window + archive).
- Limite de taille payload summary (hash + metrics au lieu de dumps complets).

## 4.3 Migration compatibility
- Repo en `db push`; attention à l’ajout de tables sans migration formelle auditée.
- À court terme acceptable, mais dette de migration explicite à planifier avant élargissement.

---

## 5. API review (contrats critiques)

## 5.1 Admin actions endpoints

### OK
- Fournissent une visibilité centrale minimale.

### Gaps
- Filtrage `status` strict mais autres filtres sans validation forte.
- Pas de pagination cursor robuste (limit-only + no cursor progression réelle).

### Should-fix
- Cursor pagination stable.
- Contrat de tri explicite.

## 5.2 Contest transitions validate

### OK
- Première matrice de transition explicite.

### Gaps
- Execute legacy n’impose pas l’usage de validate.
- Prérequis métier partiels seulement.

### Must-fix
- Bloquer execute sans validate token récent (ou endpoint execute V2 obligatoire).

## 5.3 Scoring validate/preview

### OK
- Row-level issues, dedupe policy, preview top/deltas.

### Gaps
- Preview calculée hors chemin execute réel (pas de binding import artifact→execute).
- Pas de hash de dataset à la preview.

### Must-fix
- Execute from `importId` only.
- Retourner `datasetHash` et vérifier à l’exécution.

## 5.4 Settlement validate/preview

### OK
- Validation structurée + preview per-user/totals.

### Gaps
- Execute legacy contourne plan validé.
- `PACK` check minimal (presence id), pas de vérification existence package.

### Must-fix
- Execute from `planId` only.
- Validate package existence/eligibility.

## 5.5 Compensation validate/preview/execute

### OK
- Flow le plus cohérent du lot.
- reasonCode exigé (bonne correction).

### Gaps
- Approval threshold signalé mais non réellement enforce par rôle/approval object.

### Must-fix
- Si `requiresSupervisorApproval=true`, bloquer execute sans preuve d’approbation.

## 5.6 Moderation v2 / legacy review

### OK
- `decisionCode` introduit pour reject.

### Gaps
- Le legacy endpoint concatène `decisionCode | note` dans `note`; modèle non propre.
- Double voie moderation (`/review` legacy et `/decide` v2) sans contrat unifié.

### Should-fix
- Champ structuré `decisionCode` persistant dédié (schema/runtime).
- Déclarer une voie canonique et déprécier l’autre.

## 5.7 User admin context

### OK
- Fournit le minimum contextuel utile.

### Gaps
- `rejectionsLast30d` n’est pas réellement 30d (count global REJECTED).

### Must-fix
- Corriger fenêtre temporelle réelle 30 jours.

---

## 6. UI retrofit review

## 6.1 Contest detail

### Positif
- status/scoring/settlement passent par validate/preview avant execute.

### Problèmes
- UX warnings/errors trop compactes en strings concaténées.
- confirmation `window.confirm` basique, sans récap détaillé structuré.
- exécution finale appelle encore endpoints legacy non liés aux artifacts.

### Must-fix
- Afficher issues en liste structurée (blocking vs warning).
- Confirmation modal dédiée (pas `window.confirm`) avec impact summary.
- Exécuter via tokens artifacts.

## 6.2 Rewards page

### Positif
- Flow compensation validate→preview→confirm→execute en place.
- reasonCode rendu obligatoire.

### Problèmes
- Toujours `window.confirm`.
- Erreurs non hiérarchisées par champ.

### Should-fix
- Modal de confirmation + bloc preview visuel.
- Surface field-level errors.

## 6.3 Moderation page

### Positif
- reject reason selectable.

### Problèmes
- reason globale de page (pas par item), risque d’erreur de contexte.
- pas d’aperçu impact approve avant action.

### Should-fix
- reason selection in-row/modal par submission.
- mini preview impact (+points, state transitions).

---

## 7. Tests review

## 7.1 Niveau actuel
- Typecheck passe, mais c’est insuffisant pour ce type de patch ops-critique.
- Aucune couverture ciblée des nouvelles garanties validate/preview/execute.

## 7.2 Missing tests (priorité must)

1. **Actor normalization tests**
   - session actor mapping
   - key actor mapping (including spoofed key-id handling once fixed)

2. **AdminActionLog write tests**
   - success path writes expected fields
   - failure logging path behavior (at least alert/metric)

3. **Contest transitions tests**
   - allowed/disallowed transitions
   - settled prerequisites
   - bypass prevention (post-fix)

4. **Scoring validate/preview/execute consistency tests**
   - validate artifact hash
   - preview matches execute dataset
   - dedupe policy behavior

5. **Settlement validate/preview/execute consistency tests**
   - plan validation errors
   - preview totals correctness
   - execute consumes validated plan only (post-fix)

6. **Compensation tests**
   - reasonCode required
   - token expiry
   - idempotency replay behavior
   - approval threshold enforcement (post-fix)

7. **Moderation decision tests**
   - reject requires decisionCode
   - reviewer identity persisted correctly

## 7.3 Should-have tests
- API contract snapshot tests for response shapes.
- UI integration tests for blocker rendering and confirmation gating.

---

## 8. Must-fix before Phase 2

1. **Bind execute to validated artifacts/tokens** for contest transitions/scoring/settlement.
2. **Enforce idempotency on contest execute endpoints** (score/settle/status where relevant).
3. **Harden actor identity for key mode** (server-side key registry, no free-form key id trust).
4. **Implement real retention/purge for AdminOpArtifact**.
5. **Add minimum targeted automated tests** for consistency and anti-bypass guarantees.
6. **Introduce minimal RBAC checks** on critical families (contest vs moderation vs compensation).

---

## 9. Should-fix soon

1. Replace `window.confirm` with modal confirmation component and structured preview blocks.
2. Normalize error payloads (`code`, `field`, `operatorHint`) for legacy execute endpoints too.
3. Add `operationId` propagation across validate/preview/execute and index it.
4. Unify moderation endpoints toward single canonical contract.
5. Correct `rejectionsLast30d` semantics to true 30-day window.

---

## 10. Safe to defer (for now)

1. Full reward-accounting unification (`RewardGrant` vs ledger) — important but not blocking immediate hardening.
2. Full new admin shell/workbench migration — should wait until current safety guarantees are non-bypassable.
3. Advanced anti-abuse scoring in moderation — can follow after contract and decision model hardening.

---

## 11. Hardening execution plan (short)

### Sprint H1 (blocking)
- Enforce token-bound execute for contest score/settle/transition.
- Add idempotency key checks for contest execute endpoints.
- Add artifact purge job + scheduled cleanup.
- Add targeted backend tests (must list section 7.2).

### Sprint H2 (stability)
- RBAC minimal enforcement.
- Structured confirmation modals and issue rendering on existing UI pages.
- Operation correlation (`operationId`) across logs/artifacts.

Gate to Phase 2: only after H1 complete + tests green + no bypass known on critical execute flows.
