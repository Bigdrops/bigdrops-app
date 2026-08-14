# Reprise — Style Reference
> Golden-hour warmth meets monospace precision finance.

**Theme:** Light (warm paper-white surfaces floating in a rounded frame over a saturated golden-hour photographic wallpaper)

**Verification note:** This spec is reconciled from three independent AI extractions of the same source video, then checked against six actual screenshots. The floating app frame, dual mono/sans typography, and right-hand tab rail are confirmed structural facts — not every model caught these. Where screenshots showed a value directly (hex approximations aside), that reading takes priority over any single extraction.

Reprise is a warm, editorial-toned financial terminal that fuses two languages: a sun-drenched golden-hour photographic ambience and a crisp, near-monochrome "paper" UI floating inside it. The whole interface sits inside a large rounded white app frame, itself inset over a full-bleed golden wheat-field/sky wallpaper — the wallpaper is visible around the frame's edges, not just behind one hero card. Typography is a deliberate duet: a tracked-out uppercase **monospace** for brand-voice moments (breadcrumbs, hero titles, section micro-headers, tag pills, coupon-list headers, numerals), and a **sans-serif** for navigation, body copy, and card titles. The accent family is a single honey/amber gold used in gradients and solid icon tiles; semantic color is kept microscopic — a green "Open" dot, a lime AI-signal bar, nothing else. Elevation is communicated through surface whitening and 1px hairline strokes rather than shadows, with a single near-black pill button ("Ask ReprAI") reserved for the primary AI action.

---

## Tokens — Colors

| Name | Value | Token | Role |
|---|---|---|---|
| Wallpaper / Ambient Canvas | photographic golden field + sky gradient | `--color-wallpaper` | Full-bleed background behind the app frame |
| App Frame / Canvas | `#FAFAF9` – `#F8F7F4` | `--color-canvas` | Base of the floating white panel (sidebar + content) |
| Card Surface | `#FFFFFF` | `--color-surface-card` | Primary cards, hero banner container, search field |
| Inset Surface | `#F7F5F1` | `--color-surface-inset` | Nested panels, hover rows, secondary fills |
| Border — Subtle | `#E8E5DF` | `--color-border-subtle` | Card strokes, input borders, row dividers |
| Border — Strong | `#DBD7CF` | `--color-border-strong` | Buttons, emphasized strokes |
| Divider — Dashed | `#E4E1DA` | `--color-divider-dashed` | Coupon list row separators (confirmed in screenshots) |
| Ink — Primary | `#18181B` | `--color-ink-900` | Headings, metric values, primary text |
| Ink — Secondary | `#5C5A55` | `--color-ink-600` | Nav text, labels |
| Ink — Muted | `#71717A` | `--color-ink-500` | Captions, table metadata |
| Ink — Faint | `#8B8781` | `--color-ink-400` | Placeholders, axis labels, micro-labels |
| Gold — Deep | `#B4770F` | `--color-gold-700` | Hero gradient deep end |
| Gold — Accent | `#D9962B` / `#E8A232` | `--color-gold-500` | Primary accent, icon tiles, active nav square, featured chart bar |
| Gold — Highlight | `#E8B33C` / `#F3BD48` | `--color-gold-400` | Tile gradient highlight, hero gradient mid |
| **Crimson — Deep** | **`#8B0000`** | **`--color-crimson-700`** | **Deep accent, critical alerts, high-priority badges, foldable cover-display emphasis** |
| **Crimson — Accent** | **`#A52A2A`** | **`--color-crimson-500`** | **Secondary accent, warm data series, premium tier markers, error-state warmth** |
| **Crimson — Wash** | **`rgba(139,0,0,0.08)`** | **`--color-crimson-wash`** | **Subtle tint backgrounds, hover states on crimson-themed elements** |
| Ink Button / Dark Surface | `#18181B` | `--color-ink-button` | "Ask ReprAI" pill, primary buttons (Buy bond, Upgrade) |
| Success — Dot | `#22C55E` | `--color-success-500` | "Open" status dot |
| Success — Text | `#16A34A` | `--color-success-600` | Trend indicator (e.g. +18.6%) |
| Lime — AI Signal | `#84CC16` | `--color-lime-500` | AI credit signal progress bar fill (confirmed lime, not green) |
| Danger — Pip | `#EF4444` | `--color-danger-500` | Notification badge dot |
| Chart Bar — Neutral | `#E5E7EB` | `--color-chart-neutral` | Inactive histogram bars |
| Chip / Badge Bg | `#EFEDE8` | `--color-chip-bg` | Keycap (⌘F), driver chips, tag pill fill on white |

*Hex values are sampled/estimated from source frames; treat as close approximations, not exact brand hex.*

