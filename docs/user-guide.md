# MCG — Guide utilisateur

## 1) C’est quoi MCG ?
MCG (Meme Card Game) est un jeu de cartes à collectionner orienté crypto-memes :
- vous ouvrez des packs,
- vous collectionnez des cartes de différents tokens,
- vous composez des lineups pour des contests,
- vous gagnez des récompenses selon vos performances.

---

## 2) Économie du jeu (MVP Genesis)

### 2.1 Données clés
- **25 tokens** actifs.
- **1 600 cartes par token**.
- **40 000 cartes** planifiées au total.
- **5 cartes par pack**.
- **16 000 packs** planifiés.
- **500 points de départ** par utilisateur.

### 2.2 Lecture rapide
- La capacité totale de packs est de 80 000 cartes (16 000 × 5), supérieure à la supply planifiée de 40 000.
- En pratique, la disponibilité dépend de la supply restante et des règles de tirage.

---

## 3) Parcours utilisateur

### 3.1 Connexion
- Connectez-vous via le flux auth (X/Twitter).
- Une fois connecté, votre profil et votre solde points deviennent accessibles.

### 3.2 Ouvrir des packs
1. Aller sur la page Packs.
2. Vérifier le prix et la disponibilité.
3. Ouvrir un pack (5 cartes).

Effets :
- débit de points,
- ajout des cartes dans votre collection,
- enregistrement des événements dans le ledger.

### 3.3 Gérer sa collection
La page Collection affiche :
- vos cartes,
- leur rareté/édition,
- leur disponibilité (ex. lock pendant un contest).

### 3.4 Participer à un contest
1. Ouvrir la page Contests.
2. Choisir un contest en statut `OPEN`.
3. Sélectionner votre lineup (cartes éligibles et possédées).
4. Confirmer l’inscription.

Selon la config, un contest peut avoir des frais d’entrée en points.

### 3.5 Suivre les résultats
Sur le détail contest :
- classement,
- score breakdown,
- rewards potentielles et rewards obtenues.

---

## 4) Règles contests

### 4.1 Statuts
- `DRAFT` : préparation admin.
- `OPEN` : inscriptions ouvertes.
- `LOCKED` : inscriptions fermées / lineups figées.
- `LIVE` : contest en cours.
- `SETTLED` : résultats finalisés et rewards distribuées.
- `CANCELED` : contest annulé.

### 4.2 Locks et lineups
- Une carte engagée peut être lockée temporairement.
- Le lineup doit respecter la taille et les contraintes du contest.
- Après lock, les modifications ne sont plus possibles.

### 4.3 Scoring (résumé)
Le score final dépend :
- des variations marché des tokens (snapshots START/END),
- des multiplicateurs de rareté,
- des multiplicateurs d’édition.

---

## 5) Récompenses

### 5.1 Types de récompenses
- points,
- packs reward,
- récompenses manuelles (cas spécifiques/admin).

### 5.2 Où voir ses récompenses ?
- page Rewards,
- ledger (`/api/rewards/ledger`) pour l’historique,
- `my-rewards` sur un contest.

---

## 6) Quêtes
Les quêtes permettent de gagner des récompenses complémentaires :
- progression par objectifs,
- soumission de preuves (selon type de quête),
- validation automatique ou modérée.

---

## 7) APIs utiles (vue utilisateur/intégrateur)

### Packs
- `GET /api/pack/config` : état pack, prix, odds/runtime config.
- `POST /api/pack/open` : ouvre un pack.

### Contests
- `GET /api/contests` : liste des contests visibles.
- `GET /api/contests/:contestId` : détail d’un contest.
- `POST /api/contests/:contestId/enter` : inscription lineup.
- `GET /api/contests/:contestId/ranking` : classement.
- `GET /api/contests/:contestId/my-score-breakdown` : détail score user.
- `GET /api/contests/:contestId/my-rewards` : rewards user liées au contest.

### Profil / rewards / quêtes
- `GET /api/me`
- `GET /api/rewards/ledger`
- `POST /api/rewards/packs/claim`
- `GET /api/quests`
- `POST /api/quests/:questId/submit`

---

## 8) Exemples concrets

### Exemple A — Nouveau joueur
1. Je me connecte.
2. Je vois 500 points sur mon compte.
3. J’ouvre un pack et j’obtiens 5 cartes.
4. Je consulte ma collection et prépare un lineup.
5. Je m’inscris à un contest OPEN.
6. Après settlement, je vérifie mon score et mes rewards.

### Exemple B — Joueur orienté optimisation
1. Je consulte `/api/pack/config` pour suivre la distribution runtime.
2. Je cible les contests où mes cartes sont éligibles.
3. Je compose mes lineups en priorisant rareté/édition.
4. Je suis mon ledger pour monitorer coûts d’entrée et gains.

---

## 9) Bonnes pratiques utilisateur
- Ouvrir régulièrement les packs tant que le stock est disponible.
- Vérifier les horaires `lockAt/liveAt/endAt` des contests.
- Éviter d’engager trop tôt une carte si vous hésitez entre plusieurs contests.
- Suivre les quêtes pour accumuler des rewards complémentaires.


## 10) Détail du score en contest

Quand un contest est settled (ou que votre score final est disponible), la page du contest propose un bouton **"Détails du score"**.

Vous y verrez, carte par carte :
- Base Score
- Rarity Multiplier
- Edition Multiplier
- Final Score

Formule utilisée :
`finalScore = baseScore × rarityMultiplier × editionMultiplier`

## 11) Ouvrir vos packs remportés

Les packs gagnés en contest sont disponibles dans **Rewards → Packs remportés** (`/rewards/packs`).

Workflow :
1. Ouvrez la page Packs remportés.
2. Cliquez sur **Ouvrir** sur le pack souhaité.
3. Les cartes obtenues sont révélées dans une fenêtre de reveal.
4. Le pack ouvert disparaît de la liste des packs en attente.
