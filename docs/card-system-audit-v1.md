# MCG — Audit complet système cartes (V1)
Status: AUDIT


## 1) Diagnostic global du problème actuel

Le système actuel mélange **trois logiques non alignées** :

1. **Produit collection** (rareté, variantes, sensation premium).
2. **Gameplay PvE** (stats ATK/DEF/SPD/CTRL et sélection d’équipe).
3. **Rendu UI web** (composant dense, typographies petites, overlays nombreux).

Résultat : la carte fonctionne comme *widget de données*, pas comme *objet collectible premium*.
Le principal blocage n’est pas un simple sujet CSS : c’est un problème de **cohérence data → règles de distribution → surface visible**.

---

## 2) Audit du rendu live actuel

### Chemin réel de rendu

- Les pages live qui affichent les cartes sont `collection`, `packs` (reveal) et `combats` (team builder).【F:app/collection/page.tsx†L1-L113】【F:app/packs/page.tsx†L1-L245】【F:app/combats/page.tsx†L1-L281】
- Ces pages utilisent toutes `CardFrame` comme renderer unique de carte.【F:app/collection/page.tsx†L4-L104】【F:app/packs/page.tsx†L5-L233】【F:app/combats/page.tsx†L5-L173】
- La structure visuelle de la carte est codée dans `components/ui/CardFrame.tsx`, et le style dans `app/globals.css` (bloc `.mcg-*`).【F:components/ui/CardFrame.tsx†L1-L161】【F:app/globals.css†L1880-L2368】

### Pourquoi le rendu fait “UI/dark component”

- **Densité de micro-informations** (subtitle, type strip, badges, rank, footer id, rarity, etc.) avec typographies très petites (6.5–9px), ce qui donne un ressenti dashboard au lieu d’une hiérarchie TCG lisible.【F:components/ui/CardFrame.tsx†L65-L157】【F:app/globals.css†L2042-L2368】
- **Hero zone sous-exploitée** : l’art principal est enfermé dans un médaillon rond (~88px) plutôt qu’une vraie zone d’illustration dominante type TCG.【F:components/ui/CardFrame.tsx†L80-L106】【F:app/globals.css†L2131-L2173】
- **Empilement d’accents UI** (corners, inset, top band, many pills) qui renforce le côté interface technique et pas carte éditorialisée.【F:components/ui/CardFrame.tsx†L46-L63】【F:app/globals.css†L1922-L2005】
- Le document de direction UX vise du “TCG-inspired card composition”, mais le live reste un design system web premium-dark plutôt qu’un language carte assumé (nameplate / art dominance / stat plaque / footer collector).【F:docs/ux-redesign-spec.md†L23-L33】

---

## 3) Audit de la provenance et de l’usage des données

### Chaîne réelle data → transformation → rendu

1. Source brute :
   - `mcg_base_cards.json` (5692 cartes)
   - `mcg_projects.json` (5692 projets)
   - `mcg_card_variants.json` (8221 variants)
2. Hydratation : `lib/cards.ts`
   - chargement JSON + enrichissement `hydrateCard` (project metadata, variant default, theme chain).【F:lib/cards.ts†L1-L124】
3. Exposition API :
   - `/api/me` serialize la collection via `buildUserPayload`.【F:app/api/me/route.ts†L1-L27】【F:lib/serializers.ts†L1-L30】
   - `/api/pack/open` retourne `pulledCards` provenant de `openBasePack(getBaseCards())`.【F:app/api/pack/open/route.ts†L1-L42】
4. Front :
   - `useSession` consomme `/api/me`, puis `CardFrame` lit les champs pour l’affichage live.【F:components/useSession.ts†L1-L39】【F:components/ui/CardFrame.tsx†L24-L157】

### Points critiques data

- `hydrateCard` mappe le thème visuel via `baseCard.faction` au lieu de `primaryChain`, ce qui casse la cohérence chain-color pour plusieurs chaînes non couvertes (`Avalanche`, `Polygon`, etc. tombent en `Other`).【F:lib/cards.ts†L7-L18】【F:lib/cards.ts†L94】
- Le README dit “No variants product flow”, mais la data variant est quand même chargée et injectée sur la face carte ; on a donc une architecture hybride non assumée produit vs implémentation.【F:README.md†L10-L12】【F:lib/cards.ts†L76-L109】
- Dans la base actuelle, toutes les variantes par défaut sont `common` ; la rareté visible en bas de carte est donc quasi toujours “common”.【F:lib/cards.ts†L96-L103】【F:components/ui/CardFrame.tsx†L152-L156】

### Données existantes mais peu / mal exploitées

