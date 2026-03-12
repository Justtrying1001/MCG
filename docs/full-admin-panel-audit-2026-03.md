# MCG Full Admin Panel Audit

## 1. Executive summary

### 1.1 What exists today
Le back-office admin MCG existe et couvre réellement les opérations MVP suivantes, avec surfaces UI + endpoints + runtime connectés:

- Auth admin session cookie (`/admin/login`, `/api/admin/login`, `/api/admin/logout`).
- Contest ops:
  - création de contest (`/admin/contests` + `POST /api/internal/contests`),
  - gestion de statut (`POST /api/internal/contests/:contestId/status`),
  - scoring (`POST /api/internal/contests/:contestId/score`),
  - ranking snapshot (lecture via `GET /api/internal/contests/:contestId`),
  - settlement (`POST /api/internal/contests/:contestId/settle`).
- Quest ops:
  - create/list/edit/toggle (`/admin/quests`, `/admin/quests/:questId`, `GET/POST /api/internal/quests`, `GET/PATCH /api/internal/quests/:questId`),
  - modération sociale (`/admin/quests/submissions`, `GET /api/internal/quests/submissions`, `POST /api/internal/quests/submissions/:submissionId/review`).
- Rewards ops:
  - manual grant points (`/admin/rewards`, `GET/POST /api/internal/rewards/manual-grant`),
  - user search (`GET /api/internal/users/search`).

Conclusion factuelle: le panel n’est **pas vide** ni purement prototype; il opère déjà des actions critiques en production (status lifecycle, scoring, crédits points, settlement, modération). Le problème n’est pas l’absence de fonctions; le problème est la qualité de l’opérabilité et du modèle admin.

### 1.2 Main global admin problems
1. **Back-office “fonctionnel juxtaposé”, pas “système opératoire cohérent”.**
   - Les surfaces sont des écrans utilitaires indépendants, sans architecture de jobs admin (run, moderate, analyze, compensate).
2. **Le modèle mental imposé à l’admin est celui du runtime/table schema.**
   - IDs internes, enums, JSON libre, champs techniques dominent les interactions.
3. **Faible sécurité opérationnelle sur actions irréversibles ou sensibles.**
   - Peu de previews, peu de dry-run, peu de confirmation contextuelle, pas de garde-fous par seuil.
4. **Auditabilité partielle et hétérogène entre flows rewards.**
   - Quests/manual grants passent par ledger; contests settlement passe par RewardGrant + incrément points direct.
5. **Navigation et hiérarchie UX sous-matures pour usage opérateur à volume.**
   - Pas de dashboard ops, pas de priorisation, pas de séparation claire config vs exécution vs analyse.

### 1.3 Main contest-admin problems
- L’écran detail contest mélange dans une seule surface: contexte, status transition, scoring injection, settlement, ranking lecture.
- Scoring = textarea JSON brute (`[{"userId":"","score":0}]`), donc fort risque d’erreur humaine et ambiguïtés d’interprétation.
- Settlement = lignes manuelles (`userId`, `type`, `amount`, `packDefinitionId`) sans proposition basée sur ranking ni preview d’impact.
- Status management = select enum + bouton, sans state machine explicite ni impact panel.

### 1.4 Main rewards/quests-admin problems
- Quest creation/edit plus avancé que contests, mais toujours schema-first (`type`, `validationMode`, `config`), pas campaign-first.
- Modération sociale correcte au niveau MVP (approve/reject + crédit idempotent), insuffisante au niveau ops mature (contexte faible, pas de bulk, pas de motifs structurés).
- Manual grants utiles mais peu “safe by default” (idempotency key générée côté UI, pas de step d’approbation).

### 1.5 Most urgent redesign priorities
1. Rendre explicite la séparation des jobs admin: **configurer / opérer / modérer / analyser / réparer**.
2. Remplacer les interactions brutes (JSON/IDs/enums) par opérations guidées avec validation et preview.
3. Unifier le modèle de récompense et l’auditabilité (ledger/grants/points) au niveau admin.
4. Introduire des APIs admin product-centric (prepare/validate/execute), pas seulement write endpoints runtime-centric.

---

## 2. Current admin surface inventory

### 2.1 Admin home

#### Rôle réel
Page d’entrée vers les outils, sans fonction de pilotage global.

#### Structure observée
- Header: titre “Internal Admin”, sous-titre “Internal operations entrypoint...”, bouton `Admin logout`.
- Section “Tools” contenant 4 cards-liens:
  1. Contest Admin Panel
  2. Quest Definitions
  3. Quest Review Queue
  4. Manual Reward Grants

#### Actions disponibles
- Navigation seulement.
- Aucune action de monitoring, aucune action transactionnelle.

#### Modèle mental imposé
- “Le panel est une collection d’outils”, pas “un système d’opérations produit”.

#### Problèmes UX/ops
- Pas de métriques d’état global (ex: submissions en attente, contests LIVE sans scoring, contests scorés non settled, spikes grants).
- Pas de vue priorisée “ce qui doit être traité maintenant”.
- Pas de global nav persistante: chaque page redémarre son contexte.

#### Limite structurelle
Le home est un launcher statique, pas un operations center.

### 2.2 Contest admin pages

#### 2.2.1 `/admin/contests` — rôle réel
Mixer sur la même page:
- création de contest,
- listing/historique des contests,
- navigation vers opérations détaillées.

