# CODEX TASK — MCG Card Visual Redesign

## Objective
Fully replace the visual layer of `MvpCardTile.tsx`, `mvpCardTheme.ts`, and the card CSS in `globals.css` with a new design system. Do NOT touch any API routes, DTO types, or business logic.

---

## Files to modify
- `components/ui/MvpCardTile.tsx` — card component
- `components/ui/mvpCardTheme.ts` — rarity/edition theme maps
- `app/globals.css` — card CSS (replace only the `.mvp-*` card block, keep everything else)

---

## Design system overview

### Typography (add to `<head>` via `app/layout.tsx` if not already present)
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=DM+Mono:ital,wght@0,300;0,400;1,300&family=Lora:ital@1&display=swap" rel="stylesheet">
```
- Card name → `Rajdhani 700`, uppercase
- All metadata (ticker, badge, footer) → `DM Mono 300/400`
- Flavor text → `Lora italic`

---

## 1. CSS VARIABLE SYSTEM

Every `.mvp-premium-card` receives these CSS vars inline (set by `mvpCardTheme.ts`):

```
--accent        // border wire color + badge color
--glow-col      // box-shadow glow color (rgba)
--border-out    // outer outline color
--border-in     // inner inset border color
--wire          // subtle internal separator color
--wire-acc      // slightly brighter wire for gradients
--bg-card       // card background
--bg-header     // header zone background
--bg-footer     // footer zone background
--txt-name      // card name color
--txt-sub       // footer text color
--txt-flavor    // flavor text color
```

---

## 2. RARITY THEMES (`mvpCardTheme.ts` — `getRarityTheme`)

Replace all rarity theme values with these:

### B (Common)
```
--accent:     #3d4a5c
--glow-col:   rgba(61,74,92,0)
--border-out: #181e27
--border-in:  #1f2733
--wire:       rgba(255,255,255,0.05)
--wire-acc:   rgba(255,255,255,0.07)
--bg-card:    #11111b
--bg-header:  #0d0d16
--bg-footer:  #0b0b14
--txt-name:   #c8d0dc
--txt-sub:    #2e3848
--txt-flavor: #4a5568
corner stroke: #2a3545 (no inner rect)
```

### A (Uncommon)
```
--accent:     #5a7a8a
--glow-col:   rgba(90,122,138,0.12)
--border-out: #1e2d38
--border-in:  #253545
--wire:       rgba(90,122,138,0.1)
--wire-acc:   rgba(90,122,138,0.18)
--bg-card:    #0f1318
--bg-header:  #0c1015
--bg-footer:  #0a120e
--txt-name:   #d4dde6
--txt-sub:    #3a5060
--txt-flavor: #556070
corner stroke: #3a5060 (no inner rect)
```

### S (Rare)
```
--accent:     #7090b8
--glow-col:   rgba(112,144,184,0.22)
--border-out: #243050
--border-in:  #2d3d60
--wire:       rgba(112,144,184,0.12)
--wire-acc:   rgba(112,144,184,0.22)
--bg-card:    #0d1220
--bg-header:  #0a0f1a
--bg-footer:  #090d16
--txt-name:   #dce6f4
--txt-sub:    #4a6080
--txt-flavor: #607080
corner stroke: #4a6888 (+ inner rect 3x3 opacity 0.6)
```

### S+ (Legendary)
```
--accent:     #b89a60
--glow-col:   rgba(184,154,96,0.35)
--border-out: #3a2e18
--border-in:  #4a3c22
--wire:       rgba(184,154,96,0.12)
--wire-acc:   rgba(184,154,96,0.25)
--bg-card:    #0e0b04
--bg-header:  #0b0802
--bg-footer:  #090703
--txt-name:   #ece0c8
--txt-sub:    #7a6040
--txt-flavor: #806a50
corner stroke: #8a7040 (+ inner rect 3x3 + circle dot r=0.7 fill=#b89a60 opacity=0.6)
```

---

## 3. EDITION THEMES (`mvpCardTheme.ts` — `getEditionTheme`)

Editions add a visual layer ON TOP of the rarity base. Return an `editionClass` string:

| Edition code | editionClass       |
|--------------|--------------------|
| BASE         | `ed-base`          |
| REVERSE      | `ed-reverse`       |
| BRILLANTE    | `ed-brillante`     |
| HOLOGRAPHIC  | `ed-holo`          |
| MCG_ART      | `ed-mcgart`        |

---

## 4. CARD SHELL CSS (replace `.mvp-premium-card` block in `globals.css`)

```css
.mvp-premium-card {
  position: relative;
  width: 100%;
  aspect-ratio: 63 / 88;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  background: var(--bg-card);
  outline: 1px solid var(--border-out);
  box-shadow:
    inset 0 0 0 1px var(--border-in),
    0 18px 50px rgba(0,0,0,0.8),
    0 0 40px var(--glow-col);
  display: grid;
  grid-template-rows: 50px 1fr 38px 34px;
  transition: transform 0.32s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.32s ease;
}

