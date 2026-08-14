# Reprise — Style Reference
> warm luminous glass over golden fields

**Theme:** light

The Reprise dashboard embodies a refined, contemporary fintech aesthetic that pairs soft, elevated white surfaces with a cinematic warm-golden landscape backdrop. Clean white cards float with gentle depth over a rich sunset field, creating a sense of calm premium clarity. Typography is precise and hierarchical—crisp sans-serif for interface text paired with confident tabular figures for metrics. Components favour generous rounded corners, subtle 1px borders, and restrained shadows rather than heavy elevation. Density is comfortable: information-rich without feeling cramped, with clear visual breathing room between widgets. The overall language is optimistic, trustworthy and modern—light surfaces, warm accent highlights drawn from the golden environment, and soft interactive states that feel approachable yet professional.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Canvas / Background | `#F8E8C0` – `#F5C26B` (warm golden field gradient) | `--color-canvas` | Page backdrop / imagery |
| Surface / Card | `#FFFFFF` | `--color-surface` | Primary cards, sidebar, panels |
| Surface Elevated | `#FFFFFF` | `--color-surface-elevated` | Floating widgets |
| Surface Subtle | `#FAFAF9` | `--color-surface-subtle` | Secondary panels, nested areas |
| Border / Stroke | `#E8E4DC` | `--color-border` | Card borders, dividers |
| Border Strong | `#D6D0C4` | `--color-border-strong` | Active or emphasis borders |
| Text Primary | `#1A1A1A` | `--color-text-primary` | Headings, key metrics, labels |
| Text Secondary | `#5C5A55` | `--color-text-secondary` | Supporting copy, descriptions |
| Text Muted | `#8A8680` | `--color-text-muted` | Captions, timestamps, inactive |
| Text Inverse | `#FFFFFF` | `--color-text-inverse` | Text on dark buttons |
| Accent Primary | `#1A1A1A` | `--color-accent` | Primary buttons, key actions |
| Accent Warm | `#E8A838` / `#F5C26B` | `--color-accent-warm` | Chart fills, highlights, active nav indicator |
| Status Open / Positive | `#22C55E` | `--color-status-positive` | “Open” badge, success indicators |
| Status Risk Low | `#22C55E` | `--color-risk-low` | Low risk markers |
| Status Risk Medium | `#EAB308` | `--color-risk-medium` | Medium risk |
| Progress / AI Signal | `#22C55E` → `#16A34A` | `--color-progress` | Progress bars, AI credit strength |
| Chart Bar / Allocation | `#E8A838` / `#F5C26B` | `--color-chart-warm` | Performance bars, allocation segments |
| Icon Default | `#5C5A55` | `--color-icon` | Navigation and UI icons |
| Icon Active | `#1A1A1A` | `--color-icon-active` | Selected nav items |

## Tokens — Typography

- **Font Family / Substitutes:** Inter or SF Pro (primary UI), with system-ui fallback. Tabular / monospace numerals preferred for metrics (Inter Tabular or JetBrains Mono for pure data if needed).
- **Weights used:** 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)
- **Philosophy:** Highly legible, modern geometric sans. Tight hierarchy with strong contrast between large metric numbers and supporting labels. Generous tracking avoided; slight negative tracking on large headings for polish.

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|------|------|-------------|----------------|-------|
| Display / Hero Metric | 28–32px | 1.1 | -0.02em | `--text-display` |
| Heading / Section Title | 18–20px | 1.3 | -0.01em | `--text-heading` |
| Subheading / Card Title | 15–16px | 1.4 | 0 | `--text-subheading` |
| Body / Default | 14px | 1.5 | 0 | `--text-body` |
| Caption / Label | 12–13px | 1.4 | 0.01em | `--text-caption` |
| Metric Number (large) | 24–28px | 1.15 | -0.02em | `--text-metric-lg` |
| Metric Number (medium) | 16–18px | 1.2 | -0.01em | `--text-metric-md` |
| Navigation Item | 14px | 1.4 | 0 | `--text-nav` |
| Badge / Tag | 11–12px | 1.3 | 0.02em | `--text-badge` |
| Micro / Timestamp | 11px | 1.3 | 0.01em | `--text-micro` |

## Tokens — Spacing & Shapes

- **Base unit:** 4px
- **Density:** comfortable

### Spacing Scale

| Value | Token | Usage |
|-------|-------|-------|
| 4px | `--spacing-1` | Micro gaps, icon padding |
| 8px | `--spacing-2` | Tight internal spacing |
| 12px | `--spacing-3` | Compact card padding |
| 16px | `--spacing-4` | Standard card padding, gaps |
| 20px | `--spacing-5` | Section spacing |
| 24px | `--spacing-6` | Card outer margins, larger gaps |
| 32px | `--spacing-8` | Major section separation |
| 40px | `--spacing-10` | Page-level breathing room |

### Border Radius

