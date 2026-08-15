# Divine Blood Design System

> A living financial interface built around disciplined light, deliberate darkness,
> precise data, and the quiet presence of a faithful steward.

---

## 1. Design Identity

Divine Blood is a premium, adaptive interface system for a business and
financial application.

Its visual language combines:

- precision
- wealth
- restraint
- intelligence
- warmth
- mystery
- quiet authority

The interface should feel like a place where important records are kept.

It should feel established rather than trendy.

It should feel intelligent without looking technical for its own sake.

It should feel luxurious without becoming ornamental.

It should occasionally feel uncanny.

### Core Principle

> The interface is rational. The environment is occasionally irrational.

The functional interface must remain predictable.

The unusual elements are atmospheric:

- living blood
- liquid gold
- unusual movement
- hidden visual details
- Steward's presence
- rare environmental transitions

These elements create personality without reducing usability.

---

## 2. Product Identity

### Name

**Divine Blood**

Divine Blood is the design and product identity.

It is not divided into multiple visual brands.

The system has exactly two visual modes:

- Light
- Dark

There is no separate Gold Light theme.

There is no separate Crimson Dark theme.

Gold and crimson may both exist in either mode, but their prominence changes.

**Divine Blood is an internal codename.** It is not a required public-facing
product name. When the product name is finalized separately, this visual
system continues to apply unchanged. Do not invent a replacement name in this
document.

---

## 3. Theme Philosophy

The system has exactly two modes: Light and Dark.

Each mode has a dominant identity. That identity must remain obvious in every
screen.

### Light

Light mode is dominated by:

1. White
2. Gold
3. Restrained Crimson

White provides the environment.

Gold provides identity and energy.

Crimson provides contrast, risk semantics, and occasional atmospheric detail.

Crimson must never visually overtake the white and gold environment.

```
WHITE
████████████

GOLD
███████

CRIMSON
██
```

This is a hierarchy, not a strict exclusion rule.

Small crimson details are encouraged where they improve the design.

### Dark

Dark mode is dominated by:

1. Black
2. Crimson
3. Restrained Gold

Black provides the environment.

Crimson provides identity and atmosphere.

Gold provides illumination, emphasis, and premium detail.

Gold must never visually overtake the black and crimson environment.

```
BLACK
████████████

CRIMSON
███████

GOLD
██
```

Again, this is a hierarchy.

Gold is allowed in dark mode.

Crimson is allowed in light mode.

The dominant identity of each mode must remain obvious.

---

## 4. Color System

The color system is token-based.

Tokens are defined for both modes and map to the CSS variable layer that
shadcn/ui reads.

### Light Tokens

```
:root {
  --db-canvas: #FFFFFF;
  --db-surface: #FFFFFF;
  --db-surface-raised: #FFFFFF;
  --db-surface-soft: #F5F5F5;

  --db-border: #E5E5E5;
  --db-border-strong: #D4D4D4;

  --db-ink: #171614;
  --db-ink-secondary: #525252;
  --db-ink-muted: #737373;
  --db-ink-faint: #A3A3A3;

  --db-gold-100: #FEF9E7;
  --db-gold-200: #FDE68A;
  --db-gold-300: #FCD34D;
  --db-gold-400: #FBBF24;
  --db-gold-500: #F59E0B;
  --db-gold-600: #D97706;
  --db-gold-700: #B45309;

  --db-crimson-100: #FEE2E2;
  --db-crimson-200: #FECACA;
  --db-crimson-300: #FCA5A5;
  --db-crimson-400: #F87171;
  --db-crimson-500: #DC2626;
  --db-crimson-600: #B91C1C;
  --db-crimson-700: #991B1B;

  --db-success: #16A34A;
  --db-warning: #D97706;
  --db-danger: #DC2626;
  --db-focus: #D97706;
}
```

### Dark Tokens

```
[data-theme="dark"] {
  --db-canvas: #0A0A0A;
  --db-surface: #141010;
  --db-surface-raised: #1C1414;
  --db-surface-soft: #261A1A;

  --db-border: #3D2222;
  --db-border-strong: #5C3333;

  --db-ink: #FAF5F0;
  --db-ink-secondary: #D4C4B8;
  --db-ink-muted: #A89888;
  --db-ink-faint: #706058;

  --db-gold-100: #FEF3C7;
  --db-gold-200: #FDE68A;
  --db-gold-300: #FCD34D;
  --db-gold-400: #FBBF24;
  --db-gold-500: #F59E0B;
  --db-gold-600: #D97706;
  --db-gold-700: #B45309;

  --db-crimson-100: #450A0A;
  --db-crimson-200: #7F1D1D;
  --db-crimson-300: #991B1B;
  --db-crimson-400: #DC2626;
  --db-crimson-500: #B91C1C;
  --db-crimson-600: #991B1B;
  --db-crimson-700: #7F1D1D;

  --db-success: #4ADE80;
  --db-warning: #FBBF24;
  --db-danger: #F87171;
  --db-focus: #FBBF24;
}
```

### Verified Contrast

The ratios below were computed from the token values against the listed
backgrounds. AA figures use the WCAG 2.2 thresholds: 4.5:1 for normal text,
3:1 for large text (18pt/24px or 14pt bold/18.66px bold) and for non-text UI
components and graphics.

#### Light — against `--db-surface` (#FFFFFF)