---

## Tokens — Typography

**Mono — Brand & Data Voice**
- Substitutes: JetBrains Mono → Space Mono → IBM Plex Mono → ui-monospace.
- Used for: breadcrumb ("MARKETS / CATALOG ROYALTY BOND"), hero title + subtitle ("Aurora Lane" / "DEBUT MASTER ROYALTY BOND 20230"), tag pills ("ARTIST CATALOG", "ISSUED MAY 2025"), section micro-headers ("UPCOMING COUPONS", "BOND DETAILS", "RISK OVERVIEW", "AI CREDIT SIGNAL"), large dollar figures ($172.50, $12.4M, $360), tab labels, axis labels.
- Weights: 500 (labels/tabs), 600–700 (titles, large numerals).
- Tracking: uppercase micro-labels carry visible letter-spacing (~+0.06–0.08em), confirmed in screenshots.

**Sans — UI & Body Voice**
- Substitutes: Inter → SF Pro → Geist → system-ui.
- Used for: sidebar nav items (Home, Portfolios, Markets, Chats, News), brand wordmark "Reprise", card titles (Royalty calendar, Catalog performance, Use of founds), body rows, key–value pairs, button text, user row.
- Weights: 400 (body), 500 (nav/labels), 600 (card titles, values, buttons).

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|---|---|---|---|---|
| Hero Title (mono, 700) | 28–30px | 1.15 | -0.02em | `--text-hero` |
| Metric XL (mono, 700) — e.g. $12.4M | 26–28px | 1.1 | -0.01em | `--text-metric-xl` |
| Metric L (mono, 700) — e.g. $172.50 | 22–24px | 1.15 | -0.01em | `--text-metric-l` |
| Brand Wordmark (sans, 600) | 18px | 1.2 | 0 | `--text-brand` |
| Card Title (sans, 600) | 15–16px | 1.4 | 0 | `--text-title` |
| Nav Item (sans, 500) | 14px | 1.4 | 0 | `--text-nav` |
| Body / Row (sans, 400–500) | 13–14px | 1.45 | 0 | `--text-body` |
| Caption (sans, 400) | 12px | 1.5 | 0 | `--text-caption` |
| Micro Label (mono, 500, UPPER) | 11px | 1.2 | +0.06em | `--text-micro` |
| Badge / Tag Pill (mono, 500, UPPER) | 11px | 1.2 | +0.04em | `--text-badge` |

### Responsive Type Scale

| Breakpoint | Hero Title | Metric XL | Metric L | Card Title | Body | Caption |
|---|---|---|---|---|---|---|
| Mobile (< 640px) | 22–24px | 20–22px | 18–20px | 14px | 13px | 11px |
| Tablet (640–1024px) | 24–26px | 22–24px | 20–22px | 15px | 13–14px | 12px |
| Desktop (> 1024px) | 28–30px | 26–28px | 22–24px | 15–16px | 13–14px | 12px |
| Foldable Outer (> 1024px, 1:1–4:3) | 26–28px | 24–26px | 20–22px | 15px | 13–14px | 12px |
| Foldable Inner (portrait, < 720px wide) | 20–22px | 18–20px | 16–18px | 14px | 13px | 11px |

---

## Tokens — Spacing & Shapes

- **Base unit:** 4px
- **Density:** Comfortable shell (cards, sidebar) with compact tabular interiors (tight coupon rows, dashed separators)

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
| Foldable Outer | 16–20px | 16–20px | 12–16px | 12–16px |
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
| Pills (Ask ReprAI, dots, avatars, progress bars) | 999px | `--radius-full` |

### Responsive Radius Scale

| Breakpoint | Frame | Hero | Card | Panel | Control |
|---|---|---|---|---|---|
| Mobile | 0px (full-bleed) | 12–14px | 12px | 8–10px | 8px |
| Tablet | 16–20px | 14–16px | 14px | 10px | 8–10px |
| Desktop | 20–24px | 16–20px | 16px | 10–12px | 8–10px |
| Foldable Outer | 16–20px | 14–16px | 14px | 10px | 8–10px |
| Foldable Inner | 0–12px | 12px | 12px | 8–10px | 8px |

---

## Tokens — Breakpoints & Adaptive Layout

### Breakpoint Definitions