.mvp-premium-card:hover {
  transform: translateY(-8px) scale(1.025);
  box-shadow:
    inset 0 0 0 1px var(--border-in),
    0 30px 72px rgba(0,0,0,0.9),
    0 0 64px var(--glow-col),
    0 0 110px var(--glow-col);
}

/* Grain texture */
.mvp-card-grain {
  position: absolute; inset: 0; border-radius: 10px;
  z-index: 50; pointer-events: none; opacity: 0.3;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='280'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.05'/%3E%3C/svg%3E");
  mix-blend-mode: overlay;
}

/* Corner ornaments */
.mvp-corner { position: absolute; width: 14px; height: 14px; z-index: 45; pointer-events: none; }
.mvp-corner svg { width: 100%; height: 100%; display: block; }
.mvp-corner-tl { top: 5px; left: 5px; }
.mvp-corner-tr { top: 5px; right: 5px; transform: scaleX(-1); }
.mvp-corner-bl { bottom: 5px; left: 5px; transform: scaleY(-1); }
.mvp-corner-br { bottom: 5px; right: 5px; transform: scale(-1,-1); }

/* ── Zone 1: Header ── */
.mvp-card-header {
  position: relative; z-index: 10;
  padding: 9px 11px 0;
  background: var(--bg-header);
  display: flex; justify-content: space-between; align-items: flex-start;
}
.mvp-card-header::after {
  content: ''; position: absolute; bottom: 0; left: 10px; right: 10px; height: 1px;
  background: linear-gradient(90deg, transparent, var(--wire-acc) 25%, var(--accent) 50%, var(--wire-acc) 75%, transparent);
  opacity: 0.45;
}
.mvp-card-name {
  font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 15px;
  letter-spacing: 0.05em; color: var(--txt-name); text-transform: uppercase; line-height: 1;
}
.mvp-card-ticker {
  font-family: 'DM Mono', monospace; font-size: 7.5px; font-weight: 300;
  color: var(--accent); letter-spacing: 0.12em; opacity: 0.75; margin-top: 2px;
}
.mvp-badge-rarity {
  font-family: 'DM Mono', monospace; font-size: 7px;
  letter-spacing: 0.1em; padding: 2px 5px; border-radius: 2px;
  border: 1px solid var(--accent); color: var(--accent);
  background: rgba(0,0,0,0.5); line-height: 1;
}
.mvp-badge-edition {
  font-family: 'DM Mono', monospace; font-size: 6px;
  letter-spacing: 0.1em; padding: 1px 4px; border-radius: 2px;
  border: 1px solid var(--accent); color: var(--accent);
  opacity: 0.7; line-height: 1;
}

/* ── Zone 2: Art ── */
.mvp-card-art-shell {
  position: relative; z-index: 10;
  margin: 7px 9px; border-radius: 5px; overflow: hidden;
  background: #080a0d; border: 1px solid var(--wire);
}
.mvp-card-art-shell img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.mvp-card-art-shell::after {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%);
  pointer-events: none; z-index: 2;
}

/* ── Zone 3: Textbox ── */
.mvp-card-textbox {
  position: relative; z-index: 10;
  padding: 0 11px; display: flex; align-items: center;
  border-top: 1px solid var(--wire); border-bottom: 1px solid var(--wire);
}
.mvp-card-textbox p {
  font-family: 'Lora', serif; font-style: italic; font-size: 8.5px;
  line-height: 1.45; color: var(--txt-flavor);
  overflow: hidden; display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}