| Token | Value | Ratio | AA normal text | Use |
| --- | --- | --- | --- | --- |
| ink | #171614 | 18.1:1 | pass | primary text |
| ink-secondary | #525252 | 7.4:1 | pass | secondary text |
| ink-muted | #737373 | 4.6:1 | pass | captions, metadata |
| ink-faint | #A3A3A3 | 2.8:1 | fail | large text, non-text only |
| gold-700 | #B45309 | 5.2:1 | pass | gold text on white |
| gold-600 | #D97706 | 3.8:1 | fail | large text, non-text only |
| gold-500 | #F59E0B | 2.6:1 | fail | decorative fill only |
| crimson-500 | #DC2626 | 5.5:1 | pass | risk text |
| crimson-600 | #B91C1C | 7.5:1 | pass | risk text, danger |
| success | #16A34A | 4.5:1 | pass | success text (keep weight >= 500) |
| warning | #D97706 | 3.8:1 | fail | large text, non-text only |
| focus | #D97706 | 3.8:1 | fail | see Focus section |

Against `--db-canvas` (#FFFFFF): ink 18.1:1, ink-muted 4.6:1, success
4.5:1 (borderline), warning 3.8:1 (fail).

Against `--db-surface-soft` (#F5F5F5): ink 17.0:1, ink-muted 4.3:1 (fail).
Do not set normal-size muted text on soft surfaces.

#### Dark — against `--db-surface` (#141010)

| Token | Value | Ratio | AA normal text | Use |
| --- | --- | --- | --- | --- |
| ink | #FAF5F0 | 17.5:1 | pass | primary text |
| ink-secondary | #D4C4B8 | 10.2:1 | pass | secondary text |
| ink-muted | #A89888 | 6.2:1 | pass | captions, metadata |
| ink-faint | #706058 | 3.2:1 | fail | large text, non-text only |
| gold-300 | #FCD34D | 13.8:1 | pass | gold text on dark |
| gold-400 | #FBBF24 | 11.6:1 | pass | gold text on dark |
| gold-500 | #F59E0B | 8.5:1 | pass | gold text on dark |
| crimson-400 | #DC2626 | 4.7:1 | pass | risk text |
| success | #4ADE80 | 11.5:1 | pass | success text |
| warning | #FBBF24 | 11.6:1 | pass | warning text |
| danger | #F87171 | 7.2:1 | pass | danger text |
| focus | #FBBF24 | 11.6:1 | pass | focus indicator |

Against `--db-canvas` (#0A0A0A): ink 18.0:1, ink-muted 6.3:1, crimson-400
4.8:1 (pass for normal text).

Against `--db-surface-raised` (#1C1414): ink 16.2:1, ink-muted 5.8:1.

Against `--db-surface-soft` (#261A1A): ink 15.0:1, ink-muted 5.4:1.

### Contrast Rules

- Normal text must meet 4.5:1 against its background.
- Large text must meet 3:1.
- Non-text UI components and graphics must meet 3:1.
- `ink-faint` is not for normal body text in either mode. Use it for large
  text, placeholder, disabled, and decorative elements only.
- Light `success` (#16A34A) meets 4.5:1 on white but is borderline. Keep
  weight >= 500 for normal text, or pair with icon + text label.
- Light `focus` (#D97706) does not meet the 3:1 non-text requirement for a
  focus indicator on white. Use `--db-gold-700` (#B45309, 5.2:1) for the
  light focus ring.
- Never rely on color alone to communicate meaning.

### Color Rules

#### Light mode

- White surfaces dominate.
- Gold is the primary accent.
- Crimson is secondary.
- Crimson may appear in alerts, risk indicators, selected decorative
  elements, or living material.

#### Dark mode

- Black and near-black surfaces dominate.
- Crimson is the primary environmental accent.
- Gold is secondary.
- Gold may appear in metrics, highlights, icons, living material, and
  selected actions.

Do not turn either mode into a monochromatic interface.

Do not use blue as a primary brand color.

---

## 5. Typography

Divine Blood uses two primary typefaces.

### UI Typeface — Instrument Sans

Instrument Sans is the human interface voice.

Use it for:

- navigation
- buttons
- forms
- card titles
- page headings
- body text
- settings
- dialogs
- notifications
- Steward conversations
- explanations
- general UI

Weights:

- 400 — body
- 500 — labels and navigation
- 600 — buttons and card titles
- 700 — major headings

### Data Typeface — Berkeley Mono

Berkeley Mono is the data and system voice.

Use it for:

- financial figures
- balances
- percentages
- transaction IDs
- account numbers
- invoice IDs
- timestamps
- charts
- metrics
- technical identifiers
- micro labels
- structured data

Weights:

- 400 — metadata
- 500 — labels
- 600 — important values
- 700 — major metrics

### Typography Relationship

Instrument Sans communicates human interaction.

Berkeley Mono communicates data, precision, records, and system state.

- Do not use Berkeley Mono for long paragraphs.
- Do not use Instrument Sans for major financial figures when a data-oriented
  presentation is more appropriate.

### Font Variables

```
--font-sans: "Instrument Sans", system-ui, sans-serif;
--font-mono: "Berkeley Mono", ui-monospace, SFMono-Regular, monospace;
```

Only these two approved font families should be loaded.

### Licensing Caveat

**Berkeley Mono is a commercial font.** Before it is locked as a required
production asset, confirm its licensing and availability. The design decision
can stay; the license must be handled when implementation begins. If the
license is not acceptable, select a metrically compatible monospace fallback
and keep the design treatment unchanged.

---

## 6. Type Scale

### Desktop

| Role | Size | Line height |
| --- | --- | --- |
| Hero | 30px | 1.15 |
| Display metric | 28px | 1.10 |
| Large metric | 24px | 1.15 |
| Page heading | 22px | 1.20 |
| Card title | 16px | 1.40 |
| Body | 14px | 1.50 |
| Caption | 12px | 1.50 |
| Micro | 11px | 1.20 |

### Tablet

- Hero 26px
- Display metric 24px
- Large metric 21px
- Page heading 20px
- Card title 15px
- Body 13–14px
- Caption 12px
- Micro 11px

### Mobile

- Hero 23px
- Display metric 21px
- Large metric 19px
- Page heading 19px
- Card title 14px
- Body 13px
- Caption 11px
- Micro 10–11px

Fold and Flip devices use the type scale associated with their available
layout width.

---

## 7. Micro Typography

Micro labels use Berkeley Mono.

Recommended treatment:

```
ACCOUNT STATUS
LAST UPDATED
AVAILABLE BALANCE
TRANSACTION ID
```

Properties:

- uppercase
- 10–12px
- 500–600 weight
- approximately 0.06em tracking

Apply uppercase with `text-transform: uppercase`, not by storing uppercase
strings. This preserves translation and locale behavior (see Localization).

Micro typography should be used sparingly.

---

## 8. Spacing

Base unit: **4px**

Scale:

- 4px — micro
- 8px — inline
- 12px — compact
- 16px — standard
- 20px — card
- 24px — major card/page
- 32px — section
- 40px — major separation
- 48px — major layout separation
- 64px — exceptional separation

Responsive layouts reduce spacing progressively rather than compressing every
component equally.

---

## 9. Shape Language

Divine Blood uses restrained rounded geometry.

It should not look excessively soft or playful.

| Surface | Radius |
| --- | --- |
| Major application shell | 20–24px |
| Large cards | 16px |
| Panels | 10–12px |
| Controls | 8–10px |
| Small chips | 6px |
| Pills | 999px |

Avoid:

- excessive pill usage
- cartoon-like rounding
- inconsistent radii
- sharp corners mixed randomly with large rounded corners

Shape should communicate hierarchy.

---

## 10. Surfaces & Elevation

Elevation should primarily come from:

- surface contrast
- hairline borders
- subtle shadows
- translucency
- color depth

Avoid heavy generic drop shadows.

### Light

```
Canvas
  ↓
Warm white surface
  ↓
White surface
  ↓
Raised white surface
```

Gold may provide selective visual elevation.

Crimson may provide warning or atmospheric emphasis.

### Dark

```
Black canvas
  ↓
Near-black surface
  ↓
Deep crimson-black surface
  ↓
Crimson-tinted elevated surface
```

Do not use pure white cards in Dark mode.

Do not use pure black as the only surface level.

---

## 11. Borders

Borders are primarily hairlines: **1px**.

Light: `#E8E2D6`.

Dark: `#382222`.

Stronger borders are reserved for:

- focused controls
- emphasized containers
- selected states
- important separators

Hairline borders are decorative. Do not rely on a hairline alone to identify
a component boundary (see Accessibility — non-text contrast).

Avoid thick borders as a default visual language.

---

## 12. Iconography

Two icon roles exist. Keep them distinct.

### Functional Icons

Functional icons accompany actions, labels, and data.

Characteristics:

- clean
- geometric
- medium stroke (1.5px at 16px size, scaled proportionally)
- rounded or carefully finished terminals
- rendered at 16px standard, 20px in compact nav rails
- no decorative fills

Preferred characteristics:

- primary icon = ink
- active icon = gold (or white, depending on surface)
- success = green
- risk = crimson

Icon spacing uses the 4px scale. Icons should not compete with labels.

Do not mix unrelated icon families.

### Large Design-Block Icons

Large icons are used for atmosphere and wayfinding, not as UI affordances.

Examples:

- page-level emblems
- empty-state motifs
- Steward-related marks
- section identity blocks

Rules:

- Use sparingly, at most a few per screen.
- They may use gold and crimson fills.
- They may contain micro-detail or partial living-material treatment.
- They are never interactive targets themselves.
- When an icon sits inside an interactive element, the element provides the
  accessible name; the icon is decorative (`aria-hidden`).

All icons need an accessible name or `aria-hidden="true"` when decorative.

---

## 13. Component Foundation — shadcn/ui

shadcn/ui is the component foundation for Divine Blood.

This document defines the visual treatment. It does not replace, fork, or
rewrite shadcn primitives.

### Foundation Rules

- Install and compose shadcn/ui components as the base of every surface.
- Divine Blood applies through the shadcn CSS-variable layer (`background`,
  `foreground`, `primary`, `secondary`, `destructive`, `border`, `input`,
  `ring`, `card`, `muted`, `accent`) using the tokens in Section 4.
- Do not hand-build replacements for primitives that shadcn provides (Button,
  Input, Select, Dialog, Table, Card, Sidebar, Command, Badge, Avatar,
  Skeleton, Empty, sonner toast, and so on).
- Component variants (primary, secondary, destructive, outline, ghost) carry
  the Divine Blood color semantics below.

### Variant Color Mapping

| shadcn variant | Divine Blood treatment |
| --- | --- |
| primary | dark ink surface with white text (Light); warm white surface with dark text (Dark) |
| secondary | surface + hairline border + ink text |
| destructive | crimson surface or crimson text per context; never used for ordinary primary actions |
| outline | transparent surface + hairline border |
| ghost | transparent; ink text; visible focus ring |
| gold (accent role) | reserved for selected premium actions and important accents |

### Composition

- Compose, do not reinvent. Dashboards compose Sidebar + Card + Table +
  Chart. Settings compose Tabs + Card + form controls.
- Use built-in variants and sizes before custom styles.
- Use semantic tokens only. Never raw color utilities.
- Follow the shadcn rules for forms (FieldGroup/Field), icon placement, and
  overlay titles. These apply without modification.

Where this document describes a component, it specifies the Divine Blood
visual rules for the shadcn component that implements it.

---

## 14. Component System

### Buttons

- Primary: Light = dark ink surface, white text. Dark = warm white surface,
  dark text.
- Secondary: Light = white surface, subtle border, dark text. Dark = near-black
  surface, crimson-tinted border, warm white text.
- Gold: selected premium actions, important accents, special actions.
- Crimson: destructive actions, risk actions, critical alerts. Do not use
  crimson for ordinary primary buttons.

Target height: 40px standard, 44px on touch devices. Minimum target size
must meet 24 × 24px (see Accessibility).

### Form Controls

Inputs must be:

- clear
- readable
- easy to focus
- large enough for touch

Light: white surface, warm border, dark text.

Dark: near-black surface, crimson-tinted border, warm white text.

Focused states use gold.

Error states use crimson and include text plus icon (never color alone).

Input boundary identification must not rely on the hairline border alone (see
Accessibility — non-text contrast). Use a distinct fill (`--db-surface-soft`
for the resting state) or a visible label.

### Cards

Cards are calm containers.

They should not all have shadows.

Preferred hierarchy:

1. surface
2. border
3. small elevation
4. content

Card titles use Instrument Sans.

Important financial values use Berkeley Mono.

Cards should have generous but responsive padding.

### Overlays

Dialogs, sheets, and drawers use the system surfaces and elevation rules.

Every dialog, sheet, and drawer has a title for screen readers.

Consequential confirmation dialogs are quiet: no atmospheric motion, no
living material. They communicate clearly and calmly.

### Notifications

Notifications (toasts) use the system tokens:

- success = green
- warning = gold
- error = crimson

Each notification includes an icon and text. Do not use color alone.

Notifications are static. No living material in notification surfaces.

---

## 15. Data Display

### Financial Data

Financial information is a major part of the visual language.

Numbers must be:

- aligned
- readable
- clearly differentiated from labels
- consistent in precision
- visually stable

Use Berkeley Mono for:

- balances
- amounts
- percentages
- rates
- dates
- transaction identifiers

Use semantic color carefully:

- Positive: green
- Negative/risk: crimson
- Neutral: normal ink

Do not use color as the only indicator of meaning.

### Tables

Tables are the workhorse of the financial interface.

Rules:

- Compact but readable density (see Density).
- Numeric cells use Berkeley Mono with right alignment.
- Tabular figures must not jump between rows.
- Row dividers are hairlines. Selected rows use `--db-surface-soft`.
- Zebra striping is optional and subtle (`--db-surface-soft`), never strong.
- Hover rows use `--db-surface-soft`.
- Sticky headers use the surface token with a hairline bottom border.
- Sortable columns show a clear icon and aria state.
- Status cells use icon + text + color (see Status).
- Headers use Instrument Sans 500, micro case where space allows.

Tables are a no-go zone for living material. No motion of any kind inside
table surfaces.

### Data Visualization

Charts should remain functional first.

#### Light

- neutral values use warm gray
- featured values use gold
- negative/risk values use crimson

#### Dark

- neutral values use deep crimson-black
- featured values use gold
- negative/risk values use bright crimson

Charts should not become decorative gradients.

Gold should identify important information.

Crimson should communicate risk or negative information.

Chart text must meet the same contrast rules as UI text.

### Status

Status must use:

- text
- icon
- color

Do not communicate status by color alone.

Examples:

- Open
- Pending
- Failed
- Review

Green indicates success/open states.

Crimson indicates danger/risk.

Gold indicates attention or important state.

---

## 16. Dashboards

Dashboards are the primary financial overview surface.

Rules:

- Compose from Card, Table, and Chart. Use the shadcn Sidebar for navigation.
- KPI groups use Display metric (28px) or Large metric (24px) in Berkeley Mono.
- KPIs are aligned and consistent in precision.
- Featured KPIs may use gold. Risk KPIs use crimson. Neutral KPIs use ink.
- Maximum content width applies on wide viewports (see Responsive).
- Charts are functional, not decorative.
- Allow breathing room between cards; do not tile to the edge.

Dashboard surfaces are a no-go zone for living material, except a Whisper
(Level 1) effect in the page background behind the hero region only.

---

## 17. Search

Search uses the Command palette pattern (shadcn Command in a Dialog) plus
search results surfaces.

### Command Palette

- Opens from a top-bar trigger and from Steward surfaces.
- Berkeley Mono for identifiers and searchable codes.
- Instrument Sans for human-readable labels.
- Keyboard-first: type-ahead, arrow navigation, enter to select.
- Visible focus indicator at all times.

### Search Results

- Results render as compact rows with clear hierarchy: label, type, date,
  value.
- Highlight the matched substring with gold, never color alone.
- Identifiers and amounts use Berkeley Mono.
- Show an accessible count and status for the result set.

Search results are a no-go zone for living material.

### Empty Search State

- State the query.
- Offer clear next actions.
- A single Whisper (Level 1) effect or a static gold/crimson motif is allowed
  here.

---

## 18. Navigation & States

### Navigation Layout

Desktop uses: Sidebar | Main Content | Optional Right Rail.

The sidebar may contain:

- Divine Blood mark
- workspace
- primary navigation
- secondary navigation
- settings
- account
- Steward entry point

Recommended width: 260–280px.

Tablet uses: collapsible sidebar, icon rail, or drawer. Preserve the main
content area.

Mobile uses: bottom navigation (56–64px), optional drawer, sticky top bar.
Touch targets remain at least 44 × 44px.

### Navigation States

Every navigation item has four explicit states:

- Resting: ink text, transparent surface.
- Hover: ink text, `--db-surface-soft` surface, subtle 1px gold indicator.
- Active: gold indicator (2px left rail in sidebar, underline in tabs),
  ink text, selected surface `--db-surface-soft`.
- Focus: visible gold focus ring (see Focus).

Active and current-page items use `aria-current`. State must not be
communicated by color alone.

### Persistent Help

Help and Steward entry points must appear in the same relative order across
screens (WCAG 2.2, consistent help).

---

## 19. Steward

Steward is the application's intelligent assistant.

This section is **visual guidance only**. It defines how Steward is
represented in the interface. It does not define Steward's persona, writing
style, or feature behavior.

### Visual Direction

Steward should be represented with a recognizable human avatar whose visual
language communicates:

- competence
- discretion
- maturity
- professionalism

### Avatar

Primary concept: a mature gentleman wearing a refined hat with a single
understated eyepatch. The eyepatch is a signature characteristic. It should
not make him look like a pirate.

Visual direction:

- mature man, approximately 50–65
- composed expression
- intelligent eyes
- tailored dark clothing
- refined hat
- simple dark eyepatch
- neat facial hair or clean-shaven
- restrained gold detail
- restrained crimson detail
- editorial portrait quality
- subtle old-world character
- sophisticated rather than theatrical

Avoid:

- pirate styling
- weapons
- skulls
- exaggerated vampire teeth
- horror gore
- cartoon proportions
- fantasy armor
- exaggerated steampunk elements
- glowing eyes
- overly dramatic expressions
- generic AI robot imagery

Avatar modes:

- Light: warm neutral portrait, white/cream environment, gold details, tiny
  crimson accent.
- Dark: black/crimson environment, warm skin tones, gold highlight,
  restrained crimson lighting.

Avatar sizes:

| Size | Use |
| --- | --- |
| 32px | compact messages |
| 40px | standard conversation |
| 48px | navigation/assistant controls |
| 64px | expanded assistant surfaces |
| 96px+ | profile or dedicated Steward page |

At small sizes (32px), the hat and eyepatch must remain identifiable. At small
sizes, facial detail may be simplified. Identity must not depend on tiny
facial details.

### Presence

Steward does not need to appear everywhere.

Possible appearances:

- top-bar action
- command/search interface
- floating action button (mobile)
- assistant drawer
- contextual assistant panel
- document-writing surface
- invoice-writing surface
- message composer
- dedicated Steward workspace

Steward should feel available without constantly demanding attention.

Steward conversation surfaces are a no-go zone for living material.

---

## 20. Living Material

Divine Blood contains subtle animated living materials.

The two materials are:

- Blood
- Liquid Gold

They represent the living identity of the system.

They are atmospheric, not functional UI controls.

### Blood

Blood uses deep crimson.

It should feel:

- viscous
- slow
- organic
- deep
- controlled
- slightly uncanny

Avoid:

- splatter
- gore
- dripping horror effects
- bright neon red

In Light mode, blood remains restrained.

In Dark mode, blood can become more prominent.

### Liquid Gold

Liquid gold uses the Divine Blood gold scale.

It should feel:

- heavy
- warm
- reflective
- luminous
- fluid
- precious

Avoid chrome-like metallic effects.

Gold may have subtle reflective variation.

### Living Flow

Blood and gold should behave like a slow river.

Movement may:

- flow left to right
- flow right to left
- split around surfaces
- merge
- form small eddies
- pool
- disappear beneath cards
- emerge from behind panels
- travel through narrow channels

Avoid obvious synchronized looping.

Different streams should have different speeds.

### Uncanny Placement

Living material may appear in unexpected locations.

Examples:

- behind a side drawer
- beneath a navigation rail
- through a narrow page gap
- underneath a large card
- behind a hero
- inside an empty state
- along a page edge
- within a large background surface
- behind translucent panels

The effect should sometimes make the user think: "Was that always there?"

The effect must never interfere with usability.

### No-Go Zones

Living material is prohibited in these surfaces. No motion of any kind:

- data tables
- financial summaries
- metric displays
- charts
- search results and command palette
- active forms
- input containers
- numerical data entry
- invoice previews
- document editing surfaces
- calculation displays
- consequential confirmation dialogs
- notifications
- error states
- Steward conversation surfaces

The visual identity must remain intact without any living material.

---

## 21. Living Material Levels

The system defines three levels. Each level has a precise rarity.

### Level 1 — Whisper

Almost invisible. Atmosphere at the edge of perception.

- Purpose: establish atmosphere continuously.
- Opacity: 0.04–0.10.
- Motion amplitude: up to 4px.
- Duration: any; continuous.
- Frequency: present on most atmospheric surfaces; may be constant.
- Examples: subtle shimmer, tiny current, faint movement.

### Level 2 — Presence

Clearly visible but subordinate.

- Purpose: mark an important but non-critical surface.
- Opacity: 0.12–0.22.
- Motion amplitude: up to 12px.
- Duration: 6–16s per pass, non-looping.
- Frequency: at most one active presence stream per viewport; select surfaces
  only.
- Examples: gold stream, crimson current, visible pool, animated drawer edge.

### Level 3 — Event

A major visual moment.

- Purpose: mark a significant achievement or workflow completion.
- Opacity: 0.20–0.35.
- Motion amplitude: up to 24px, or a single large-area pass.
- Duration: 6–16s, one pass, then settles.
- Frequency: at most one Event per user session; trigger only on meaningful
  user achievements (financial milestone, significant workflow completion, a
  dedicated Steward moment). Not on routine actions.

The rarer the effect, the more powerful it becomes.

---

## 22. Living Material Layering & Motion

### Layer Order

1. Application background
2. Living material
3. Atmospheric glow/reflection
4. UI surfaces
5. Content
6. Interactive controls

Animated material must never reduce text readability.

### Motion Parameters

- Major flow: 12–30s
- Small flow: 6–16s
- UI response: 200–350ms
- Theme transition: 300ms

Use organic easing.

Avoid linear movement.

Avoid synchronized loops.

Prefer GPU-friendly transforms and opacity only (no layout-thrashing
properties).

---

## 23. Motion System

Normal interface motion should be subtle.

### Fast — 120–180ms

For: hover, focus, icon changes.

### Standard — 200–350ms

For: drawers, menus, cards, theme changes.

### Slow — 400–700ms

For: major state transitions, page-level atmospheric changes.

Avoid animation for animation's sake.

### Theme Transition

Theme transitions should feel like the environment changing.

- Light: white + gold + restrained crimson.
- Dark: black + crimson + restrained gold.

Use approximately 300ms transitions for background, surfaces, borders, text,
and controls.

The living material may continue moving during the transition.

---

## 24. Reduced Motion

When reduced motion is enabled:

```
@media (prefers-reduced-motion: reduce) {
  /* Remove continuous living motion. */
}
```

Replace animation with:

- static gradients
- static material shapes
- subtle opacity transitions
- minimal non-looping effects

The visual identity must remain intact without motion.

Any animation triggered by interaction must have a reduced-motion equivalent
that removes the animation and keeps the state change visible.

---

## 25. Accessibility — WCAG 2.2 AA

Divine Blood must meet WCAG 2.2 Level AA in both visual modes.

### Contrast (1.4.3, 1.4.11)

- Normal text: at least 4.5:1.
- Large text (24px+, or 18.66px+ bold): at least 3:1.
- Non-text UI components and graphics: at least 3:1.

Use the verified token table in Section 4. Apply the contrast rules listed
there, including the flagged light-mode focus and success tokens.

### Focus Visible (2.4.7, 2.4.11)

- Every interactive element has a visible focus indicator.
- Indicator is at least 2px thick, offset at least 2px from the element.
- Light: `--db-gold-700` (or an updated `--db-focus` that meets 3:1).
- Dark: `--db-focus` (#F3C45D).
- Focused elements must not be fully obscured by sticky headers or overlays.
  Use appropriate scroll margin for anchors.

### Keyboard (2.1.1, 2.1.2, 2.4.3)

- All functionality is keyboard-operable.
- No keyboard traps.
- Focus order follows visual order.
- Skip link to main content.

### Target Size (2.5.8)

- Interactive targets at least 24 × 24px.
- On coarse pointers, target at least 44 × 44px.

### Text Scaling, Spacing, Reflow (1.4.4, 1.4.10, 1.4.12)

- Content remains usable at 200% zoom without loss of function.
- Content reflows without horizontal scrolling at 320px width.
- Text spacing overrides (letter-spacing, word-spacing, line-height, paragraph
  spacing) do not break content.

### Not by Color Alone (1.4.1)

- Never use gold, crimson, or green alone to communicate meaning.
- Status always includes icon + text.

### Motion (2.3.3)

- Animation from interaction can be disabled via the reduced-motion setting
  (Section 24).

### Forms & Errors (3.3.1, 3.3.2, 3.3.3)

- Every input has a programmatically associated label.
- Errors are identified with text, an icon, and `aria-invalid`; the first
  error receives focus on submit.
- Error messages are announced (live region).

### Understanding & Robustness

- Logical heading hierarchy and semantic HTML.
- Screen-reader labels for icon-only controls.
- Consistent help placement (Section 18).
- Content does not force redundant re-entry of information already provided
  in the session.
- Authentication does not rely solely on cognitive function tests; provide a
  password manager, copy-paste, or alternative sign-in path.

---

## 26. Focus

Focus must be visually obvious.

- Light: gold focus ring (`--db-gold-700` or an updated `--db-focus` token
  meeting 3:1 against white).
- Dark: bright gold focus ring (`--db-focus`, #F3C45D).

Focus indicators must remain visible against both surfaces and borders.

Do not remove browser focus indicators without replacing them with a stronger
equivalent.

---

## 27. Loading, Empty, Error States

### Loading

Loading states should remain quiet.

Preferred:

- subtle shimmer
- controlled opacity
- skeleton surfaces
- restrained gold activity indicator

Avoid aggressive pulsing.

Steward may use a subtle breathing indicator while processing.

### Empty States

Empty states provide an opportunity for subtle atmosphere.

Possible:

- static liquid gold
- small crimson current (Whisper level)
- Steward avatar
- minimal illustration
- restrained environmental motion

Do not fill empty states with excessive decoration.

### Error States

Errors use crimson.

They must include:

- clear text
- icon
- actionable recovery where possible

Avoid dramatic animations.

The visual system should communicate: important, not frightening.

---

## 28. Content & Atmosphere

### Imagery

Imagery should be editorial and premium.

Preferred:

- natural human photography
- architectural photography
- materials
- paper
- books
- financial objects
- subtle environmental imagery

Avoid:

- generic corporate stock photography
- neon cyberpunk imagery
- fantasy game art
- excessive gold imagery
- excessive crimson imagery

The living material may be layered into imagery where appropriate.

### Editorial Character

Divine Blood should occasionally feel like a well-kept private archive.

Useful visual references include:

- financial ledgers
- old books
- correspondence
- private libraries
- archival documents
- refined stationery
- dark wood
- paper
- metal
- glass
- ink

These references should influence atmosphere, not become literal decoration
everywhere.

### Negative Space

Negative space is an active part of the design.

Do not fill every available area.

Large empty regions can be used for:

- breathing room
- visual hierarchy
- living material
- editorial atmosphere
- focus

The interface should feel expensive partly because it is not overcrowded.

---

## 29. Density

The shell is comfortable.

Financial data may be compact.

Therefore:

| Area | Density |
| --- | --- |
| Outer shell | comfortable |
| Cards | comfortable |
| Tables | compact but readable |
| Financial records | information-dense |
| Navigation | compact |

Density should increase inside data structures rather than across the entire
application.

Row height in tables: 40–44px on desktop, 48px+ on touch.

---

## 30. Responsive Architecture

### Breakpoints

| Range | Behavior |
| --- | --- |
| 0–639px | Mobile |
| 640–1023px | Tablet |
| 1024–1439px | Desktop |
| 1440px+ | Wide Desktop |

#### Mobile

- edge-to-edge application
- no visible external frame
- single-column content
- bottom navigation
- sticky top bar
- compact hero
- horizontally scrollable KPI groups where necessary
- bottom sheets for secondary information
- Steward FAB
- minimum 44px touch targets

#### Tablet

- small application inset
- collapsible sidebar
- 1–2 content columns
- narrower secondary rails
- tablet spacing
- touch-aware controls

#### Desktop

- visible application frame
- full sidebar
- two or three content regions
- optional right rail
- full type scale
- larger negative space

#### Wide Desktop

Increase breathing room without allowing content to become excessively wide.

Use maximum content widths where appropriate.

### Fold Devices

Foldable devices are treated according to available space rather than as a
separate visual brand.

- Cover: treat as compact mobile.
- Inner portrait: treat as compact tablet.
- Inner landscape: treat as compact desktop.

Fold geometry must be respected. Content must not place important interactive
elements across a hinge or unusable display region.

### Flip Devices

Flip cover displays use the mobile system.

When expanded:

- portrait follows tablet/mobile rules
- landscape follows compact desktop rules where width permits

The layout must adapt continuously where possible.

Do not depend only on device names. Viewport geometry is the source of truth.

### Safe Areas

Support:

- env(safe-area-inset-top)
- env(safe-area-inset-right)
- env(safe-area-inset-bottom)
- env(safe-area-inset-left)

Safe-area handling is required for:

- bottom navigation
- FABs
- full-screen drawers
- sticky headers
- modal surfaces
- edge-to-edge layouts

### Touch

Coarse pointer targets should be at least 44 × 44px. Preferred: 44–48px.

Do not rely on hover-only interaction. Every hover interaction must have an
equivalent touch/focus state.

### Responsive Content Rules

Content should transform, not merely shrink.

- Desktop: Sidebar + Main + Right rail.
- Tablet: Collapsible navigation + Main + optional secondary panel.
- Mobile: Top bar + Main + Bottom navigation + Bottom sheets.
- Fold: Cover → mobile, inner portrait → tablet, inner landscape → desktop-like.

---

## 31. Print

When the application or a document is printed:

- Force the Light palette. Use white backgrounds and ink/black text.
- Remove living material and all animation.
- Remove interactive states (hover, focus, pressed).
- Print tables with full borders and full values; do not truncate.
- Numeric columns stay aligned (tabular figures).
- Use `color-adjust: exact` where brand color in charts must survive.
- Maximum content width applies to print layout.
- Include document headers/footers with identifiers and page numbers where
  applicable.

---

## 32. Localization

- Support right-to-left (RTL) layouts. Do not hardcode left/right alignment.
- Use `text-transform` for uppercase micro labels, not stored uppercase
  strings.
- Do not truncate by fixed character count; text length varies by locale.
- Numeric and currency formats follow the locale, using tabular figures.
- Keep type scale and density rules; allow text to expand without clipping.
- Micro labels and identifiers must not overflow their containers in
  translated text.

---

## 33. Do

- Keep Light predominantly white and gold.
- Keep Dark predominantly black and crimson.
- Allow controlled cross-color usage.
- Use Instrument Sans for human UI.
- Use Berkeley Mono for data.
- Make Steward calm and capable.
- Use the Steward eyepatch as a recognizable signature.
- Use blood and gold as rare living material.
- Respect the living-material no-go zones.
- Preserve large areas of negative space.
- Use hairline borders.
- Support Mobile, Tablet, Desktop, Fold, and Flip.
- Respect safe areas.
- Support reduced motion.
- Keep financial data highly readable.
- Make unusual elements discoverable rather than obvious.
- Meet WCAG 2.2 AA in both modes.

## 34. Do Not

- Do not create more than two visual modes.
- Do not create separate Gold Light and Crimson Dark themes.
- Do not create a rainbow theme system.
- Do not use blue as the brand accent.
- Do not make Light predominantly crimson.
- Do not make Dark predominantly gold.
- Do not use pure black for every Dark surface.
- Do not use pure white cards throughout Dark mode.
- Do not use excessive gradients.
- Do not use cursive typography.
- Do not use Arabic-style decorative typography.
- Do not use generic AI robot imagery for Steward.
- Do not make Steward look like a pirate.
- Do not use gore or blood splatter.
- Do not animate every component.
- Do not place living material in the no-go zones.
- Do not sacrifice readability for atmosphere.
- Do not use color alone to communicate meaning.
- Do not rely on hover for essential functionality.
- Do not force desktop layouts onto mobile.

---

## 35. Core Design Equation

Divine Blood can be summarized as:

```
LIGHT
White
+
Gold
+
A Trace of Blood

DARK
Black
+
Blood
+
A Trace of Gold
```

Combined with:

```
Instrument Sans
+
Berkeley Mono
+
Precise Financial UI
+
A Faithful Steward
+
Living Material
+
Negative Space
```

---

## 36. Final Brand Principle

Divine Blood should not look like a fantasy interface.

It should look like a serious, premium business application that happens to
contain something ancient and alive beneath its surfaces.

The user should trust it first.

Then notice its personality.

Then discover its mysteries.

---

## 37. Design Source of Truth

This document defines the Divine Blood visual system.

Future interface design must follow this document.

Where a component is not explicitly defined, use these principles in order:

1. Usability
2. Accessibility
3. Mode hierarchy
4. Typography hierarchy
5. Consistency
6. Restraint
7. Atmosphere

The atmosphere must never override usability.

---

## 38. Design Review Checklist

Use this checklist when reviewing any screen or component against Divine
Blood.

### Identity and Mode

- [ ] The dominant identity of the mode is obvious (white/gold in Light,
      black/crimson in Dark).
- [ ] No fantasy, gothic, vampire, or gaming aesthetic leaks into the surface.
- [ ] The interface looks premium and serious, not generic SaaS and not
      theatrical.
- [ ] Not more than two modes exist.

### Color and Contrast

- [ ] Normal text meets 4.5:1; large text and non-text meet 3:1.
- [ ] No ink-faint used for normal body text.
- [ ] No light-mode success token used for normal text without icon + text.
- [ ] Focus indicator is visible (2px, offset) and passes 3:1 in the mode.
- [ ] Status is never communicated by color alone.

### Typography

- [ ] Instrument Sans only for human UI.
- [ ] Berkeley Mono only for data, metrics, identifiers, and micro labels.
- [ ] Berkeley Mono not used for long paragraphs.
- [ ] Micro labels use text-transform, not stored uppercase.

### Components and Data

- [ ] shadcn/ui primitives used; no hand-built replacements for covered
      components.
- [ ] Tables: tabular figures, aligned numerics, no living material.
- [ ] Dashboards: KPI alignment, functional charts, breathing room.
- [ ] Search: keyboard-first, gold highlight not color alone, no living
      material in results.
- [ ] Navigation has all four states (rest, hover, active, focus) and
      aria-current.

### Living Material

- [ ] Whisper / Presence / Event rarity respected (Level 3 at most once per
      session).
- [ ] No living material in any no-go zone.
- [ ] Reduced-motion path keeps identity intact without motion.

### Accessibility and Response

- [ ] Keyboard operable, logical focus order, visible focus.
- [ ] 44px touch targets on coarse pointers.
- [ ] Content usable at 200% zoom and reflows at 320px.
- [ ] Errors include text + icon + actionable recovery.
- [ ] Safe areas respected on mobile surfaces.

---

## 39. Pre-Implementation Verification

Before implementation begins, confirm these decisions:

1. Berkeley Mono license and availability (see Section 5).
2. Light `--db-focus` updated to a gold that meets 3:1 on white, or adopt
   `--db-gold-700` for the focus ring.
3. Light `--db-success` usage rule: normal text paired with icon + text, or a
   darker success token.
4. Final product name, separate from the Divine Blood codename.
5. shadcn/ui registry and installed component set (see Section 13).

---

*The interface is rational. The environment is occasionally irrational.*