# Design System Strategy: The Digital Relic

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Relic."** We are not building a utility; we are building an artifact. The goal is to move away from the "flatness" of modern SaaS and toward a tactile, immersive experience where every interaction feels like touching a physical, enchanted object. 

This system breaks the "standard template" look by utilizing **intentional asymmetry** and **atmospheric layering**. Instead of a rigid grid, we use overlapping glass panels and "floating" card components that break container boundaries. High-contrast typography scales—mixing the tech-forward *Space Grotesk* with the approachable *Be Vietnam Pro*—create an editorial rhythm that feels premium yet internet-native.

---

## 2. Colors & Atmospheric Depth
Our palette is rooted in the deep cosmos (`surface: #120b1a`) and punctuated by high-energy neon "mana" (`secondary: #4af8e3`).

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid strokes to define sections. Sectioning must be achieved through background shifts. Use `surface_container_low` for secondary content areas and `surface_container_highest` for active interactive zones. Boundaries are felt through tonal transitions, not drawn with lines.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of frosted glass.
*   **Base:** `surface` (#120b1a) - The deep "tabletop."
*   **Mid-Layer:** `surface_container` (#1e1628) - General UI panels.
*   **Top-Layer:** `surface_bright` (#33273f) - High-priority cards or modals.
Nesting `surface_container_highest` elements inside `surface_container_low` creates a natural "pop" without a single line of CSS border.

### The "Glass & Gradient" Rule
Standard panels are "dead." Use semi-transparent surface colors (60-80% opacity) combined with a `backdrop-filter: blur(20px)`. 
*   **Signature Textures:** Main CTAs must use a linear gradient from `primary` (#c799ff) to `primary_container` (#bc87fe) at a 135-degree angle to provide "visual soul."

---

## 3. Typography: The Editorial Voice
We use typography to bridge the gap between "Gamer" and "High-End Editorial."

*   **The Hero (Space Grotesk):** Used for `display` and `headline` levels. This font’s geometric quirks capture the "Meme" energy while remaining sharp and authoritative. 
    *   *Rule:* Headlines should use tight letter-spacing (-0.02em) to feel like a punchy headline.
*   **The Narrator (Be Vietnam Pro):** Used for `title` and `body`. It provides a clean, neutral balance to the aggressive display face. 
*   **The Metadata (Plus Jakarta Sans):** Used for `labels`. These are small, uppercase, and tracked out (+0.05em) to feel like technical data on a premium collectible card.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are forbidden. We use **Ambient Glows** and **Tonal Stacking**.

*   **The Layering Principle:** Depth is achieved by stacking `surface_container` tiers. A `surface_container_lowest` card placed on a `surface_container_low` background creates a "carved out" look.
*   **Ambient Shadows:** For floating cards, use a diffused shadow: `box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4)`. The color should never be pure black; it should be a darkened version of `surface_container_lowest`.
*   **The "Ghost Border" Fallback:** If a separator is required for accessibility, use `outline_variant` (#4d4456) at **15% opacity**. It should be a whisper of a line, not a statement.
*   **Tactile Highlights:** All "Glass" panels should have a top-left 1px inner highlight (using `surface_tint` at 20% opacity) to simulate light hitting the edge of a glass sheet.

---

## 5. Components

### Tactile Cards (The Core Component)
*   **Style:** No borders. Use `surface_container_highest` with a `lg` (2rem) corner radius.
*   **Interaction:** On hover, the card should scale (1.05x) and gain a `primary` glow (0 0 20px `primary_dim`).
*   **Rarity Accents:** Rare cards use `tertiary` (#ffe792) for a "Gold" reward feel; Battle cards use `error` (#ff6e84).

### Buttons
*   **Primary:** Gradient of `primary` to `primary_container`. `full` (9999px) roundedness. Text in `on_primary`.
*   **Secondary/Glass:** `surface_bright` with 40% opacity and a `backdrop-blur`. High tactile feel.
*   **Tertiary/Ghost:** No background. `primary` text with an underline that only appears on hover.

### Progress & Health Bars
*   Avoid flat bars. Use a "segmented" approach with `0.5` (0.175rem) spacing between segments. 
*   **Health:** `error_dim`. **Mana/Energy:** `secondary_dim`.

### Inputs
*   Use `surface_container_lowest` as the field background. 
*   Floating labels using `label-md` in `on_surface_variant`.
*   Focus state: A 2px outer glow of `primary_dim` at 50% opacity.

---

## 6. Do's and Don'ts

### Do:
*   **Use Spacing as a Divider:** Use the `8` (2.75rem) or `10` (3.5rem) spacing tokens to separate major content blocks instead of lines.
*   **Embrace Asymmetry:** Let card images bleed off the edge of their containers.
*   **Animate the Light:** Use subtle CSS animations to make gradients "shimmer" on hover.

### Don't:
*   **Don't use 100% Opacity Borders:** They kill the "Glassy" vibe and make the app feel like a legacy dashboard.
*   **Don't Overcrowd:** This is a game; let the art breathe. If a screen feels busy, increase the spacing scale by one tier.
*   **Don't use Standard Grays:** Every neutral in this system must be tinted with the `background` purple (#120b1a) to maintain the "Midnight" atmosphere.