# MCG UX Redesign — Premium Product Direction
Status: VISION


## 1) High-fidelity page structure
- **Home**: cinematic hero, value proposition, conversion-focused CTAs, and product pillars.
- **Packs**: opening ritual, reveal flow, and drop-value storytelling.
- **Collection**: responsive card gallery with search/faction filters.
- **PvE**: squad selection, difficulty choice, combat log, and run progression.
- **Account**: player profile, opening history, and seasonal progression status.

## 2) Design system
### Color palette
- Background: `#04050b` / `#090b16`
- Surface: `rgba(11, 14, 28, 0.78)`
- Text: `#ecf1ff`
- Cyan accent: `#23e7ff`
- Magenta accent: `#ff47e8`
- Lime accent: `#b8ff46`

### Typography
- Family: `Inter, ui-sans-serif, system-ui`
- Hero titles: `700–900`
- Interface labels/chips: `600–700`

### Visual language
- Premium dark surfaces with controlled neon edges.
- TCG-inspired card composition (nameplate, art zone, stats zone, rarity treatment).
- Subtle texture/noise and holographic glint instead of heavy motion overload.

## 3) Motion specs
- Card hover lift: `180ms ease`.
- Holo glint fade-in: `180ms ease`.
- Progress fill animation: `250ms ease-out`.
- Pack tilt reveal: `760ms cubic-bezier(0.2, 0.9, 0.1, 1)`.

## 4) Reusable component map
- `SiteShell`: global header/nav/account + footer framing.
- `Button`: `primary`, `ghost`, `danger` variants.
- `CardFrame`: reusable TCG card renderer.
- `Modal`: pack reveal and overlay interactions.
- `ProgressBar`: PvE/account progression.
- `useSession`: shared session state (`/api/me`).