/* ── Zone 4: Footer ── */
.mvp-card-footer {
  position: relative; z-index: 10;
  padding: 0 11px; display: flex; align-items: center; justify-content: space-between;
  background: var(--bg-footer);
}
.mvp-card-footer::before {
  content: ''; position: absolute; top: 0; left: 10px; right: 10px; height: 1px;
  background: linear-gradient(90deg, transparent, var(--wire-acc) 30%, var(--wire-acc) 70%, transparent);
  opacity: 0.6;
}
.mvp-footer-code, .mvp-footer-set {
  font-family: 'DM Mono', monospace; font-size: 7px; font-weight: 300;
  color: var(--txt-sub); letter-spacing: 0.06em;
}
.mvp-footer-sep { width: 1px; height: 10px; background: var(--wire-acc); opacity: 0.4; }
```

---

## 5. EDITION CSS LAYERS

Add these classes to `globals.css`:

```css
/* ══ REVERSE ══ */
.ed-reverse .mvp-reverse-foil {
  position: absolute; inset: 0; border-radius: 10px; z-index: 19; pointer-events: none;
  background: repeating-linear-gradient(
    108deg,
    rgba(255,255,255,0.000) 0px, rgba(180,210,255,0.055) 2px,
    rgba(255,255,255,0.000) 4px, rgba(200,240,200,0.040) 6px,
    rgba(255,255,255,0.000) 8px, rgba(255,200,200,0.035) 10px,
    rgba(255,255,255,0.000) 12px
  );
}
/* Art mask: hides foil over artwork zone */
.ed-reverse .mvp-art-mask {
  position: absolute; z-index: 22;
  top: 57px; left: 9px; right: 9px; bottom: 79px;
  border-radius: 5px; background: var(--bg-card); pointer-events: none;
}
.ed-reverse .mvp-art-reveal {
  position: absolute; z-index: 23;
  top: 57px; left: 9px; right: 9px; bottom: 79px;
  border-radius: 5px; overflow: hidden; pointer-events: none;
  border: 1px solid var(--wire);
}
.ed-reverse .mvp-art-reveal img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ed-reverse .mvp-art-reveal::after {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%);
}

/* ══ BRILLANTE ══ */
@keyframes brillanteShift {
  0%   { background-position: 0% 50%; }
  25%  { background-position: 100% 0%; }
  50%  { background-position: 100% 100%; }
  75%  { background-position: 0% 100%; }
  100% { background-position: 0% 50%; }
}
@keyframes brillanteSweep {
  0%   { transform: translateX(-150%) skewX(-15deg); }
  100% { transform: translateX(250%) skewX(-15deg); }
}

.ed-brillante {
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,0.12),
    0 0 0 1px var(--border-out),
    0 18px 50px rgba(0,0,0,0.8),
    0 0 50px rgba(200,220,255,0.3) !important;
}
.ed-brillante:hover {
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,0.2),
    0 0 0 1px var(--border-out),
    0 30px 72px rgba(0,0,0,0.9),
    0 0 80px rgba(200,220,255,0.45),
    0 0 130px rgba(200,220,255,0.15) !important;
}
.mvp-brill-foil {
  position: absolute; inset: 0; border-radius: 10px; z-index: 22; pointer-events: none;
  background: linear-gradient(
    125deg,
    rgba(255,255,255,0.00) 0%,   rgba(200,210,230,0.07) 8%,
    rgba(255,255,255,0.13) 15%,  rgba(180,200,230,0.06) 22%,
    rgba(255,255,255,0.09) 30%,  rgba(210,220,240,0.05) 38%,
    rgba(255,255,255,0.14) 45%,  rgba(190,210,240,0.07) 52%,
    rgba(255,255,255,0.10) 60%,  rgba(200,215,240,0.06) 68%,
    rgba(255,255,255,0.13) 76%,  rgba(185,205,235,0.05) 84%,
    rgba(255,255,255,0.08) 92%,  rgba(255,255,255,0.00) 100%
  );
  background-size: 300% 300%;
  animation: brillanteShift 6s ease-in-out infinite;
  mix-blend-mode: screen;
}
.mvp-brill-glitter {
  position: absolute; inset: 0; border-radius: 10px; z-index: 23; pointer-events: none;
  background-image:
    radial-gradient(circle 1px at 12% 8%,  rgba(255,255,255,0.9) 0%, transparent 100%),
    radial-gradient(circle 1px at 87% 12%, rgba(255,255,255,0.8) 0%, transparent 100%),
    radial-gradient(circle 1px at 34% 19%, rgba(255,255,255,0.7) 0%, transparent 100%),
    radial-gradient(circle 1px at 61% 25%, rgba(255,255,255,0.9) 0%, transparent 100%),
    radial-gradient(circle 1px at 78% 33%, rgba(255,255,255,0.6) 0%, transparent 100%),
    radial-gradient(circle 1px at 22% 41%, rgba(255,255,255,0.8) 0%, transparent 100%),
    radial-gradient(circle 1px at 50% 38%, rgba(255,255,255,0.7) 0%, transparent 100%),
    radial-gradient(circle 1px at 93% 46%, rgba(255,255,255,0.9) 0%, transparent 100%),
    radial-gradient(circle 1px at 8%  54%, rgba(255,255,255,0.7) 0%, transparent 100%),
    radial-gradient(circle 1px at 68% 52%, rgba(255,255,255,0.8) 0%, transparent 100%),
    radial-gradient(circle 1px at 40% 61%, rgba(255,255,255,0.6) 0%, transparent 100%),
    radial-gradient(circle 1px at 82% 65%, rgba(255,255,255,0.9) 0%, transparent 100%),
    radial-gradient(circle 1px at 18% 72%, rgba(255,255,255,0.7) 0%, transparent 100%),
    radial-gradient(circle 1px at 55% 78%, rgba(255,255,255,0.8) 0%, transparent 100%),
    radial-gradient(circle 1px at 30% 85%, rgba(255,255,255,0.6) 0%, transparent 100%),
    radial-gradient(circle 1px at 71% 88%, rgba(255,255,255,0.9) 0%, transparent 100%),
    radial-gradient(circle 1px at 45% 93%, rgba(255,255,255,0.7) 0%, transparent 100%),
    radial-gradient(circle 1px at 90% 96%, rgba(255,255,255,0.8) 0%, transparent 100%),
    radial-gradient(circle 2px at 25% 30%, rgba(255,255,255,0.4) 0%, transparent 100%),
    radial-gradient(circle 2px at 74% 70%, rgba(255,255,255,0.35) 0%, transparent 100%);
  mix-blend-mode: screen; opacity: 0.85;
  background-size: 300% 300%;
  animation: brillanteShift 6s ease-in-out infinite reverse;
}
.mvp-brill-sweep {
  position: absolute; top: 0; bottom: 0; left: 0; width: 40%;
  z-index: 24; pointer-events: none;
  background: linear-gradient(
    90deg, transparent 0%, rgba(255,255,255,0.06) 30%,
    rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.06) 70%, transparent 100%
  );
  animation: brillanteSweep 3.5s ease-in-out infinite;
  mix-blend-mode: screen;
}