| Element | Radius | Token |
|---------|--------|-------|
| Cards / Panels | 16–20px | `--radius-card` |
| Buttons (primary) | 10–12px | `--radius-button` |
| Inputs / Search | 10px | `--radius-input` |
| Pills / Badges | 999px (full) | `--radius-pill` |
| Small chips / tags | 6–8px | `--radius-chip` |
| Chart containers | 12–16px | `--radius-chart` |
| Sidebar items | 8–10px | `--radius-nav` |
| Avatars / Media | 8–12px | `--radius-media` |

### Layout
- Left sidebar: ~240–260px fixed width, white surface, full height.
- Main content: fluid with generous max-width, multi-column widget grid (typically 2–3 columns on desktop).
- Card internal padding: 16–24px.
- Widget gap: 16–24px.
- Top header / search bar integrated into sidebar or floating.
- Background imagery fills the entire viewport behind all surfaces.

## Components

**Sidebar Navigation**  
- **Role:** Primary global navigation (Home, Portfolios, Markets with nested Equities/Bonds, Chats, News).  
- **Visual Description:** White background, 240–260px wide. Items use 14px Medium text, 8–10px radius hover/active states. Active item shows dark text + small warm accent indicator or filled background. Icons 18–20px, muted by default, dark when active. Subtle badge counters (e.g. Chats “2”) in pill form. Soft bottom user profile area.

**Search Input**  
- **Role:** Global search at top of sidebar or content.  
- **Visual Description:** Rounded 10px, light border `#E8E4DC`, subtle fill, 14px placeholder text, leading search icon, trailing filter/command icon. Height ~40px, comfortable padding.

**Metric / KPI Cards**  
- **Role:** Display yield, rating, coupon, maturity, min investment, bond status.  
- **Visual Description:** White surface, 16–20px radius, 1px soft border, light shadow. Large bold metric number (24–28px), small uppercase or muted label above/below. Status pill (green “Open”) with rounded full radius. Clean internal spacing 16–20px.

**Royalty Calendar / Data Cards**  
- **Role:** Show periodic royalty amounts and breakdowns (Streaming, Downloads, etc.).  
- **Visual Description:** White card with clear hierarchy. Large dollar value, percentage breakdowns with small icons in soft warm or neutral pills. List of upcoming coupons as clean rows with date + amount.

**Performance Chart / Bar Chart**  
- **Role:** Catalog performance over years.  
- **Visual Description:** Soft warm yellow/orange filled bars on light background. Rounded bar ends, muted axis labels, generous padding inside card. No heavy grid lines.

**Allocation / Use of Funds**  
- **Role:** Horizontal or segmented progress showing percentage allocation.  
- **Visual Description:** Stacked or multi-segment bar in warm gold tones with clear percentage labels and legend. Soft rounded container.

**Risk Overview & AI Credit Signal**  
- **Role:** Risk ratings and AI strength indicator.  
- **Visual Description:** Clean list of risk levels with coloured text or small indicators. Progress bar for AI signal (strong green fill, percentage + label “Very strong”). Soft card treatment.

**Primary Action Buttons**  
- **Role:** “Buy bond”, “Add to watchlist”, “Ask ReprAI”.  
- **Visual Description:** Solid dark (`#1A1A1A`) with white text, 10–12px radius, medium weight. Secondary buttons use outline or lighter fill. Comfortable height ~40–44px, generous horizontal padding.

**Status Badges / Pills**  
- **Role:** Bond status, risk levels, tags (Artist Catalog, Debut Era).  
- **Visual Description:** Full-radius pills, soft background tints or solid colours matching status (green for Open, warm for highlights). Small 11–12px Medium text.

**Hero Media / Artist Banner**  
- **Role:** Large image of Aurora Lane with overlaid title and tags.  
- **Visual Description:** Rounded corners matching card radius, high-quality photography, soft gradient overlay for text legibility, small tags as pills.

## Do's and Don'ts

### Do
- Use soft white cards with 1px low-contrast borders and gentle shadows over the warm golden background.
- Maintain clear visual hierarchy with large, bold metric numbers and muted supporting labels.
- Apply consistent large border radii (16–20px) on cards and generous internal padding.
- Keep interactive states subtle—slight background darkening or soft accent indicators.
- Use warm golden/amber tones exclusively for data visualisation and positive highlights.
- Preserve comfortable density with 16–24px gaps between major widgets.

### Don't
- Introduce dark mode or high-contrast black backgrounds.
- Use heavy drop shadows or strong elevation that fights the soft aesthetic.
- Apply saturated primary colours or neon accents outside the warm gold family.
- Overcrowd cards; avoid tight packing of metrics without breathing room.
- Use sharp 0–4px radii on major containers.
- Employ pure black text on pure white without the observed soft neutral greys for secondary content.

## Surfaces & Elevation

