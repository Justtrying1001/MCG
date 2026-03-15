# MCG — Bible Technique du Repository

> **Référence technique exhaustive** du projet MCG.  
> Ce document centralise architecture, conventions, modules, modèles de données, flux runtime, surfaces API, sécurité, exploitation, qualité et déploiement.
> Le complément produit/user est dans `docs/user-guide.md`.

---

## 1) Objectif du document

Ce document doit permettre à une équipe tech (dev, lead, SRE, QA, ops) de :
- comprendre rapidement la structure du repo,
- localiser la logique métier,
- identifier les surfaces de mutation/lecture,
- opérer le runtime sans ambiguïté,
- diagnostiquer les incidents,
- maintenir et faire évoluer la plateforme.

---

## 2) Stack, dépendances et runtime

### 2.1 Stack principale
- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Prisma 5**
- **PostgreSQL**
- **Zod** (validation)
- **Vitest** (tests)

### 2.2 Dépendances runtime (package)
- `next`, `react`, `react-dom`
- `@prisma/client`
- `zod`
- `@vercel/analytics`

### 2.3 Dépendances dev
- `prisma`, `typescript`, `vitest`
- `eslint`, `eslint-config-next`
- types React/Node

### 2.4 Scripts opératoires
- `dev`: `prisma generate && next dev`
- `build`: `prisma generate && next build`
- `start`: `next start`
- `lint`: `next lint`
- `typecheck`: `prisma generate && tsc --noEmit`
- `test`: `vitest run`
- scripts seed/bootstrap : voir section 15

---

## 3) Cartographie du repository

### 3.1 Arborescence utile
- `app/` : UI routes + API route handlers.
- `components/` : composants UI (user/admin/domain).
- `lib/` : services transverses + domaines métier.
- `lib/domain/` : logique métier principale.
- `lib/admin/` : workbenches/outils admin.
- `prisma/` : schéma + scripts seed/check.
- `data/` : dataset canonique cartes.
- `scripts/` : utilitaires runtime.
- `tests/` : tests unitaires/intégration.

### 3.2 Architecture en couches
1. **Presentation layer** : pages App Router + composants.
2. **HTTP layer** : handlers API `app/api/**/route.ts`.
3. **Domain layer** : orchestration métier dans `lib/domain/**`.
4. **Persistence layer** : Prisma Client + PostgreSQL.
5. **Admin ops layer** : logique interne, contrôles et audit.

### 3.3 Convention de responsabilité
- Les mutations métier passent prioritairement par routes API explicites.
- Les modules `lib/domain` doivent rester la source de vérité fonctionnelle.
- Les composants UI consomment des contrats sérialisés.

---

## 4) Pages applicatives (surface front)

### 4.1 Pages user
- `/` → `app/page.tsx`
- `/packs` → `app/packs/page.tsx`
- `/collection` → `app/collection/page.tsx`
- `/contests` → `app/contests/page.tsx`
- `/contests/[contestId]` → `app/contests/[contestId]/page.tsx`
- `/rewards` → `app/rewards/page.tsx`
- `/compte` → `app/compte/page.tsx`
- `/combats` → `app/combats/page.tsx` (legacy)

### 4.2 Pages admin
- `/admin/login` → `app/admin/login/page.tsx`
- `/admin/(protected)` → surfaces protégées (layout + pages)

### 4.3 Layouts et styles
- `app/layout.tsx`
- `app/globals.css`
- `app/design-system.css`
- `styles/*.css`

---

## 5) API publique

### 5.1 Auth/session
- `GET /api/auth/x/start`
- `GET /api/auth/x/callback`
- `POST /api/auth/logout`
- `GET /api/me`

### 5.2 Packs
- `GET /api/pack/config`
- `POST /api/pack/open`

### 5.3 Contests
- `GET /api/contests`
- `GET /api/contests/[contestId]`
- `GET /api/contests/[contestId]/ranking`
- `GET /api/contests/[contestId]/lineup-options`
- `POST /api/contests/[contestId]/enter`

### 5.4 Quêtes / rewards
- `GET /api/quests`
- `POST /api/quests/[questId]/submit`
- `GET /api/rewards/ledger`

### 5.5 Legacy PvE
- `app/api/pve/*`

Statut : surfaces maintenues pour compatibilité, mais hors boucle produit prioritaire.

---

## 6) API interne / admin

Préfixe : `app/api/internal/**`

### 6.1 Contests
- CRUD/édition statut (`/contests`, `/contests/[contestId]`, `/status`, `/score`, `/settle`)
- Config lifecycle (`/contest-configs/**`)
- Orchestration run (`/contest-runs/**`)

### 6.2 Contest runs (opérations lourdes)
- snapshots (`/snapshots/start`, `/snapshots/end`)
- scoring (`/scoring/preview`, `/compute`, `/validate`)
- settlement plan (`/generate`, `/preview`, `/execute`, `/validate`)
- overview opérationnel

### 6.3 Quêtes / modération
- quests CRUD/lifecycle/library
- review submissions
- moderation queue/context/decide

### 6.4 Rewards / compensations
- manual grant
- pack grant
- compensations preview/validate/execute

