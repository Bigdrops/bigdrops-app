
Reprise — Style Reference
> warm glowing sunset header on structured light canvas
> 
Theme: light (with high-contrast dark accents and warm amber hero surfaces)
Reprise combines a clean, structured financial dashboard layout with warm, editorial branding moments. The canvas utilizes off-white and pure white surfaces bound together by subtle, low-contrast hairline borders and generous corner rounding. The standout feature is a rich, warm golden/amber hero header card that introduces artistic photography directly into a heavy data interface. Typography relies on a sharp, modern sans-serif with a high-contrast black display typeface for primary titles and key financial metrics, giving the interface an executive yet highly expressive feel.
Tokens — Colors
| Name | Value | Token | Role |
|---|---|---|---|
| Golden Sun | #E8A232 | --color-golden-sun | Main gradient fill on hero banners, warm brand accents, and active status highlights |
| Warm Amber | #F3BD48 | --color-warm-amber | Secondary gradient accent on hero imagery overlays and pill backgrounds |
| Canvas Gray | #F4F4F6 | --color-canvas-gray | Base background color behind sidebar, main grid, and panels |
| Off-White | #FAF8F5 | --color-off-white | Warm light surface tone for inner hero content badges and subtle pill fills |
| Pure White | #FFFFFF | --color-white | Surface color for cards, top bar, sidebar, input fields, and modal containers |
| Charcoal Ink | #18181B | --color-charcoal-ink | Primary text color for headlines, key financial figures, and button surfaces |
| Muted Slate | #71717A | --color-muted-slate | Secondary/body text, metric labels, tab headers, and table metadata |
| Border Hairline | #E4E4E7 | --color-border-hairline | 1px clean container borders, card outlines, and horizontal dividers |
| Positive Green | #16A34A | --color-positive-green | Positive trend indicators, upward percentages, and active status indicators |
Tokens — Typography
Inter / System Sans — Primary Interface Typeface
 * Substitute: Inter, SF Pro Display, system-ui
 * Weights: 400 (regular body/labels), 500 (navigation/buttons), 600 (subtitles/table headers), 700 (card titles)
 * Sizes: 11px, 12px, 13px, 14px, 16px, 18px, 24px
 * Role: Carries sidebar links, data tables, key-value pairs, tab navigation, pill text, and status tags.
Bold Grotesk Display — Primary Metric & Hero Title Typeface
 * Substitute: Instrument Sans (Bold), Plus Jakarta Sans, Geist (Bold)
 * Weights: 800 / Black
 * Sizes: 28px, 32px, 42px
 * Role: Displays brand headlines (e.g., "AURORA LANE") and dominant numerical data (e.g., "$172.50", "$12.4M").
Type Scale
| Role | Size | Line Height | Letter Spacing | Token |
|---|---|---|---|---|
| caption / badge | 11px | 1.2 | 0.02em | --text-caption |
| label / metadata | 12px | 1.3 | 0.01em | --text-label |
| body / table | 13px | 1.4 | 0 | --text-body |
| nav / button | 14px | 1.4 | 0 | --text-nav |
| card headline | 18px | 1.3 | -0.01em | --text-card-head |
| section title | 24px | 1.2 | -0.02em | --text-section |
| display metric | 32px | 1.1 | -0.03em | --text-display |
| hero headline | 42px | 1.0 | -0.04em | --text-hero |
Tokens — Spacing & Shapes
Base unit: 4px
Density: comfortable (generous card padding with compact data tables)
Spacing Scale
| Name | Value | Token |
|---|---|---|
| 2 | 2px | --spacing-2 |
| 4 | 4px | --spacing-4 |
| 8 | 8px | --spacing-8 |
| 12 | 12px | --spacing-12 |
| 16 | 16px | --spacing-16 |
| 20 | 20px | --spacing-20 |
| 24 | 24px | --spacing-24 |
| 32 | 32px | --spacing-32 |
Border Radius
| Element | Value | Token |
|---|---|---|
| inputs / search | 8px | --radius-input |
| small buttons / pills | 12px | --radius-pill |
| interactive cards / hero banner | 20px | --radius-hero |
| dashboard widget cards | 16px | --radius-card |
| floating sidebar / containers | 24px | --radius-container |
Layout
 * Sidebar Width: 220px (collapsible / structured)
 * Top Bar Height: 56px
 * Card Padding: 16px (compact metrics) to 24px (hero & detailed charts)
 * Grid Gap: 16px horizontal & vertical gap between dashboard widgets
