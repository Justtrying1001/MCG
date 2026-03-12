# MCG Contest Admin Creation Audit

## 1. Executive summary

### 1.1 What exists today
- **Implémenté**: un flux de création de contest existe uniquement via la surface **legacy** (`/admin/contests/legacy`) avec un formulaire brut (`code`, `title`, `status`, dates, `maxRosterSize`, `cardSetId`, `config` JSON). La nouvelle page `/admin/contests` est surtout un catalogue opérationnel et ne crée pas de contest directement.
- **Implémenté**: le backend crée un `Contest` + une `ContestRule` avec un modèle MVP minimal (`maxRosterSize`, `cardSetId`, `config`).
- **Implémenté**: opérations run-time d’exploitation (transition de phase, scoring, settlement) via workbenches + endpoints validate/preview/execute.

### 1.2 What is usable
- **Utilisable (ops MVP)**:
  - création d’un contest simple,
  - verrouillage du lifecycle par transitions explicites,
  - ingestion de scores et génération de ranking,
  - settlement manuel par lignes de rewards (user par user).
- Le système est exploitable pour un mode **backoffice technique** (petit volume, opérateurs experts, faible automatisation).

### 1.3 What is misleading or broken
- **Trompeur côté admin UX**: la page principale `/admin/contests` n’expose pas la création comme action primaire; elle renvoie vers un badge “Legacy create”, ce qui donne une expérience fragmentée et non finalisée.
- **Trompeur côté produit**: la création laisse croire à une configuration riche via `config JSON`, mais ce JSON n’a pas de contrat produit explicite ni de validation métier forte.
- **Brut / risqué ops**: scoring et settlement restent des workflows de saisie manuelle (rows/brut), sans policy de distribution liée au ranking.

### 1.4 What is missing
- **Absent structurellement**:
  - modèle d’entry fee en points,
  - modèle de distribution des rewards (top N, top %, tiers),
  - modèle de reward policy attachée au contest dès la création,
  - modèle explicite min/max/exact team size (seulement `maxRosterSize`, utilisé comme exact dans le runtime),
  - wizard produit guidé “contest setup”.

### 1.5 Main redesign implications
- Avant un redesign UI, il faut d’abord refondre la **modélisation backend/data**: contest setup, entry policy, team policy, reward policy, payout schedule.
- Sans cette base, une nouvelle UI sera seulement plus jolie mais restera couplée à des primitives techniques et à des opérations manuelles risquées.

## 2. Current admin contest creation reality

### 2.1 UI creation flow
- **Réalité actuelle**:
  - `/admin/contests` = catalogue + filtres + liens vers overview/scoring/settlement/audit.
  - création déplacée dans `/admin/contests/legacy` (fallback explicite).
  - formulaire de création legacy non guidé, technique, avec `config JSON` libre.
- **Diagnostic UX**:
  - discoverability faible (create caché en legacy),
  - hiérarchie de workflow non claire (catalogue/run vs setup initial),
  - labels orientés implémentation (`maxRosterSize`, `cardSetId`) plutôt que langage produit.

### 2.2 API creation flow
- **POST `/api/internal/contests`** appelle `createContestMvp`.
- Paramètres réellement pris en compte: `code`, `title`, `startsAt`, `lockAt`, `endsAt`, `status`, `maxRosterSize`, `cardSetId`, `config`.
- **Absent à la création**: rewards, distribution, entry fee, payout model.

### 2.3 Runtime creation flow
- `createContestMvp`:
  - crée `Contest` (status/date metadata),
  - crée une `ContestRule` unique avec `maxRosterSize`, `cardSetId`, `config`.
- Pas de persistance de règles économiques ou de distribution.

### 2.4 Data model support
- Le modèle data couvre bien le **run technique** (entry, score, ranking, settlement), mais la **configuration produit** est pauvre.
- `ContestRule` est un conteneur MVP minimal + `config` JSON libre; pas un vrai langage de règles produit.