### 6.5 Admin ops / users
- admin actions log / action details
- dashboard summaries
- users search + admin context

---

## 7) Domaine métier — acquisition et cartes

### 7.1 Modules
- `lib/domain/acquisition/open-pack.ts`
- `lib/domain/acquisition/pack-config.ts`
- `lib/domain/acquisition/slot-weights.ts`
- `lib/domain/acquisition/constants.ts`
- `lib/domain/cards/token-master.ts`

### 7.2 Responsabilités clés
- déterminer le pack actif et sa validité runtime,
- effectuer des tirages pondérés par slots,
- appliquer garde-fous supply,
- matérialiser l’ouverture en événement + instances possédées,
- aligner impacts économiques dans ledger.

### 7.3 Invariants à préserver
- un tirage doit être traçable (event/log + instances),
- la supply de template ne doit pas diverger,
- l’état collection utilisateur doit refléter les écritures d’acquisition.

---

## 8) Domaine métier — contests

### 8.1 Modules
- `lib/domain/contests/runtime.ts`
- `lib/domain/contests/config-runtime.ts`
- `lib/domain/contests/eligibility-runtime.ts`
- `lib/domain/contests/scoring-engine-runtime.ts`
- `lib/domain/contests/snapshot-runtime.ts`
- `lib/domain/contests/settlement-plan-runtime.ts`
- `lib/domain/contests/settlement-plan-runtime.ts`

### 8.2 Machine de cycle de vie (conceptuelle)
`DRAFT -> OPEN -> LOCKED -> LIVE -> SETTLED` (+ `CANCELED`)

### 8.3 Entrée contest
- validation fenêtre temporelle,
- validation ownership des cartes,
- validation règles d’éligibilité,
- création entrée + lock roster,
- débit frais d’entrée si policy active.

### 8.4 Scoring & settlement
- collecte/snapshot données source,
- calcul score (ou import validé),
- génération plan de settlement,
- preview et validation,
- exécution idempotente,
- distribution de rewards et publication ranking.

### 8.5 Risques techniques
- double exécution settlement,
- dérive entre scoring preview et scoring final,
- changements de statut non conformes,
- incohérences entre contest entries et roster locks.

---

## 9) Domaine métier — quests

### 9.1 Modules
- `lib/domain/quests/runtime.ts`
- `lib/domain/quests/social.ts`
- `lib/domain/quests/milestone-definitions.ts`
- `lib/domain/quests/milestone-seed.ts`

### 9.2 Flux standard
1. Publication/activation de quêtes.
2. Soumission de preuves par user.
3. Mise en file de review.
4. Décision modération/admin.
5. Attribution des rewards associées.

### 9.3 Contraintes
- décision review idempotente,
- transitions de statut explicites,
- traçabilité des grants liés à une submission.

---

## 10) Domaine métier — rewards et économie

### 10.1 Modules
- `lib/domain/rewards/ledger.ts`
- `lib/domain/rewards/conventions.ts`
- `lib/domain/rewards/welcome.ts`
- `lib/domain/rewards/onboarding.ts`
- `lib/domain/rewards/manual-grants.ts`
- `lib/domain/rewards/reward-pack-grants.ts`

### 10.2 Rôle du ledger
- source de vérité des écritures de points/récompenses,
- justification métier de chaque variation,
- auditabilité post-opérations.

### 10.3 Familles de raisons (exemples)
- welcome reward
- pack open
- quest reward
- contest entry fee
- admin grant

---

## 11) Projections et read models

### 11.1 Modules
- `lib/domain/projections/collection.ts`
- `lib/domain/projections/contracts.ts`
- `lib/domain/progression/profile-summary.ts`

### 11.2 Objectif
- transformer des états relationnels en read models optimisés UI,
- fournir des contrats stables au frontend,
- réduire logique de composition côté composants.

---

## 12) Authentification, session et sécurité

### 12.1 Auth user
- OAuth X via `lib/x-oauth.ts`
- session via `lib/auth.ts` (cookie applicatif + token hashé)
- consommation session côté UI via `components/useSession.ts`

### 12.2 Auth admin
- credentials admin : `lib/admin-auth.ts`
- clés internes et gardes : `lib/internal-auth.ts`