| Name | Range | Target Devices | Token |
|---|---|---|---|
| Mobile | 0 – 639px | Phones, small handsets | `--bp-mobile` |
| Tablet | 640px – 1023px | iPads, Android tablets, large phones landscape | `--bp-tablet` |
| Desktop | 1024px – 1439px | Laptops, monitors | `--bp-desktop` |
| Wide | 1440px+ | Large monitors, ultrawide | `--bp-wide` |
| Foldable — Cover | 0 – 639px, ~1:1 to 4:5 | Foldable closed (outer display) | `--bp-fold-cover` |
| Foldable — Inner Portrait | 640px – 880px, ~3:4 to 1:1 | Foldable open, portrait | `--bp-fold-inner-portrait` |
| Foldable — Inner Landscape | 881px – 1024px, ~4:3 to 16:10 | Foldable open, landscape | `--bp-fold-inner-landscape` |

### Layout Architecture — Adaptive

#### Mobile (< 640px)
- **App frame:** Full-bleed, no visible wallpaper margin. Frame radius = 0.
- **Sidebar:** Collapsed to a bottom navigation bar (56–64px tall) or hamburger-drawer overlay. Nav items: icon-only with 11px mono labels.
- **Top bar:** Sticky, breadcrumb truncated to last segment only, "Ask ReprAI" becomes a floating action button (FAB, 56px circle, bottom-right).
- **Content:** Single column, full-width cards. Hero banner stacks vertically: image top, text below.
- **KPI strip:** Horizontal scrollable row (snap to card), or 2×3 grid.
- **Right rail:** Converted to bottom-sheet or accordion sections within the main column.
- **Cards:** Full-width, 12px radius, 12–16px padding.
- **Typography:** Reduced by ~15–20% from desktop scale.
- **Touch targets:** Minimum 44×44px for all interactive elements.

#### Tablet (640–1024px)
- **App frame:** 8–12px inset from viewport edges, 16–20px radius.
- **Sidebar:** Collapsible narrow rail (64–72px wide, icon + label stacked) or full-width drawer. Toggle via hamburger.
- **Content:** 1–2 column grid depending on content density. Hero banner remains horizontal.
- **KPI strip:** 3×2 or 6-column row.
- **Right rail:** Either hidden behind a tab toggle or shown as a narrower panel (240–280px) when space permits.
- **Cards:** 14px radius, 16–20px padding.

#### Desktop (> 1024px)
- **App frame:** 16–24px inset, 20–24px radius. Wallpaper visible on all sides.
- **Sidebar:** Full expanded state (~260–280px), all nav items with icons + labels.
- **Content:** Full three-column layout — sidebar | main content | right rail.
- **Hero banner:** Horizontal, image right-anchored, gradient overlay left-to-right.
- **KPI strip:** Six-column single row.
- **Right rail:** Fixed ~320–360px width, tab bar + stacked panels.

#### Foldable Devices

**Cover Display (closed, ~1:1 to 4:5 aspect)**
- Treat as a compact mobile layout but with more horizontal space.
- Bottom nav or side rail (icon-only, 56px wide) depending on width.
- Content: 1–2 column grid. Hero banner may switch to stacked if < 500px wide.
- KPI strip: 2×3 grid or horizontal scroll.
- Right rail: Bottom-sheet only.

**Inner Display — Portrait (open, ~3:4 to 1:1, 640–880px wide)**
- Similar to tablet layout but with taller viewport.
- Sidebar: Collapsible rail or persistent if > 720px wide.
- Content: 1–2 columns. Consider split-pane for reading + detail views.
- Right rail: Persistent if > 800px wide, otherwise accordion.

**Inner Display — Landscape (open, ~4:3 to 16:10, 881–1024px wide)**
- Similar to small desktop.
- Sidebar: Persistent narrow rail or full sidebar.
- Content: 2-column main + right rail (280px).
- Take advantage of extra height: show more rows in coupon lists, larger chart areas.

### Safe Areas & Insets

| Context | Top | Bottom | Left | Right |
|---|---|---|---|---|
| Mobile (notch/dynamic island) | `env(safe-area-inset-top)` | `env(safe-area-inset-bottom) + 64px` (bottom nav) | `env(safe-area-inset-left)` | `env(safe-area-inset-right)` |
| Tablet | 0 | 0 | 0 | 0 |
| Desktop | 0 | 0 | 0 | 0 |
| Foldable (hinge) | 0 | 0 | `env(fold-left)` or media query | `env(fold-right)` or media query |

*Note: For foldable inner displays, avoid placing critical UI elements (buttons, primary actions) within 24px of the hinge/fold seam. Use `spanning` media queries or JavaScript fold APIs where available.*

---

## Layout & Architecture

A rounded white app frame floats over a full-bleed golden wallpaper, wallpaper visible on all sides. Inside: a fixed left sidebar (wordmark → search → nav tree → trial card → settings → user) and a main region split into a top bar (breadcrumb pill left, bell/help/AI-pill right) and a two-column workspace — center column (hero banner → KPI strip → paired cards for royalty/coupons and performance/allocation) plus a right insight rail (tab bar → Bond Details → Risk Overview → AI Credit Signal → Est. Income CTA). Grid gaps run 16–24px; card padding 16–24px; coupon rows use dashed 1px separators.