### 2.5 Rewards configuration reality
- Les rewards ne sont pas définies à la création.
- Elles sont injectées plus tard lors du settlement via lignes manuelles (`userId`, `type`, `amount`, `packDefinitionId`).
- Aucun lien natif “ranking -> payout policy” dans le modèle.

### 2.6 Team rules reality
- La team size est gérée via `maxRosterSize`, mais le runtime impose **exactement** ce nombre à l’entrée.
- Donc c’est un “exact roster size déguisé en max”.
- Support possible 3/5/7 techniquement (si valeur envoyée), mais non cadré par UI produit ni policy explicite.

### 2.7 Entry rules reality
- Pas d’entry fee points dans les modèles/API/runtime contest.
- L’entrée vérifie statut/dates/ownership/eligibility cardSet/locks, mais pas de coût d’entrée ni wallet policy.

## 3. Code audit by layer

### 3.1 Admin UI surfaces
- `/admin/contests` (nouvelle surface): catalogue dense orienté opérations de run, pas setup.
- `/admin/contests/legacy`: seule surface create réelle; form bas niveau.
- `/admin/contests/[contestId]`: overview opérationnelle (progress/blockers/transitions).
- Workbenches lifecycle/scoring/settlement:
  - davantage sécurisés (validate/preview/execute),
  - mais toujours basés sur payloads techniques manuels.
- **Conclusion UI**: séparation setup vs ops incomplète; setup reste legacy et techniquement exposé.

### 3.2 Internal/admin APIs
- APIs contest “execute” structurées + idempotency sur status/score/settle.
- Endpoints validate/preview présents sur `contest-runs/*` pour transition/scoring/settlement.
- L’endpoint demandé `/api/internal/contests/[contestId]/score/auto/route.ts` est **absent** dans le repo.
- **Gap produit**: aucun endpoint de création avec validation métier riche (wizard create validate/execute).

### 3.3 Runtime/domain logic
- `enterContestMvp` implémente:
  - checks statut + lockAt,
  - unicité entry,
  - exact size lineup,
  - ownership via `OwnedCardInstance`,
  - eligibility optionnelle `cardSetId`,
  - lock anti double utilisation.
- `recordContestScoresMvp`:
  - upsert scores,
  - régénère ranking complet,
  - marque entries scorées.
- `settleContestMvp`:
  - crée settlement unique,
  - écrit `RewardGrant`,
  - crédite points user pour rewards POINTS,
  - passe contest/entries en SETTLED.
- **Limite**: aucun calcul de payout automatique depuis ranking; settlement totalement “payload-driven”.

### 3.4 Data model
- `Contest`: métadonnées lifecycle (status, startsAt, lockAt, endsAt).
- `ContestRule`: `cardSetId`, `maxRosterSize`, `config` JSON.
- `ContestEntry`, `RosterLock`, `ContestScore`, `ContestRanking`, `ContestSettlement`: modélisation run solide MVP.
- `RewardGrant`: log de grant mais sans notion de policy/tier/schedule.
- **Absences critiques**:
  - `entryFeePoints` / `entryCurrency` / `entryMode`,
  - `teamSizePolicy` (exact/min/max),
  - `rewardPolicy`, `rewardTier`, `distributionRule`,
  - versioning de règles de contest.

### 3.5 Rewards coupling
- Couplage actuel = **late manual settlement**:
  1) ranking calculé séparément,
  2) opérateur saisit manuellement rewards,
  3) validate/preview puis execute settlement.
- Pas de payout policy persistée à la création.
- Risques:
  - erreurs humaines de mapping ranking->reward,
  - incohérences inter contests,
  - faible reproductibilité/audit produit,
  - dépendance à compétence opérateur.

### 3.6 Docs
- `README.md` et `repo-cartography` décrivent bien un système contest orienté run MVP (create/status/score/settle), sans prétendre un moteur de config produit riche.
- `current-runtime-architecture.md` est trop haut niveau pour opérer une création admin contest détaillée.
- Les documents demandés suivants sont **absents**:
  - `docs/contest-backend-audit-2026-03.md`
  - `docs/contest-scoring-coingecko-audit-2026-03.md`
  - `docs/contest-system-readiness-audit-2026-03.md`
