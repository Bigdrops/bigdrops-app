# Design System Specification: The Architectural ERP

## 1. Overview & Creative North Star
**Creative North Star: "The Precise Monolith"**

Enterprise ERPs are often cluttered, loud, and visually exhausting. This design system rejects the "dashboard density" trap in favor of **The Precise Monolith**. We treat data as an editorial asset. The aesthetic is inspired by high-end Swiss architectural journals: expansive white space, rigorous typographic scales, and depth achieved through tonal layering rather than structural lines.

By moving away from "standard" boxed UI, we create a mobile-first environment that feels premium, calm, and intentional. We aren't just building an ERP; we are building a high-fidelity workspace where the interface recedes to let the decision-making shine.

---

## 2. Colors & Surface Logic

Our palette utilizes deep Slate/Zinc neutrals punctuated by a surgical application of Indigo. 

### The "No-Line" Rule
To achieve a high-end feel, **1px solid borders are prohibited for sectioning.** Traditional ERPs use lines to separate data, which creates "visual noise." In this system, boundaries are defined exclusively by:
- **Background Shift:** Placing a `surface-container-low` card on a `surface` background.
- **Tonal Contrast:** Using `surface-container-highest` to highlight an active record without a stroke.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of frosted glass.
- **Level 0 (Base):** `surface` (#faf8ff) – The canvas.
- **Level 1 (Sections):** `surface-container-low` (#f2f3ff) – Large content groupings.
- **Level 2 (Interactive Cards):** `surface-container-lowest` (#ffffff) – Individual data points or forms.
- **Level 3 (Overlays):** `surface-bright` (#faf8ff) with Glassmorphism for Sheets and Popovers.

### The Glass & Gradient Rule
Main CTAs and Hero stats should utilize a **Signature Gradient**: 
- **From:** `primary` (#494bd6) 
- **To:** `primary_dim` (#3c3dca) at a 135-degree angle.
For floating navigation (Bottom Bar), use `surface_container_lowest` at 80% opacity with a `backdrop-blur` of 12px to create an integrated, modern depth.

---

## 3. Typography: The Editorial Edge

We use **Inter** not just for readability, but as a structural element. 

| Level | Token | Size | Weight/Tracking | Intent |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-md` | 2.75rem | 700 / -0.02em | Hero financial figures / KPIs |
| **Headline** | `headline-sm` | 1.5rem | 600 / -0.01em | Page titles and Sheet headers |
| **Title** | `title-sm` | 1rem | 600 / Normal | Card headers and Section labels |
| **Body** | `body-md` | 0.875rem | 400 / Normal | General data and descriptions |
| **Label** | `label-sm` | 0.6875rem | 700 / 0.05em | Compact metadata (ALL CAPS) |

**Design Note:** Use `label-sm` in `on_surface_variant` (#445d99) for field labels to maintain a compact, professional ERP density without sacrificing legibility.

---

## 4. Elevation & Depth: Tonal Layering

Traditional shadows are "cheap." We use **Ambient Depth.**

- **The Layering Principle:** Instead of a shadow, place a `surface_container_highest` (#d9e2ff) element inside a `surface_container` (#eaedff) to create a "recessed" or "inset" feel for data tables.
- **Ambient Shadows:** For floating elements (Modals/Sheets), use:
  - `box-shadow: 0 12px 40px -12px rgba(17, 48, 105, 0.08);`
  - This uses a tinted version of `on_surface` to ensure the shadow feels like a natural light obstruction, not a gray smudge.
- **The "Ghost Border" Fallback:** If a border is required for accessibility, use `outline_variant` (#98b1f2) at **15% opacity**. Never use a 100% opaque border on a container.

---

## 5. Components

### Buttons & Inputs
- **Primary Button:** Indigo gradient background, `on_primary` text, `0.5rem` radius. 
- **Secondary Button:** `surface_container_high` background, no border.
- **Input Fields:** Use `surface_container_low` as the fill. On focus, transition to `surface_container_lowest` with a 1px `primary` ghost border.

### Cards & Lists (The Editorial Table)
- **Tables:** Forbid horizontal lines. Use alternating row colors: `surface` and `surface_container_low`. 
- **Padding:** Use generous vertical padding (1.5rem) but tight horizontal padding (1rem) for mobile-first efficiency.
- **Cards:** No borders. Use `surface_container_lowest` on top of `surface_container`.

### Navigation Architecture
- **Persistent Header:** Glassmorphic (`backdrop-blur`), `surface` at 90% opacity.
- **Bottom Bar:** The "Action Dock." High contrast. Icons use `primary` for active states.
- **Side Drawer (Sheet):** Uses `surface_bright`. Content should be nested in `surface_container_low` cards to create a "drawer within a drawer" feel.

---

## 6. Do’s and Don’ts

### Do
- **Do** use `label-sm` for all non-editable metadata to keep the ERP feeling compact.
- **Do** use "Optical Alignment." Icons in buttons should be shifted 1px to visually center them against text.
- **Do** rely on `surface-container` shifts to group related financial data.

### Don’t
- **Don't** use `#000000` for text. Always use `on_surface` (#113069) for high-contrast titles.
- **Don't** use dividers (`<hr>`). Use a 24px or 32px vertical gap to separate sections.
- **Don't** use standard Indigo for everything. Reserve the `primary` accent for the "Money Path" (approvals, submits, and key KPIs). Keep the rest of the UI neutral.

---

## 7. Semantic Mapping for Developers

| HTML Element | System Mapping | Style Notes |
| :--- | :--- | :--- |
| `<section>` | **Card** | `bg-surface-container-low`, `rounded-DEFAULT` |
| `<table>` | **Data Grid** | No borders, `label-md` for headers, row-striping via `surface-container-low` |
| `<button>` | **Action** | `rounded-DEFAULT`, shadow-ambient on hover |
| `<nav>` | **Landmark** | `backdrop-blur-md`, `bg-surface/80` |