### Adaptive Grid System

```css
/* Mobile-first grid */
.reprise-layout {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr;
  gap: var(--spacing-3);
}

/* Tablet */
@media (min-width: 640px) {
  .reprise-layout {
    grid-template-columns: 64px 1fr;
    gap: var(--spacing-4);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .reprise-layout {
    grid-template-columns: 260px 1fr 320px;
    gap: var(--spacing-5);
  }
}

/* Wide */
@media (min-width: 1440px) {
  .reprise-layout {
    grid-template-columns: 280px 1fr 360px;
    gap: var(--spacing-6);
  }
}

/* Foldable inner portrait */
@media (min-width: 640px) and (max-width: 880px) and (min-aspect-ratio: 3/4) {
  .reprise-layout {
    grid-template-columns: 72px 1fr;
    gap: var(--spacing-4);
  }
}

/* Foldable inner landscape */
@media (min-width: 881px) and (max-width: 1024px) and (min-aspect-ratio: 4/3) {
  .reprise-layout {
    grid-template-columns: 72px 1fr 280px;
    gap: var(--spacing-4);
  }
}
```

---

## Components

**1. Sidebar Navigation**
- Brand row: gold-gradient dot/orb logo + bold sans "Reprise" wordmark + collapse icon.
- Search field: white fill, 1px subtle border, 10–12px radius, leading search icon, trailing `⌘F` keycap chip.
- Nav items: 14px medium sans, 18–20px outline icons, 8–10px radius rows. Active item ("Markets") shows a filled dark rounded-square icon background and stays expanded to reveal sub-items (Equities, Bonds) via a vertical guide line with dot markers. "Chats" carries a small numeric badge.
- **Mobile:** Bottom bar (56–64px) with 5 items, icon + 10px label. Active state: gold icon fill. Or hamburger drawer with full sidebar content.
- **Tablet:** Collapsible rail (64px) with stacked icon + label, or full drawer.
- **Foldable cover:** Icon-only rail (56px) if width > 400px, otherwise bottom bar.

**2. Trial / Upgrade Card (sidebar footer)**
- Bordered card with a gold lightning-bolt tile, a live waveform ornament (thin gold bars), "7-days free trial" copy, and a full-width dark pill button ("Upgrade").
- **Mobile:** Hidden in bottom nav; accessible via "More" menu or profile sheet.
- **Tablet/Foldable:** Shown in sidebar rail as a compact icon-only tile or full card in drawer.

**3. User Row**
- Circular avatar, name + email in small sans text, chevron, sits above/below Settings and Help links at the sidebar base.
- **Mobile:** Moved to bottom nav "Profile" tab or top-bar avatar popover.

**4. Top Bar**
- Breadcrumb in uppercase mono ("MARKETS /") with the current page wrapped in a bordered pill ("CATALOG ROYALTY BOND").
- Right cluster: bell icon (with small red pip when active), help icon, and the signature **"Ask ReprAI"** — solid near-black pill, white text, sparkle icon.
- **Mobile:** Breadcrumb truncated to last segment. "Ask ReprAI" becomes a 56px FAB (bottom-right, 24px margin). Bell + help collapse into a "More" overflow menu.
- **Tablet:** Breadcrumb shows 2 segments max. Right cluster stays visible if space allows.

**5. Tab Bar (right rail)**
- Overview / Cashflow / Financials / Risks / Documents. Mono uppercase-adjacent labels; active tab in dark ink with underline, inactive tabs muted.
- **Mobile:** Horizontal scrollable pill tabs or bottom-sheet segment control.
- **Tablet:** Vertical tab list or horizontal scroll.
- **Foldable inner:** Persistent vertical tab list if right rail is shown.

**6. Hero Banner**
- Large rounded card (16–20px radius) with a right-anchored, amber-washed portrait photograph and a left-to-right gold gradient overlay ensuring the mono white title stays legible.
- Bold mono title ("Aurora Lane"), muted mono uppercase subtitle ("DEBUT MASTER ROYALTY BOND 20230").
- Bottom-row glass tag pills over the image: translucent white fill, thin white-stroke border, mono uppercase text (e.g. "♫ ARTIST CATALOG", "DEBUT ERA [2018–2023]", "ISSUED MAY 2025").
- **Mobile:** Stacks vertically — image full-width top (200–240px height), text below on white surface. Tag pills become a horizontal scroll row beneath the title.
- **Tablet:** Horizontal layout, image 40% width.
- **Foldable cover:** Stacked if < 500px wide, horizontal if wider.

