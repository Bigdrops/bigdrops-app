# Reprise — Style Reference
> Golden-hour warmth meets crimson depth. Two modes, one voice.

**Theme:** Dual-mode (gold light + crimson dark)

**Verification note:** This spec is reconciled from three independent AI extractions of the same source video, then checked against six actual screenshots. The floating app frame, dual mono/sans typography, and right-hand tab rail are confirmed structural facts — not every model caught these. Where screenshots showed a value directly (hex approximations aside), that reading takes priority over any single extraction.

Reprise is a warm, editorial-toned financial terminal that fuses two languages: a sun-drenched golden-hour photographic ambience and a crisp, near-monochrome "paper" UI floating inside it. The interface supports two distinct visual modes — **Gold Light** and **Crimson Dark** — toggled by user preference, time of day, or system setting. In Gold Light, warm paper-white surfaces float over a golden wheat-field wallpaper with honey/amber accents. In Crimson Dark, deep crimson surfaces absorb light while warm gold highlights punctuate the darkness like embers. Typography remains a deliberate duet: tracked-out uppercase **monospace** for brand-voice moments, and **sans-serif** for navigation and body copy. Elevation is communicated through surface tinting and 1px hairline strokes rather than heavy shadows.

---

## Tokens — Colors

### Gold Light Mode (Default)

| Name | Value | Token | Role |
|---|---|---|---|
| Wallpaper / Ambient Canvas | photographic golden field + sky gradient | `--color-wallpaper-light` | Full-bleed background behind the app frame |
| App Frame / Canvas | `#FAFAF9` – `#F8F7F4` | `--color-canvas-light` | Base of the floating white panel |
| Card Surface | `#FFFFFF` | `--color-surface-card-light` | Primary cards, hero banner container |
| Inset Surface | `#F7F5F1` | `--color-surface-inset-light` | Nested panels, hover rows, secondary fills |
| Border — Subtle | `#E8E5DF` | `--color-border-subtle-light` | Card strokes, input borders, row dividers |
| Border — Strong | `#DBD7CF` | `--color-border-strong-light` | Buttons, emphasized strokes |
| Divider — Dashed | `#E4E1DA` | `--color-divider-dashed-light` | Coupon list row separators |
| Ink — Primary | `#18181B` | `--color-ink-900-light` | Headings, metric values, primary text |
| Ink — Secondary | `#5C5A55` | `--color-ink-600-light` | Nav text, labels |
| Ink — Muted | `#71717A` | `--color-ink-500-light` | Captions, table metadata |
| Ink — Faint | `#8B8781` | `--color-ink-400-light` | Placeholders, axis labels |
| Gold — Deep | `#B4770F` | `--color-gold-700` | Hero gradient deep end, primary chart featured bars |
| Gold — Accent | `#D9962B` / `#E8A232` | `--color-gold-500` | Primary accent, icon tiles, active nav, featured chart bar |
| Gold — Highlight | `#E8B33C` / `#F3BD48` | `--color-gold-400` | Tile gradient highlight, hero gradient mid |
| Ink Button / Dark Surface | `#18181B` | `--color-ink-button-light` | "Ask ReprAI" pill, primary buttons |
| Success — Dot | `#22C55E` | `--color-success-500` | "Open" status dot |
| Success — Text | `#16A34A` | `--color-success-600` | Positive trend indicator |
| Lime — AI Signal | `#84CC16` | `--color-lime-500` | AI credit signal progress bar fill |
| Danger — Pip | `#EF4444` | `--color-danger-500` | Notification badge dot |
| Chart Bar — Neutral | `#E5E7EB` | `--color-chart-neutral-light` | Inactive histogram bars |
| Chip / Badge Bg | `#EFEDE8` | `--color-chip-bg-light` | Keycap chips, tag pill fill |

### Crimson Dark Mode