#### Structure observée (ordre réel)
1. Header (titre + logout)
2. Bloc `Create contest`
   - inputs: `Code`, `Title`, `status` select (`DRAFT|OPEN|LOCKED|LIVE|SETTLED|CANCELED`),
   - dates: `startsAt`, `lockAt`, `endsAt` (`datetime-local`),
   - `maxRosterSize`,
   - `cardSetId (optional)`,
   - textarea `Config JSON (optional)`.
3. Bloc `Contests`
   - bouton refresh,
   - cards contest avec meta (`Entries`, `Rankings`, `Settled`, `Starts`, `Lock`, `Ends`).

#### Actions disponibles
- Create contest direct.
- Refresh list.
- Ouvrir detail contest.

#### Modèle mental imposé
- L’admin doit comprendre d’emblée:
  - le lifecycle enum,
  - les timestamps métier,
  - la relation contest/rule,
  - ce qu’est `cardSetId`,
  - et comment structurer `config` JSON.

#### Critique opérabilité
- **Mélange config + catalogue** sur une même page sans segmentation claire.
- Le formulaire expose la mécanique interne du domaine, pas une intention métier (“créer un contest hebdo draft prêt à publier”).
- Validation UI partielle (required + integer + parse JSON), mais pas de validation métier explicite (ordre temporel, cohérence status/date).

#### Risques ops
- Contest créé avec status non adapté (`LIVE`, `SETTLED`) car select libre.
- Config JSON syntaxiquement valide mais sémantiquement absurde.
- Mauvaise saisie `cardSetId` sans assistance de lookup.

#### 2.2.2 `/admin/contests/:contestId` — rôle réel
Console d’opérations critiques “tout-en-un”:
- status transition,
- scoring ingestion,
- settlement,
- lecture ranking.

#### Structure observée (ordre réel)
1. Header
2. Lien retour contests
3. Bloc identité contest + compteurs + dates + règle (`Roster size`, `Rule cardSetId`).
4. Bloc `Status management` (select enum + bouton update)
5. Bloc `Score injection` (textarea JSON + submit)
6. Bloc `Settlement` (rows rewards dynamiques)
7. Bloc `Ranking snapshot` (top 25 from API)

#### Actions disponibles
- Changer status immédiatement.
- Soumettre scores bruts.
- Définir rewards row-by-row et settle.

#### Modèle mental imposé
L’admin doit maîtriser en interne:
- quand un status est légitime,
- format scoring payload,
- mapping userId gagnants,
- implications `RewardType` (`POINTS|PACK|CARD_INSTANCE`),
- dépendances `amount`/`packDefinitionId`.

#### Critique opérabilité
- **Page mélange 4 jobs incompatibles**:
  - pilotage lifecycle,
  - exécution scoring,
  - exécution settlement,
  - monitoring ranking.
- Aucun “mode opératoire” guidé (préparer > vérifier > exécuter > confirmer).
- UI ne fait pas de reconciliation scoring↔ranking↔settlement.

#### Risques ops
- Mauvais JSON scoring => blocage ou résultat inattendu.
- Rewards incomplètes (ex: type PACK sans `packDefinitionId`) détectées tardivement.
- Settlement exécuté sans preview de delta points par user.

### 2.3 Quest admin pages

#### 2.3.1 `/admin/quests` — rôle réel
Page hybride qui cumule:
- création de quest,
- listing de toutes les définitions,
- édition inline partielle,
- activation/désactivation.

#### Structure observée
1. Header + logout
2. Retour admin home
3. Bloc `Create quest`
   - champs: `code`, `title`, `description`, `type`, `validationMode`, `rewardPoints`,
   - conditional fields:
     - `threshold` pour milestone,
     - `targetUrl`, `instructions`, checkbox `proofRequired` pour social.
   - toggles `Active`, `One-time`.
4. Bloc `Quest definitions`
   - cards avec type, validationMode, reward, analytics agrégées,
   - actions: `Open detail`, `Edit`, `Activate/Deactivate`.

#### Actions disponibles
- Create.
- Edit partielle (title/description/reward/config selon type).
- Toggle active.

#### Modèle mental imposé
- L’admin doit comprendre enums `QuestType` et `QuestValidationMode`.
- L’admin doit savoir quel `config` est attendu pour chaque type.

#### Critique opérabilité
- Meilleur que contests (conditional fields), mais reste technique.
- **Mélange config + catalogue + édition transactionnelle** sur même écran.
- Peu de garde-fous inter-champs (ex: coupling type/validation attendu business).

#### 2.3.2 `/admin/quests/:questId` — rôle réel
Vue de diagnostic détaillée pour une quest donnée.

#### Structure observée
- Section `Quest identity` (id, code, type, title, description, reward, active, one-time, validation, start/end, `config` JSON en `<pre>`).
- Section `Analytics` (counts progress/completed/submissions/points).
- Section `Latest submissions`.
- Section `Recently completed users`.
- Section `Latest ledger credits`.

#### Actions disponibles
- Aucune action corrective directe (lecture essentiellement).

#### Critique opérabilité
- Très orientée “inspection de données brutes”.
- Bon potentiel d’audit, mais pas orientée décision actionnable.
- Exposition directe du `config` JSON confirme la dépendance au modèle interne.

