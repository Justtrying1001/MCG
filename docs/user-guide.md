# MCG — Bible User / Produit

> Document de référence **utilisateur + produit** (format GitBook-ready).  
> Objectif : expliquer précisément le fonctionnement du jeu, les features, les règles, l’économie, la compétition, les rewards et les surfaces admin qui impactent les users.

---

## 1) C’est quoi MCG

MCG (Meme Card Game) est un jeu web avec :
- acquisition de cartes via packs,
- progression collection,
- contests compétitifs avec lineup,
- quêtes/milestones,
- rewards et ledger de points,
- opérations live via admin.

La boucle de base :
1. Connexion (OAuth X) ou mode invité.
2. Ouverture de packs.
3. Construction de collection.
4. Participation à des contests.
5. Réception de rewards.
6. Progression via quests/milestones.

---

## 2) Surfaces utilisateur disponibles

### 2.1 Pages user
- `/` : page d’accueil et modules d’engagement.
- `/packs` : ouverture de packs.
- `/collection` : progression collection.
- `/contests` : listing des contests actifs/publics.
- `/contests/[contestId]` : détail + lineup + ranking.
- `/rewards` : rewards et historique.
- `/compte` : session/profil.

### 2.2 APIs user
- Auth : `/api/auth/x/start`, `/api/auth/x/callback`, `/api/auth/logout`
- Session : `/api/me`
- Packs : `/api/pack/config`, `/api/pack/open`, `/api/guest/pack/open`
- Contests : `/api/contests`, `/api/contests/[contestId]`, `/api/contests/[contestId]/lineup-options`, `/api/contests/[contestId]/enter`, `/api/contests/[contestId]/ranking`
- Quests/Rewards : `/api/quests`, `/api/quests/[questId]/submit`, `/api/rewards/ledger`

---

## 3) Économie de base (points)

- Points de départ user : **500**.
- Coût d’ouverture d’un pack sale : **500 points**.
- Nombre de cartes par pack : **5**.
- Welcome reward à la création via OAuth X : **+500 points**.

Conséquence pratique : un nouveau compte ayant reçu le welcome reward peut ouvrir 1 pack immédiatement.

---

## 4) Packs — configuration précise

### 4.1 Packs officiels runtime
Deux packs MVP sont semés côté runtime :
- `mvp_sale_pack` (SALE), planned pack count = **11 000**.
- `mvp_reward_pack` (REWARD), planned pack count = **5 000**.
- Cartes par pack : **5**.

### 4.2 Capacité totale prévue
- Packs totaux planifiés : 11 000 + 5 000 = **16 000 packs**.
- Cartes totales issues des packs : 16 000 × 5 = **80 000 cartes**.

### 4.3 Set et dataset
- Set MVP : `MVP_SET_V1`.
- Dataset token master : 50 tokens (`token-master-50.json`).

---

## 5) Supply des cartes (distribution canonique)

### 5.1 Supply par token (par rareté/édition)
Matrice de supply seed :
- COMMON : BASE 730, REVERSE 130, BRILLANTE 45, HOLO 20, FULL_ART 5
- UNCOMMON : 240, 50, 20, 8, 2
- RARE : 130, 30, 12, 6, 2
- EPIC : 80, 18, 7, 4, 1
- LEGENDARY : 45, 8, 3, 3, 1

Total supply par token = **1 600**.

### 5.2 Supply globale MVP
- 50 tokens × 1 600 = **80 000** cartes planifiées.
- Cette valeur matche exactement la capacité totale des packs (80 000).

### 5.3 Répartition globale par rareté (au seed initial)
- COMMON : 930/1600 = **58.125%**
- UNCOMMON : 320/1600 = **20.000%**
- RARE : 180/1600 = **11.250%**
- EPIC : 110/1600 = **6.875%**
- LEGENDARY : 60/1600 = **3.750%**

### 5.4 Répartition globale par édition (au seed initial)
- BASE : 1225/1600 = **76.5625%**
- REVERSE : 236/1600 = **14.7500%**
- BRILLANTE : 87/1600 = **5.4375%**
- HOLO : 41/1600 = **2.5625%**
- FULL_ART : 11/1600 = **0.6875%**

