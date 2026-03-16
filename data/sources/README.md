# data/sources — Raw source files

Ces fichiers sont les **sources brutes** utilisées pour générer `data/token-master-50.json`.

**Ne pas modifier manuellement.** Pour mettre à jour les tokens, modifier ces fichiers puis relancer :

```bash
node scripts/build-token-master-50.mjs
```

Pour régénérer également le master éditorial complet (cartes + variants) :

```bash
node scripts/build-mcg-cards-master.mjs
```

## Fichiers

| Fichier | Rôle | Champs apportés |
|---------|------|-----------------|
| `MCG_Set1_Edition1_v3.csv` | CSV éditorial original (50 tokens) | `coingeckoId`, `cardTitle`, `cardSubtitle`, `flavorText`, `heroArtworkPrompt`, champs visuels/art |
| `mcg_base_cards.json` | Référentiel base cards — données techniques | `slug`, `imageUrl`, `projectId`, `baseCardId`, `primaryChain`, `faction`, `marketCapRank`, `projectTier` |
| `mcg_projects.json` | Fallback pour les champs manquants dans mcg_base_cards | Mêmes champs, priorité secondaire |
| `mcg_card_variants.json` | Définitions des variants de cartes | `variantType`, `frameStyle`, `isDefaultVariant` |

## Ces fichiers ne sont PAS lus au runtime

Le runtime lit uniquement `data/token-master-50.json` (via `lib/domain/cards/token-master.ts`).
Le seed lit uniquement `data/token-master-50.json` (via `prisma/seed-mvp-controlled-emission.mjs`).