- `subtitle` existe dans les données mais n’est pas rendu (on affiche `primaryChain · symbol` en subtitle UI).【F:types/cards.ts†L10-L13】【F:components/ui/CardFrame.tsx†L69-L71】
- `powerScore` existe en data, mais `CardFrame` peut le recalculer différemment (moyenne arrondie), alors que le gameplay PvE raisonne plutôt en somme des stats.
  - Cela crée une incohérence produit forte entre “puissance affichée” et “puissance jouée”.【F:types/cards.ts†L18-L19】【F:components/ui/CardFrame.tsx†L33-L34】【F:app/combats/page.tsx†L23-L25】

---

## 4) Audit des éléments visibles sur les cartes

### Éléments à garder (mais re-hiérarchiser)

- **Nom** : essentiel identité collectible.【F:components/ui/CardFrame.tsx†L68】
- **Hero visual** (image projet) : essentiel désirabilité, mais zone à agrandir fortement.【F:components/ui/CardFrame.tsx†L89-L95】
- **Stats 4 axes** : utile gameplay si normalisées et lisibles.【F:components/ui/CardFrame.tsx†L118-L137】
- **Rareté / variant** : utile collection & opening, mais aujourd’hui mal porté.【F:components/ui/CardFrame.tsx†L74-L77】【F:components/ui/CardFrame.tsx†L152-L156】

### Éléments à supprimer/fusionner/déplacer

- `type strip` + `subtitle` + `chain pill` + `footer rarity` = redondance taxonomique (chain/faction/symbol apparaissent à plusieurs endroits).【F:components/ui/CardFrame.tsx†L69-L71】【F:components/ui/CardFrame.tsx†L98-L115】【F:components/ui/CardFrame.tsx†L108-L115】【F:components/ui/CardFrame.tsx†L152-L156】
- `marketCapRank` en badge art (`#rank`) pollue la zone héro ; à déplacer en meta footer ou back-end metadata selon usage réel.【F:components/ui/CardFrame.tsx†L112-L114】
- `variantId/baseCardId` affiché en footer principal n’a pas de valeur perçue player-first ; à garder en microprint discret (collector id).【F:components/ui/CardFrame.tsx†L141】

---

## 5) Audit des stats

### État actuel

- Les 4 stats sont affichées en barres segmentées (`10` segments) avec `round(value/10)`, clamp 0..10.【F:components/ui/CardFrame.tsx†L18-L21】【F:components/ui/CardFrame.tsx†L128-L133】
- PvE consomme les stats brutes et construit HP/dégâts depuis DEF/CTRL/ATK/SPD.【F:lib/pve/helpers.ts†L7-L25】【F:lib/pve/simulateBattle.ts†L29-L52】

### Problèmes

- **Compression visuelle** : pour des distributions très basses sur plusieurs axes (ex. médianes faibles), beaucoup de cartes tombent visuellement dans 0–3 segments, donc faible discrimination perçue.
- **Incohérence de score** : l’UI affiche parfois une moyenne (`powerScore` fallback), le PvE utilise somme + formules de combat ; ce n’est pas une “lecture unique” de la puissance.【F:components/ui/CardFrame.tsx†L33-L34】【F:app/combats/page.tsx†L23-L25】【F:lib/pve/simulateBattle.ts†L29-L52】
- **Manque de contexte role-based** : aucune lecture de rôle (agresseur, tank, tempo, contrôle) alors que les 4 stats pourraient permettre une classification claire.

### Recommandation stats

- Conserver `ATK/DEF/SPD/CTRL` en V1, mais :
  - afficher une **valeur primaire de combat unique** (ex: Combat Score) dérivée de la même formule gameplay;
  - garder les 4 sous-stats en secondaire;
  - remplacer segments 10 par jauges normalisées par percentile (dataset snapshot).

---

## 6) Audit de la rareté

### État actuel

- Rareté visuelle affichée depuis `variantRarity` de la variante par défaut hydratée.【F:lib/cards.ts†L96-L103】【F:components/ui/CardFrame.tsx†L152-L156】
- La page packs affiche des odds hardcodées (2/10/28/60) non reliées au moteur réel de tirage.【F:app/packs/page.tsx†L11-L16】

### Problèmes critiques

- **Décorrélation système/communication** : odds affichées ≠ odds réelles.
- **Rareté de fait aplatie** : variantes par défaut common → signal rareté faible sur l’essentiel des pulls affichés.
- **Rareté sans narration produit** : tier projet, variant rarity, rank, poids de drop coexistent sans modèle unifié.

### Recommandation rareté

- Séparer explicitement :
  1. **Rareté de carte de base** (collectible scarcity globale).
  2. **Rareté de finition/variant** (foil, full-art, etc.).
- Afficher sur la carte la rareté de base + traitement visuel de variante, pas l’inverse.

---

## 7) Audit de la pondération / distribution

### État actuel