| Level | Background | Border | Shadow / Effect | Notes |
|-------|------------|--------|-----------------|-------|
| Canvas | Warm golden field imagery | none | none | Full-bleed photographic/illustrative background |
| Sidebar / Primary Surface | `#FFFFFF` | none or subtle right border | very soft | Fixed left panel |
| Cards / Widgets | `#FFFFFF` | 1px `#E8E4DC` | soft multi-layer shadow (0 4px 24px rgba(0,0,0,0.06)) | Elevated floating feel |
| Nested / Inner Panels | `#FAFAF9` | 1px light | none or minimal | Secondary groupings |
| Buttons / Interactive | solid or outlined | matching | none | Flat or very subtle |
| Overlays / Popovers | `#FFFFFF` | 1px | stronger soft shadow + optional light blur | Future modals |

## Imagery & Data Visualization

- Background is a rich, painterly golden wheat field at sunset—warm, optimistic, high visual quality.
- Charts use soft rounded warm-amber fills (`#E8A838` / `#F5C26B`) with muted axes and no aggressive grid lines.
- Icons are simple, consistent stroke weight (~1.5–2px), muted by default.
- Progress bars and allocation segments are rounded and filled with the warm accent palette.
- Status colours are restrained greens and ambers rather than high-saturation alerts.
- Photography (artist imagery) is treated with soft rounded corners and gentle overlays for text contrast.
- No heavy illustration or decorative elements beyond the background and clean data visuals.

## Layout & Architecture

Collapsible or fixed ~240–260px left sidebar containing logo, search, primary navigation with nested items, and user profile. Main content area uses a flexible multi-column grid (commonly 2–3 columns on desktop) of independently elevated white cards. Top of main content features a large hero banner for the selected bond/artist. Widgets are modular and self-contained with consistent internal padding. The entire interface sits atop a full-viewport warm landscape image that remains visible around and between the floating white surfaces, creating a distinctive “glass over nature” spatial feel. Sticky elements (if any) are limited; the design prioritises calm vertical scrolling of modular cards.

## Agent Prompt Guide

1. “Create a white elevated KPI metric card with 18px border radius, 1px soft border #E8E4DC, large 28px bold dark metric number, small muted 12px label above it, and a green full-radius status pill reading ‘Open’.”
2. “Build a left sidebar navigation item in a light dashboard: 14px medium text, 20px icon, 10px radius, active state with dark text and subtle warm accent indicator on the left.”
3. “Design a soft warm-amber bar chart card for yearly catalog performance: rounded bars in #E8A838, muted axis labels, white card container with 16px radius and gentle shadow.”
4. “Create a primary dark action button (‘Buy bond’) with 12px radius, solid #1A1A1A background, white text, medium weight, and 40px height.”
5. “Build an AI credit signal component: white card containing a horizontal progress bar filled in strong green to 82%, labelled ‘Very strong’ with supporting risk list items.”

## Similar Brands / Aesthetics

- Linear (clean light surfaces, refined typography, soft elevation)
- Stripe Dashboard (professional fintech clarity, generous spacing, restrained colour)
- Vercel / Next.js design language (modern sans, soft cards, high-quality polish)
- Arc Browser or Raycast (elevated glass-like surfaces with thoughtful background treatment)

## Quick Start

```css
:root {
  /* Colors */
  --color-canvas: #F5C26B;
  --color-surface: #FFFFFF;
  --color-surface-subtle: #FAFAF9;
  --color-border: #E8E4DC;
  --color-border-strong: #D6D0C4;
  --color-text-primary: #1A1A1A;
  --color-text-secondary: #5C5A55;
  --color-text-muted: #8A8680;
  --color-text-inverse: #FFFFFF;
  --color-accent: #1A1A1A;
  --color-accent-warm: #E8A838;
  --color-status-positive: #22C55E;
  --color-progress: #22C55E;
  --color-chart-warm: #E8A838;

  /* Typography */
  --font-sans: Inter, system-ui, -apple-system, sans-serif;
  --text-display: 28px;
  --text-heading: 18px;
  --text-body: 14px;
  --text-caption: 12px;
  --text-metric-lg: 28px;

  /* Spacing */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-6: 24px;
  --spacing-8: 32px;

  /* Radius */
  --radius-card: 18px;
  --radius-button: 12px;
  --radius-input: 10px;
  --radius-pill: 999px;
  --radius-nav: 10px;
}
```

```css
@theme {
  --color-canvas: #F5C26B;
  --color-surface: #FFFFFF;
  --color-border: #E8E4DC;
  --color-text-primary: #1A1A1A;
  --color-text-secondary: #5C5A55;
  --color-text-muted: #8A8680;
  --color-accent: #1A1A1A;
  --color-accent-warm: #E8A838;
  --color-status-positive: #22C55E;

  --font-sans: Inter, system-ui, sans-serif;

  --text-display: 1.75rem;
  --text-heading: 1.125rem;
  --text-body: 0.875rem;
  --text-caption: 0.75rem;

  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-4: 1rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;

  --radius-card: 1.125rem;
  --radius-button: 0.75rem;
  --radius-pill: 9999px;
}
```