/* ══ HOLOGRAPHIQUE ══ */
@keyframes holoShift {
  0%   { background-position: 0% 50%; }
  33%  { background-position: 100% 20%; }
  66%  { background-position: 50% 100%; }
  100% { background-position: 0% 50%; }
}
.ed-holo { outline: none !important; }
.ed-holo::after {
  content: ''; position: absolute; inset: 0; border-radius: 10px; z-index: 45;
  pointer-events: none;
  background: linear-gradient(125deg,
    rgba(255,80,80,0.5), rgba(255,200,60,0.4), rgba(60,220,100,0.4),
    rgba(60,180,255,0.5), rgba(180,60,255,0.4), rgba(255,80,160,0.4)
  );
  background-size: 300% 300%;
  animation: holoShift 4s ease-in-out infinite;
  -webkit-mask-image: linear-gradient(#000,#000), linear-gradient(#000,#000);
  -webkit-mask-composite: xor;
  -webkit-mask-size: 100% 100%, calc(100% - 3px) calc(100% - 3px);
  -webkit-mask-position: 0 0, 1.5px 1.5px;
  mask-composite: exclude;
}
.mvp-holo-layer {
  position: absolute; inset: 0; border-radius: 10px; z-index: 19; pointer-events: none;
  background: linear-gradient(125deg,
    rgba(255,80,80,0.12) 0%,   rgba(255,160,60,0.10) 14%,
    rgba(255,240,60,0.10) 28%, rgba(60,220,100,0.10) 42%,
    rgba(60,180,255,0.12) 57%, rgba(120,80,255,0.10) 71%,
    rgba(220,60,200,0.10) 85%, rgba(255,80,80,0.08) 100%
  );
  background-size: 300% 300%;
  animation: holoShift 4s ease-in-out infinite;
  mix-blend-mode: screen;
}
.mvp-holo-lines {
  position: absolute; inset: 0; border-radius: 10px; z-index: 20; pointer-events: none;
  background: repeating-linear-gradient(
    102deg,
    transparent 0px,
    rgba(255,120,120,0.04) 1px, rgba(255,200,80,0.04) 2px,
    rgba(120,255,120,0.04) 3px, rgba(80,160,255,0.04) 4px,
    rgba(180,80,255,0.04) 5px, transparent 6px
  );
  mix-blend-mode: screen; opacity: 0.8;
}

/* ══ MCG ART ══ */
/* 
  IMPORTANT: The logo pattern uses a base64 PNG of the MCG logo (white on transparent).
  Save the following base64 as /public/mcg-logo-tile.png in the repo,
  then reference it as url('/mcg-logo-tile.png') instead of the inline base64 below.
  
  Base64 tile (48x32px, white logo on transparent):
  iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAYAAABU1PscAAABfUlEQVR4nO2Wa07DMBCEv3GSFqjE/a/IBYCmcZYfXuMQAWrjVAjJI0VJto539jHrQkNDQ0NDBXTPzc2sdx8RQNK8t4/dAzCzAGTihpMHDm47S4o/fH4z+r02AjCzgUR0BC6SzO0CZuARmChBVWO3AJzkkN8lmdsAOlJgE6kquyHsuRnw7nsezUxegQAcSQHM7Jh9uI8GeuABuFCyHQH7FyLOcD0YELMW3P7F51Iny3XXYnMAZtYB85rAYnSapGmxPlA0cqFMqUBqrbBcfy1qRGxOaFxlL64z6VkPwOhBdv6e9dBLGreQqGqh3A5bSu+VyphJFbt5n81TyFviV/LLfl89B0rygl+HLTxuroAT6fwa/R6/0UImNrufjtQymfxMasMn4AxMW6bUVg2IctKuhZfFKUqCBEhS9AREioDfqBixtRp4Bk4UMU5OaCAdaif38Uo6G3pf2wGdpJca/1AfQG6lz3+c+Ehc3PNvXf7MbYOk1xr/DQ0NDQ0NDX+ND3LlsB6hJmdVAAAAAElFTkSuQmCC
*/
.mvp-mcgart-pattern {
  position: absolute; inset: 0; border-radius: 10px; z-index: 8; pointer-events: none;
  background-image: url('/mcg-logo-tile.png');
  background-repeat: repeat;
  background-size: 48px 32px;
  opacity: 0.04;
  mix-blend-mode: screen;
}
.mvp-mcgart-art-mask {
  position: absolute; z-index: 9;
  top: 57px; left: 9px; right: 9px; bottom: 79px;
  border-radius: 5px; background: var(--bg-card); pointer-events: none;
}
.mvp-mcgart-art-reveal {
  position: absolute; z-index: 11;
  top: 57px; left: 9px; right: 9px; bottom: 79px;
  border-radius: 5px; overflow: hidden; pointer-events: none;
  border: 1px solid var(--wire);
}
.mvp-mcgart-art-reveal img { width: 100%; height: 100%; object-fit: cover; display: block; }
.mvp-mcgart-art-reveal::after {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%);
}
```

---

## 6. CORNER SVG PER RARITY

Render these SVG corner ornaments inside each card (4x, rotated via CSS classes):

```tsx
// B — just L bracket
const cornerB = (stroke: string) => (
  <svg viewBox="0 0 14 14" fill="none">
    <path d="M1 13V1H13" stroke={stroke} strokeWidth="0.9"/>
  </svg>
)