**7. KPI Stat Strip**
- Single white card, six-column row directly under the hero: Yield, Rating, Coupon, Maturity, Min. Investment, Bond status. Labels are small muted sans/mono; values are bold ink. "Bond status" pairs a small green dot with "Open".
- **Mobile:** Horizontal scroll (snap-x, 140px min-width per item) or 2×3 grid.
- **Tablet:** 3×2 grid or horizontal scroll.
- **Foldable inner portrait:** 2×3 grid.
- **Foldable inner landscape / Desktop:** Single six-column row.

**8. Royalty Calendar Card**
- Sans card title ("Royalty calendar"). Large bold mono dollar figure ($172.50) with a muted mono uppercase caption ("PER $5,000 INVESTED"). Below: a 2×2 grid of gold-gradient icon tiles (Streaming, Downloads, Sync licensing, Live & other) each paired with a percentage.
- **Mobile:** 2×2 grid maintained, tiles 48–56px. Caption below figure.
- **Tablet/Foldable:** Same, tiles 56–64px.

**9. Upcoming Coupons List**
- Header: calendar icon + mono uppercase label. Rows: date in sans on the left, dollar amount in bold mono right-aligned, separated by 1px dashed dividers — confirmed directly in every screenshot.
- **Mobile:** Full-width rows, 48px touch height. Date + amount with generous padding.
- **All breakpoints:** Same pattern, touch targets scale to 44px minimum on mobile.

**10. Catalog Performance Chart Card**
- Bold mono large value ("$12.4M") plus a small lime/green "↑18.6%" trend chip. Below: a 5-column bar histogram, neutral light-gray bars with one featured bar in solid/gradient gold, muted axis labels beneath (years).
- **Mobile:** Chart height 120–140px. Bars 24–32px wide. Axis labels 10px.
- **Tablet:** Chart height 160px.
- **Desktop:** Chart height 180–200px.

**11. Use of Funds Card**
- "Allocation" header with a percentage value at right (confirmed as "100%" total in production view, individual segments summing beneath — e.g. Catalog acquisition 40%, Marketing & play listing 25%, Touring 15%, Sync licensing 12%, Reserve 8%).
- Single segmented horizontal bar in graduated gold tones, small gap between segments, legend rows below with a colored dot + label + right-aligned percent.
- **Mobile:** Legend stacks vertically. Bar height 8px.
- **Tablet+:** Legend 2-column grid. Bar height 10–12px.

**12. Bond Details Panel (right rail)**
- Nested card, info icon + mono uppercase header ("BOND DETAILS"). Two-column key–value grid (Issuer, Bond type, Seniority / Payment freq., Day count, Governing law). Keys muted sans, values medium ink, right-aligned.
- **Mobile:** Full-width, becomes an accordion section in main column.
- **Tablet:** Shown in right rail if space, otherwise accordion.

**13. Risk Overview Panel**
- Headline ("Low-medium risk") in semibold sans. Key–value rows identical pattern to Bond Details (Default risk, Market risk, Liquidity risk, Volatility) — right-aligned semibold values.
- **Mobile:** Same accordion treatment as Bond Details.

**14. AI Credit Signal Panel**
- "Very strong" label + percentage (e.g. "82%") in mono. Horizontal progress bar with a **lime-green** fill (not standard green) on a light track. "Key drivers" caption followed by small pill chips (Royalty quality, Diversification, Growth, Management).
- **Mobile:** Progress bar 8px height. Chips wrap to 2 rows.
- **Desktop:** Progress bar 10–12px height. Chips single row.

**15. Est. Annual Income / CTA Card**
- Mono uppercase caption ("STREAMING ROYALTIES (LAST 5 YEARS)"). Large bold mono dollar figure ($360) with muted "OF $5,000" suffix. Button pair: primary dark pill ("Buy bound"/"Buy bond") + secondary outlined pill with star icon ("Add to watchlist").
- **Mobile:** Buttons stack vertically, full-width. Primary on top.
- **Tablet+:** Buttons side-by-side, primary left.

**16. Buttons (system)**
- Primary: solid near-black (`#18181B`), white text, 8–10px radius, ~40px height.
- Secondary: white fill, 1px border, ink text, optional leading icon.
- AI Pill: 999px radius, dark fill, sparkle icon, reserved exclusively for "Ask ReprAI".
- **Crimson variant (new):** solid `#8B0000` fill, white text, 8–10px radius. Used for: critical alerts, premium-tier CTAs, high-priority actions, foldable cover-display emphasis buttons. Hover: `#A52A2A`.
- **Mobile:** Minimum 44px height, full-width in forms. 48px preferred for thumb reach.
- **Touch states:** Add 8px active-scale transform, 150ms ease-out.