- La doc existante “admin panel” (notamment `full-admin-panel-audit`) reconnaît déjà des limites fortes (legacy + workflows bruts), mais il manque une vérité consolidée centrée **contest creation/setup produit**.

### 3.7 Tests
- Présents:
  - helpers UI catalog/workbench,
  - overview route,
  - hardening score execute (importId/idempotency replay).
- Manquants majeurs:
  - tests de création contest riches (validations métier setup),
  - tests de modèles de rewards distribution (inexistant),
  - tests d’entry fee (inexistant),
  - tests de team policy (min/max/exact),
  - tests end-to-end “create -> run -> settle” avec policy déclarative.

## 4. Product gap analysis

### 4.1 Missing admin capabilities
- Wizard de création guidée (étapes + validation métier).
- Prévisualisation explicite du contest “tel qu’il sera joué” avant création.
- Gestion versionnée de templates de contest.

### 4.2 Missing contest parameters
- Entry fee points.
- Team size business policy (exact/min/max + valeurs autorisées).
- Eligibility policy plus riche (au-delà d’un simple `cardSetId`).
- Lifecycle policy explicite (entry window vs lock vs live duration).

### 4.3 Missing reward distribution model
- Pas de top N / top % / par rang / tiers.
- Pas de mapping déclaratif ranking bands -> rewards.
- Pas d’engine auto de génération de settlement plan depuis ranking.

### 4.4 Missing entry fee model
- Aucun champ DB/API/runtime pour débiter/créditer un coût d’entrée.
- L’admin UI n’offre rien sur ce sujet (absence explicite, non simulée).

### 4.5 Missing team configuration model
- `maxRosterSize` seul et ambigu.
- Aucune distinction min/max/exact.
- Aucune taxonomie team formats (3/5/7) en produit.

## 5. What is reusable vs what likely needs redesign

### Réutilisable
- Pipeline ops validate/preview/execute + artifacts + idempotency.
- Domain runtime d’entrée (ownership, locks, cardSet eligibility) globalement solide.
- Modèles run (`ContestEntry`, `ContestScore`, `ContestRanking`, `ContestSettlement`) utiles comme socle.

### À refondre probablement
- Modèle de configuration contest (`ContestRule` trop générique/JSON).
- Couplage rewards (définition tardive manuelle).
- UX create/setup (legacy, non guidée, non product-first).
- Contrats API de création (pas de validation métier structurée).

## 6. Risks and operational friction
- Erreur de setup initial (status/date/rule incohérents) faute de garde-fous métier.
- Erreur de settlement manuelle (mauvais user/montant/type).
- Faible capacité à opérer à l’échelle (process trop artisanaux).
- Dépendance à opérateurs experts connaissant les détails backend.
- Difficulté à garantir cohérence inter contests (pas de policy formalisée).

## 7. Documentation truth audit
- **Honnête sur le MVP run**: oui, docs principales décrivent un système contest technique exploitable.
- **Insuffisant pour “contest creation/setup produit”**: oui, manque de doc contractuelle sur ce qui est réellement configurable par un admin non technique.
- **Incohérences/obsolescence**:
  - inventaire docs cible/admin plus ambitieux que le modèle réellement implémenté,
  - plusieurs docs demandées n’existent pas.

## 8. Recommended next architecture questions
1. Quel est le **contrat produit minimal** d’un contest à la création (obligatoire vs optionnel)?
2. Comment modéliser proprement `entryPolicy` (fee/currency/exemptions)?
3. Comment modéliser `teamPolicy` (exact/min/max + formats autorisés)?
4. Quel modèle de `rewardPolicy` (tiers, top N, top %, fixed ranks, cap budget)?
5. Le settlement doit-il être **auto-generated from ranking + policy** avec override contrôlé?
6. Comment unifier reward accounting (grants + ledger) pour auditabilité end-to-end?
7. Quelle UX wizard permet de réduire erreurs opérateur sans exposer JSON brut?

