# Refonte complète frontend Admin MCG — Audit, architecture cible, design system et blueprint

## 1) Audit complet admin

### 1.1 Understanding système
- Surface admin identifiée dans `app/admin/(protected)/*` avec domaines: dashboard, contests (catalog + create + workbenches), rewards, quests, moderation, users, activity-log, analytics, campaigns, milestones.
- Shell central: `components/admin/AdminShell.tsx` + navigation `lib/admin/navigation.ts`.
- Styles legacy majoritairement regroupés dans `app/globals.css` (`.admin-*`) avec nombreux styles inline sur pages.

### 1.2 UX audit
- Points forts: couverture fonctionnelle large, endpoints déjà structurés, flows critiques présents.
- Frictions: navigation peu hiérarchisée, pages orientées blocs techniques, actions critiques peu mises en sécurité visuelle.
- Douleurs opérateur: tables et formulaires denses sans séparation primary/secondary; faible lisibilité des priorités (SLA, danger, pending).

### 1.3 UI audit
- Incohérences: mix classes globales + inline style, badges hétérogènes, hiérarchie visuelle instable page à page.
- Ton visuel: parfois trop “dashboard brut” (mur de KPI), pas assez “console d’opération moderne”.

### 1.4 Workflow audit
- Critiques bien couverts mais perfectibles côté présentation:
  - create/edit/publish contest;
  - moderation review;
  - manual compensation;
  - user context for support.
- Besoin clé: workflows en étapes, tables lisibles, statuts normalisés.

### 1.5 Priorisation
- **P0**: shell, navigation, statuts, surfaces communes, lisibilité actions sensibles.
- **P1**: harmonisation pages opérationnelles principales (dashboard, contests, moderation, rewards, users, logs).
- **P2**: refonte détaillée des pages secondaires (analytics, campaigns, quests legacy, legacy contests).

## 2) Architecture admin cible

### Navigation cible
- Overview: Dashboard, Activity log, Analytics.
- Operations: Contests, Moderation, Rewards, Quests, Milestones.
- Users: User context, Campaigns.

### Domaines et structures
- Dashboard: health + alerts + pending actions + quick links + inventory snapshot.
- Contests: toolbar recherche/statut, table lifecycle, actions publish/archive/unpublish.
- Moderation: queue priorisée SLA/evidence + actions Review/Quest.
- Rewards: workflow en 2 étapes (recipient → payload) + historique grants.
- Users: search-first + contexte consolidé (quests/rewards/contests/activity).
- Activity: timeline filtrable, statut exécution, erreurs lisibles.

## 3) Design system admin (sub-system)

### Tokens & ton
- Base sombre/neutre alignée MCG, accents retenus via tokens existants (`ink`, `chalk`, `clay`, bordures subtiles).
- Statuts normalisés: `neutral`, `success`, `warn`, `danger`.

### Composants admin introduits
- `AdminPageHeader`
- `AdminToolbar`
- `AdminStatusBadge`
- `AdminStatStrip`
- `AdminPanel`
- `AdminDataTable`, `AdminTableHead`, `AdminTableRow`
- `AdminEmptyState`

### Règles
- Desktop-first, responsive propre (1120/860).
- Actions sensibles signalées par callout danger + confirmations.
- Réduction des styles inline au profit d’un layer CSS dédié `.admin-v2-*`.

## 4) Blueprint d’implémentation admin

### Ordre de refonte
1. Shell + navigation + styles transverses.
2. Dashboard + contest catalog.
3. Moderation + rewards ops.
4. Users context + activity log.
5. Pages secondaires et legacy cleanup.

### Fichiers modifiés (phase exécutée)
- Shell/navigation:
  - `components/admin/AdminShell.tsx`
  - `lib/admin/navigation.ts`
- DS admin:
  - `components/admin/AdminUi.tsx`
  - `styles/components.css` (section `Admin Console v2`)
- Pages refondues:
  - `app/admin/(protected)/page.tsx`
  - `app/admin/(protected)/contests/page.tsx`
  - `app/admin/(protected)/moderation/page.tsx`
  - `app/admin/(protected)/rewards/page.tsx`
  - `app/admin/(protected)/users/page.tsx`
  - `app/admin/(protected)/activity-log/page.tsx`

### QA checklist
- Navigation cohérente et active state correct.
- Statuts normalisés sur toutes les pages refondues.
- Workflows critiques lisibles et actionnables.
- Responsive tablette/mobile sans rupture structurelle.
- Aucune modification backend/API/types métier.

## 5) Implémentation réelle livrée (ce commit)
- Nouveau shell admin “Operator Console” avec sidebar structurée par domaines.
- Nouveau design layer admin-v2 (surfaces, tables, badges, headers, split/layout responsive).
- Refonte opérationnelle de 6 surfaces clés: Dashboard, Contests, Moderation, Rewards Ops, Users, Activity Log.
- Conservation stricte des endpoints et workflows backend existants (frontend-only).