---

## 6) Drop system — fonctionnement détaillé

## 6.1 Types de slots par pack
Pour 5 cartes/pack :
- Slots 1–3 : `STANDARD`
- Slot 4 : `EDITION_BOOST`
- Slot 5 : `RARITY_HIT`

## 6.2 Logique de tirage
Le tirage est **pondéré dynamiquement** par :

`drawWeight = remainingSupply × rarityMultiplier(slot) × editionMultiplier(slot)`

Donc le taux de drop n’est pas fixe : il évolue selon la supply restante en runtime.

## 6.3 Multipliers de rareté par slot
- STANDARD : COMMON 1.4, UNCOMMON 1.1, RARE 0.6, EPIC 0.25, LEGENDARY 0.1
- EDITION_BOOST : COMMON 1, UNCOMMON 1, RARE 1.1, EPIC 1.2, LEGENDARY 1.3
- RARITY_HIT : COMMON 0.1, UNCOMMON 0.35, RARE 1.4, EPIC 2.4, LEGENDARY 3.6

## 6.4 Multipliers d’édition par slot
- STANDARD : BASE 1.3, REVERSE 1, BRILLANTE 0.8, HOLO 0.6, FULL_ART 0.4
- EDITION_BOOST : BASE 0.3, REVERSE 1.1, BRILLANTE 1.3, HOLO 1.6, FULL_ART 2
- RARITY_HIT : BASE 1, REVERSE 1.1, BRILLANTE 1.2, HOLO 1.3, FULL_ART 1.4

## 6.5 Estimation des odds au démarrage (théorique)
À supply initiale, en appliquant la formule :

### Slot STANDARD (slots 1–3)
- Raretés approx : COMMON 72.84%, UNCOMMON 19.44%, RARE 5.89%, EPIC 1.50%, LEGENDARY 0.33%

### Slot EDITION_BOOST (slot 4)
- Raretés approx : COMMON 53.77%, UNCOMMON 19.74%, RARE 12.94%, EPIC 8.55%, LEGENDARY 4.99%

### Slot RARITY_HIT (slot 5)
- Raretés approx : COMMON 9.83%, UNCOMMON 11.90%, RARE 26.95%, EPIC 28.21%, LEGENDARY 23.11%

> Les odds exactes en production doivent être lues via `/api/pack/config` (elles dépendent du `remainingSupply` runtime).

---

## 7) Pack opening — règles et erreurs user

### 7.1 Conditions d’ouverture (auth)
- Être connecté.
- Pack actif et source correcte.
- Stock pack restant (`openedPackCount < plannedPackCount`).
- Supply template restante active.
- Solde points suffisant (pack cost).

### 7.2 Effets d’une ouverture réussie
- Débit points user (ledger `PACK_OPEN`).
- Incrément `openedPackCount` du pack.
- Création `PackOpeningEvent`.
- Création `OwnedCardInstance` (5 lignes).
- Incrément `issuedSupply` templates.

### 7.3 Erreurs possibles côté user
- Unauthorized.
- Not enough points.
- Pack stock exhausted.
- Pack inactive / bootstrap manquant.

---

## 8) Contests — fonctionnement complet côté joueur

## 8.1 Statuts exposés
`DRAFT`, `OPEN`, `LOCKED`, `LIVE`, `SETTLED`, `CANCELED`.

### Signification
- DRAFT : préparation admin (non public/jouable).
- OPEN : inscriptions ouvertes.
- LOCKED : inscriptions fermées.
- LIVE : calcul/phase active.
- SETTLED : résultats/rewards finalisés.
- CANCELED : contest annulé.

## 8.2 Contest list & detail côté user
- Liste : contests publics en statut OPEN/LOCKED/LIVE/SETTLED.
- Détail : accessible seulement si contest publié + statut public.