### 2.4 Rewards/manual grants page

#### Rôle réel
Outillage compensation/support pour créditer des points manuellement.

#### Structure observée
1. Header + retour admin home
2. Bloc `Select user`
   - search input, résultats listés (displayName, @xUsername, points)
3. Bloc `Create manual grant`
   - `userId`, `amount`, `reason label`, `reason code`
4. Bloc `Recent manual grants`
   - liste historique (user, amount, reason, reasonCode, createdAt)

#### Actions disponibles
- Search user.
- Apply grant.
- Lire historique récent.

#### Modèle mental imposé
- L’admin doit opérer avec `userId` interne.
- L’admin doit comprendre idempotency sans UI dédiée (clé générée silencieusement côté client).

#### Critique opérabilité
- Efficace pour support ponctuel.
- Insuffisant pour ops sécurisé à grande échelle (pas de workflow d’approbation, pas de seuils, pas de raison codifiée obligatoire).

### 2.5 Moderation/review surfaces

#### `/admin/quests/submissions` — rôle réel
Queue de review sociale simple.

#### Structure observée
- Filter status (`ALL|SUBMITTED|APPROVED|REJECTED`).
- Cards submission: quest code/title/type/reward, user, createdAt, proof URL, note, reviewedAt.
- Actions sur SUBMITTED uniquement: `Approve`, `Reject`.

#### Critique opérabilité
- Solide pour MVP “human in the loop”.
- Pas de mécanismes throughput:
  - pas de tri secondaire,
  - pas de batch,
  - pas de keyboard flow,
  - pas de motifs de rejet structurés,
  - pas de contexte utilisateur/historique fraude.

### 2.6 Supporting admin APIs
Pattern commun:
- Auth check via `requireInternalAdminAccess`.
- Erreurs métiers via `ContestRuntimeError`, `QuestRuntimeError`, `ManualGrantError`.

Problème global:
- La plupart des endpoints exposent des primitives CRUD/runtime, pas des endpoints opératoires guidés.
- Manque d’APIs de preview/validation/simulation sur flows critiques.

---

## 3. Current admin flows reconstructed

### 3.1 Admin authentication and access

#### Séquence réelle
1. UI login envoie username/password à `POST /api/admin/login`.
2. API vérifie credentials (env `ADMIN_USERNAME` + `ADMIN_PASSWORD_HASH` PBKDF2).
3. API pose cookie `mcg_admin_session` signé HMAC, 8h TTL, httpOnly.
4. Layout protégé (`app/admin/(protected)/layout.tsx`) lit cookie et redirige sinon.
5. APIs internal acceptent soit session valide soit header clé interne.

#### Frictions/risques
- Mode actor enregistré dans certains flows = `session|key` (pas identité admin nominative).
- Pas de RBAC (toutes actions sensibles sous même niveau d’accès).
- Pas de rotation/session management UI.

### 3.2 Create contest

#### Séquence exacte
1. Admin ouvre `/admin/contests`.
2. Renseigne code/title/status/dates/rule fields.
3. Optionnel: colle `config` JSON.
4. UI fait checks basiques.
5. Appel `POST /api/internal/contests`.
6. Runtime `createContestMvp`:
   - trim code/title,
   - default status DRAFT,
   - crée contest,
   - crée une rule imbriquée (`maxRosterSize`, `cardSetId`, `config`).

#### Garde-fous présents
- code/title requis.
- maxRosterSize integer > 0 en UI.

#### Garde-fous absents
- matrice métier status initial recommandé.
- validations sémantiques date-ordering côté UI claire.
- lookup assisté `cardSetId`.

### 3.3 Manage contest status

#### Séquence exacte
1. Ouvrir detail contest.
2. Choisir status enum.
3. `POST /status` avec `{status}`.
4. Runtime `updateContestStatusMvp` fait update direct.

#### Risque clé
- Endpoint et runtime n’encadrent pas les transitions (pas de state machine enforcement explicite).

### 3.4 Score contest

#### Séquence exacte
1. Admin colle JSON scores dans textarea.
2. Submit => `POST /score` `{scores:[{userId,score}]}`.
3. Runtime `recordContestScoresMvp`:
   - vérifie array non vide,
   - valide chaque row (userId non vide, score number finite),
   - déduplique par userId (Map),
   - exige contest status LOCKED ou LIVE,
   - upsert `ContestScore`,
   - recompute ranking global (delete/create `ContestRanking`),
   - met `ContestEntry.status=SCORED` pour users scorés.

#### Ambiguïtés
- Dédup implicite (last value wins) non expliquée UI.
- Pas d’aperçu des users invalides/inexistants avant mutation.

### 3.5 Settle contest

#### Séquence exacte
1. Admin saisit rows rewards dans UI.
2. Submit => `POST /settle` `{rewards:[...]}`.
3. Runtime `settleContestMvp`:
   - refuse si déjà settled/existing settlement,
   - crée `ContestSettlement`,
   - crée `RewardGrant` pour chaque row,
   - si `type=POINTS` incrémente `User.points` directement,
   - `Contest.status=SETTLED`,
   - `ContestEntry.status=SETTLED` pour toutes entries.

