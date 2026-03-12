# MCG Admin UI Audit

## 1. Executive summary

### 1.1 Current admin UI reality
Le panel admin est **fonctionnel mais hétérogène**: une nouvelle shell cohérente existe (`AdminShell`, sidebar modules, styles partagés), mais plusieurs surfaces restent des workbenches techniques MVP avec logique orientée payload/API plutôt qu’orientation opérateur produit. On observe une coexistence active entre flows récents structurés (contest-config, moderation queue) et flows legacy encore accessibles (contests legacy, quests legacy).  

### 1.2 What works
- **Shell et IA module**: navigation latérale claire, regroupement par grands modules, signaux de contexte (“Ops cockpit”, “Lifecycle & runs”, etc.).
- **Ops dashboards**: home admin + activity log + moderation queue donnent des signaux opérationnels utiles (backlog, échecs, SLA, audit trail).
- **Contest run safety rails**: lifecycle/scoring/settlement sont découpés en validate/preview/execute avec confirmations explicites.
- **Moderation UX**: queue + detail + history est le module le plus “ops-grade” actuellement.

### 1.3 What is confusing or weak
- **Densité et sémantique trop backend-ish** dans les modules critiques (contest create, scoring, settlement, rewards).
- **Terminologie incohérente** (phase/status, contest section/admin panel styles, labels legacy vs nouveaux).
- **Construction de rewards/distribution trop preset** côté contest create: faible lisibilité métier pour un admin non-tech.
- **Redondance Dashboard vs Analytics** (deux écrans très proches, valeur distincte faible).
- **Coexistence legacy encore trop visible** dans plusieurs modules (contests, quests), risque de mauvais chemin ops.

### 1.4 Highest-risk admin flows
1. Contest create (nouveau wizard): plus lisible qu’avant, mais encore trop “configuration technique” et presets implicites.  
2. Contest scoring workbench: saisie manuelle `userId/score` fragile malgré rails.  
3. Settlement (legacy coexistence): transition en cours, mais opérabilité dépend encore de compréhension des chemins.  
4. Rewards manual compensation: flow sensible (points ledger) dans UI compacte, peu guidée sur impacts/risques.

### 1.5 Recommended redesign priorities
1. **P0**: unifier contest run IA (create → lifecycle → scoring → settlement) avec langage produit et états explicites.  
2. **P0**: durcir deprecation UX des chemins legacy (gating visuel et navigation).  
3. **P1**: refondre rewards ops (wizard + impact panels + confirmations standardisées).  
4. **P1**: harmoniser patterns de formulaires/états/erreurs cross-modules.  
5. **P2**: fusionner/repositionner Analytics vs Dashboard.

---

## 2. Admin information architecture audit

### 2.1 Inventory réel des surfaces
Modules actifs identifiés:
- Dashboard (`/admin`)
- Contests (catalog, create, overview, lifecycle, scoring, settlement, audit, legacy)
- Campaigns & Quests (catalog campaigns, quest library, builder, detail, submissions legacy, quests legacy)
- Moderation (queue, submission detail, decision history)
- Rewards (manual compensation/grants)
- Users (search + admin context)
- Analytics (baseline)
- Activity Log
- Auth (`/admin/login`)

### 2.2 Architecture de navigation
- La sidebar est claire et stable.
- Les modules sont bien regroupés à haut niveau.
- Problème principal: **les sous-flows critiques sont dispersés** entre pages overview, workbenches, legacy links et écrans historiques sans gouvernance visuelle forte.

### 2.3 Discoverability
- Bonne discoverability des modules top-level.
- Discoverability moyenne/faible des “bons chemins” à l’intérieur des modules critiques:
  - Contests: l’overview propose plusieurs liens mais sans priorisation visuelle forte du chemin recommandé.
  - Quests/Moderation: meilleur couplage via liens de contexte.

### 2.4 Setup vs Run vs Audit vs Maintenance
- Cette séparation existe partiellement (ex: contests: create/setup vs run vs audit).
- Elle n’est pas systématiquement matérialisée en IA secondaire cohérente (onglets/sections standard), donc dépend du texte de page.

---

## 3. Module-by-module audit

## 3.1 Dashboard
**État**: Bon / Partiel
- Bon: KPIs utiles, actions prioritaires, événements critiques récents.
- Partiel: écran très orienté “copilotage ops” mais peu de drill-down natif; dépend de liens externes.
- Dette: recouvrement fort avec page Analytics.

## 3.2 Contests
**État**: Partiel / Confus / Critique sur certains flux

### Catalog
- Bon: table dense, filtres, accès rapide aux workbenches.
- Confus: liens legacy visibles au même niveau que le flow moderne.

### Create (nouveau wizard)
- Bon: découpage 6 étapes, pas de JSON brut, actions save/validate/publish explicites.
- Confus:
  - section Rewards & Distribution principalement des **presets codés** (rank1 points, top10 pack, top25 xp) plutôt qu’un vrai builder métier générique.
  - termes trop techniques (`cardSetId`, `EXACT`, `CARD_SET_ONLY`, refs bundle/rules) encore exposés.
