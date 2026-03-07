# MCG UX Redesign — Product/UI Direction

## 1) Maquettes hi-fi (mapping pages)
- **Home**: hero, valeur produit, CTA vers packs/collection, preuve sociale gameplay.
- **Packs**: zone booster centrée, bouton ouverture, modal reveal 3 cartes.
- **Collection**: filtres rapides (faction/recherche), grille responsive de cartes TCG.
- **Combats PvE**: sélection d’équipe max 3 cartes, difficulté, log de combat, progression.
- **Compte**: profil, historiques, jauge de progression.

## 2) Design System
### Palette
- Background base: `#05050a`
- Surface: `#0f1120`
- Texte: `#edf1ff`
- Accent cyan: `#19e4ff`
- Accent magenta: `#fd40ff`
- Accent acid green: `#9dff46`

### Typographie
- Base: `Inter, ui-sans-serif, system-ui`
- Titres: poids 700–800
- Données gameplay/chips: 600

### Langage visuel
- Bords arrondis (`14–16px`) et bordures néon légères.
- Textures discrètes (repeating-linear-gradient + radials).
- Cartes avec zone art dédiée + rareté colorée + lueur holographique au hover.

## 3) Spécifications d’animation
- Hover carte: `180ms ease`, `translateY(-4px)`.
- Lueur holo: apparition en `180ms ease`.
- Progress bar PvE: `250ms ease-out`.
- Pack opening: tilt 3D `600ms cubic-bezier(0.2, 0.9, 0.1, 1)`.

## 4) Découpage composants réutilisables
- `SiteShell`: header persistant, navigation, footer, zone session/login.
- `Button`: variantes primary/ghost/danger.
- `CardFrame`: rendu carte TCG standardisé (stats, art, rareté, état sélection).
- `Modal`: reveal de packs / overlays.
- `ProgressBar`: progression PvE / compte.
- `useSession`: hook de session partagé (`/api/me`).