#### Risques
- Settlement peut partir d’un reward plan sans lien explicite ranking.
- Pas de rollback fonctionnel (hors transaction DB) côté opérateur.
- Pas d’explication UI des side effects multi-table.

### 3.6 Create/edit quest

#### Séquence create
1. `/admin/quests` form create.
2. Build config conditionnel selon type.
3. `POST /api/internal/quests`.
4. Runtime `createQuestDefinitionMvp`:
   - defaults type/validation si invalides,
   - normalise reward/date,
   - normalise config par type,
   - crée row `QuestDefinition`.

#### Séquence edit
1. Toggle mode edit dans card.
2. Patch body partiel.
3. `PATCH /api/internal/quests/:questId`.
4. Runtime `updateQuestDefinitionMvp`:
   - charge existing,
   - résout nextType/nextValidation,
   - normalise dates/config,
   - update.

#### Frictions
- Edition silencieuse: peu de feedback erreurs côté UI (saveEditing ignore beaucoup d’échecs).
- Modèle dépend de compréhension enum/config.

### 3.7 Moderate social submissions

#### Séquence exacte
1. `/admin/quests/submissions` charge queue filtrée.
2. Review action appelle `/review` avec `action`.
3. Runtime `reviewQuestSubmissionMvp`:
   - vérifie submission + type social,
   - no-op si déjà reviewée,
   - update status/review metadata,
   - update/create `UserQuestProgress`,
   - si APPROVE et rewardPoints>0: credit ledger idempotent (`quest-approval:<questId>:user:<userId>`).

#### Frictions/risques
- Pas de champ note obligatoire à la décision.
- `reviewedByAdmin` reçoit `session|key`, pas admin identifier.

### 3.8 Issue manual grant

#### Séquence exacte
1. Search user ou saisie userId.
2. Saisie amount/reason.
3. UI génère `idempotencyKey = manual-ui:<userId>:<timestamp>`.
4. `POST /api/internal/rewards/manual-grant`.
5. Runtime `grantManualPointsMvp`:
   - valide user/amount/reason,
   - construit metadata,
   - `creditPointsWithLedger` (`ADMIN_GRANT`),
   - retourne applied/user/entry.

#### Frictions/risques
- Pas de réutilisation visible des idempotency keys côté opérateur.
- Pas d’étape confirmation anti-erreur montant.

### 3.9 Search/select user for admin ops

#### Séquence exacte
1. Search term envoyé à `/api/internal/users/search?q=&limit=`.
2. Runtime match sur `id`, `xUserId`, `xUsername`, `displayName` (contains insensitive).
3. UI sélectionne et remplit `userId`.

#### Limites
- Pas de contexte opérationnel enrichi dans résultat (historique grants, flags, progression, risques).

---

## 4. Contest admin audit

### 4.1 Contest creation model
Le modèle exposé en UI est quasi isomorphe à `Contest + ContestRule`:
- `code`, `title`, `status`, `startsAt/lockAt/endsAt`,
- `maxRosterSize`, `cardSetId`, `config`.

Ce qui est un vrai concept admin:
- titre/code,
- fenêtre temporelle,
- taille roster.

Ce qui est trop runtime-technique:
- `cardSetId` brut,
- `config` JSON libre,
- status enum complet dès create.

Diagnostic: panel force un modèle de base de données, pas un modèle de campagne/compétition.

### 4.2 Contest lifecycle operability
Lifecycle métier supposé: DRAFT→OPEN→LOCKED→LIVE→SETTLED (ou CANCELED).

Implémentation observée:
- UI select libre sur toutes valeurs.
- API/status accepte n’importe quel enum valide.
- Runtime fait un update direct sans validation de transition.

Conséquence:
- Opérabilité dépend de discipline humaine, pas du système.
- Fort risque d’états incohérents avec réalité opérationnelle.

### 4.3 Scoring UX / runtime coupling
Forces runtime:
- validations type/format,
- transaction,
- recompute ranking cohérent,
- status entries scorées.

Faiblesses UX:
- entrée JSON brute,
- pas de mapping assisté entrants contest,
- pas de diff avant/après ranking,
- pas d’erreur contextualisée row-level.

Couplage problématique:
- UI est obligée d’exprimer directement le contrat runtime `scores[]` brut.

### 4.4 Settlement UX / reward coupling
Forces runtime:
- unicité settlement par contest,
- transaction sérialisable,
- side effects cohérents en base.

Faiblesses ops:
- reward plan non guidé,
- absence preview user impact,
- pas de lien automatique ranking→récompense,
- mélange de concepts (RewardGrant + points direct increment).

### 4.5 Contest ops risks
Risque élevé:
1. Mauvaise transition status.
2. Erreur payload scoring.
3. Rewards mal paramétrées (user/type/amount/packDefinitionId).
4. Settlement exécuté trop tôt.
5. Incompréhension side effects (entries all SETTLED).

### 4.6 What is missing for a product-grade contest admin
- séparation stricte écrans/jobs:
  - configuration contest,
  - run lifecycle,
  - scoring workbench,
  - settlement workbench,
  - reporting post-mortem.
- APIs dédiées preview/validate avant execute.
- garde-fous state machine et confirmations contextuelles.

---

## 5. Rewards / quests admin audit

### 5.1 Quest creation model
Actuel:
- type-driven config avec conditional inputs.
- runtime normalise selon type.