- Fragile: compréhension admin dépend de la connaissance implicite du backend policy model.

### Overview + lifecycle + scoring + settlement + audit
- Bon: flow run maintenant découpé en surfaces dédiées.
- Bon: lifecycle/scoring/settlement utilisent validate/preview/execute (pattern ops robuste).
- Confus:
  - scoring reste une saisie manuelle par `userId` (copier/coller/rows), encore risqué.
  - settlement policy-driven est mieux, mais le contexte de “pourquoi tel rule/bundle s’applique” pourrait être plus explicite.
  - styles mélangés (`admin-*` et `contest-*`) donnent une impression de patchwork.

### Legacy contests
- Legacy critique conservé (nécessaire compatibilité), mais encore très exposé:
  - création legacy avec `config` JSON.
  - détails legacy avec flows manuels score/settle.
- Risque ops: mauvaise entrée opérateur possible si pression temps.

## 3.3 Campaigns & Quests
**État**: Partiel
- Campaigns catalog: propre, simple, utile comme hub.
- Quest library: lisible, filtres et actions cohérents.
- Quest builder (nouveau): amélioration claire vs legacy, validations présentes.
- Quest detail: fonctionnel mais reste une vue “admin primitive” plus qu’un écran produit guidé.
- Legacy quests pages: coexistence source de confusion similaire à contests.

## 3.4 Moderation
**État**: Bon (meilleur module admin)
- Queue avec SLA/evidence signals = bon design ops.
- Submission detail: contexte utilisateur + impact preview + décisions claires.
- History: auditability correcte.
- Dette: style/interaction encore minimalistes, mais structure produit/ops solide.

## 3.5 Rewards
**État**: Partiel / Sensible
- Bon: search user, validation+preview+execute compensation, ledger rows.
- Confus/fragile:
  - page compacte qui mélange recherche, action critique, listing historique.
  - plusieurs traces de backward-compat UI/state dans le code (naming reward-pack alias), signal de dette.
  - manque de framing des impacts et garde-fous UX “haute criticité”.

## 3.6 Users
**État**: Bon / Partiel
- Bon: modèle “search then context panel” adapté support ops.
- Partiel: pas de navigation profonde vers actions contextualisées (reward correction, moderation context, contest incidents) depuis la fiche.

## 3.7 Analytics
**État**: Faible maturité
- “Analytics Baseline” est utile mais très réduit et redondant avec dashboard.
- Impression d’écran placeholder plus que module analytique.

## 3.8 Activity log
**État**: Bon / Partiel
- Bon: timeline d’actions avec filtre statut.
- Partiel: recherche/filtrage limité (pas de filtres multi-dimensionnels), pas de page détail action.

---

## 4. UX / visual consistency audit

### 4.1 Ce qui est cohérent
- `AdminShell` + classes `admin-*` fournissent une base UI homogène (header, sidebar, cards, badges, tables).
- Patterns récurrents présents: toolbar + table + badges d’état.

### 4.2 Incohérences principales
- Coexistence `admin-*` et anciens styles `contest-*`/`SiteShell` selon page, avec variations visuelles sensibles.
- CTA primaires pas toujours clairement hiérarchisés (certaines actions critiques en boutons visuellement similaires à des actions secondaires).
- Densité parfois trop élevée sur workbenches critiques (scoring, rewards).

### 4.3 États UX
- Loading/empty/error généralement présents.
- Mais feedback parfois textuel minimal (“failed”, “cannot...”) sans guidance corrective structurée.

---

## 5. High-risk ops flow audit

## 5.1 Create/configure contest
- **Amélioration réelle** vs legacy (wizard + draft/validate/publish).
- **Risque restant**: builder rewards/distribution encore “preset technique”, compréhension métier incomplète.
- **Risque de mauvaise configuration** toujours élevé pour opérateurs non experts.

## 5.2 Contest lifecycle operations
- Pattern validate→execute bon.
- Risque modéré: dépendance à confirmations navigateur + messages textuels, peu de guardrails visuels avancés.

## 5.3 Scoring/ranking
- Validation/preview existent (point fort).
- Risque élevé maintenu par saisie manuelle rows/userId.

## 5.4 Settlement
- Flow policy-driven Phase 2 est un net progrès (generate/preview/execute).
- Coexistence legacy acceptable techniquement mais encore dangereuse UX si l’opérateur ne lit pas finement les messages de chemin recommandé.

## 5.5 Rewards/points grants
- Flow transactionnel robuste backend, mais surface UI encore trop “ops brute”.
- Risque principal: erreurs de manipulation en contexte de volume/urgence (form unique dense, peu de segmentation).

---

## 6. Legacy / deprecation audit

### 6.1 Surfaces legacy identifiées
- `/admin/contests/legacy`
- `/admin/contests/legacy/[contestId]`
- `/admin/quests/legacy`
- `/admin/quests/submissions` (legacy fallback depuis moderation)

### 6.2 État de dépréciation
- Mentions “deprecated/legacy fallback” présentes, donc transparence partielle.
- Mais les liens restent visibles et facilement actionnables depuis des écrans principaux.