| Name | Value | Token | Role |
|---|---|---|---|
| Wallpaper / Ambient Canvas | deep crimson gradient `#1A0505` → `#2D0A0A` | `--color-wallpaper-dark` | Full-bleed dark background behind the app frame |
| App Frame / Canvas | `#0F0A0A` – `#140C0C` | `--color-canvas-dark` | Base of the floating dark panel |
| Card Surface | `#1A1111` | `--color-surface-card-dark` | Primary cards, hero banner container |
| Inset Surface | `#241818` | `--color-surface-inset-dark` | Nested panels, hover rows, secondary fills |
| Border — Subtle | `#3D2525` | `--color-border-subtle-dark` | Card strokes, input borders, row dividers |
| Border — Strong | `#4A2E2E` | `--color-border-strong-dark` | Buttons, emphasized strokes |
| Divider — Dashed | `#352020` | `--color-divider-dashed-dark` | Coupon list row separators |
| Ink — Primary | `#F5F0EB` | `--color-ink-900-dark` | Headings, metric values, primary text |
| Ink — Secondary | `#B8A89C` | `--color-ink-600-dark` | Nav text, labels |
| Ink — Muted | `#9A8B80` | `--color-ink-500-dark` | Captions, table metadata |
| Ink — Faint | `#7A6E66` | `--color-ink-400-dark` | Placeholders, axis labels |
| Gold — Accent (dark) | `#E8B33C` / `#F3BD48` | `--color-gold-400` | Primary accent in dark mode — brighter gold for contrast |
| Gold — Highlight (dark) | `#F3D9A0` | `--color-gold-300` | Tile highlights, hero gradient mid in dark |
| Crimson — Deep | `#8B0000` | `--color-crimson-700` | Dark mode canvas tint, deep surfaces |
| Crimson — Surface | `#A52A2A` | `--color-crimson-500` | Card accents, elevated surfaces |
| Crimson — Glow | `#C43E3E` | `--color-crimson-400` | Hover states, active indicators, glow effects |
| Crimson — Wash | `rgba(165,42,42,0.15)` | `--color-crimson-wash-dark` | Subtle tint backgrounds |
| Ink Button / Dark Surface | `#F5F0EB` | `--color-ink-button-dark` | Primary buttons in dark mode (inverted) |
| Success — Dot (dark) | `#4ADE80` | `--color-success-400` | "Open" status dot — brighter for dark |
| Success — Text (dark) | `#22C55E` | `--color-success-500` | Positive trend — brighter for dark |
| Lime — AI Signal (dark) | `#A3E635` | `--color-lime-400` | AI signal — brighter for dark |
| Danger — Pip (dark) | `#F87171` | `--color-danger-400` | Notification badge — brighter for dark |
| Chart Bar — Neutral (dark) | `#3D2525` | `--color-chart-neutral-dark` | Inactive histogram bars |
| Chip / Badge Bg (dark) | `#2D1A1A` | `--color-chip-bg-dark` | Keycap chips, tag pill fill |

### Semantic Color Mapping

| Semantic | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| Primary accent | `--color-gold-500` | `--color-gold-400` | Icon tiles, featured bars, active states |
| Secondary accent | `--color-gold-700` | `--color-gold-300` | Deep gradients, hover accents |
| Risk / critical | `--color-crimson-700` | `--color-crimson-400` | Alerts, negative values, risk metrics |
| Risk / medium | `--color-crimson-500` | `--color-crimson-500` | Risk labels, overdue states |
| Background | `--color-canvas-light` | `--color-canvas-dark` | App frame base |
| Card surface | `--color-surface-card-light` | `--color-surface-card-dark` | Primary containers |
| Text primary | `--color-ink-900-light` | `--color-ink-900-dark` | Headings, values |
| Text secondary | `--color-ink-600-light` | `--color-ink-600-dark` | Labels, nav |
| Border | `--color-border-subtle-light` | `--color-border-subtle-dark` | Dividers, strokes |

---

## Tokens — Typography

**Mono — Brand & Data Voice**
- Substitutes: JetBrains Mono → Space Mono → IBM Plex Mono → ui-monospace.
- Used for: breadcrumb, hero title + subtitle, tag pills, section micro-headers, large dollar figures, tab labels, axis labels.
- Weights: 500 (labels/tabs), 600–700 (titles, large numerals).
- Tracking: uppercase micro-labels carry visible letter-spacing (~+0.06–0.08em).

**Sans — UI & Body Voice**
- Substitutes: Inter → SF Pro → Geist → system-ui.
- Used for: sidebar nav items, brand wordmark "Reprise", card titles, body rows, key–value pairs, button text.
- Weights: 400 (body), 500 (nav/labels), 600 (card titles, values, buttons).

### Type Scale (Mode-Agnostic)