Blocage:
- configuration centrée enum/config, pas centrée intention produit (campaign objective, CTA, proof policy, reward package).

### 5.2 Validation model
Enums exposés:
- `AUTO`, `SUBMIT`, `MANUAL_REVIEW`.

Problème:
- sémantique non expliquée en profondeur dans UI.
- l’admin doit savoir quand chaque mode est cohérent avec le type.

### 5.3 Reward model
Actuel:
- quest reward = `rewardPoints` entier.

Conséquences:
- pas de bundles riches natifs.
- pas de pluralité reward components.
- limite l’évolutivité produit.

### 5.4 Social quest admin model
Actuel:
- types `SOCIAL_FOLLOW_X`, `SOCIAL_ENGAGEMENT_X`.
- config social: `proofRequired`, `targetUrl`, `instructions`.

Limites:
- `SOCIAL_ENGAGEMENT_X` ne distingue pas explicitement like/retweet/comment dans modèle admin structuré.
- preuve non structurée (URL/note libres).

### 5.5 Moderation queue quality
Points positifs:
- queue opérationnelle,
- filtre status,
- approve/reject rapide.

Points faibles:
- pas de SLA/aging indicators,
- pas de priorisation intelligente,
- pas de mode audit anti-abus,
- pas de bulk.

### 5.6 Manual grants operability
Forces:
- ledger-backed,
- trace metadata,
- recherche user intégrée.

Faiblesses:
- contrôles process faibles,
- pas d’approbation hiérarchique,
- pas de segmentation motif standard.

### 5.7 Analytics usability
Actuel:
- counts + total points distributed.

Insuffisant:
- pas de trend temporel,
- pas de conversion funnel,
- pas de drill-down causal.

### 5.8 What is missing for a product-grade rewards admin
- reward abstraction unifiée et extensible.
- outils campagne sociale et modération industrielle.
- policies ops (limits, approvals, anomaly alerts).

---

## 6. UX / operability audit

### 6.1 Navigation issues
- Aucun shell admin persistant (menu global).
- Retour contextuel via liens ad hoc.
- Pas de fil d’Ariane cross-domain.

### 6.2 Information architecture issues
- Mélanges récurrents de jobs:
  - `/admin/contests`: config + listing,
  - `/admin/contests/:id`: monitor + execute status + execute scoring + execute settlement,
  - `/admin/quests`: create + catalogue + edit transactionnel.

### 6.3 Form and field design issues
Champs techniquement exposés en frontal admin:
- contests: `status`, `cardSetId`, `config` JSON,
- scoring: JSON brut `scores`,
- settlement: `userId`, `type`, `amount`, `packDefinitionId`,
- quests: `type`, `validationMode`, `config` dépendant,
- rewards: `userId`, `reasonCode`, `idempotency` implicite.

Diagnostic:
- L’UI reflète la forme des payloads API, pas les intentions opérateur.

### 6.4 Missing guidance / explanations
- Peu de textes d’aide orientés risques.
- Effets de bord rarement explicités avant action.
- Absence de checklists contextuelles.

### 6.5 Missing previews / summaries
- pas de preview scoring impact,
- pas de simulation settlement,
- pas de résumé opérationnel final avant commit.

### 6.6 Error-proneness / ops risk
- système fortement dépendant de prudence manuelle.
- peu de barrières anti-erreur structurées.

---

## 7. Use-case audit

### 7.1 Create a contest
- Faisable: Oui.
- Clair: Partiellement.
- Guidé: Non.
- Sûr: Moyen-faible.
- Rapide: Oui pour opérateur technique; non pour profil produit non technique.
- Product-grade: Non.
- Savoirs requis: enum lifecycle, rule model, ids techniques.
- Risques: mauvais status, mauvais cardSetId, config incohérente.
- Blocages scale: absence templates/wizard/validation métier.

### 7.2 Run a contest safely
- Faisable: Oui.
- Clair: Moyen.
- Guidé: Faible.
- Sûr: Faible-moyen.
- Rapide: Oui si expert interne.
- Product-grade: Non.
- Savoirs requis: séquence status implicite.
- Risques: transitions non contrôlées.
- Blocages scale: manque workbench lifecycle.

### 7.3 Settle rewards safely
- Faisable: Oui.
- Clair: Faible.
- Guidé: Non.
- Sûr: Faible.
- Rapide: Oui mais risqué.
- Product-grade: Non.
- Savoirs requis: mapping ranking->userId, types rewards, side effects points.
- Risques: mauvaise attribution, contest settled prématurément.
- Blocages scale: pas de preview/reconciliation.

### 7.4 Configure a Follow X quest
- Faisable: Oui.
- Clair: Moyen.
- Guidé: Partiel.
- Sûr: Moyen.
- Rapide: Correct.
- Product-grade: Pas encore.
- Savoirs requis: mode validation + proof config.
- Risques: mismatch type/validation/policy.
- Blocages scale: modèle campagne limité.

### 7.5 Configure a Like/RT/Comment quest
- Faisable: Partiellement (via `SOCIAL_ENGAGEMENT_X`).
- Clair: Faible-moyen.
- Guidé: Faible.
- Sûr: Moyen.
- Rapide: Moyen.
- Product-grade: Non.
- Savoirs requis: interprétation non structurée de “engagement”.
- Risques: config trop générique, ambiguïté de preuve.
- Blocages scale: pas de taxonomie d’actions sociales fine.