Components
Hero Title Card (Golden Sunset Banner)
Role: Main entity banner at top of workspace.
 * Visual Description: Warm amber to golden-yellow gradient surface (#E8A232), 20px border radius, integrated cropped photography on right edge. Features large display typography in dark charcoal, pill metadata badges over subtle translucent dark overlays, and horizontal key-value stat blocks across the bottom border.
Metric KPI Block
Role: Displays key figures (e.g., "$172.50 Royalty Calendar", "$12.4M Catalog Performance").
 * Visual Description: #FFFFFF card surface, 16px radius, subtle 1px border (#E4E4E7). Features extra-large numeric text (#18181B), small green percentage pills (#16A34A on light green tint), and micro-bar graphs or progress indicators beneath the numerical value.
Data Table Row
Role: Lists schedules, coupons, and historical distributions.
 * Visual Description: Clean horizontal list items separated by 1px bottom border. Dates aligned left in dark body text (13px), financial figures aligned right in bold weight. Alternating hover state uses a subtle #FAF8F5 background layer.
Primary Action Button ("+ Ask Reprise")
Role: Main call-to-action in top navigation bar.
 * Visual Description: Solid Charcoal/Black background (#18181B), crisp white text, fully rounded pill shape (20px radius), subtle icon preceding text. High contrast against white nav bar.
Tag / Filter Pill
Role: Metadata tags (e.g., "ARTIST CATALOG", "DEBUT ERA", "ISSUED MAY 2025").
 * Visual Description: Translucent off-white or dark-tint background, 1px subtle hairline border, uppercase 11px bold text with wide letter-spacing.
Do's and Don'ts
Do
 * Use 1px low-contrast light grey borders (#E4E4E7) on card containers instead of box shadows.
 * Combine warm golden hero banners with cool light-gray background surfaces to create visual warmth without cluttering data areas.
 * Keep numbers extra bold and display-scale for immediate visual scanning.
 * Use rounded corners consistently: 16px for cards, 20px for hero blocks.
Don't
 * Don't use solid dark or saturated saturated red/blue colors for metric card backgrounds—keep widgets white.
 * Don't add heavy drop shadows; depth is achieved entirely through background color hierarchy (#F4F4F6 canvas vs #FFFFFF surface).
 * Don't use standard square corners on widgets—the visual system relies heavily on smooth 16px–24px radii.
Surfaces & Elevation
| Level | Name | Value | Border | Purpose |
|---|---|---|---|---|
| 0 | Base Canvas | #F4F4F6 | None | Overall dashboard background |
| 1 | Widget Cards | #FFFFFF | 1px solid #E4E4E7 | Primary containers for metrics, graphs, tables |
| 2 | Warm Hero Surface | Gradient (#E8A232 to #F3BD48) | None | Main spotlight card for featured entity |
| 3 | Input / Pill Fields | #FAF8F5 or #FFFFFF | 1px solid #E4E4E7 | Search bars, dropdown triggers, and tag chips |
Agent Prompt Guide
Example Component Prompts:
 * Create a Hero Spotlight Card:
   > Create a hero card component with a 20px border radius and a warm amber-to-gold gradient background (#E8A232). Place a large bold title "AURORA LANE" in dark charcoal, followed by three metadata pill tags with translucent white backgrounds. In the bottom row, display a 4-column key-value grid with 12px labels and 16px bold values.
   > 
 * Create a KPI Card:
   > Build a financial metric card on a #FFFFFF surface with 16px rounded corners and a 1px #E4E4E7 border. Include a muted title "Royalty calendar", a prominent $172.50 numerical display in bold 32px font, and a small green percentage badge (+18.5%).
   > 
 * Create a Data Table Widget:
   > Build a 2-column list widget for coupon dates and payouts. The container should be white with a 1px light border. Each row should have a 13px date on the left (#18181B) and a bold right-aligned dollar amount (#18181B), separated by faint hairline dividers.
   > 
Similar Brands / Aesthetics
 * Linear — Clean structural layout, smooth radius hierarchy, and sharp micro-typography.
 * Ramp / Mercury — Crisp financial dashboard aesthetic with high-contrast metric cards and low-contrast borders.
 * Raycast — Smooth search modal styling and refined pill/badge architecture.
Quick Start
CSS Custom Properties
:root {
  /* Colors */
  --color-golden-sun: #e8a232;
  --color-warm-amber: #f3bd48;
  --color-canvas-gray: #f4f4f6;
  --color-off-white: #faf8f5;
  --color-white: #ffffff;
  --color-charcoal-ink: #18181b;
  --color-muted-slate: #71717a;
  --color-border-hairline: #e4e4e7;
  --color-positive-green: #16a34a;

  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-display: 'Instrument Sans', 'Plus Jakarta Sans', sans-serif;

  /* Spacing */
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-32: 32px;

  /* Border Radius */
  --radius-input: 8px;
  --radius-pill: 12px;
  --radius-card: 16px;
  --radius-hero: 20px;
  --radius-container: 24px;
}

Tailwind v4
@theme {
  /* Colors */
  --color-golden-sun: #e8a232;
  --color-warm-amber: #f3bd48;
  --color-canvas-gray: #f4f4f6;
  --color-off-white: #faf8f5;
  --color-white: #ffffff;
  --color-charcoal-ink: #18181b;
  --color-muted-slate: #71717a;
  --color-border-hairline: #e4e4e7;
  --color-positive-green: #16a34a;

  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-display: 'Instrument Sans', 'Plus Jakarta Sans', sans-serif;

  /* Radius */
  --radius-input: 8px;
  --radius-pill: 12px;
  --radius-card: 16px;
  --radius-hero: 20px;
  --radius-container: 24px;
}

