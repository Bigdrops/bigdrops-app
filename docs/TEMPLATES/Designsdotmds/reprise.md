# Reprise — Style Reference
> Golden-hour warmth meets monospace precision finance.

**Theme:** Light (warm paper-white surfaces floating in a rounded frame over a saturated golden-hour photographic wallpaper)

**Verification note:** This spec is reconciled from three independent AI extractions of the same source video, then checked against six actual screenshots. The floating app frame, dual mono/sans typography, and right-hand tab rail are confirmed structural facts — not every model caught these. Where screenshots showed a value directly (hex approximations aside), that reading takes priority over any single extraction.

Reprise is a warm, editorial-toned financial terminal that fuses two languages: a sun-drenched golden-hour photographic ambience and a crisp, near-monochrome "paper" UI floating inside it. The whole interface sits inside a large rounded white app frame, itself inset over a full-bleed golden wheat-field/sky wallpaper — the wallpaper is visible around the frame's edges, not just behind one hero card. Typography is a deliberate duet: a tracked-out uppercase **monospace** for brand-voice moments (breadcrumbs, hero titles, section micro-headers, tag pills, coupon-list headers, numerals), and a **sans-serif** for navigation, body copy, and card titles. The accent family is a single honey/amber gold used in gradients and solid icon tiles; semantic color is kept microscopic — a green "Open" dot, a lime AI-signal bar, nothing else. Elevation is communicated through surface whitening and 1px hairline strokes rather than shadows, with a single near-black pill button ("Ask ReprAI") reserved for the primary AI action.

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
| Ink Button / Dark Surface | `#18181B` | `--color-ink-button` | "Ask ReprAI" pill, primary buttons (Buy bond, Upgrade) |
| Success — Dot | `#22C55E` | `--color-success-500` | "Open" status dot |
| Success — Text | `#16A34A` | `--color-success-600` | Trend indicator (e.g. +18.6%) |
| Lime — AI Signal | `#84CC16` | `--color-lime-500` | AI credit signal progress bar fill (confirmed lime, not green) |
| Danger — Pip | `#EF4444` | `--color-danger-500` | Notification badge dot |
| Chart Bar — Neutral | `#E5E7EB` | `--color-chart-neutral` | Inactive histogram bars |
| Chip / Badge Bg | `#EFEDE8` | `--color-chip-bg` | Keycap (⌘F), driver chips, tag pill fill on white |

*Hex values are sampled/estimated from source frames; treat as close approximations, not exact brand hex.*

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

### Layout

- Floating rounded white app frame, inset from viewport edges, sitting over a full-bleed golden wallpaper visible on all sides (confirmed: image 5/6 show wallpaper above, left, and right of the panel).
- Left sidebar: fixed ~260–280px — logo/wordmark → search → nav (Home, Portfolios, Markets with Equities/Bonds sub-tree, Chats with counter badge, News) → trial/upgrade card → settings → user row.
- Top bar: ~56px, breadcrumb pill left, bell + help + "Ask ReprAI" pill right.
- Center content: hero banner → KPI stat row (Yield, Rating, Coupon, Maturity, Min. Investment, Bond status) → 2-up cards (Royalty Calendar + Upcoming Coupons) → 2-up cards (Catalog Performance chart + Use of Funds allocation).
- Right insight rail: tab bar (Overview / Cashflow / Financials / Risks / Documents) → Bond Details → Risk Overview → AI Credit Signal → Est. Annual Income CTA.
- Coupon/data rows: ~40–44px tall with 1px dashed separators.

## Components

**1. Sidebar Navigation**
- Brand row: gold-gradient dot/orb logo + bold sans "Reprise" wordmark + collapse icon.
- Search field: white fill, 1px subtle border, 10–12px radius, leading search icon, trailing `⌘F` keycap chip.
- Nav items: 14px medium sans, 18–20px outline icons, 8–10px radius rows. Active item ("Markets") shows a filled dark rounded-square icon background and stays expanded to reveal sub-items (Equities, Bonds) via a vertical guide line with dot markers. "Chats" carries a small numeric badge.