### 7.6 Configure a contest milestone quest
- Faisable: Oui.
- Clair: Moyen.
- Guidé: Partiel (threshold field).
- Sûr: Moyen.
- Rapide: Oui.
- Product-grade: Partiel.
- Savoirs requis: concept threshold + auto progression.
- Risques: seuil mal dimensionné.
- Blocages scale: peu d’outils de simulation impact.

### 7.7 Issue a manual compensation grant
- Faisable: Oui.
- Clair: Plutôt oui.
- Guidé: Moyen.
- Sûr: Moyen-faible.
- Rapide: Oui.
- Product-grade: Non.
- Savoirs requis: userId interne, reason discipline.
- Risques: erreurs montant/mauvais user, absence 4-eyes.
- Blocages scale: governance grants insuffisante.

### 7.8 Prepare for future reward bundles
- Faisable aujourd’hui: Non (natif insuffisant).
- Clair: N/A.
- Guidé: N/A.
- Sûr: N/A.
- Rapide: N/A.
- Product-grade: Non.
- Savoirs requis: bricolage technique.
- Risques: explosion complexité si patchée sans modèle.
- Blocages scale: reward schema/admin contract trop points-centric.

### 7.9 Moderate a social submission
- Faisable: Oui.
- Clair: Oui en MVP.
- Guidé: Basique.
- Sûr: Moyen.
- Rapide: Oui pour faible volume.
- Product-grade: Non.
- Savoirs requis: policy interne de preuve.
- Risques: décisions inconsistantes faute cadre.
- Blocages scale: no batch/no reviewer tooling/no anti-abuse signals.

### 7.10 Search/select user for admin operation
- Faisable: Oui.
- Clair: Oui.
- Guidé: Oui basique.
- Sûr: Moyen.
- Rapide: Oui.
- Product-grade: Partiel.
- Savoirs requis: connaître attributs user attendus.
- Risques: faux positif user selection, pas de fiche contextualisée.
- Blocages scale: recherche non enrichie ops.

### 7.11 Score a contest
- Faisable: Oui.
- Clair: Faible.
- Guidé: Non.
- Sûr: Faible.
- Rapide: Oui techniquement.
- Product-grade: Non.
- Savoirs requis: format JSON exact, userId exacts.
- Risques: payload erreurs/doublons/omissions.
- Blocages scale: absence import pipeline/preview.

---

## 8. Gap analysis

### 8.1 Missing for a coherent admin back-office
- Ops dashboard transversal.
- Architecture de navigation orientée processus.
- séparation explicite des modules selon jobs.

### 8.2 Missing for contest ops maturity
- State machine enforceable.
- scoring workspace fiable.
- settlement planner avec simulation.

### 8.3 Missing for social campaign ops
- modèle campagne structuré.
- preuve et policy de modération outillées.
- productivité queue à volume.

### 8.4 Missing for reward bundle extensibility
- modèle de reward composable.
- APIs/admin contracts bundle-aware.

### 8.5 Missing for safer admin workflows
- preview systématique,
- confirmations à contexte,
- approbation à seuil,
- audit trail opérateur nominatif.

---

## 9. Redesign requirements for next phase

### 9.1 Global admin UX requirements
- Shell admin persistant + navigation process-first.
- Dashboard priorisé (work queues + alertes).
- Standardisation des patterns critiques (prepare/validate/execute).

### 9.2 Contest admin requirements
- création contest guidée par intention produit.
- transitions lifecycle contraintes et explicitées.
- scoring import + validation row-level + preview ranking diff.
- settlement assistant avec proposition auto + simulation points/rewards.

### 9.3 Rewards/quests admin requirements
- quest builder orienté cas d’usage/campagne.
- modération outillée pour volume.
- manual grants avec governance.

### 9.4 Data/config implications
- abstractions admin au-dessus des tables runtime.
- réduction de JSON libre exposé.
- préparation reward bundles.

### 9.5 API/runtime implications
- endpoints de prévalidation et simulation.
- enrichissement erreurs métier orientées opérateur.
- harmonisation rewards accounting.

### 9.6 What should be preserved from current implementation
- transactions sérialisables sur flows critiques.
- conventions d’idempotency.
- séparation public/internal APIs.
- base fonctionnelle MVP déjà large.

---

## 10. Recommended redesign priorities

### 10.1 Must fix first
1. Contest state/scoring/settlement safety rails.
2. Séparation des jobs admin par surfaces dédiées.
3. Unification cohérence rewards-grants-ledger-points.
4. Preview/simulation sur actions critiques.

### 10.2 Should fix next
1. Quest campaign model + richer social action types.
2. Moderation throughput tooling.
3. Manual grants governance et contrôles.

### 10.3 Later improvements
1. Analytics ops avancées.
2. Automations anti-abus.
3. Capabilities enterprise-grade audit/compliance.

---

## 11. File-by-file evidence appendix

### 11.1 UI admin surfaces

#### `app/admin/(protected)/layout.tsx`
- Observation: gate unique session cookie, redirect `/admin/login` si absent.
- Importance: point de contrôle principal de l’accès UI admin.
- Limite révélée: aucun niveau d’autorisation fin.