**17. Search Input**
- White fill, 1px subtle border, 10–12px radius, leading search icon, trailing `⌘F` keycap styled with the chip token (light fill, 1px border, 6px radius, mono text).
- **Mobile:** Full-width, 48px height. Keycap hidden (space constraint).
- **Tablet+:** Keycap shown.

**18. Crimson Accent Components (new)**
- **Crimson badge:** Small pill, `#8B0000` background, white mono text, 6px radius. Used for: "Premium", "Urgent", "High Risk" labels.
- **Crimson dot:** 8px circle, `#A52A2A` fill. Used for: critical status indicators, premium tier markers.
- **Crimson chart series:** Bar/line in `#8B0000` to `#A52A2A` gradient. Used for: secondary data series, risk metrics, premium allocation segments.
- **Crimson tile:** 36–40px, 10–12px radius, `#8B0000` to `#A52A2A` gradient fill. Used for: premium feature icons, critical alert icons.
- **Crimson progress track:** Background `#F7F5F1`, fill `#A52A2A`. Used for: risk meters, premium completion indicators.

---

## Do's and Don'ts

### Do
- Keep the golden wallpaper visible around the floating white app frame — this is not a flat gray-canvas dashboard.
- Reserve monospace for brand-voice and data moments: hero titles, breadcrumbs, tag pills, section micro-headers, large numerals.
- Use sans-serif for everything conversational: nav, body copy, card titles, button labels.
- Use 1px low-contrast warm borders and surface whitening for elevation instead of heavy drop shadows.
- Use dashed 1px separators for tabular data rows (coupon lists); solid hairlines for card edges.
- Express gold as gradients on icon tiles, the hero overlay, and featured chart bars — not flat fills everywhere.
- Keep semantic color microscopic: a small dot, a thin bar — never a large colored field.
- Right-align numeric values in data rows and panels for scannability.
- **Use crimson (`#8B0000`–`#A52A2A`) sparingly and intentionally:** reserve it for premium tiers, critical alerts, high-priority badges, and secondary data series. It should feel like a warm, earthy accent — not a jarring red alert.
- **Design for touch first on mobile and foldable:** 44px minimum touch targets, generous padding, thumb-reachable zones (bottom nav, FABs).
- **Test on foldable hinge areas:** keep primary actions and critical text at least 24px from the fold seam.
- **Use snap scrolling on mobile** for horizontal KPI strips and tab bars.
- **Adapt typography density:** reduce sizes by 15–20% on mobile, increase line-height slightly for readability.
- **Preserve the app frame radius on desktop** (20–24px) but go edge-to-edge on mobile for immersion.

### Don't
- Don't flatten the background to plain gray — the wallpaper is warm and photographic throughout, not confined to one hero card.
- Don't set navigation, body copy, or card titles in monospace — that's the brand/data voice only.
- Don't use more than one dark pill button per view — "Ask ReprAI" and primary CTAs are the exception, not the norm.
- Don't apply heavy shadows or glassmorphism outside the hero's translucent tag pills.
- Don't use sharp corners — nothing under 6px radius except dividers and underlines.
- Don't introduce more hue families beyond gold + crimson + a restrained green/lime + a small red pip.
- **Don't use crimson as a primary brand color** — gold remains the dominant accent. Crimson is a supporting, warm, earthy secondary accent.
- **Don't crowd the foldable hinge** with buttons, inputs, or critical text.
- **Don't use desktop hover patterns on mobile** — replace hover-revealed actions with always-visible or long-press alternatives.
- **Don't lock orientation** — the layout should reflow gracefully between portrait and landscape on all devices.
- **Don't use fixed widths on mobile** — everything should be fluid and percentage-based.

---

## Surfaces & Elevation

| Level | Value | Border | Notes |
|---|---|---|---|
| Wallpaper (ambient) | photographic golden field/sky | — | Full-bleed, visible around the frame edges |
| App Frame | `#FAFAF9`–`#F8F7F4` | soft outer shadow | Floating rounded panel containing the entire UI |
| Sidebar / Content Background | same as frame | hairline right border on sidebar | — |
| Cards | `#FFFFFF` | 1px `#E8E5DF` | Primary containers; very soft shadow, not heavy |
| Nested Panels / Inputs | `#F7F5F1` | 1px `#E8E5DF` | Secondary groupings, search field |
| Glass Tag Pills (hero only) | `rgba(255,255,255,.14)` | 1px `rgba(255,255,255,.35)` | Backdrop-blur, confined to the hero banner |
| Dark Controls | `#18181B` | none | Buttons, AI pill |
| Crimson Surfaces | `#8B0000`–`#A52A2A` | none | Premium badges, critical alerts, secondary accent tiles |