**2. Trial / Upgrade Card (sidebar footer)**
- Bordered card with a gold lightning-bolt tile, a live waveform ornament (thin gold bars), "7-days free trial" copy, and a full-width dark pill button ("Upgrade").

**3. User Row**
- Circular avatar, name + email in small sans text, chevron, sits above/below Settings and Help links at the sidebar base.

**4. Top Bar**
- Breadcrumb in uppercase mono ("MARKETS /") with the current page wrapped in a bordered pill ("CATALOG ROYALTY BOND").
- Right cluster: bell icon (with small red pip when active), help icon, and the signature **"Ask ReprAI"** — solid near-black pill, white text, sparkle icon.

**5. Tab Bar (right rail)**
- Overview / Cashflow / Financials / Risks / Documents. Mono uppercase-adjacent labels; active tab in dark ink with underline, inactive tabs muted.

**6. Hero Banner**
- Large rounded card (16–20px radius) with a right-anchored, amber-washed portrait photograph and a left-to-right gold gradient overlay ensuring the mono white title stays legible.
- Bold mono title ("Aurora Lane"), muted mono uppercase subtitle ("DEBUT MASTER ROYALTY BOND 20230").
- Bottom-row glass tag pills over the image: translucent white fill, thin white-stroke border, mono uppercase text (e.g. "♫ ARTIST CATALOG", "DEBUT ERA [2018–2023]", "ISSUED MAY 2025").

**7. KPI Stat Strip**
- Single white card, six-column row directly under the hero: Yield, Rating, Coupon, Maturity, Min. Investment, Bond status. Labels are small muted sans/mono; values are bold ink. "Bond status" pairs a small green dot with "Open".

**8. Royalty Calendar Card**
- Sans card title ("Royalty calendar"). Large bold mono dollar figure ($172.50) with a muted mono uppercase caption ("PER $5,000 INVESTED"). Below: a 2×2 grid of gold-gradient icon tiles (Streaming, Downloads, Sync licensing, Live & other) each paired with a percentage.

**9. Upcoming Coupons List**
- Header: calendar icon + mono uppercase label. Rows: date in sans on the left, dollar amount in bold mono right-aligned, separated by 1px dashed dividers — confirmed directly in every screenshot.

**10. Catalog Performance Chart Card**
- Bold mono large value ("$12.4M") plus a small lime/green "↑18.6%" trend chip. Below: a 5-column bar histogram, neutral light-gray bars with one featured bar in solid/gradient gold, muted axis labels beneath (years).

**11. Use of Funds Card**
- "Allocation" header with a percentage value at right (confirmed as "100%" total in production view, individual segments summing beneath — e.g. Catalog acquisition 40%, Marketing & play listing 25%, Touring 15%, Sync licensing 12%, Reserve 8%).
- Single segmented horizontal bar in graduated gold tones, small gap between segments, legend rows below with a colored dot + label + right-aligned percent.

**12. Bond Details Panel (right rail)**
- Nested card, info icon + mono uppercase header ("BOND DETAILS"). Two-column key–value grid (Issuer, Bond type, Seniority / Payment freq., Day count, Governing law). Keys muted sans, values medium ink, right-aligned.

**13. Risk Overview Panel**
- Headline ("Low-medium risk") in semibold sans. Key–value rows identical pattern to Bond Details (Default risk, Market risk, Liquidity risk, Volatility) — right-aligned semibold values.

**14. AI Credit Signal Panel**
- "Very strong" label + percentage (e.g. "82%") in mono. Horizontal progress bar with a **lime-green** fill (not standard green) on a light track. "Key drivers" caption followed by small pill chips (Royalty quality, Diversification, Growth, Management).

**15. Est. Annual Income / CTA Card**
- Mono uppercase caption ("STREAMING ROYALTIES (LAST 5 YEARS)"). Large bold mono dollar figure ($360) with muted "OF $5,000" suffix. Button pair: primary dark pill ("Buy bound"/"Buy bond") + secondary outlined pill with star icon ("Add to watchlist").