## 8.3 Participation user (entry)
Conditions strictes :
- Contest doit être `OPEN`.
- `lockAt` non dépassé.
- Une seule entry par user/contest.
- Team size mode supporté : `EXACT` uniquement.
- Taille lineup = valeur configurée (`teamSizeValue`, défaut 5).
- Toutes les cartes lineup doivent appartenir au user.
- Eligibilité card set respectée si mode `CARD_SET_ONLY`.
- Cartes non déjà lockées dans un contest actif.

### Entry fee
- Si `entryFeeEnabled = true`, alors `entryFeeAmount` doit être un entier > 0.
- Débit effectué via ledger (`CONTEST_ENTRY_FEE`).
- Erreur user si points insuffisants.

### Effets d’une entry réussie
- Création `ContestEntry` (status LOCKED côté runtime actuel).
- Création `RosterLock` pour chaque carte.
- Lock state appliqué sur instances engagées.
- Progression de milestones contest alimentée.

---

## 9) Scoring contests — formule détaillée

## 9.1 Données de calcul
Le moteur lit des snapshots `START` et `END` par token :
- `priceUsd`
- `marketCapUsd`
- `volume24hUsd`
- `marketCapRank`

## 9.2 Transformations de variation
- `priceChange = (end-start)/start`
- `marketCapChange = (end-start)/start`
- `volumeChange = (end-start)/start`
- `rankChange = (start-end)/start` (amélioration rank => positif)

## 9.3 Scores normalisés par dimension
`boundedScore(change, denominator) = 50 + 50 * clamp(change/denominator, -1, 1)`

Denominators :
- Price: 0.5
- Volume: 1
- Market cap: 0.5
- Rank: 0.3

## 9.4 Score token final
`baseTokenScore = 0.45*price + 0.25*volume + 0.20*marketCap + 0.10*rank`

`rankMultiplier = 1 + 0.10 * clamp(rankChange/0.3, 0, 1)`

`tokenScoreFinal = min(100, baseTokenScore * rankMultiplier)`

## 9.5 Score user final
Pour chaque carte lineup :

`cardScore = tokenScoreFinal × rarityMultiplier × editionMultiplier`

Multipliers scoring cartes :
- Rareté : COMMON 1, UNCOMMON 1.05, RARE 1.12, EPIC 1.22, LEGENDARY 1.35
- Édition : BASE 1, REVERSE 1.03, BRILLANTE 1.08, HOLO 1.15, FULL_ART 1.25

Score user = somme des `cardScore` lineup.
Ranking = tri score desc puis userId asc.

---

## 10) Rewards — sources et règles

## 10.1 Sources principales
- Welcome reward (signup OAuth X).
- Pack open (débit).
- Quest rewards (crédits).
- Contest entry fee (débit si activé).
- Admin grants (crédits manuels).
- Contest settlement rewards.

## 10.2 Ledger
Le ledger centralise :
- type d’entrée (credit/debit),
- montant,
- raison,
- référence,
- idempotency key (quand applicable),
- métadonnées.

## 10.3 Idempotence
Les flux critiques (welcome, quest approval, grants) utilisent des conventions d’idempotence pour éviter les doubles attributions.

---

## 11) Quests & milestones — détail exhaustif seed v1

Les milestones seedées (`seed:milestone:rewards`) sont :

| Code | Catégorie/Métrique | Seuil | Reward points |
|---|---|---:|---:|
| `ms_open_packs_01` | PACK_OPEN_COUNT | 1 | 100 |
| `ms_open_packs_05` | PACK_OPEN_COUNT | 5 | 250 |
| `ms_open_packs_20` | PACK_OPEN_COUNT | 20 | 800 |
| `ms_total_cards_25` | TOTAL_CARDS_COLLECTED | 25 | 200 |
| `ms_total_cards_100` | TOTAL_CARDS_COLLECTED | 100 | 750 |
| `ms_unique_cards_10` | UNIQUE_CARDS_COLLECTED | 10 | 220 |
| `ms_unique_cards_25` | UNIQUE_CARDS_COLLECTED | 25 | 700 |
| `ms_contests_joined_1` | CONTESTS_JOINED | 1 | 150 |
| `ms_contests_joined_10` | CONTESTS_JOINED | 10 | 900 |
| `ms_contests_won_1` | CONTESTS_WON | 1 | 1200 |
| `ms_rare_plus_10` | RARE_PLUS_CARDS_OWNED | 10 | 500 |
| `ms_epic_plus_5` | EPIC_PLUS_CARDS_OWNED | 5 | 900 |
| `ms_legendary_1` | LEGENDARY_CARDS_OWNED | 1 | 1500 |
| `ms_rewards_claimed_5` | REWARDS_CLAIMED | 5 | 600 |
| `ms_reward_points_5000` | REWARD_POINTS_EARNED | 5000 | 1200 |