---

## Imagery & Data Visualization

- Photography: warm golden-hour portraiture, right-anchored in the hero banner, fused via a left-origin gold gradient overlay for text legibility.
- Wallpaper: painterly golden wheat-field-and-sky illustration/photo, full-bleed behind the entire floating frame.
- Icons: simple outline style, ~1.5–2px stroke, muted by default, inverted to white/cream on gold or dark tiles.
- Icon tiles: ~36–40px, 10–12px radius, gold gradient fill.
- **Crimson icon tiles:** ~36–40px, 10–12px radius, `#8B0000` to `#A52A2A` gradient fill. White/cream icon stroke.
- Histograms: neutral light-gray bars with one gold gradient "featured" bar, muted mono axis labels.
- **Crimson histograms:** Secondary series in `#8B0000` to `#A52A2A` gradient. Use for risk metrics, premium allocation, or comparative data.
- Allocation bar: single segmented horizontal bar in graduated gold tones with a small legend list below.
- **Crimson allocation segments:** Use for premium-tier or high-risk allocation portions. Blend with gold segments, never dominate.
- Progress/signal: lime-green fill on a light track, full radius.
- **Crimson progress:** `#A52A2A` fill on `#F7F5F1` track. Used for risk meters, premium completion.
- Status color logic: gold = brand/data emphasis, green dot = "Open" status, lime = positive AI signal, red = notification only, **crimson = premium/critical/secondary accent**.

---

## Layout & Architecture — Responsive Summary

| Feature | Mobile | Tablet | Desktop | Foldable Cover | Foldable Inner |
|---|---|---|---|---|---|
| App frame | Edge-to-edge, 0 radius | 8–12px inset, 16–20px radius | 16–24px inset, 20–24px radius | Edge-to-edge or 4–8px inset | 8–12px inset |
| Sidebar | Bottom nav / hamburger drawer | Collapsible rail / drawer | Full 260–280px | Bottom nav / icon rail | Icon rail / full |
| Top bar | Sticky, truncated breadcrumb | Sticky, 2-segment breadcrumb | Sticky, full breadcrumb | Sticky, truncated | Sticky, 2-segment |
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

1. "Create a hero banner card (18px radius) with a right-anchored amber-washed portrait photo, left-to-right gold gradient overlay, a bold mono white title, a muted mono uppercase subtitle, and 2–3 glass tag pills (translucent white fill, 1px white-stroke border, backdrop-blur, mono uppercase text)."
2. "Build a key–value bond details panel: white nested card, two-column grid, muted sans keys left, medium ink values right, mono-uppercase micro-header with a leading info icon."
3. "Create a coupon list row: ~44px height, sans date left, bold mono dollar amount right, 1px dashed bottom divider, subtle hover tint."
4. "Make a catalog performance widget: bold mono large dollar value plus a small lime '+X%' trend chip, five-bar neutral histogram with one gold-gradient featured bar and muted mono axis labels."
5. "Build the primary CTA pair: dark near-black pill button (white text) plus a secondary outlined pill with a star icon, 8–10px radius, ~40px height, 12px gap."
6. "Design a left sidebar nav item: 14px medium sans, 18–20px outline icon, 8–10px radius row, active state shows a dark filled rounded-square icon background with the icon inverted to white."
7. **"Create a crimson accent badge: small pill, `#8B0000` background, white mono uppercase text, 6px radius, used for premium or critical labels."**
8. **"Build a responsive KPI stat strip: six items on desktop, horizontal scroll on mobile, 2×3 grid on foldable. Each item has a muted label and bold value, with the 'Open' status showing a green dot."**
9. **"Design a foldable-aware layout: three-column on desktop (sidebar + main + rail), two-column on tablet/foldable-inner-landscape (rail + main), single-column stacked on mobile with bottom navigation."**
10. **"Create a crimson data tile: 36–40px square, 10–12px radius, `#8B0000` to `#A52A2A` gradient fill, white outline icon centered. Use for premium feature markers or critical alert indicators."**

---

## Similar Brands / Aesthetics

- Mercury (warm neutral fintech surfaces, hairline borders)
- Linear (quiet elevation, precise compact rows)
- Raycast (mono micro-labels, keycap chips, dark pill actions)
- Stripe Dashboard (clean key–value finance panels, tabbed insight rails)

---

## Quick Start