**16. Buttons (system)**
- Primary: solid near-black (`#18181B`), white text, 8–10px radius, ~40px height.
- Secondary: white fill, 1px border, ink text, optional leading icon.
- AI Pill: 999px radius, dark fill, sparkle icon, reserved exclusively for "Ask ReprAI".

**17. Search Input**
- White fill, 1px subtle border, 10–12px radius, leading search icon, trailing `⌘F` keycap styled with the chip token (light fill, 1px border, 6px radius, mono text).

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

### Don't
- Don't flatten the background to plain gray — the wallpaper is warm and photographic throughout, not confined to one hero card.
- Don't set navigation, body copy, or card titles in monospace — that's the brand/data voice only.
- Don't use more than one dark pill button per view — "Ask ReprAI" and primary CTAs are the exception, not the norm.
- Don't apply heavy shadows or glassmorphism outside the hero's translucent tag pills.
- Don't use sharp corners — nothing under 6px radius except dividers and underlines.
- Don't introduce more hue families beyond gold + a restrained green/lime + a small red pip.

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

## Imagery & Data Visualization

- Photography: warm golden-hour portraiture, right-anchored in the hero banner, fused via a left-origin gold gradient overlay for text legibility.
- Wallpaper: painterly golden wheat-field-and-sky illustration/photo, full-bleed behind the entire floating frame.
- Icons: simple outline style, ~1.5–2px stroke, muted by default, inverted to white/cream on gold or dark tiles.
- Icon tiles: ~36–40px, 10–12px radius, gold gradient fill.
- Histograms: neutral light-gray bars with one gold gradient "featured" bar, muted mono axis labels.
- Allocation bar: single segmented horizontal bar in graduated gold tones with a small legend list below.
- Progress/signal: lime-green fill on a light track, full radius.
- Status color logic: gold = brand/data emphasis, green dot = "Open" status, lime = positive AI signal, red = notification only.

## Layout & Architecture

A rounded white app frame floats over a full-bleed golden wallpaper, wallpaper visible on all sides. Inside: a fixed left sidebar (wordmark → search → nav tree → trial card → settings → user) and a main region split into a top bar (breadcrumb pill left, bell/help/AI-pill right) and a two-column workspace — center column (hero banner → KPI strip → paired cards for royalty/coupons and performance/allocation) plus a right insight rail (tab bar → Bond Details → Risk Overview → AI Credit Signal → Est. Income CTA). Grid gaps run 16–24px; card padding 16–24px; coupon rows use dashed 1px separators.

## Agent Prompt Guide

1. "Create a hero banner card (18px radius) with a right-anchored amber-washed portrait photo, left-to-right gold gradient overlay, a bold mono white title, a muted mono uppercase subtitle, and 2–3 glass tag pills (translucent white fill, 1px white-stroke border, backdrop-blur, mono uppercase text)."
2. "Build a key–value bond details panel: white nested card, two-column grid, muted sans keys left, medium ink values right, mono-uppercase micro-header with a leading info icon."
3. "Create a coupon list row: ~44px height, sans date left, bold mono dollar amount right, 1px dashed bottom divider, subtle hover tint."
4. "Make a catalog performance widget: bold mono large dollar value plus a small lime '+X%' trend chip, five-bar neutral histogram with one gold-gradient featured bar and muted mono axis labels."
5. "Build the primary CTA pair: dark near-black pill button (white text) plus a secondary outlined pill with a star icon, 8–10px radius, ~40px height, 12px gap."
6. "Design a left sidebar nav item: 14px medium sans, 18–20px outline icon, 8–10px radius row, active state shows a dark filled rounded-square icon background with the icon inverted to white."

## Similar Brands / Aesthetics

- Mercury (warm neutral fintech surfaces, hairline borders)
- Linear (quiet elevation, precise compact rows)
- Raycast (mono micro-labels, keycap chips, dark pill actions)
- Stripe Dashboard (clean key–value finance panels, tabbed insight rails)

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
  --micro-tracking: .06em;
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