### 12.3 Secrets et env
Variables clés :
- `DATABASE_URL`
- `X_CONSUMER_KEY`
- `X_CONSUMER_SECRET`
- `X_REDIRECT_URI`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`
- `INTERNAL_ADMIN_KEY` (+ variantes role/id)

### 12.4 Risques sécurité à surveiller
- exposition d’endpoints internes sans garde adéquate,
- faiblesse des secrets admin,
- mauvaise séparation des rôles,
- idempotence absente sur opérations sensibles.

---

## 13) Base de données Prisma

Source of truth : `prisma/schema.prisma`

### 13.1 Familles de modèles
- **Identité/session** : `User`, `UserSession`
- **Legacy continuité** : `UserCard`, `PackOpening`
- **Cards/Packs** : `TokenProject`, `CardSet`, `Rarity`, `Edition`, `CardTemplate`, `PackDefinition`, `DropTable`, `DropTableRow`, `PackOpeningEvent`, `OwnedCardInstance`
- **Contests** : `Contest`, `ContestRule`, `ContestEntry`, `RosterLock`, `ContestScore`, `ContestRanking`, `ContestSettlement`, `ContestRewardPolicy`, `ContestRewardBundle`, `ContestRewardComponent`, `ContestRewardDistributionRule`, `ContestSettlementPlan`, `ContestSettlementPlanItem`
- **Quêtes** : `QuestDefinition`, `UserQuestProgress`, `QuestSubmission`
- **Rewards** : `RewardGrant`, `RewardLedgerEntry`
- **Progression** : `UserProgression`, `CollectionProgression`, `CompetitiveProgression`
- **Admin/Audit** : `AdminActionLog`, `AdminOpArtifact`, `AdminIdempotencyKey`

### 13.2 Principes data
- privilégier transactions sur mutations multi-étapes,
- garantir cohérence entre tables source et projections,
- tracer les opérations admin impactantes.

---

## 14) Composants UI et conventions front

### 14.1 Composants transverses
- `components/ui/*` (buttons, modal, drawer, badges, cards)

### 14.2 Composants par domaine
- home : `components/home/*`
- contests : `components/contests/*`
- collection : `components/collection/*`
- rewards : `components/rewards/*`
- profile : `components/profile/*`
- admin : `components/admin/*`

### 14.3 Principes
- composants d’affichage séparés de la logique métier,
- contrats data explicites,
- réutilisation des primitives UI communes.

---

## 15) Seed, bootstrap et scripts

### 15.1 Seed runtime
- `npm run seed:mvp:controlled-emission`
- `npm run seed:milestone:rewards`

### 15.2 Bootstrap/check
- `npm run check:mvp:bootstrap`
- `npm run bootstrap:mvp:cloud`
- `npm run bootstrap:mvp:cloud:deploy`

### 15.3 Scripts dataset
- `npm run build:token-master-50`
- `scripts/simulate-genesis-pack-distribution.mjs`

### 15.4 Finalité
- garantir un état initial cohérent,
- détecter tôt les dérives de configuration,
- rendre le runtime reproductible entre environnements.

---

## 16) Qualité, tests et validation

### 16.1 Type safety
- `npm run typecheck`

### 16.2 Test suite
- `npm test`
- tests sur domains, routes API, admin flows, scripts audit/bootstrap

### 16.3 Lint
- `npm run lint`

### 16.4 Stratégie de vérification recommandée avant merge
1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. smoke test local des routes critiques (packs, contests, quests, rewards)

---

## 17) Déploiement et exploitation

### 17.1 Build
- `npm run build`
- `npm run start`

### 17.2 Vercel pipeline
- `npm run vercel-build` (inclut génération Prisma + bootstrap deploy)

### 17.3 Observabilité minimale à maintenir
- erreurs API (statuts, payloads)
- incidents contest-run (scoring/settlement)
- dérives rewards/ledger
- logs d’actions admin

### 17.4 Playbook incident (résumé)
1. Identifier domaine touché (packs/contests/quests/rewards).
2. Isoler endpoint(s) en erreur.
3. Vérifier env secrets + DB connectivité.
4. Examiner traces admin action/idempotency.
5. Exécuter correction contrôlée (compensation/manual grant/re-run validé).

---

## 18) Limitations connues

- Surfaces legacy conservées pour compatibilité (PvE).
- Certaines validations avancées dépendent des configurations runtime admin.
- La fiabilité opérationnelle dépend fortement des secrets et rôles correctement paramétrés.

---

## 19) Conventions d’évolution

### 19.1 Pour ajouter une feature
- définir d’abord le contrat métier dans `lib/domain/*`
- exposer via route API dédiée
- sérialiser proprement pour la couche UI
- couvrir par tests unitaires/intégration

### 19.2 Pour modifier un flux critique (packs/contests/settlement)
- identifier invariants data
- ajouter garde-fous/idempotence
- vérifier impacts sur ledger/rewards
- prévoir stratégie rollback opérationnelle

### 19.3 Pour admin ops
- tracer toute action à impact,
- éviter les side effects silencieux,
- garder des endpoints explicites et auditables.

---

## 20) Index rapide des fichiers critiques

- Auth/session : `lib/auth.ts`, `lib/x-oauth.ts`, `lib/admin-auth.ts`, `lib/internal-auth.ts`
- Prisma : `lib/prisma.ts`, `prisma/schema.prisma`
- Packs : `lib/domain/acquisition/*`
- Cards : `lib/domain/cards/token-master.ts`
- Contests : `lib/domain/contests/*`
- Quests : `lib/domain/quests/*`
- Rewards : `lib/domain/rewards/*`
- Projections : `lib/domain/projections/*`, `lib/domain/progression/*`
- Admin helpers : `lib/admin/*`, `lib/admin-ops.ts`
- APIs : `app/api/**/route.ts`

---

## 21) Conclusion

Ce document constitue la **bible technique** du repo MCG.  
Il doit rester aligné avec le code effectif et être mis à jour à chaque évolution structurelle majeure (domain model, routes critiques, schéma Prisma, pipelines d’exploitation).
