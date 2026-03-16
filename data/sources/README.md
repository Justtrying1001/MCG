# data/sources — Raw source files

Ces fichiers sont les **sources brutes** du pipeline Genesis 25 tokens.

Le workflow officiel :

```bash
node scripts/build-token-master-25.mjs   # → data/token-master-25.json
node scripts/build-mcg-cards-master.mjs  # → data/mcg-cards-master.json
```

## Fichiers

| Fichier | Rôle | Champs principaux |
|---------|------|-------------------|
| `MCG_Set1_Edition1_v3.csv` | Source éditoriale principale | `coingeckoId`, `cardTitle`, `cardSubtitle`, `flavorText`, `heroArtworkPrompt`, champs visuels |
| `mcg_base_cards.json` | Référentiel de métadonnées cartes | `slug`, `image`, `projectId`, `baseCardId`, `primaryChain`, `faction`, `marketCapRank`, `projectTier` |
| `mcg_projects.json` | Fallback projet quand `base_cards` est incomplet | `slug`, `image`, `projectId`, `primaryChain`, `marketCapRank` |
| `mcg_card_variants.json` | Pont vers variants historiques | `variantType`, `frameStyle`, `isDefaultVariant` |

## Runtime

Le runtime et le seed lisent **uniquement** `data/token-master-25.json`.