| Role | Size | Line Height | Letter Spacing | Token |
|---|---|---|---|---|
| Hero Title (mono, 700) | 28–30px | 1.15 | -0.02em | `--text-hero` |
| Metric XL (mono, 700) | 26–28px | 1.1 | -0.01em | `--text-metric-xl` |
| Metric L (mono, 700) | 22–24px | 1.15 | -0.01em | `--text-metric-l` |
| Metric Negative (mono, 700) | 22–24px | 1.15 | -0.01em | `--text-metric-neg` |
| Brand Wordmark (sans, 600) | 18px | 1.2 | 0 | `--text-brand` |
| Card Title (sans, 600) | 15–16px | 1.4 | 0 | `--text-title` |
| Nav Item (sans, 500) | 14px | 1.4 | 0 | `--text-nav` |
| Body / Row (sans, 400–500) | 13–14px | 1.45 | 0 | `--text-body` |
| Caption (sans, 400) | 12px | 1.5 | 0 | `--text-caption` |
| Micro Label (mono, 500, UPPER) | 11px | 1.2 | +0.06em | `--text-micro` |
| Badge / Tag Pill (mono, 500, UPPER) | 11px | 1.2 | +0.04em | `--text-badge` |
| Risk Label (mono, 600, UPPER) | 11px | 1.2 | +0.06em | `--text-risk` |

### Responsive Type Scale

| Breakpoint | Hero Title | Metric XL | Metric L | Card Title | Body | Caption |
|---|---|---|---|---|---|---|
| Mobile (< 640px) | 22–24px | 20–22px | 18–20px | 14px | 13px | 11px |
| Tablet (640–1024px) | 24–26px | 22–24px | 20–22px | 15px | 13–14px | 12px |
| Desktop (> 1024px) | 28–30px | 26–28px | 22–24px | 15–16px | 13–14px | 12px |
| Foldable Outer | 26–28px | 24–26px | 20–22px | 15px | 13–14px | 12px |
| Foldable Inner | 20–22px | 18–20px | 16–18px | 14px | 13px | 11px |

---

## Tokens — Spacing & Shapes

- **Base unit:** 4px
- **Density:** Comfortable shell with compact tabular interiors

### Spacing Scale

| Value | Token | Usage |
|---|---|---|
| 4px | `--spacing-1` | Icon-to-label gap |
| 8px | `--spacing-2` | Inline gaps, row padding-y |
| 12px | `--spacing-3` | Button padding, nav item spacing |
| 16px | `--spacing-4` | Card inner padding (compact), grid gaps |
| 20px | `--spacing-5` | Card padding, section gaps |
| 24px | `--spacing-6` | Frame/page padding, card header padding |
| 32px | `--spacing-8` | Section separation |
| 40px | `--spacing-10` | Sidebar block gaps |

### Responsive Spacing Scale

| Breakpoint | Card Padding | Section Gap | Frame Padding | Grid Gap |
|---|---|---|---|---|
| Mobile (< 640px) | 12–16px | 12–16px | 0px (edge-to-edge) | 8–12px |
| Tablet (640–1024px) | 16–20px | 16–20px | 8–12px | 12–16px |
| Desktop (> 1024px) | 20–24px | 20–24px | 16–24px | 16–24px |
| Foldable Outer | 12–16px | 12–16px | 0–8px | 8–12px |
| Foldable Inner | 12–16px | 12–16px | 0–8px | 8–12px |

### Border Radius

| Element | Radius | Token |
|---|---|---|
| Floating app frame | 20–24px | `--radius-frame` |
| Hero banner | 16–20px | `--radius-hero` |
| Cards / sidebar trial card | 16px | `--radius-card` |
| Nested panels, search input, icon tiles | 10–12px | `--radius-panel` |
| Buttons, tag pills | 8–10px | `--radius-control` |
| Keycaps, chips | 6px | `--radius-chip` |
| Pills | 999px | `--radius-full` |

---

## Tokens — Breakpoints & Adaptive Layout

### Breakpoint Definitions

| Name | Range | Target Devices |
|---|---|---|
| Mobile | 0 – 639px | Phones, small handsets |
| Tablet | 640px – 1023px | iPads, Android tablets |
| Desktop | 1024px – 1439px | Laptops, monitors |
| Wide | 1440px+ | Large monitors, ultrawide |
| Foldable — Cover | 0 – 639px, ~1:1 to 4:5 | Foldable closed (outer display) |
| Foldable — Inner Portrait | 640px – 880px, ~3:4 to 1:1 | Foldable open, portrait |
| Foldable — Inner Landscape | 881px – 1024px, ~4:3 to 16:10 | Foldable open, landscape |

