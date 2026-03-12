# MvpCardTileV2 vs ClaudeUI — comparaison de fidélité visuelle (point par point)

## Méthode
- Source ClaudeUI inspectée :
  - `claudeui/MvpCardTile.tsx`
  - `claudeui/mvp-card.css`
  - `claudeui/mvpCardTheme.ts`
- Implémentation MCG inspectée :
  - `components/ui/MvpCardTileV2.tsx`
  - `components/ui/MvpCardTileV2.module.css`
  - `components/ui/mvpCardThemeV2.ts`

## Tableau de comparaison

| Axe | ClaudeUI | MvpCardTileV2 | Niveau |
|---|---|---|---|
| Structure de carte | 4 zones grid strictes (50 / 1fr / 38 / 34) + layers (grain/corners/overlays) | Même structure 4 zones, mêmes couches principales | **Identique (très haute fidélité)** |
| Header | Name uppercase + ticker mono + badges droite + separator line | Repris à l’identique en hiérarchie/placement/styles | **Identique / très proche** |
| Coins décoratifs | 4 corners SVG mirroring + detail/dot selon rareté | Même principe SVG + mirroring + detail/dot pilotés par thème | **Identique** |
| Zone art | Cadre sombre + bordure fine + vignette ; Claude en `cover` | Cadre/vignette identiques, mais `contain` au lieu de `cover` | **Très proche (écart volontaire)** |
| Textbox | zone dédiée avec texte italique serif, clamp 2 lignes | Même style italique/clamp/border/padding | **Identique / très proche** |
| Footer | code + separator + set/meta compact, mono petite taille | code + set+édition + supply compacte (grille 3 colonnes) | **Très proche (légère adaptation)** |
| Rareté | Palette + glow + corner detail progressifs | Même logique de progression + mappings MCG 5 niveaux | **Très proche** |
| Éditions | BASE/REVERSE/BRILLANTE/HOLO/MCG_ART avec overlays dédiés | BASE/REVERSE/BRILLANTE/HOLO/FULL_ART avec overlays équivalents | **Très proche (mapping runtime)** |
| Animation/Perf | Animation riche globale | Conservée, mais ralentie en collection + reduced-motion | **Très proche (compromis perf)** |

## 1) Structure de carte

- Claude : shell ratio `63/88`, grid à 4 zones, effets overlays par couches absolues.  
- V2 : même ratio, même grid, mêmes zones et architecture de couches.

Verdict : **identique / très haute fidélité**.

## 2) Header

- Typo + hiérarchie :
  - Claude: `Rajdhani` pour le nom, `DM Mono` ticker/badges.
  - V2: même familles et hiérarchie visuelle.
- Badges : rareté + édition à droite, style mono compact.
- Séparateur : trait horizontal dégradé bas du header.
- Coins décoratifs : même positions et symétries.

Verdict : **très fidèle**.

## 3) Zone art

- Fond/framing/vignette : repris.
- Masks : reverse/full-art utilisent masques + re-render de l’art.
- Différence critique : `object-fit`.
  - Claude: `cover`.
  - V2: `contain` (compromis asset-driven MCG).

Verdict : **très proche, avec un écart assumé sur le fit image**.

## 4) Textbox

- Style : italique serif, clamp 2 lignes.
- Fond/texture : séparation par bordures wire-like conservée.
- Padding/border : proches de Claude.

Verdict : **très fidèle**.

## 5) Footer

- Claude : code + set en mode compact avec separator.
- V2 : conserve la densité compacte, ajoute la ligne supply dédiée.

Verdict : **très proche, adaptation runtime utile**.

## 6) Raretés (COMMON, UNCOMMON, RARE, EPIC, LEGENDARY)

- COMMON : base neutre faible glow, corners simples.
- UNCOMMON : accent plus visible, glow léger.
- RARE : glow renforcé + corner detail.
- EPIC : palette premium violette + detail/dot.
- LEGENDARY : palette dorée + glow fort + detail/dot.

Verdict global rareté : **très proche de Claude**, avec adaptation enums MCG (5 niveaux) et non les codes demo (`B/A/S/S+`).

## 7) Éditions (BASE, REVERSE, BRILLANTE, HOLO, FULL_ART)

- BASE : rendu de base sans overlay dédié.
- REVERSE : foil global + masque art + reveal art.
- BRILLANTE : foil + glitter + sweep animés.
- HOLO : spectrum layer + holo lines + border iridescent animé.
- FULL_ART : pattern watermark frame + masque/reveal art (équivalent à `MCG_ART` Claude).

Verdict global édition : **très proche**, mapping nominal adapté au runtime MCG.

## 8) Écarts exacts restants

1. **`cover` -> `contain` en zone art**  
   - Pourquoi : assets réels MCG majoritairement carrés/token-logo ; éviter crop agressif et dégradation perçue.
   - Nature : **asset-driven / produit**.

2. **Largeur fixe Claude -> largeur fluide V2**  
   - Pourquoi : ne pas casser la grille responsive `/collection` et les slots reveal `/packs`.
   - Nature : **responsive/layout**.

3. **Enums édition/rareté demo Claude -> enums runtime MCG**  
   - Pourquoi : alignement strict au pipeline réel sans champ/enum fictif.
   - Nature : **runtime/contrat DTO**.

4. **Animation collection modérée**  
   - Pourquoi : limiter charge visuelle/CPU sur grilles denses.
   - Nature : **perf**.

## 9) Preuve visuelle / preuve comparative

- Preuve principale fournie ici par comparaison directe des blocs JSX/CSS et des thèmes (ligne à ligne).
- Captures app de validation disponibles pour `/collection` et `/packs` (rendu V2 branché dans le runtime).
- Conclusion : ce port est **fidèle au plus proche** avec 4 écarts explicitement justifiés (assets, responsive, runtime enum, perf collection).