#### `app/admin/(protected)/page.tsx`
- Observation: home = 4 cards navigation, aucun état ops.
- Importance: entrypoint admin officiel.
- Limite révélée: pas de pilotage global.

#### `app/admin/(protected)/contests/page.tsx`
- Observation: create form expose `status`, dates, `maxRosterSize`, `cardSetId`, `config JSON` + list cards.
- Importance: principal point d’entrée contest config.
- Limites révélées: modèle brut orienté schema; validations métier faibles.

#### `app/admin/(protected)/contests/[contestId]/page.tsx`
- Observation: enchaîne status select, score JSON textarea, settlement rows manuelles, ranking snapshot.
- Importance: cœur ops contest.
- Limites révélées: mélange jobs critiques; forte fragilité opérateur.

#### `app/admin/(protected)/quests/page.tsx`
- Observation: create + catalogue + inline edit + toggle, champs conditionnels type social/milestone.
- Importance: console quest centrale.
- Limites révélées: densité élevée, dépendance enums/config.

#### `app/admin/(protected)/quests/[questId]/page.tsx`
- Observation: vue d’identité + analytics + listes submissions/completions/ledger credits, config JSON brut.
- Importance: diagnostic post-config.
- Limites révélées: lecture brute peu actionnable.

#### `app/admin/(protected)/quests/submissions/page.tsx`
- Observation: filter status + approve/reject unitaire.
- Importance: modération sociale live.
- Limites révélées: pas de tooling volume ni cadre décision structuré.

#### `app/admin/(protected)/rewards/page.tsx`
- Observation: user search + grant form + history; idempotency key auto générée côté client.
- Importance: compensation/support.
- Limites révélées: governance sécurité faible.

#### `app/admin/login/page.tsx`
- Observation: login simple username/password -> redirect contests.
- Importance: porte d’entrée admin.
- Limites révélées: UX authentification minimale, pas de self-diagnostic config.

#### `components/admin/AdminLogoutButton.tsx`
- Observation: POST logout + replace login.
- Importance: sécurité session.
- Limite révélée: pas de confirmation ni état de session visible.

### 11.2 APIs admin/internal

#### `app/api/admin/login/route.ts`
- Responsabilité: auth credentials + cookie session.
- Input: `{username,password}`.
- Output: `{ok:true}` + cookie; erreurs 400/401/503.
- Critique: bon endpoint de base, pas d’info contextuelle (account lock, audit id).

#### `app/api/admin/logout/route.ts`
- Responsabilité: clear cookie.
- Input: none.
- Output: `{ok:true}`.
- Critique: minimaliste, acceptable.

#### `app/api/internal/contests/route.ts`
- GET: list contests avec rules + counts.
- POST: create contest à partir payload brut.
- Critique: CRUD-like, pousse UI à exposer schema brut; pas de create-preview.

#### `app/api/internal/contests/[contestId]/route.ts`
- GET detail + rankings + recentScores.
- Critique: utile en lecture, mais snapshots limités (top 25) et pas de synthèse opérationnelle.

#### `app/api/internal/contests/[contestId]/status/route.ts`
- POST status enum.
- Critique: manque garde-fous transitions/impact.

#### `app/api/internal/contests/[contestId]/score/route.ts`
- POST scores payload brut.
- Critique: runtime-friendly, admin-unfriendly; pas de validate-only endpoint.

#### `app/api/internal/contests/[contestId]/settle/route.ts`
- POST rewards payload brut.
- Critique: pas de simulation ni reward plan assisté.

#### `app/api/internal/quests/route.ts`
- GET list internal quests analytics enrichies.
- POST create quest.
- Critique: base solide; reste orienté modèle technique.

#### `app/api/internal/quests/[questId]/route.ts`
- GET detail analytics.
- PATCH update quest.
- Critique: puissant mais patch permissif; pas de validate endpoint.

#### `app/api/internal/quests/submissions/route.ts`
- GET queue avec filtre status.
- Critique: suffisant MVP; manque pagination/priority controls explicites.

#### `app/api/internal/quests/submissions/[submissionId]/review/route.ts`
- POST action APPROVE|REJECT, note optionnelle.
- Critique: note non obligatoire, actor identity faible.

#### `app/api/internal/rewards/manual-grant/route.ts`
- GET recent grants.
- POST apply manual grant.
- Critique: bon socle, manque policy endpoints (limits/approvals).

#### `app/api/internal/users/search/route.ts`
- GET query search user.
- Critique: utilitaire efficace, pas de contexte opérationnel enrichi.

### 11.3 Runtime / logique métier / auth helpers

#### `lib/admin-auth.ts`
- Fait: PBKDF2 verify, HMAC session token, TTL 8h, cookie helpers.
- Valeur: implémentation claire et compacte.
- Limites: identité admin limitée à username unique env; pas de multi-admin model.

#### `lib/internal-auth.ts`
- Fait: auth internal via clé + fallback session.
- Valeur: support script/m2m.
- Limite: `mode` renvoyé (`session|key`) peut polluer audit métier si utilisé comme identité.

#### `lib/domain/contests/runtime.ts`
- Faits critiques:
  - `recordContestScoresMvp` accepte payload brut, recalc ranking, updates entries,
  - `settleContestMvp` crée settlement/reward grants + points direct increments,
  - `updateContestStatusMvp` update direct sans matrice transition.