### Layout Architecture — Adaptive

#### Mobile (< 640px)
- **App frame:** Full-bleed, no visible wallpaper margin. Frame radius = 0.
- **Sidebar:** Collapsed to bottom navigation bar (56–64px tall) or hamburger-drawer.
- **Top bar:** Sticky, breadcrumb truncated, "Ask ReprAI" becomes FAB (56px circle, bottom-right).
- **Content:** Single column, full-width cards. Hero banner stacks vertically.
- **KPI strip:** Horizontal scrollable row or 2×3 grid.
- **Right rail:** Bottom-sheet or accordion sections.
- **Touch targets:** Minimum 44×44px.

#### Tablet (640–1024px)
- **App frame:** 8–12px inset, 16–20px radius.
- **Sidebar:** Collapsible narrow rail (64–72px) or full-width drawer.
- **Content:** 1–2 column grid. Hero banner horizontal.
- **Right rail:** Tab toggle or narrower panel (240–280px).

#### Desktop (> 1024px)
- **App frame:** 16–24px inset, 20–24px radius. Wallpaper visible on all sides.
- **Sidebar:** Full expanded state (~260–280px).
- **Content:** Three-column layout — sidebar | main content | right rail.
- **Right rail:** Fixed ~320–360px width.

#### Foldable Devices
- **Cover Display:** Compact mobile layout, bottom nav or icon rail.
- **Inner Portrait:** Tablet-like, sidebar collapsible rail, 1–2 columns.
- **Inner Landscape:** Small desktop, sidebar rail or full, 2-column main + right rail.

---

## Theme System

### Mode Toggle

The interface supports three theme states:
- **Light** (gold): Explicit user choice
- **Dark** (crimson): Explicit user choice
- **System**: Follows OS `prefers-color-scheme`

Toggle location: Settings panel or quick-access icon in top bar (sun/moon icon).

### CSS Implementation

```css
/* Default: Light mode */
:root {
  --color-canvas: var(--color-canvas-light);
  --color-card: var(--color-surface-card-light);
  --color-inset: var(--color-surface-inset-light);
  --color-border: var(--color-border-subtle-light);
  --color-border-strong: var(--color-border-strong-light);
  --color-dash: var(--color-divider-dashed-light);
  --color-ink: var(--color-ink-900-light);
  --color-ink-2: var(--color-ink-600-light);
  --color-ink-3: var(--color-ink-500-light);
  --color-ink-4: var(--color-ink-400-light);
  --color-accent: var(--color-gold-500);
  --color-accent-deep: var(--color-gold-700);
  --color-accent-highlight: var(--color-gold-400);
  --color-risk: var(--color-crimson-700);
  --color-risk-medium: var(--color-crimson-500);
  --color-button: var(--color-ink-button-light);
  --color-success: var(--color-success-500);
  --color-success-text: var(--color-success-600);
  --color-lime: var(--color-lime-500);
  --color-danger: var(--color-danger-500);
  --color-chart-neutral: var(--color-chart-neutral-light);
  --color-chip-bg: var(--color-chip-bg-light);
  --color-wallpaper: var(--color-wallpaper-light);
}

/* Dark mode */
[data-theme="dark"] {
  --color-canvas: var(--color-canvas-dark);
  --color-card: var(--color-surface-card-dark);
  --color-inset: var(--color-surface-inset-dark);
  --color-border: var(--color-border-subtle-dark);
  --color-border-strong: var(--color-border-strong-dark);
  --color-dash: var(--color-divider-dashed-dark);
  --color-ink: var(--color-ink-900-dark);
  --color-ink-2: var(--color-ink-600-dark);
  --color-ink-3: var(--color-ink-500-dark);
  --color-ink-4: var(--color-ink-400-dark);
  --color-accent: var(--color-gold-400);
  --color-accent-deep: var(--color-gold-300);
  --color-accent-highlight: var(--color-gold-400);
  --color-risk: var(--color-crimson-400);
  --color-risk-medium: var(--color-crimson-500);
  --color-button: var(--color-ink-button-dark);
  --color-success: var(--color-success-400);
  --color-success-text: var(--color-success-500);
  --color-lime: var(--color-lime-400);
  --color-danger: var(--color-danger-400);
  --color-chart-neutral: var(--color-chart-neutral-dark);
  --color-chip-bg: var(--color-chip-bg-dark);
  --color-wallpaper: var(--color-wallpaper-dark);
}

/* System preference fallback */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --color-canvas: var(--color-canvas-dark);
    --color-card: var(--color-surface-card-dark);
    /* ... all dark tokens ... */
  }
}
```

