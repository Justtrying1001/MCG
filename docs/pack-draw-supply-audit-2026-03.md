# GENESIS / Edition 1 — Audit économique final (contrainte 80 000)

## 1) Audit : matrice d’origine vs v2 précédente

### Matrice d’origine (v1)

| Rarity | BASE | REVERSE | BRILLANTE | HOLO | FULL_ART |
|---|---:|---:|---:|---:|---:|
| COMMON | 520 | 160 | 60 | 20 | 6 |
| UNCOMMON | 260 | 95 | 42 | 16 | 5 |
| RARE | 130 | 52 | 24 | 10 | 4 |
| EPIC | 60 | 24 | 12 | 6 | 3 |
| LEGENDARY | 26 | 11 | 6 | 4 | 2 |

- Total/token: **1558**
- Total global (50 tokens): **77,900**

Lecture: structure techniquement stable, mais certaines lignes perçues trop généreuses (`COMMON/REVERSE`, `LEGENDARY/BASE`).

### Matrice v2 précédente (premium mais sous-remplie)

| Rarity | BASE | REVERSE | BRILLANTE | HOLO | FULL_ART |
|---|---:|---:|---:|---:|---:|
| COMMON | 420 | 100 | 60 | 32 | 12 |
| UNCOMMON | 230 | 66 | 50 | 30 | 10 |
| RARE | 125 | 38 | 32 | 22 | 8 |
| EPIC | 68 | 22 | 20 | 14 | 5 |
| LEGENDARY | 18 | 7 | 6 | 5 | 3 |

- Total/token: **1403**
- Total global (50 tokens): **70,150**

Lecture:
- mieux qualitativement (plus premium, hiérarchie plus lisible),
- **non conforme** à la contrainte produit absolue (`16,000 × 5 = 80,000`).

### Contrainte produit / runtime

- packs: 16,000 (11,000 sale + 5,000 reward)
- cards per pack: 5
- total planifié requis: **80,000**
- donc supply cible par token: **1600**
- moteur runtime auth conservé: slot-based (`STANDARD` ×3, `EDITION_BOOST`, `RARITY_HIT`) + controlled emission DB-native.

## 2) Matrice finale proposée (GENESIS final 80k)

Objectif: conserver les améliorations premium de v2 tout en normalisant strictement à 80,000.

| Rarity | BASE | REVERSE | BRILLANTE | HOLO | FULL_ART |
|---|---:|---:|---:|---:|---:|
| COMMON | 730 | 130 | 45 | 20 | 5 |
| UNCOMMON | 240 | 50 | 20 | 8 | 2 |
| RARE | 130 | 30 | 12 | 6 | 2 |
| EPIC | 80 | 18 | 7 | 4 | 1 |
| LEGENDARY | 45 | 8 | 3 | 3 | 1 |

- Total/token: **1600**
- Total global (50 tokens): **80,000** ✅

### Logique économique

- on réduit explicitement les volumes UNCOMMON/RARE/EPIC/LEG par rapport à la précédente finale,
- on concentre le volume supplémentaire vers COMMON/BASE pour tenir 80k sans sur-inonder les paliers premium,
- `COMMON/REVERSE` reste inférieur à la v1 (130 vs 160),
- les éditions restent plus rares en volume absolu (surtout BRILLANTE/HOLO/FULL_ART) pour préserver la perception collector,
- la logique slots continue de porter l'expérience d'ouverture (édition boost + hit), mais sur une base supply plus resserrée par édition.

## 3) Simulation comparative (slot-based)

Commande: `node scripts/simulate-genesis-pack-distribution.mjs`

### Totaux planifiés
- v1 origin: 77,900
- v2 low: 70,150
- final 80k: 80,000

### Projection attendue (1,000 packs / 5,000 cartes)

#### v1 origin
- Rareté: COMMON 2435.93, UNCOMMON 1217.18, RARE 707.97, EPIC 395.97, LEGENDARY 242.96
- Édition: BASE 3047.06, REVERSE 1172.65, BRILLANTE 492.70, HOLO 204.77, FULL_ART 82.81

#### v2 low
- Rareté: COMMON 2261.86, UNCOMMON 1256.70, RARE 774.82, EPIC 505.74, LEGENDARY 200.89
- Édition: BASE 2960.20, REVERSE 870.85, BRILLANTE 619.63, HOLO 393.41, FULL_ART 155.91

#### final 80k
- Rareté: COMMON 2821.12, UNCOMMON 899.80, RARE 575.58, EPIC 412.68, LEGENDARY 290.81
- Édition: BASE 3647.02, REVERSE 835.93, BRILLANTE 309.71, HOLO 159.86, FULL_ART 47.49

### Projection attendue (10,000 packs / 50,000 cartes)

#### v1 origin
- Rareté: COMMON 24359.26, UNCOMMON 12171.81, RARE 7079.70, EPIC 3959.68, LEGENDARY 2429.55
- Édition: BASE 30470.61, REVERSE 11726.53, BRILLANTE 4927.03, HOLO 2047.68, FULL_ART 828.15

#### v2 low
- Rareté: COMMON 22618.64, UNCOMMON 12566.96, RARE 7748.15, EPIC 5057.39, LEGENDARY 2008.86
- Édition: BASE 29602.02, REVERSE 8708.49, BRILLANTE 6196.34, HOLO 3934.06, FULL_ART 1559.10

#### final 80k
- Rareté: COMMON 28211.21, UNCOMMON 8998.02, RARE 5755.82, EPIC 4126.84, LEGENDARY 2908.11
- Édition: BASE 36470.15, REVERSE 8359.33, BRILLANTE 3097.05, HOLO 1598.61, FULL_ART 474.85

### Lecture produit

- la finale récupère la contrainte business absolue (80k exact),
- garde la réduction des excès perçus (reverse common, base legendary),
- reste plus premium que v1 sur la hiérarchie d’accès hautes raretés,
- évite le sous-remplissage structurel de v2.

## 4) Implémentation / vérification

- Seed mise à jour sur la matrice `GENESIS final`.
- Invariants de test dry-run mis à jour (`1600` / `80000`).
- Script de simulation mis à jour pour comparer 3 états (v1/v2/finale).
- Runtime slot-based inchangé (compatibilité préservée).