// A — L bracket (same, different color)
const cornerA = (stroke: string) => cornerB(stroke)

// S — L bracket + small inner rect
const cornerS = (stroke: string) => (
  <svg viewBox="0 0 14 14" fill="none">
    <path d="M1 13V1H13" stroke={stroke} strokeWidth="0.9"/>
    <rect x="1" y="1" width="3" height="3" stroke={stroke} strokeWidth="0.5" opacity="0.6"/>
  </svg>
)

// S+ — L bracket + rect + dot
const cornerSPlus = (stroke: string, dot: string) => (
  <svg viewBox="0 0 14 14" fill="none">
    <path d="M1 13V1H13" stroke={stroke} strokeWidth="1"/>
    <rect x="1" y="1" width="3" height="3" stroke={stroke} strokeWidth="0.6" opacity="0.7"/>
    <circle cx="2.5" cy="2.5" r="0.7" fill={dot} opacity="0.6"/>
  </svg>
)
```

Corner stroke colors: B=`#2a3545`, A=`#3a5060`, S=`#4a6888`, S+=`#8a7040` (dot=`#b89a60`)

---

## 7. `MvpCardTile.tsx` STRUCTURE

```tsx
<article
  className={`mvp-premium-card ${editionClass}`}
  style={{ /* all --css-vars from getRarityTheme */ }}
>
  {/* Always present */}
  <div className="mvp-card-grain" />

  {/* Corner ornaments x4 */}
  <span className="mvp-corner mvp-corner-tl">{cornerSvg}</span>
  <span className="mvp-corner mvp-corner-tr">{cornerSvg}</span>
  <span className="mvp-corner mvp-corner-bl">{cornerSvg}</span>
  <span className="mvp-corner mvp-corner-br">{cornerSvg}</span>

  {/* Edition layers — conditionally rendered */}
  {edition === 'REVERSE' && (
    <>
      <div className="mvp-reverse-foil" />
      <div className="mvp-art-mask" />
      <div className="mvp-art-reveal"><img src={imageUrl} /></div>
    </>
  )}
  {edition === 'BRILLANTE' && (
    <>
      <div className="mvp-brill-foil" />
      <div className="mvp-brill-glitter" />
      <div className="mvp-brill-sweep" />
    </>
  )}
  {edition === 'HOLOGRAPHIC' && (
    <>
      <div className="mvp-holo-layer" />
      <div className="mvp-holo-lines" />
    </>
  )}
  {edition === 'MCG_ART' && (
    <>
      <div className="mvp-mcgart-pattern" />
      <div className="mvp-mcgart-art-mask" style={{ background: 'var(--bg-card)' }} />
      <div className="mvp-mcgart-art-reveal"><img src={imageUrl} /></div>
    </>
  )}

  {/* Zone 1: Header */}
  <div className="mvp-card-header">
    <div>
      <div className="mvp-card-name">{displayName}</div>
      <div className="mvp-card-ticker">${symbol}</div>
    </div>
    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
      <span className="mvp-badge-rarity">{rarity}</span>
      {edition !== 'BASE' && (
        <span className="mvp-badge-edition">{editionLabel}</span>
      )}
    </div>
  </div>

  {/* Zone 2: Art — hidden for REVERSE and MCG_ART (reveal layer handles it) */}
  <div
    className="mvp-card-art-shell"
    style={{ visibility: ['REVERSE','MCG_ART'].includes(edition) ? 'hidden' : 'visible' }}
  >
    <img src={imageUrl} alt={displayName} />
  </div>

  {/* Zone 3: Textbox */}
  <div className="mvp-card-textbox">
    <p>{cardText}</p>
  </div>

  {/* Zone 4: Footer */}
  <div className="mvp-card-footer">
    <span className="mvp-footer-code">{cardNumber}</span>
    <div className="mvp-footer-sep" />
    <span className="mvp-footer-set">{setEditionLabel}</span>
  </div>
</article>
```