### Mode-Specific Behaviors

| Element | Light Mode (Gold) | Dark Mode (Crimson) |
|---|---|---|
| Wallpaper | Golden wheat field + sky | Deep crimson gradient `#1A0505` → `#2D0A0A` |
| App frame | Warm white `#FAFAF9` | Near-black crimson `#0F0A0A` |
| Cards | Pure white `#FFFFFF` | Dark crimson `#1A1111` |
| Borders | Warm gray `#E8E5DF` | Dark crimson `#3D2525` |
| Primary text | Near-black `#18181B` | Warm white `#F5F0EB` |
| Accent color | Honey gold `#D9962B` | Bright gold `#E8B33C` |
| Risk color | Deep crimson `#8B0000` | Bright crimson `#C43E3E` |
| Hero gradient | Gold left-to-right | Gold-to-crimson, darker base |
| Glass pills | White translucent | Crimson translucent |
| Buttons (primary) | Near-black | Warm white |
| Success dot | Green `#22C55E` | Bright green `#4ADE80` |
| Lime signal | `#84CC16` | `#A3E635` |

---

## Components

**1. Sidebar Navigation**
- Brand row: mode-aware gradient dot (gold in both, brighter in dark) + "Reprise" wordmark.
- Search field: mode-aware fill and border.
- Nav items: 14px medium sans. Active item shows filled rounded-square icon background.
- **Light:** Active background = ink, icon = white.
- **Dark:** Active background = gold, icon = dark.
- **Mobile:** Bottom bar or hamburger drawer.

**2. Hero Banner**
- Large rounded card with gradient overlay.
- **Light:** Gold-to-transparent gradient over amber-washed portrait.
- **Dark:** Gold-to-crimson gradient over darker portrait, deeper shadows.
- Glass tag pills adapt: white translucent (light) / crimson translucent (dark).
- "Premium Tier" pill: crimson glass in both modes.

**3. KPI Stat Strip**
- Six-column row: Yield, Rating, Coupon, Maturity, Min. Investment, Bond status.
- **Light:** White card, ink values, green dot for "Open".
- **Dark:** Dark card, warm white values, bright green dot.
- Crimson values (high risk, negative) use `--color-risk` (adapts per mode).

**4. Royalty Calendar Card**
- 2×2 grid of icon tiles.
- **Light:** Gold gradient tiles on white card.
- **Dark:** Gold gradient tiles on dark card, brighter icons.
- Negative stream tile: crimson gradient in both modes (brighter in dark).

**5. Upcoming Coupons List**
- Dashed dividers between rows.
- **Light:** Solid crimson divider for overdue rows.
- **Dark:** Bright crimson divider for overdue rows.
- Overdue badge: deep crimson (light) / bright crimson (dark).

**6. Catalog Performance Chart**
- Histogram with neutral bars + one featured gold bar.
- **Light:** Neutral = light gray `#E5E7EB`, featured = gold gradient.
- **Dark:** Neutral = dark crimson `#3D2525`, featured = bright gold gradient.
- Secondary risk series: crimson gradient (darker in light, brighter in dark).

**7. Use of Funds Card**
- Segmented horizontal bar in graduated tones.
- **Light:** Gold-to-crimson gradient left-to-right on white.
- **Dark:** Gold-to-crimson gradient on dark, segments more luminous.

**8. Bond Details Panel (right rail)**
- Two-column key–value grid.
- **Light:** White nested card, crimson left border for premium.
- **Dark:** Dark nested card, bright crimson left border for premium.
- High-risk values: crimson text (adapts brightness per mode).

**9. Risk Overview Panel**
- Risk headline + key–value rows with heat bars.
- **Light:** "Medium" = `#A52A2A`, heat bars = crimson tones.
- **Dark:** "Medium" = `#C43E3E`, heat bars = brighter crimson.
- Heat bar intensity increases in dark mode for visibility.

