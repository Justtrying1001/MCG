# MCG — Documentation technique

## 1) Vue d’ensemble
MCG est une application **Next.js (App Router)** avec une API intégrée, une logique métier organisée en modules de domaine (`lib/domain/*`) et une persistance **PostgreSQL via Prisma**.

Le dépôt est désormais aligné sur un seul référentiel de cartes actif : **25 tokens Genesis**, soit **80 000 cartes planifiées**.

---

## 2) Stack technique

- **Frontend / Backend web** : Next.js 14, React 18, TypeScript.
- **Validation** : Zod.
- **ORM** : Prisma 5 (`@prisma/client`, `prisma`).
- **Base de données** : PostgreSQL.
- **Tests** : Vitest.
- **Analytics** : `@vercel/analytics`.

---

## 3) Structure du repository

- `app/` : pages App Router + handlers API (`app/api/**/route.ts`).
- `components/` : composants UI (user et admin).
- `lib/domain/` : logique métier par verticales (acquisition, contests, rewards, quests, progression, etc.).
- `lib/admin/` : utilitaires/workbenches admin.
- `prisma/` : schéma, migrations, scripts de seed/audit.
- `data/` : datasets de référence (notamment `token-master-25.json`).
- `scripts/` : scripts de build data et utilitaires opérationnels.
- `tests/` : tests unitaires et d’intégration API/runtime.

---

## 4) Modules métier principaux

### 4.1 Cartes & acquisition
- `lib/domain/cards/token-master.ts` : charge et expose le master 25 tokens.
- `lib/domain/acquisition/open-pack.ts` : ouverture de packs.
- `lib/domain/acquisition/pack-config.ts` : configuration/odds et validations.
- `lib/domain/acquisition/slot-weights.ts` : pondérations de tirage.

### 4.2 Contests
- `lib/domain/contests/runtime.ts` : orchestration lifecycle.
- `lib/domain/contests/snapshot-runtime.ts` : snapshots START/END.
- `lib/domain/contests/scoring-engine-runtime.ts` : scoring/ranking.
- `lib/domain/contests/settlement-plan-runtime.ts` : settlement et distribution rewards.
- `lib/domain/contests/config-runtime.ts`, `eligibility-runtime.ts` : règles de configuration/éligibilité.

### 4.3 Rewards / progression / quêtes
- `lib/domain/rewards/*` : ledger et récompenses.
- `lib/domain/progression/*` : progression user.
- `lib/domain/quests/*` : catalogue, soumissions, validation.

---

## 5) API

### 5.1 API publique
- Auth/session : `/api/auth/privy/exchange`, `/api/auth/logout`, `/api/me`.
- Packs : `/api/pack/config`, `/api/pack/open`.
- Contests : `/api/contests`, `/api/contests/[contestId]`, `/ranking`, `/lineup-options`, `/enter`, `/my-score-breakdown`, `/my-rewards`, `/reward-preview`.
- Quêtes et rewards : `/api/quests`, `/api/quests/[questId]/submit`, `/api/rewards/ledger`, `/api/rewards/packs/claim`.

### 5.2 API interne/admin
Sous `app/api/internal/**` :
- administration contests (catalogue, score, réconciliation lifecycle, configs),
- modération (`/moderation/*`),
- quêtes internes (`/quests/*`, `/quest-submissions/*`),
- rewards manuels (`/reward-pack-grant`, `/manual-grant`),
- compensations (`/compensations/*`),
- dashboards/admin actions.

---

## 6) Base de données

### 6.1 Modèle
Le schéma Prisma (`prisma/schema.prisma`) couvre notamment :
- utilisateurs/session/admin,
- catalogue cartes (token projects, templates, instances possédées),
- packs et événements d’ouverture,
- contests (config, snapshots, scores, ranking, settlement),
- rewards ledger,
- quêtes/modération.

### 6.2 Migrations
Les migrations sont versionnées dans `prisma/migrations/*` et appliquées via Prisma (`db push` en dev, `prisma:deploy:schema` en environnement déployé).

---

## 7) Authentification

- Le frontend initialise Privy via `components/providers/RootProviders.tsx` avec `appId` (React SDK) et sans `clientId` sur le path web.
- Configuration web Privy: `loginMethods: ["wallet", "twitter"]`, `showWalletLoginFirst: true`, `walletChainType: "solana-only"`, `walletList: ["phantom", "solflare", "backpack", "wallet_connect"]`.
- Les wallets embedded sont explicitement désactivés (`createOnLogin: "off"` pour Ethereum et Solana).
- Une fois Privy authentifié, le frontend échange le `accessToken` via `POST /api/auth/privy/exchange`.
- Le backend crée ensuite la session applicative `mcg_session`, lue par `GET /api/me`.
- Le logout applicatif passe par `POST /api/auth/logout`.
- Les routes admin sont protégées côté API et layouts/pages admin.

---

## 8) Pipeline cartes — Genesis 25 tokens

### 8.1 Sources
- `data/sources/MCG_Set1_Edition1_v3.csv`
- `data/sources/mcg_base_cards.json`
- `data/sources/mcg_projects.json`
- `data/sources/mcg_card_variants.json`

### 8.2 Génération
1. `node scripts/build-token-master-25.mjs` → `data/token-master-25.json`
2. `node scripts/build-mcg-cards-master.mjs` → `data/mcg-cards-master.json`

### 8.3 Règles de volumétrie
- **25 tokens** dans le master actif.
- Supply par token : **3 200 cartes**.
- Supply globale : **25 × 3 200 = 80 000 cartes**.
- Packs : 5 cartes/pack, 16 000 packs planifiés (80 000 cartes de capacité pack, alignée sur la supply planifiée).

---

## 9) Scripts opératoires

### 9.1 Runtime
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`
- `npm test`

### 9.2 Data / seed / bootstrap
- `npm run build:token-master-25`
- `npm run build:mcg-cards-master`
- `npm run seed:mvp:controlled-emission`
- `npm run check:mvp:bootstrap`
- `npm run bootstrap:mvp:cloud`
- `npm run bootstrap:mvp:cloud:deploy`
- `npm run seed:milestone:rewards`
- `npm run audit:milestone:rewards`

### 9.3 Déploiement
- `npm run vercel-build` : déploie schéma, génère Prisma, bootstrap cloud deploy, puis build Next.

---

## 10) Qualité et exploitation

- Les tests couvrent l’économie packs, contests lifecycle/scoring/settlement, API internes et surfaces admin.
- Les scripts de seed/check garantissent la cohérence du bootstrap Genesis.
- Le master token actif est unique (`data/token-master-25.json`) pour éviter toute ambiguïté 50 vs 25 tokens.