- Le pack open pondère uniquement les cartes de base hydratées, avec tirage **avec remise** (doublons possibles dans le même pack).【F:lib/cards.ts†L126-L160】
- Poids = `tierBaseWeight * (1+rankFactor) * variantWeight/1000` où `tierBaseWeight` donne **S=1, A=2, B=4, C=6, D=8**.【F:lib/cards.ts†L6】【F:lib/cards.ts†L126-L136】

### Problèmes

- Si S est censé être top-tier/premium, le poids actuel le rend **moins probable**, sans explicitation produit.
- Le dataset étant massivement en tier C, la distribution de pulls est écrasée vers C.
- `variantWeight` pris depuis variante par défaut neutralise l’intérêt réel des variantes rares en opening.

### Recommandation distribution

- Passer à une distribution en 2 étapes :
  1. Tirer un **slot rarity bucket** (Common/Rare/Epic/Legendary) avec probabilités contrôlées.
  2. Tirer la carte dans ce bucket selon un poids secondaire (meta balancing, anti-dup, rotation).
- Tirage sans remise dans un pack (5 uniques max par pack), ou au minimum anti-dup soft cap.
- Publier odds réelles depuis la config serveur (pas hardcode front).

---

## 8) Structure recommandée d’une carte MCG V1

### Blocs visibles recommandés

1. **Header premium (obligatoire, visible)**
   - `name` (dominant), `symbol` (secondaire), badge set/edition.
2. **Type line (visible, compact)**
   - `faction` + `primaryChain` fusionnés en une seule ligne taxonomique.
3. **Hero zone (dominante, visible)**
   - image projet plein cadre (pas médaillon central comme zone principale).
4. **Rarity + variant stamp (visible)**
   - rareté base en coin principal; variant foil/full-art via treatment visuel.
5. **Stat panel (visible, gameplay-first)**
   - Combat Score + 4 sous-stats ATK/DEF/SPD/CTRL.
6. **Footer meta (visible discret)**
   - collector id, snapshot date, rank (si utile collection), set code.

### Données backend only (pas face avant principale)

- `coingeckoId`, `projectId`, `slug`, flags techniques d’éligibilité.
- `dropWeight` brut et détails d’algorithme.

### Stable vs snapshot

- **Snapshot-based** (figé à l’émission carte) : stats, rank snapshot, score.
- **Stable global** : identité projet (`name/symbol/image/faction/chain`).
- Éviter les cartes qui “changent” visuellement selon refresh runtime.

---

## 9) Direction de rendu recommandée

### Direction cible (maintenable + scalable)

- Un **template carte unique V1** (industrialisation), avec variations via:
  - palette de rareté,
  - frame layer par niveau,
  - overlay variant (foil/full-art/glitch/gold) paramétrique.
- Pipeline visuel en couches CSS maintenables (base frame, rarity frame, variant overlay, microtexture).
- Hero zone prioritaire (≈45–55% hauteur carte), stat panel lisible, footer compact.

### Ce qu’il faut éviter

- Multiplication de composants carte par rareté (coût maintenance élevé).
- Dépendance à des illustrations bespoke par carte pour être “premium”.
- Hardcode odds/labels côté front.

---

## 10) Plan d’action concret de refonte

### Phase 0 — Nettoyage repo (rapide)

1. Définir un **CardViewModel V1** unique (contrat UI).
2. Élaguer les champs visibles redondants dans `CardFrame`.
3. Déplacer les odds en config serveur exposée via endpoint.

### Phase 1 — Refonte data model

1. Introduire `baseRarity` explicite sur base card.
2. Conserver `variantRarity` pour finition uniquement.
3. Introduire `combatScore` canonique partagé UI + PvE.
4. Distinguer champs snapshot vs champs dynamiques.

### Phase 2 — Refonte distribution packs

1. Algorithme 2-step bucket → card draw.
2. Odds versionnées (ex: `pack_table_v1`).
3. Anti-dup intra-pack.
4. Instrumentation analytics (distribution réelle par 1k/10k ouvertures).

### Phase 3 — Refonte rendu carte

1. Recomposer hiérarchie : header fort, hero dominant, stat panel clair, footer collector.
2. Normaliser taille typo/espacements (arrêter les 6–7px sur infos primaires).
3. Réduire badges/strips redondants, garder 1 taxonomie lisible.

### Phase 4 — Validation produit

1. QA visuelle (desktop/mobile, lisibilité).
2. QA balance (corrélation rareté ↔ perception ↔ performance PvE).
3. QA pack economics (odds affichées = odds moteur).

### Décision nette

- **Garder** : chemin de rendu centralisé via composant unique + hydratation serveur.
- **Réécrire** : modèle rareté/distribution et hiérarchie visible de carte.
- **Nettoyer** : redondances de champs UI, hardcodes d’odds, ambiguïtés de score puissance.