**10. AI Credit Signal Panel**
- Progress bar with lime fill.
- **Light:** Lime `#84CC16` on light track.
- **Dark:** Bright lime `#A3E635` on dark track.
- Weak signals (< 40%): crimson fill (darker in light, brighter in dark).

**11. Est. Annual Income / CTA Card**
- Button pair: primary + secondary.
- **Light:** Primary = ink, secondary = white with border.
- **Dark:** Primary = warm white, secondary = dark with border.
- High-risk CTA: crimson pill (deep in light, bright in dark).
- Crimson warning strip: 4px gradient top border.

**12. Buttons (system)**
- **Light Primary:** solid `#18181B`, white text.
- **Dark Primary:** solid `#F5F0EB`, dark text.
- **Light Secondary:** white fill, 1px border, ink text.
- **Dark Secondary:** dark fill, 1px border, warm white text.
- **Crimson (both):** `#8B0000` (light) / `#C43E3E` (dark), white text.
- **AI Pill:** 999px radius. Light = dark fill; Dark = warm white fill, dark text.

**13. Search Input**
- **Light:** White fill, subtle border.
- **Dark:** Dark fill `#1A1111`, crimson-tinted border.
- Keycap chip adapts background per mode.

**14. Theme Toggle Button**
- Located in top bar or settings.
- **Icon:** Sun (light mode active) / Moon (dark mode active).
- **Transition:** Smooth 300ms cross-fade between modes.

---

## Do's and Don'ts

### Do
- **Respect the mode duality:** Gold owns light, crimson owns dark. Never mix them within the same mode.
- **Keep gold as the accent in both modes:** In light, gold is the hero; in dark, gold is the ember-like highlight against crimson depths.
- **Use crimson for risk semantics in both modes:** Light = deep crimson (`#8B0000`), Dark = bright crimson (`#C43E3E`).
- **Adapt text contrast:** Light mode uses dark ink on white; dark mode uses warm white on near-black.
- **Brighten semantic colors in dark mode:** Green, lime, red all shift up ~200 brightness points for visibility.
- **Use surface tinting for elevation:** Light = whiten; Dark = deepen crimson.
- **Animate mode transitions:** 300ms ease on background, border, and text color changes.
- **Persist user preference:** Save theme choice to localStorage; default to system preference.
- **Design for touch first on mobile/foldable:** 44px minimum targets, thumb zones.

### Don't
- **Don't use light-mode colors in dark mode:** No white cards, no light gray borders, no dark text in dark mode.
- **Don't use dark-mode colors in light mode:** No near-black backgrounds, no bright crimson text on white.
- **Don't make dark mode pure black:** The crimson tint (`#0F0A0A`) provides warmth and brand cohesion.
- **Don't let crimson dominate light mode:** In light mode, crimson is microscopic — dots, badges, borders only.
- **Don't let gold dominate dark mode:** In dark mode, gold is accent only — icons, highlights, featured bars.
- **Don't forget to test both modes:** Every component must be verified in both gold light and crimson dark.
- **Don't use blue for interactive states:** Use gold hover in light, gold glow in dark.

---

## Surfaces & Elevation

### Light Mode

| Level | Value | Border | Notes |
|---|---|---|---|
| Wallpaper | golden field/sky | — | Full-bleed, visible around frame |
| App Frame | `#FAFAF9` | soft shadow | Floating rounded panel |
| Cards | `#FFFFFF` | 1px `#E8E5DF` | Primary containers |
| Inset / Inputs | `#F7F5F1` | 1px `#E8E5DF` | Secondary groupings |
| Glass Pills | `rgba(255,255,255,.14)` | 1px `rgba(255,255,255,.35)` | Hero banner only |
| Dark Controls | `#18181B` | none | Buttons, AI pill |
| Crimson Surfaces | `#8B0000` | none | Badges, critical alerts |

### Dark Mode

| Level | Value | Border | Notes |
|---|---|---|---|
| Wallpaper | `#1A0505` → `#2D0A0A` | — | Deep crimson gradient |
| App Frame | `#0F0A0A` | soft crimson shadow | Floating rounded panel |
| Cards | `#1A1111` | 1px `#3D2525` | Primary containers |
| Inset / Inputs | `#241818` | 1px `#3D2525` | Secondary groupings |
| Glass Pills | `rgba(139,0,0,.2)` | 1px `rgba(165,42,42,.4)` | Hero banner only |
| Light Controls | `#F5F0EB` | none | Buttons, AI pill (inverted) |
| Crimson Surfaces | `#C43E3E` | none | Badges, critical alerts |