## 9. File-by-file evidence appendix

### A. Admin UI/UX
- `app/admin/(protected)/contests/page.tsx`
  - catalogue + filtres + actions run,
  - lien explicite vers create legacy.
- `app/admin/(protected)/contests/legacy/page.tsx`
  - création réelle via champs techniques + config JSON.
- `app/admin/(protected)/contests/[contestId]/page.tsx`
  - overview opérations + liens workbenches.
- `app/admin/(protected)/contests/[contestId]/lifecycle/page.tsx`
  - validate transition + execute.
- `app/admin/(protected)/contests/[contestId]/scoring/page.tsx`
  - rows manuels + validate/preview/execute.
- `app/admin/(protected)/contests/[contestId]/settlement/page.tsx`
  - rewards rows manuels + validate/preview/execute.
- `app/admin/(protected)/contests/legacy/[contestId]/page.tsx`
  - surface monolithique mêlant status/scoring/settlement.
- `components/admin/AdminShell.tsx`
  - navigation module-level (contest = “Lifecycle & runs”).

### B. APIs
- `app/api/internal/contests/route.ts`
- `app/api/internal/contests/[contestId]/route.ts`
- `app/api/internal/contests/[contestId]/status/route.ts`
- `app/api/internal/contests/[contestId]/score/route.ts`
- `app/api/internal/contests/[contestId]/settle/route.ts`
- `app/api/internal/contest-runs/[contestId]/*` (overview + validate/preview)
- `app/api/internal/contests/[contestId]/score/auto/route.ts` → **absent**

### C. Runtime/domain
- `lib/domain/contests/runtime.ts`
- `lib/admin/contest-workbench.ts`

### D. Data model
- `prisma/schema.prisma` (`Contest*`, `RewardGrant`, `CardSet`, `OwnedCardInstance`, `AdminOpArtifact`)

### E. Docs
- `README.md`
- `docs/current-runtime-architecture.md`
- `docs/repo-cartography-2026-03.md`
- `docs/full-admin-panel-audit-2026-03.md`
- Fichiers demandés mais absents:
  - `docs/contest-backend-audit-2026-03.md`
  - `docs/contest-scoring-coingecko-audit-2026-03.md`
  - `docs/contest-system-readiness-audit-2026-03.md`

### F. Tests
- `tests/admin-contest-catalog-filter.test.ts`
- `tests/admin-contest-workbench.test.ts`
- `tests/api-internal-contest-overview-route.test.ts`
- `tests/api-internal-contest-score-hardening.test.ts`

---

## Direct answers to the 13 explicit questions
1. **Le panel admin crée-t-il correctement un contest ?** → **Partiel** (possible en legacy, mais non product-grade).
2. **Paramètres réellement configurables ?** → code/title/status/dates/maxRosterSize/cardSetId/config JSON.
3. **Paramètres critiques manquants ?** → entry fee, reward policy/distribution, team policy explicite, eligibility riche.
4. **Création orientée produit ou backend-MVP ?** → clairement **backend-MVP**.
5. **Rewards modélisés correctement dès création ?** → **Absent**.
6. **Distribution rewards configurable aujourd’hui ?** → **Absent** (manuel row-by-row au settlement).
7. **Entry fee points existe ?** → **Non**.
8. **Taille d’équipe réellement configurable ?** → **Partiel** (valeur numérique possible, sémantique ambiguë).
9. **Top N / top % / tiers modélisables ?** → **Non** dans le modèle actuel.
10. **Parties solides et réutilisables ?** → runtime entry safety + scoring/ranking pipeline + guardrails validate/preview/idempotency.
11. **Parties à refondre ?** → contest setup model, reward distribution model, create UX.
12. **Risques admin/ops actuels ?** → erreurs manuelles setup/settlement, dépendance expertise technique, faible scalabilité.
13. **Gap list produit vs repo ?** → gros gap sur configuration produit déclarative (entry/team/rewards/distribution), alors que run technique MVP est présent.