---

## 8. PUBLIC ASSET

Copy the MCG logo tile to `/public/mcg-logo-tile.png`.

Decode this base64 and save it:
```
iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAYAAABU1PscAAABfUlEQVR4nO2Wa07DMBCEv3GSFqjE/a/IBYCmcZYfXuMQAWrjVAjJI0VJto539jHrQkNDQ0NDBXTPzc2sdx8RQNK8t4/dAzCzAGTihpMHDm47S4o/fH4z+r02AjCzgUR0BC6SzO0CZuARmChBVWO3AJzkkN8lmdsAOlJgE6kquyHsuRnw7nsezUxegQAcSQHM7Jh9uI8GeuABuFCyHQH7FyLOcD0YELMW3P7F51Iny3XXYnMAZtYB85rAYnSapGmxPlA0cqFMqUBqrbBcfy1qRGxOaFxlL64z6VkPwOhBdv6e9dBLGreQqGqh3A5bSu+VyphJFbt5n81TyFviV/LLfl89B0rygl+HLTxuroAT6fwa/R6/0UImNrufjtQymfxMasMn4AxMW6bUVg2IctKuhZfFKUqCBEhS9AREioDfqBixtRp4Bk4UMU5OaCAdaif38Uo6G3pf2wGdpJca/1AfQG6lz3+c+Ehc3PNvXf7MbYOk1xr/DQ0NDQ0NDX+ND3LlsB6hJmdVAAAAAElFTkSuQmCC
```

Or via bash: `echo "<base64>" | base64 -d > public/mcg-logo-tile.png`

---

## 9. DO NOT TOUCH
- `types/cards.ts` (MvpCardView, MvpCollectionItem)
- `lib/domain/cards/token-master.ts`
- `lib/domain/acquisition/open-pack.ts`
- `lib/serializers.ts`
- `app/api/**`
- Any Prisma schema or migrations