### 6.3 Risque
- La dépréciation est surtout textuelle, pas structurelle.
- Tant que les chemins legacy restent “à un clic”, le risque de divergence de process demeure.

---

## 7. Docs and tests audit

## 7.1 Docs
- Le repo contient une base documentaire riche sur architecture/admin contracts/audits.
- Point faible: manque d’un **runbook UI admin consolidé** “what to use now / what is legacy / canonical path per operation”.
- Plusieurs docs décrivent le target state, moins la cartographie UX opérationnelle actuelle page par page.

## 7.2 Tests
- Bonne couverture backend/runtime/API des flows admin critiques (contest workbench, contest-config APIs, settlement-plan APIs, moderation routes, rewards routes).
- Couverture UI réelle faible: la majorité des tests admin côté front cible des helpers et contrats, pas des comportements page complets.
- Avant refonte UI large, il manque des tests e2e/smoke pour flux critiques inter-pages (create contest, run scoring, settlement execute, compensation execute).

---

## 8. Recommended redesign roadmap

## 8.1 P0 (immédiat)
1. **Contest UX hardening**
   - clarifier chemin principal sur toutes les pages contests,
   - déprioriser visuellement legacy,
   - enrichir lisibilité reward/distribution create.
2. **Legacy guardrails UI**
   - gating plus fort (warning blocks, friction, roles optionnels) sur pages legacy.
3. **Critical action pattern standard**
   - standardiser composant confirm/preview/execute avec impact summary homogène.

## 8.2 P1
1. **Rewards module redesign léger**
   - séparer “search user”, “prepare grant”, “recent operations”,
   - expliciter impacts et raisons.
2. **Quest/Moderation harmonisation**
   - aligner tous les écrans sur design tokens/admin patterns modernes.

## 8.3 P2
1. **Analytics rationalisation**
   - fusion ou spécialisation claire Dashboard vs Analytics.
2. **User context deep links**
   - actions opérables contextuelles depuis fiche utilisateur.

## 8.4 Priorisation des modules à refondre
1. Contests (critique)  
2. Rewards (critique)  
3. Legacy coexistence surfaces (critique transversal)  
4. Quests (moyen)  
5. Analytics (moyen)

---

## 9. File-by-file evidence appendix

### 9.1 Core shell / IA
- `components/admin/AdminShell.tsx`
- `app/admin/(protected)/layout.tsx`
- `app/globals.css` (styles `admin-*`)

### 9.2 Dashboard / analytics / audit
- `app/admin/(protected)/page.tsx`
- `app/admin/(protected)/analytics/page.tsx`
- `app/admin/(protected)/activity-log/page.tsx`

### 9.3 Contests
- `app/admin/(protected)/contests/page.tsx`
- `app/admin/(protected)/contests/create/page.tsx`
- `app/admin/(protected)/contests/[contestId]/page.tsx`
- `app/admin/(protected)/contests/[contestId]/lifecycle/page.tsx`
- `app/admin/(protected)/contests/[contestId]/scoring/page.tsx`
- `app/admin/(protected)/contests/[contestId]/settlement/page.tsx`
- `app/admin/(protected)/contests/[contestId]/audit/page.tsx`
- `app/admin/(protected)/contests/legacy/page.tsx`
- `app/admin/(protected)/contests/legacy/[contestId]/page.tsx`

### 9.4 Quests / campaigns / moderation / rewards / users
- `app/admin/(protected)/campaigns/page.tsx`
- `app/admin/(protected)/quests/page.tsx`
- `app/admin/(protected)/quests/builder/page.tsx`
- `app/admin/(protected)/quests/[questId]/page.tsx`
- `app/admin/(protected)/quests/submissions/page.tsx`
- `app/admin/(protected)/quests/legacy/page.tsx`
- `app/admin/(protected)/moderation/page.tsx`
- `app/admin/(protected)/moderation/[submissionId]/page.tsx`
- `app/admin/(protected)/moderation/history/page.tsx`
- `app/admin/(protected)/rewards/page.tsx`
- `app/admin/(protected)/users/page.tsx`

### 9.5 Admin docs reviewed
- `docs/admin-panel-screen-spec-and-implementation-plan-2026-03.md`
- `docs/admin-panel-target-architecture-2026-03.md`
- `docs/admin-panel-api-contract-spec-2026-03.md`
- `docs/full-admin-panel-audit-2026-03.md`

### 9.6 Admin tests reviewed
- `tests/admin-protected-layout.test.ts`
- `tests/admin-contest-workbench.test.ts`
- `tests/admin-contest-catalog-filter.test.ts`
- `tests/admin-quest-builder.test.ts`
- `tests/api-internal-contest-configs-routes.test.ts`
- `tests/api-internal-contest-settlement-plan-routes.test.ts`
- `tests/api-internal-moderation-queue-route.test.ts`
- `tests/api-internal-moderation-decide-route.test.ts`
- `tests/api-internal-manual-grant-route.test.ts`
