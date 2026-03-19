# MCG Design System — "Digital Relic"

## 1. Creative Direction

The app should feel like a **game world**, not a SaaS dashboard.

Tone:

* playful
* collectible
* immersive
* premium but fun

Think:

* Pokémon UI
* collectible card games
* digital artifacts

NOT:

* boring dashboards
* crypto trading apps
* admin panels

---

## 2. Core Principles

### 2.1 Card-first experience

Cards are the center of the UI.

* everything revolves around cards
* cards must feel tactile and collectible
* hover = interaction
* selection = focus + detail panel

---

### 2.2 Depth & Layers

No flat UI.

Use:

* dark background
* layered surfaces
* glass panels
* soft gradients

Avoid:

* flat colors
* white backgrounds

---

### 2.3 No hard borders

DO NOT use:

* 1px borders
* sharp separators

Use instead:

* background contrast
* shadows
* glow
* spacing

---

### 2.4 Glass & Glow

UI should feel alive.

Use:

* backdrop blur
* subtle transparency
* neon glow accents

Colors:

* purple (primary)
* cyan (secondary)
* gold (rarity)

---

## 3. Layout System

### 3.1 App Shell

Always use:

* left sidebar (navigation)
* top bar (user + currency)
* main content area

---

### 3.2 Page Structure

Most pages follow:

* header (title + filters)
* main content (cards / lists)
* optional side panel (details)

---

## 4. Components

### 4.1 Cards

* rounded corners
* image-based
* gradient overlay
* rarity badge
* hover animation (scale + glow)

---

### 4.2 Buttons

Primary:

* gradient (purple → violet)
* rounded full
* bold

Secondary:

* glass style
* subtle background

---

### 4.3 Panels

* glass effect
* blur
* soft shadows
* layered surfaces

---

## 5. Typography

Use hierarchy:

* large bold titles
* small uppercase labels
* readable body text

Style:

* modern
* slightly futuristic
* not corporate

---

## 6. Interactions

* hover = scale + glow
* click = focus / selection
* transitions = smooth

---

## 7. Authentication States

The app has two distinct UI modes:

### 7.1 Unauthenticated (Landing)

* marketing / onboarding
* lighter layout
* no sidebar

### 7.2 Authenticated (App UI)

* full game interface
* sidebar + topbar + panels

These two modes must remain clearly separated.

---

## 8. Implementation rules

* DO NOT copy raw HTML from design files
* rebuild components in React / Next.js
* reuse existing backend and data
* do not break current logic

---

## 9. Goal

Transform the app into a **playable collectible experience**, not just a UI.