```css
:root {
  /* Colors */
  --color-canvas: #FAFAF9;
  --color-surface-card: #FFFFFF;
  --color-surface-inset: #F7F5F1;
  --color-border-subtle: #E8E5DF;
  --color-border-strong: #DBD7CF;
  --color-divider-dashed: #E4E1DA;
  --color-ink-900: #18181B;
  --color-ink-600: #5C5A55;
  --color-ink-500: #71717A;
  --color-ink-400: #8B8781;
  --color-gold-700: #B4770F;
  --color-gold-500: #D9962B;
  --color-gold-400: #E8B33C;
  --color-crimson-700: #8B0000;
  --color-crimson-500: #A52A2A;
  --color-crimson-wash: rgba(139, 0, 0, 0.08);
  --color-ink-button: #18181B;
  --color-success-500: #22C55E;
  --color-success-600: #16A34A;
  --color-lime-500: #84CC16;
  --color-danger-500: #EF4444;
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

  /* Spacing (base 4px) */
  --spacing-1: 4px; --spacing-2: 8px; --spacing-3: 12px;
  --spacing-4: 16px; --spacing-5: 20px; --spacing-6: 24px;
  --spacing-8: 32px; --spacing-10: 40px;

  /* Radius */
  --radius-frame: 22px; --radius-hero: 18px; --radius-card: 16px;
  --radius-panel: 11px; --radius-control: 9px; --radius-chip: 6px;
  --radius-full: 999px;

  /* Effects */
  --gradient-gold-tile: linear-gradient(135deg, #F3BD48, #D9962B);
  --gradient-hero: linear-gradient(90deg, #B4770F 0%, #D9962B 45%, rgba(217,150,43,0) 100%);
  --gradient-crimson: linear-gradient(135deg, #A52A2A, #8B0000);
  --micro-tracking: .06em;

  /* Breakpoints */
  --bp-mobile: 639px;
  --bp-tablet: 1023px;
  --bp-desktop: 1439px;
}

/* Responsive type scale */
@media (max-width: 639px) {
  :root {
    --text-hero: 700 22px/1.2 var(--font-mono);
    --text-metric-xl: 700 20px/1.15 var(--font-mono);
    --text-metric-l: 700 18px/1.2 var(--font-mono);
    --text-title: 600 14px/1.4 var(--font-sans);
    --radius-frame: 0px;
    --radius-hero: 12px;
    --radius-card: 12px;
  }
}

@media (min-width: 640px) and (max-width: 1023px) {
  :root {
    --text-hero: 700 24px/1.15 var(--font-mono);
    --text-metric-xl: 700 22px/1.1 var(--font-mono);
    --text-metric-l: 700 20px/1.15 var(--font-mono);
    --radius-frame: 18px;
    --radius-hero: 14px;
  }
}

@media (min-width: 1024px) and (max-width: 1439px) {
  :root {
    --text-hero: 700 26px/1.15 var(--font-mono);
    --text-metric-xl: 700 24px/1.1 var(--font-mono);
    --text-metric-l: 700 22px/1.15 var(--font-mono);
    --radius-frame: 20px;
    --radius-hero: 16px;
  }
}

@media (min-width: 1440px) {
  :root {
    --text-hero: 700 28px/1.15 var(--font-mono);
    --text-metric-xl: 700 26px/1.1 var(--font-mono);
    --text-metric-l: 700 22px/1.15 var(--font-mono);
    --radius-frame: 22px;
    --radius-hero: 18px;
  }
}
```

```css
@theme {
  --font-sans: "Inter", "SF Pro", "Geist", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "Space Mono", "IBM Plex Mono", ui-monospace, monospace;

  --color-canvas: #FAFAF9;
  --color-card: #FFFFFF;
  --color-inset: #F7F5F1;
  --color-line: #E8E5DF;
  --color-line-strong: #DBD7CF;
  --color-dash: #E4E1DA;
  --color-ink: #18181B;
  --color-ink-2: #5C5A55;
  --color-ink-3: #71717A;
  --color-ink-4: #8B8781;
  --color-gold-700: #B4770F;
  --color-gold-500: #D9962B;
  --color-gold-400: #E8B33C;
  --color-crimson-700: #8B0000;
  --color-crimson-500: #A52A2A;
  --color-crimson-wash: rgba(139, 0, 0, 0.08);
  --color-inkbtn: #18181B;
  --color-ok: #22C55E;
  --color-ok-text: #16A34A;
  --color-lime: #84CC16;
  --color-red: #EF4444;
  --color-bar: #E5E7EB;
  --color-chip: #EFEDE8;

  --radius-frame: 22px;
  --radius-hero: 18px;
  --radius-card: 16px;
  --radius-panel: 11px;
  --radius-control: 9px;
  --radius-chip: 6px;

  --spacing: 4px;
}
```