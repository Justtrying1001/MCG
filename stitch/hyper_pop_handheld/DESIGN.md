# Design System Document: Tactical Joy & High-Energy Play

## 1. Overview & Creative North Star
**Creative North Star: "The Living Toybox"**
This design system moves away from the sterile, "premium tech" aesthetic of modern SaaS and instead embraces the tactile, high-energy world of handheld console gaming. The goal is to create a UI that feels like a physical object—a collectible, "clickable" world where every interaction provides sensory satisfaction. 

By leveraging **Intentional Asymmetry** and **Exaggerated Tactility**, we break the standard grid. Elements shouldn't just sit on the screen; they should pop, bounce, and stack like a deck of physical cards. We are optimizing for "Collectible Obsession"—the feeling that every UI element is a prize to be discovered.

---

## 2. Colors
Our palette is a high-octane mix of electric primaries designed to command attention.

- **Primary & Action (#0e0dfe / #1212FF):** The "Saturated Blue." Use this for high-priority navigation and core "Game Start" actions.
- **Secondary & Accent (#00e1ef / #00EEFC):** "Vivid Cyan." Used for supportive actions and highlighting successful states.
- **Tertiary & Punch (#a92759 / #FF6B9B):** "Hot Pink." Reserved for rare collectibles, "Meme of the Week," and high-energy alerts.
- **Electric Yellow (#FFEF00) & Acid Green (#CCFF00):** These are our "Notification" and "Win" states. Use them for currency, leveling up, and rare card borders.

**The "No-Line" Rule (Internal):** 
Within a component (like a card), do not use 1px lines to separate content. Use **Surface Hierarchy**—shifting from `surface-container-low` to `surface-container-high`—to create distinct zones.

**Surface Hierarchy & Nesting:**
Treat the UI as a physical stack. 
1. **Base Layer:** `surface` (#f5f6f7).
2. **The "Table":** `surface-container-low` (#eff1f2) for large background sections.
3. **The "Toy":** `surface-container-lowest` (#ffffff) for the cards themselves, creating a clean, high-contrast lift.

**The Anti-Glass Rule:** 
Per the creative direction, **glassmorphism is strictly forbidden.** Surfaces must be 100% opaque. Depth is created through solid color blocks and offset shadows, not transparency.

---

## 3. Typography
Typography is our primary tool for energy. We balance "Chunky Display" with "Ultra-Readable Body."

- **Display & Headlines (Space Grotesk):** 
  - Use `display-lg` (3.5rem) and `display-md` (2.75rem) for big wins, card names, and game titles. 
  - These should always use tight letter-spacing (-2%) to feel "packed" and powerful.
- **Title & Body (Be Vietnam Pro):**
  - Use `title-lg` (1.375rem) for card descriptions. 
  - Use `body-md` (0.875rem) for instructional text. 
  - The contrast between the eccentric headers and the geometric, clean body text ensures the game remains playable even at high speeds.
- **Labels (Plus Jakarta Sans):**
  - Small, all-caps metadata (stats, rarity) should use `label-md` with increased letter-spacing (5%) to ensure clarity against vibrant backgrounds.

---

## 4. Elevation & Depth
In this system, depth is **Cartoony**, not realistic.

- **The Layering Principle:** 
  Stacking is mandatory. A `primary-container` button sits on a `surface-container-highest` panel, which sits on a `surface` background. Each jump in tier represents a "step" closer to the user's thumb.
- **Tactile Shadows (The Offset Shadow):** 
  Forget soft ambient glows. Use **Hard Offset Shadows**. 
  - **Shadow Token:** Offset `4px 4px`, 0px blur. 
  - **Color:** Use a darkened version of the background or a saturated color (e.g., a Hot Pink button gets a Saturated Blue shadow). This creates a "Pop-Art" depth.
- **The "Heavy Border" Rule:** 
  All interactive containers must use a thick border (`3px` to `4px`). 
  - **Token:** `outline` (#757778) or `on-surface` (#2c2f30). 
  - High-contrast borders are what give the UI its "Handheld Console" weight.

---

## 5. Components

### Buttons (The "Pressable" Feel)
- **Primary:** `primary` background, `on-primary` text, `4px` black border, `4px` offset shadow.
- **Shape:** `full` (9999px) roundedness for a pill shape that feels like a toy controller button.
- **Interaction:** On click/press, the button should shift `2px` down and right, and the shadow should disappear to simulate a physical "click."

### Cards (The "Collectible" Core)
- **Structure:** `3rem` (xl) rounded corners. 
- **Header:** Use `headline-sm` with a `surface-variant` background fill to separate the title from the card body without using a line.
- **Forbid Dividers:** Use `spacing-4` (1.4rem) of vertical white space to separate card stats.

### Chips (Rarity Tags)
- **Style:** Small, fully rounded (`full`) capsules.
- **Coloring:** Match chip color to card rarity (e.g., Acid Green for Common, Hot Pink for Mythic).

### Input Fields
- **Style:** `surface-container-lowest` background with a thick `3px` border using `outline-variant`. 
- **Focus State:** Border changes to `secondary` (Vivid Cyan) with a `4px` offset shadow.

### Progress Bars (The "XP" Bar)
- **Style:** Thick, `2rem` height, `full` roundedness.
- **Fill:** Use a gradient transition from `primary` to `secondary_fixed` to show "energy" or "charge."

---

## 6. Do's and Don'ts

### Do:
- **Use "Juicy" Spacing:** Use `spacing-6` and `spacing-8` to give elements room to breathe. High energy requires space to prevent visual clutter.
- **Embrace the Corner:** Use the `xl` (3rem) and `full` roundedness tokens for almost everything. Sharp corners are the enemy of joy.
- **Layer Saturated Colors:** Place Vivid Cyan text on a Saturated Blue background for that high-vibrancy "Nintendo" look.

### Don't:
- **No 1px Lines:** If you feel the need to draw a line, use a background color shift or more padding instead.
- **No Glass/Transparency:** Keep everything solid and bold. Transparency dilutes the "toy-like" strength of the brand.
- **No Centered-Only Layouts:** Use intentional asymmetry. Let a card peek in from the side of the screen or offset a title to the left while the CTA sits on the right. It feels more dynamic and game-like.
- **No Muted Tones:** If a color looks "dusty" or "sophisticated," it’s the wrong hex code. We only use high-saturation, high-vibrancy tokens.