- Valeur: transactions sérialisables, invariants de base.
- Limites: contrats runtime-centric exposés en UI; cohérence reward accounting hétérogène.

#### `lib/domain/quests/runtime.ts`
- Faits critiques:
  - normalization config type-dependent,
  - social submit/review flows,
  - approbation crédite ledger avec idempotency,
  - analytics agrégées internal.
- Valeur: runtime plus structuré que contests côté rewards.
- Limites: dépendance enums/config reste forte côté admin.

#### `lib/domain/rewards/manual-grants.ts`
- Faits: validation forte input + credit ledger ADMIN_GRANT transactionnel.
- Valeur: meilleure auditabilité que points direct.
- Limite: gouvernance process non codifiée (policy/approval).

#### `lib/domain/rewards/ledger.ts`
- Faits: credit/debit helpers, idempotency support.
- Valeur: primitive solide pour audit reward.
- Limite: usage non uniformisé across all reward flows.

#### `lib/domain/rewards/conventions.ts`
- Faits: conventions reasonRef/idempotency centralisées.
- Valeur: cohérence partielle des clés ledger.
- Limite: ne couvre pas harmonisation RewardGrant contest path.

#### `lib/domain/users/search.ts`
- Faits: recherche contains sur id/x ids/name, limit cap 20.
- Valeur: simple et utile.
- Limite: pas de score de pertinence ni enrichissement ops.

### 11.4 Data model evidence and admin-model fit

#### `Contest`
- Admin concept: oui (entité de compétition).
- Exposé brut problématique: status/timestamps sans orchestration.

#### `ContestRule`
- Admin concept: partiel (règles de compétition).
- Problème: `config Json?` pousse UI à JSON libre.

#### `ContestEntry`
- Admin concept: oui pour participation.
- Problème: états internes exposables sans abstraction de phase utilisateur.

#### `ContestScore`
- Admin concept: oui mais opération devrait être outil assisté, pas payload brut.

#### `ContestRanking`
- Admin concept: oui (output lisible), bon candidat pour surfaces analytics.

#### `ContestSettlement`
- Admin concept: oui (événement de clôture), mais nécessite guardrails process.

#### `RewardGrant`
- Admin concept: oui pour attribution non-ledger historique contest.
- Problème: coexistence avec ledger credits complexifie modèle mental.

#### `RewardLedgerEntry`
- Admin concept: oui pour audit comptable points.
- Problème: pas universellement utilisé sur tous flows rewards.

#### `QuestDefinition`
- Admin concept: oui.
- Problème: `config Json?` et enums imposent modèle technique.

#### `UserQuestProgress`
- Admin concept: oui pour suivi progression.
- Problème: états techniques pouvant être mal interprétés sans UX dédiée.

#### `QuestSubmission`
- Admin concept: oui (objet de modération).
- Problème: preuve libre non structurée limite qualité review.

### 11.5 Documentation evidence

#### `README.md`
- Documente routes admin/internal et principaux concepts.
- Limite: description opérationnelle admin reste high-level.

#### `docs/current-runtime-architecture.md`
- Couvre architecture runtime contests/internal split.
- Limite: détail UX admin limité.

#### `docs/reward-system-audit-2026-03.md`
- Documente état rewards/quests MVP et gaps.
- Limite: focalisé rewards, pas audit global admin.

#### `docs/repo-cartography-2026-03.md`
- Cartographie repo/routes/services utile.
- Limite: certaines assertions historiques ne reflètent pas totalement l’état admin enrichi actuel.

#### `docs/repo-and-docs-consolidation-audit-2026-03.md`
- Fichier absent dans le repo au moment de cet audit V2.

---

## 12. Admin belief vs system reality (critical actions)

### 12.1 Contest status update
- Ce que l’admin croit faire: “changer de phase du contest”.
- Ce que le système fait réellement: update direct de champ status sans validation de transition métier.
- Risque: phase incohérente par rapport aux données et opérations déjà exécutées.

### 12.2 Contest scoring
- Ce que l’admin croit faire: “injecter les résultats”.
- Ce que le système fait réellement:
  - upsert score par user,
  - recompute ranking complet,
  - écrase ranking précédent,
  - marque entries scorées.
- Risque: un payload imparfait réécrit la vérité opérationnelle.

### 12.3 Contest settlement
- Ce que l’admin croit faire: “attribuer les récompenses des gagnants”.
- Ce que le système fait réellement:
  - crée settlement unique,
  - crée RewardGrant rows,
  - incrémente directement points pour rewards POINTS,
  - force contest et entries en SETTLED.
- Risque: side effects plus larges que perçus, non prévisualisés.

### 12.4 Submission moderation approve
- Ce que l’admin croit faire: “approuver une preuve”.
- Ce que le système fait réellement:
  - met submission APPROVED,
  - met progression COMPLETED,
  - crédite points via ledger idempotent.
- Risque: si policy review faible, crédit points déclenché sur preuve insuffisante.

### 12.5 Manual grant
- Ce que l’admin croit faire: “compenser un utilisateur”.
- Ce que le système fait réellement:
  - écrit un ledger CREDIT ADMIN_GRANT,
  - incrémente points,
  - idempotence dépend de clé fournie/générée.
- Risque: process governance faible -> surcompensation ou erreurs répétées.