---

## Imagery & Data Visualization

### Light Mode
- Photography: warm golden-hour portraiture, right-anchored, gold gradient overlay.
- Wallpaper: golden wheat-field-and-sky, full-bleed.
- Icons: outline style, muted by default, inverted on gold tiles.
- Histograms: light gray bars, one gold featured bar.
- Allocation: gold-to-crimson gradient segments.

### Dark Mode
- Photography: same portraits but with crushed blacks and warmer shadows.
- Wallpaper: deep crimson gradient, no photo (abstract).
- Icons: outline style, warm gray by default, bright on gold tiles.
- Histograms: dark crimson bars, one bright gold featured bar.
- Allocation: bright gold-to-crimson gradient segments on dark.

---

## Layout & Architecture — Responsive Summary

| Feature | Mobile | Tablet | Desktop | Foldable Cover | Foldable Inner |
|---|---|---|---|---|---|
| App frame | Edge-to-edge, 0 radius | 8–12px inset, 16–20px radius | 16–24px inset, 20–24px radius | Edge-to-edge | 8–12px inset |
| Sidebar | Bottom nav / drawer | Collapsible rail / drawer | Full 260–280px | Bottom nav / icon rail | Icon rail / full |
| Top bar | Sticky, truncated | Sticky, 2-segment | Sticky, full | Sticky, truncated | Sticky, 2-segment |
| Ask ReprAI | FAB (bottom-right) | Pill in top bar | Pill in top bar | FAB or top bar | Pill in top bar |
| Content columns | 1 | 1–2 | 2–3 | 1–2 | 1–2 |
| Right rail | Bottom-sheet / accordion | Tab toggle / narrow panel | Fixed 320–360px | Bottom-sheet | Narrow panel / accordion |
| Hero banner | Stacked (image top) | Horizontal | Horizontal | Stacked if < 500px | Horizontal |
| KPI strip | Horizontal scroll / 2×3 grid | 3×2 grid | 6-column row | 2×3 grid | 2×3 or 6-column |
| Card padding | 12–16px | 16–20px | 20–24px | 12–16px | 16–20px |
| Touch target | 44–48px | 40–44px | 40px | 44–48px | 40–44px |
| Typography | -15–20% scale | -5–10% scale | Full scale | -15–20% scale | -5–10% scale |

---

## Agent Prompt Guide

1. "Create a hero banner card with a mode-aware gradient overlay: gold-to-transparent in light mode, gold-to-crimson in dark mode. Include glass tag pills that adapt their translucency per mode."
2. "Build a mode-aware KPI stat strip: white card in light, dark crimson card in dark. Values use `--color-ink` (adapts per mode). Risk values use `--color-risk` (deep in light, bright in dark)."
3. "Create a coupon list with mode-aware dividers: dashed warm gray in light, dashed dark crimson in dark. Overdue rows use solid `--color-risk` divider."
4. "Make a catalog performance histogram: neutral bars use `--color-chart-neutral` (light gray in light, dark crimson in dark). Featured bar uses bright gold gradient in both modes."
5. "Build mode-aware primary buttons: near-black with white text in light; warm white with dark text in dark. Crimson variant adapts depth per mode."
6. "Design a theme toggle: sun icon for light mode, moon icon for dark mode. Smooth 300ms transition between states."
7. "Create a risk overview panel with mode-aware heat bars: crimson tones that brighten in dark mode for visibility."
8. "Build an AI credit signal with mode-aware progress: lime fill brightens in dark mode; weak signals switch to crimson."

---

## Similar Brands / Aesthetics

- Mercury (warm neutral fintech surfaces, hairline borders)
- Linear (quiet elevation, precise compact rows, dark mode excellence)
- Raycast (mono micro-labels, keycap chips, dark pill actions)
- Stripe Dashboard (clean key–value finance panels, tabbed insight rails)
- **Sunset fintech:** warm gold-crimson palettes, editorial finance

---

## Quick Start