Caractéristiques communes :
- quest type `CONTEST_COUNT_MILESTONE`
- validation `AUTO`
- `oneTime = true`
- `isActive = true` à la création seed

---

## 12) Contest rewards — ce que l’app permet

Le builder admin supporte :
- types reward : `POINTS`, `XP`, `PACK`
- distribution : `FIXED_RANKS`, `TOP_N`, `TOP_PERCENT`

Exemples supportés :
- Rank #1 = 1 000 points,
- Top 10 = X points,
- Top 5% = pack reward.

Le wizard create contest propose par défaut une règle “Winner” à 1 000 points (rank 1), puis permet ajout/modification.

---

## 13) Création de contest (admin) — ce qui impacte le user

Le flow de création a 6 étapes :
1. Infos contest
2. Schedule
3. Entry fee
4. Team & eligibility
5. Rewards
6. Review / Launch

Paramètres clés exposés :
- code auto ou manuel,
- titre, description,
- `openAt`, `lockAt`, `endAt`,
- `entryFeeEnabled`, `entryFeeAmount`,
- `teamSizeMode=EXACT`, `teamSizeValue` (3/5/7 dans UI),
- `eligibilityMode` (`ANY` ou `CARD_SET_ONLY`),
- règles de rewards.

Impact direct user :
- fenêtre de participation,
- coût d’entrée,
- taille lineup,
- contraintes d’éligibilité,
- structure de récompenses.

---

## 14) Mode invité (guest)

## 14.1 Paramètres guest
- 5 cartes/pack.
- Coût pack = `GAME_CONFIG.PACK_COST`.
- Rareté guest pondérée fixe : COMMON 40, UNCOMMON 30, RARE 20, EPIC 8, LEGENDARY 2.
- Édition guest tirée uniformément dans `[BASE, REVERSE, BRILLANTE, HOLO, FULL_ART]`.

## 14.2 Différences avec mode authentifié
- Pas la même persistance complète que le mode auth.
- Flux destiné à la découverte/test.

---

## 15) Back-office (vue produit)

Surfaces internes majeures :
- contests (catalog, create wizard, lifecycle, scoring, settlement, audit),
- quests (library, builder, submissions),
- moderation (queue + decide + history),
- rewards (manual grants + pack grants),
- milestones,
- users,
- activity log + analytics.

Même si non visible du user final, ces modules déterminent la stabilité des contests, la fiabilité scoring et la distribution rewards.

---

## 16) Glossaire

- **Pack Definition** : configuration d’un pack (source, count, cards/pack, active).
- **Card Template** : définition canonique (token + rareté + édition + supply).
- **Owned Card Instance** : exemplaire individuel détenu par un user.
- **Contest Entry** : participation user à un contest.
- **Roster Lock** : enregistrement de la lineup verrouillée.
- **Contest Snapshot** : capture métriques token START/END.
- **Contest Token Score** : score token dérivé du snapshot.
- **Settlement** : clôture contest + rewards.
- **Reward Ledger Entry** : ligne comptable credit/debit points.
- **Milestone Quest** : objectif auto de progression avec seuil.

---

## 17) Installation / commandes utiles

```bash
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

Commandes clés :
- `npm run seed:mvp:controlled-emission`
- `npm run seed:milestone:rewards`
- `npm run check:mvp:bootstrap`
- `npm run typecheck`
- `npm test`

---

## 18) Relation avec la bible technique

Ce document couvre la vision **user/projet** et les règles visibles/produit.  
Pour l’implémentation complète code + architecture + modèles + opérations techniques, utiliser `docs/technical.md`.