```css
:root {
  /* Light mode (default) */
  --color-canvas: #FAFAF9;
  --color-card: #FFFFFF;
  --color-inset: #F7F5F1;
  --color-border: #E8E5DF;
  --color-border-strong: #DBD7CF;
  --color-dash: #E4E1DA;
  --color-ink: #18181B;
  --color-ink-2: #5C5A55;
  --color-ink-3: #71717A;
  --color-ink-4: #8B8781;
  --color-accent: #D9962B;
  --color-accent-deep: #B4770F;
  --color-accent-highlight: #E8B33C;
  --color-risk: #8B0000;
  --color-risk-medium: #A52A2A;
  --color-button: #18181B;
  --color-success: #22C55E;
  --color-success-text: #16A34A;
  --color-lime: #84CC16;
  --color-danger: #EF4444;
  --color-chart-neutral: #E5E7EB;
  --color-chip-bg: #EFEDE8;

  /* Typography */
  --font-sans: "Inter", "SF Pro", "Geist", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "Space Mono", "IBM Plex Mono", ui-monospace, monospace;
  --text-hero: 700 28px/1.15 var(--font-mono);
  --text-metric-xl: 700 26px/1.1 var(--font-mono);
  --text-metric-l: 700 22px/1.15 var(--font-mono);
  --text-title: 600 15px/1.4 var(--font-sans);
  --text-nav: 500 14px/1.4 var(--font-sans);
  --text-body: 400 13px/1.45 var(--font-sans);
  --text-caption: 400 12px/1.5 var(--font-sans);
  --text-micro: 500 11px/1.2 var(--font-mono);

  /* Spacing */
  --spacing-1: 4px; --spacing-2: 8px; --spacing-3: 12px;
  --spacing-4: 16px; --spacing-5: 20px; --spacing-6: 24px;
  --spacing-8: 32px; --spacing-10: 40px;

  /* Radius */
  --radius-frame: 22px; --radius-hero: 18px; --radius-card: 16px;
  --radius-panel: 11px; --radius-control: 9px; --radius-chip: 6px;
  --radius-full: 999px;

  /* Effects */
  --gradient-gold-tile: linear-gradient(135deg, #F3BD48, #D9962B);
  --gradient-hero-light: linear-gradient(90deg, #B4770F 0%, #D9962B 45%, rgba(217,150,43,0) 100%);
  --gradient-hero-dark: linear-gradient(90deg, #B4770F 0%, #D9962B 35%, #A52A2A 70%, rgba(139,0,0,0) 100%);
  --micro-tracking: .06em;
}

/* Dark mode */
[data-theme="dark"] {
  --color-canvas: #0F0A0A;
  --color-card: #1A1111;
  --color-inset: #241818;
  --color-border: #3D2525;
  --color-border-strong: #4A2E2E;
  --color-dash: #352020;
  --color-ink: #F5F0EB;
  --color-ink-2: #B8A89C;
  --color-ink-3: #9A8B80;
  --color-ink-4: #7A6E66;
  --color-accent: #E8B33C;
  --color-accent-deep: #F3D9A0;
  --color-accent-highlight: #F3BD48;
  --color-risk: #C43E3E;
  --color-risk-medium: #A52A2A;
  --color-button: #F5F0EB;
  --color-success: #4ADE80;
  --color-success-text: #22C55E;
  --color-lime: #A3E635;
  --color-danger: #F87171;
  --color-chart-neutral: #3D2525;
  --color-chip-bg: #2D1A1A;
}

/* System preference fallback */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --color-canvas: #0F0A0A;
    --color-card: #1A1111;
    --color-inset: #241818;
    --color-border: #3D2525;
    --color-border-strong: #4A2E2E;
    --color-dash: #352020;
    --color-ink: #F5F0EB;
    --color-ink-2: #B8A89C;
    --color-ink-3: #9A8B80;
    --color-ink-4: #7A6E66;
    --color-accent: #E8B33C;
    --color-accent-deep: #F3D9A0;
    --color-accent-highlight: #F3BD48;
    --color-risk: #C43E3E;
    --color-risk-medium: #A52A2A;
    --color-button: #F5F0EB;
    --color-success: #4ADE80;
    --color-success-text: #22C55E;
    --color-lime: #A3E635;
    --color-danger: #F87171;
    --color-chart-neutral: #3D2525;
    --color-chip-bg: #2D1A1A;
  }
}
```
