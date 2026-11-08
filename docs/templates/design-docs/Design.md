# Divine Blood Design System

> A living financial interface built around disciplined light, deliberate darkness,
> precise data, and the quiet presence of a faithful steward.

---

## 1. Design Identity

Divine Blood is a premium, adaptive interface system for a business and financial application.

Its visual language combines:

- precision
- wealth
- restraint
- intelligence
- vibrant clarity
- quiet authority

The interface should feel like a place where important records are kept on pristine paper under clear light.

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

**Divine Blood is an internal codename.** It is not a required public-facing product name. When the product name is finalized separately, this visual system continues to apply unchanged. Do not invent a replacement name in this document.

---

## 3. Theme Philosophy (62/38 Gold Rule)

The system has exactly two modes: Light and Dark. No dilution. No cream. No beige.

### Light (62% White / 38% Gold)

Light mode is dominated by:

1. **Gold** – the primary identity layer. Solid gold blocks, heroes, panels, and KPI backgrounds. (≈38% of visual real estate).
2. **Pure White** – the contrast layer, providing breathing room and structure. (≈62% of visual real estate).
3. **Restrained Crimson** – used exclusively for risk, danger, or severe contrast. (≈<1%).

```

GOLD  ████████████████  (38%)
WHITE ██████████████    (62%)
RED   █                 (<1%)

```

Gold is the protagonist. White is the supporting canvas.

Crimson is an accent. It sits on top of white or gold, never blending into them.

### Dark (70% Black / 25% Crimson / 5% Gold)

Dark mode is dominated by:

1. **Pure Black** – the void, the foundation.
2. **Crimson** – the living identity, the pulse.
3. **Restrained Gold** – used exclusively for premium highlights and illumination.

```

BLACK  ████████████████  (70%)
CRIMSON ████████         (25%)
GOLD   ██                (5%)

```

Gold is a spotlight, not a surface tint. Crimson is the environment, but it stays in the foreground—never bleeding into background borders or surfaces.

---

## 4. Color System

The color system is token-based.

Tokens are defined for both modes and map to the CSS variable layer that shadcn/ui reads.

### Light Tokens (Pure White + Solid Gold)

```css
:root {
  /* ---- Pure White Canvas ---- */
  --db-canvas: #FFFFFF;           /* Pure White */
  --db-surface: #FFFFFF;          /* Pure White */
  --db-surface-raised: #FFFFFF;   /* Pure White */
  --db-surface-soft: #F4F4F5;     /* Neutral faint grey (hover only, never cream) */

  /* ---- Neutral Structural Borders (No cream) ---- */
  --db-border: #E5E5E5;           /* Neutral light grey */
  --db-border-strong: #D4D4D4;    /* Neutral mid grey */

  /* ---- Ink ---- */
  --db-ink: #18181B;              /* Almost black */
  --db-ink-secondary: #52525B;    /* Dark grey */
  --db-ink-muted: #71717A;        /* Mid grey */
  --db-ink-faint: #A1A1AA;        /* Light grey (large text only) */
  --db-ink-on-gold: #18181B;      /* Dark text for solid gold surfaces */

  /* ---- GOLD (Primary Identity - 38% of Light UI) ---- */
  --db-gold-100: #FEF3C7;         /* Soft gold background (large areas) */
  --db-gold-200: #FDE68A;         /* Mid gold background */
  --db-gold-300: #FCD34D;         /* Vibrant gold surface */
  --db-gold-400: #FBBF24;         /* Bright gold - heroes, KPIs, primary blocks */
  --db-gold-500: #F59E0B;         /* Pure Gold accent - buttons, active states */
  --db-gold-600: #D97706;         /* Deep gold - strong emphasis */
  --db-gold-700: #B45309;         /* Dark gold - text on gold, focus rings */

  /* ---- CRIMSON (Risk & Contrast) ---- */
  --db-crimson-400: #C95B5B;
  --db-crimson-500: #A52A2A;      /* Pure Crimson */
  --db-crimson-600: #8B0000;
  --db-crimson-700: #650000;

  --db-success: #16A34A;
  --db-warning: #D97706;
  --db-danger: #8B0000;
  --db-focus: #B45309;            /* Meets 3:1 on white */
  --db-focus-ring: #B45309;
}
```

Dark Tokens (Pure Black Void)

```css
[data-theme="dark"] {
  --db-canvas: #000000;           /* Pure Black */
  --db-surface: #0A0A0A;          /* Near-black */
  --db-surface-raised: #141414;   /* Slightly lifted black */
  --db-surface-soft: #1A1A1A;     /* Neutral dark (hover only, never crimson-tinted) */

  /* ---- Neutral Structural Borders (NO CRIMSON TINT) ---- */
  --db-border: #2A2A2A;           /* Strict neutral dark grey */
  --db-border-strong: #3A3A3A;    /* Strict neutral mid-grey */

  --db-ink: #FAFAFA;              /* Near white */
  --db-ink-secondary: #D4D4D8;
  --db-ink-muted: #A1A1AA;
  --db-ink-faint: #52525B;

  --db-gold-400: #FBBF24;
  --db-gold-500: #F59E0B;         /* Pure Gold highlight */
  --db-gold-600: #D97706;
  --db-gold-700: #B45309;

  --db-crimson-300: #842727;
  --db-crimson-400: #C43E3E;      /* Bright Crimson (stands alone) */
  --db-crimson-500: #A52A2A;      /* Deep Crimson */
  --db-crimson-600: #8B0000;

  --db-success: #4ADE80;
  --db-warning: #FBBF24;
  --db-danger: #F87171;
  --db-focus: #FBBF24;            /* Meets 3:1 on black */
  --db-focus-ring: #FBBF24;
}
```

Verified Contrast (Abridged)

· Light --db-ink (#18181B) on --db-canvas (#FFFFFF): 18.1:1 (Pass).
· Light --db-ink-on-gold (#18181B) on --db-gold-400 (#FBBF24): 7.1:1 (Pass).
· Light --db-gold-700 (#B45309) on white: 5.2:1 (Pass for text/focus).
· Dark --db-crimson-400 (#C43E3E) on --db-surface (#0A0A0A): 3.6:1 (Pass for large text, icons, non-text).
· Dark --db-ink (#FAFAFA) on --db-surface (#0A0A0A): 18.2:1 (Pass).

Contrast Rules:

· Normal text: 4.5:1 minimum.
· Large text / non-text UI: 3:1 minimum.
· ink-faint is for large text, placeholder, and decorative elements only.
· Never rely on color alone to communicate meaning.

---

5. Typography

Divine Blood uses two primary typefaces. Both are fully open-source (SIL OFL) with zero licensing cost or ambiguity.

UI Typeface — Instrument Sans

Instrument Sans is the human interface voice.

Use it for:

· navigation
· buttons
· forms
· card titles
· page headings
· body text
· settings
· dialogs
· notifications
· Steward conversations
· explanations
· general UI

Weights:

· 400 — body
· 500 — labels and navigation
· 600 — buttons and card titles
· 700 — major headings

Data Typeface — JetBrains Mono

JetBrains Mono is the data and system voice. Engineered for extreme readability in dense information environments.

Use it for:

· financial figures
· balances
· percentages
· transaction IDs
· account numbers
· invoice IDs
· timestamps
· charts
· metrics
· technical identifiers
· micro labels
· structured data

Weights:

· 400 — metadata
· 500 — labels
· 600 — important values
· 700 — major metrics

Font Variables

```css
--font-sans: "Instrument Sans", system-ui, -apple-system, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, "SF Mono", "Menlo", "Consolas", monospace;
```

Definitive Font Loading

```html
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

---

6. Type Scale

Desktop

Role Size Line height Weight
Hero 30px 1.15 700 (Sans) / 600 (Mono)
Display metric 28px 1.10 700 (Mono)
Large metric 24px 1.15 600 (Mono)
Page heading 22px 1.20 600 (Sans)
Card title 16px 1.40 600 (Sans)
Body 14px 1.50 400 (Sans)
Caption 12px 1.50 500 (Mono)
Micro 11px 1.20 600 (Mono)

Tablet & Mobile

Reduce sizes proportionally. Preserve hierarchy.

---

7. Micro Typography

Micro labels use JetBrains Mono.

Properties:

· uppercase (text-transform: uppercase)
· 10–12px
· 500–600 weight
· ~0.06em tracking

---

8. Spacing

Base unit: 4px

Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px.

---

9. Shape Language

Restrained rounded geometry.

Surface Radius
Major shell 20–24px
Large cards 16px
Panels 10–12px
Controls 8–10px
Small chips 6px
Pills 999px

---

10. Surfaces & Elevation (Gold-First in Light)

Elevation comes from pure layering and subtle shadows. No warm tints. No cream. No crimson mixing.

Light (62 White / 38 Gold)

```
Gold Surface (Identity Layer) ────┐
  ↓                              │ 38% of UI
White Surface (Content Layer) ────┘
  ↓                              │ 62% of UI
Raised White (Elevated Content) ──┘
```

· Gold surfaces (--db-gold-300, --db-gold-400) are used for:
  · Hero sections
  · Primary KPI cards
  · Sidebar headers
  · Key action panels
  · Navigation active states
· White surfaces provide contrast, form fields, detailed data tables, and reading areas.
· Gold provides selective visual elevation. Crimson provides risk or emphasis.

Dark (70 Black / 25 Crimson / 5 Gold)

```
Canvas (Pure Black #000000)
  ↓
Surface (Near-black #0A0A0A)
  ↓
Raised (Lifted black #141414)
```

Crimson provides identity and atmosphere in the foreground (text, icons, statuses, hero blocks). Borders remain neutral.

Do not use pure white cards in Dark mode. Do not use pure black as the only surface level—use #0A0A0A and #141414 for depth.

---

11. Borders (Pure Structure, No Crimson Tint)

Borders are strictly functional and neutral in both modes.

Mode Standard Strong
Light #E5E5E5 #D4D4D4
Dark #2A2A2A #3A3A3A

· No cream borders in Light.
· No crimson-tinted borders in Dark. Functional surfaces (forms, tables, inputs) use neutral warm borders (--db-border: #2A2A2A), never crimson-tinted borders, so form states are never confused with danger.
· Borders are 1px hairlines. They provide structure, not atmosphere.
· Do not rely on a hairline alone to identify a component boundary. Use distinct fills or labels.

---

12. Iconography

Functional Icons

· Clean, geometric, 1.5px stroke at 16px.
· Primary = ink, Active = gold, Risk = crimson.
· No decorative fills.

Large Design-Block Icons

· Use sparingly for atmosphere and wayfinding.
· May use gold and crimson fills.
· Never interactive targets themselves.
· All icons need an accessible name or aria-hidden="true".

---

13. Component Foundation — shadcn/ui

shadcn/ui is the component foundation.

· Install and compose shadcn primitives.
· Map CSS variables to the tokens in Section 4.
· Do not hand-build replacements for covered components.

Variant Color Mapping

shadcn variant Divine Blood treatment
primary dark ink surface with white text (Light); warm white surface with dark text (Dark)
secondary surface + hairline border + ink text
destructive crimson surface or crimson text
outline transparent + hairline border
ghost transparent + ink text + visible focus ring
gold solid gold background (--db-gold-400) + dark ink text (--db-ink-on-gold)

---

14. Component System

Buttons

· Primary: Light = dark ink surface, white text. Dark = light surface, dark text.
· Gold: solid gold background (--db-gold-400) with dark ink text. Used for premium actions, confirmations, and key CTAs.
· Crimson: destructive/risk actions only.
· Minimum height: 40px (44px on touch devices).

Form Controls

· Light: white surface, neutral border, dark text.
· Dark: near-black surface, #2A2A2A border, light text. Never use crimson-tinted borders on inputs.
· Focus states use gold.
· Error states use crimson + text + icon.

Cards

· Calm containers.
· Surface + border + subtle elevation.
· Gold Cards: Solid gold background (--db-gold-400) with dark ink text. Used for featured KPIs, hero metrics, or premium content blocks.
· Card titles: Instrument Sans. Financial values: JetBrains Mono.

Overlays & Notifications

· Dialogs, sheets, drawers use system surfaces.
· Notifications use success (green), warning (gold), error (crimson) with icon + text.

---

15. Data Display

Financial Data

· Use JetBrains Mono for balances, amounts, percentages, dates, IDs.
· Positive = green. Negative/risk = crimson. Neutral = ink.
· On gold surfaces, use --db-ink-on-gold (#18181B) for maximum readability.
· Never use color alone.

Tables

· Compact density (40–44px rows).
· Numeric cells: JetBrains Mono, right-aligned.
· Row dividers: hairlines.
· Selected/hover rows: --db-surface-soft.
· Sticky headers: surface + hairline bottom border.
· No living material in tables.

Data Visualization

· Light: neutral = grey, featured = gold, risk = crimson.
· Dark: neutral = dark grey/crimson-black, featured = gold, risk = bright crimson.
· Chart text must meet contrast rules.

Status

· Always use text + icon + color.
· Green = success/open. Crimson = danger/risk. Gold = attention.

---

16. Dashboards (Gold-First Light Mode)

Dashboards are the primary financial overview surface.

Rules:

· Compose from Card, Table, and Chart. Use the shadcn Sidebar for navigation.
· Hero Section: Solid gold background (--db-gold-400 or --db-gold-300) featuring the primary KPI (Total Balance) with dark ink text. This immediately establishes the 38% gold identity.
· KPI groups: Use Display metric (28px) or Large metric (24px) in JetBrains Mono.
· Featured KPIs use gold backgrounds. Risk KPIs use crimson backgrounds. Neutral KPIs use white surfaces with ink text.
· Maximum content width applies on wide viewports (see Responsive).
· Charts are functional, not decorative.
· Allow breathing room between cards; do not tile to the edge.

Gold Distribution Map (Light Mode):

· Hero Banner / Primary KPI → Solid Gold (--db-gold-400)
· Sidebar active state → Gold indicator + soft gold glow
· Primary CTA buttons → Solid Gold (--db-gold-500)
· Featured metric cards → Gold surface (--db-gold-300) with dark text
· Rest of the UI → Pure White surfaces

Dashboard surfaces are a no-go zone for living material, except a Whisper (Level 1) effect in the page background behind the hero region only.

---

17. Search

Search uses the Command palette pattern (shadcn Command in a Dialog) plus search results surfaces.

Command Palette

· Opens from a top-bar trigger and from Steward surfaces.
· JetBrains Mono for identifiers and searchable codes.
· Instrument Sans for human-readable labels.
· Keyboard-first: type-ahead, arrow navigation, enter to select.
· Visible focus indicator at all times.

Search Results

· Results render as compact rows with clear hierarchy: label, type, date, value.
· Highlight the matched substring with gold, never color alone.
· Identifiers and amounts use JetBrains Mono.
· Show an accessible count and status for the result set.

Search results are a no-go zone for living material.

Empty Search State

· State the query.
· Offer clear next actions.
· A single Whisper (Level 1) effect or a static gold/crimson motif is allowed here.

---

18. Navigation & States

Navigation Layout

Desktop uses: Sidebar | Main Content | Optional Right Rail.

The sidebar may contain:

· Divine Blood mark
· workspace
· primary navigation
· secondary navigation
· settings
· account
· Steward entry point

Recommended width: 260–280px.

Tablet uses: collapsible sidebar, icon rail, or drawer. Preserve the main content area.

Mobile uses: bottom navigation (56–64px), optional drawer, sticky top bar. Touch targets remain at least 44 × 44px.

Navigation States

Every navigation item has four explicit states:

· Resting: ink text, transparent surface.
· Hover: ink text, --db-surface-soft surface, subtle 1px gold indicator.
· Active: gold indicator (2px left rail in sidebar, underline in tabs), ink text, selected surface --db-surface-soft or soft gold background.
· Focus: visible gold focus ring (see Focus).

Active and current-page items use aria-current. State must not be communicated by color alone.

Persistent Help

Help and Steward entry points must appear in the same relative order across screens (WCAG 2.2, consistent help).

---

19. Steward

Steward is the application's intelligent assistant.

This section is visual guidance only. It defines how Steward is represented in the interface. It does not define Steward's persona, writing style, or feature behavior.

Visual Direction

Steward should be represented with a recognizable human avatar whose visual language communicates:

· competence
· discretion
· maturity
· professionalism

Avatar

Primary concept: a mature gentleman wearing a refined hat with a single understated eyepatch. The eyepatch is a signature characteristic. It should not make him look like a pirate.

Visual direction:

· mature man, approximately 50–65
· composed expression
· intelligent eyes
· tailored dark clothing
· refined hat
· simple dark eyepatch
· neat facial hair or clean-shaven
· restrained gold detail
· restrained crimson detail
· editorial portrait quality
· subtle old-world character
· sophisticated rather than theatrical

Avoid:

· pirate styling
· weapons
· skulls
· exaggerated vampire teeth
· horror gore
· cartoon proportions
· fantasy armor
· exaggerated steampunk elements
· glowing eyes
· overly dramatic expressions
· generic AI robot imagery

Avatar modes:

· Light: warm neutral portrait, white/gold environment, gold details, tiny crimson accent.
· Dark: black/crimson environment, warm skin tones, gold highlight, restrained crimson lighting.

Avatar sizes:

Size Use
32px compact messages
40px standard conversation
48px navigation/assistant controls
64px expanded assistant surfaces
96px+ profile or dedicated Steward page

At small sizes (32px), the hat and eyepatch must remain identifiable. At small sizes, facial detail may be simplified. Identity must not depend on tiny facial details.

Presence

Steward does not need to appear everywhere.

Possible appearances:

· top-bar action
· command/search interface
· floating action button (mobile)
· assistant drawer
· contextual assistant panel
· document-writing surface
· invoice-writing surface
· message composer
· dedicated Steward workspace

Steward should feel available without constantly demanding attention.

Steward conversation surfaces are a no-go zone for living material.

---

20. Living Material

Divine Blood contains subtle animated living materials.

The two materials are:

· Blood
· Liquid Gold

They represent the living identity of the system.

They are atmospheric, not functional UI controls.

Blood

Blood uses deep crimson.

It should feel:

· viscous
· slow
· organic
· deep
· controlled
· slightly uncanny

Avoid:

· splatter
· gore
· dripping horror effects
· bright neon red

In Light mode, blood remains restrained.

In Dark mode, blood can become more prominent.

Liquid Gold

Liquid gold uses the Divine Blood gold scale.

It should feel:

· heavy
· warm
· reflective
· luminous
· fluid
· precious

Avoid chrome-like metallic effects.

Gold may have subtle reflective variation.

Living Flow

Blood and gold should behave like a slow river.

Movement may:

· flow left to right
· flow right to left
· split around surfaces
· merge
· form small eddies
· pool
· disappear beneath cards
· emerge from behind panels
· travel through narrow channels

Avoid obvious synchronized looping.

Different streams should have different speeds.

Uncanny Placement

Living material may appear in unexpected locations.

Examples:

· behind a side drawer
· beneath a navigation rail
· through a narrow page gap
· underneath a large card
· behind a hero
· inside an empty state
· along a page edge
· within a large background surface
· behind translucent panels

The effect should sometimes make the user think: "Was that always there?"

The effect must never interfere with usability.

No-Go Zones

Living material is prohibited in these surfaces. No motion of any kind:

· data tables
· financial summaries
· metric displays
· charts
· search results and command palette
· active forms
· input containers
· numerical data entry
· invoice previews
· document editing surfaces
· calculation displays
· consequential confirmation dialogs
· notifications
· error states
· Steward conversation surfaces

The visual identity must remain intact without any living material.

---

21. Living Material Levels

The system defines three levels. Each level has a precise rarity.

Level 1 — Whisper

Almost invisible. Atmosphere at the edge of perception.

· Purpose: establish atmosphere continuously.
· Opacity: 0.04–0.10.
· Motion amplitude: up to 4px.
· Duration: any; continuous.
· Frequency: present on most atmospheric surfaces; may be constant.
· Examples: subtle shimmer, tiny current, faint movement.

Level 2 — Presence

Clearly visible but subordinate.

· Purpose: mark an important but non-critical surface.
· Opacity: 0.12–0.22.
· Motion amplitude: up to 12px.
· Duration: 6–16s per pass, non-looping.
· Frequency: at most one active presence stream per viewport; select surfaces only.
· Examples: gold stream, crimson current, visible pool, animated drawer edge.

Level 3 — Event

A major visual moment.

· Purpose: mark a significant achievement or workflow completion.
· Opacity: 0.20–0.35.
· Motion amplitude: up to 24px, or a single large-area pass.
· Duration: 6–16s, one pass, then settles.
· Frequency: at most one Event per user session; trigger only on meaningful user achievements (financial milestone, significant workflow completion, a dedicated Steward moment). Not on routine actions.

The rarer the effect, the more powerful it becomes.

---

22. Living Material Layering & Motion

Layer Order

1. Application background
2. Living material
3. Atmospheric glow/reflection
4. UI surfaces
5. Content
6. Interactive controls

Animated material must never reduce text readability.

Motion Parameters

· Major flow: 12–30s
· Small flow: 6–16s
· UI response: 200–350ms
· Theme transition: 300ms

Use organic easing.

Avoid linear movement.

Avoid synchronized loops.

Prefer GPU-friendly transforms and opacity only (no layout-thrashing properties).

---

23. Motion System

Normal interface motion should be subtle.

Fast — 120–180ms

For: hover, focus, icon changes.

Standard — 200–350ms

For: drawers, menus, cards, theme changes.

Slow — 400–700ms

For: major state transitions, page-level atmospheric changes.

Avoid animation for animation's sake.

Theme Transition

Theme transitions should feel like the environment changing.

· Light: white + gold + restrained crimson.
· Dark: black + crimson + restrained gold.

Use approximately 300ms transitions for background, surfaces, borders, text, and controls.

The living material may continue moving during the transition.

---

24. Reduced Motion

When reduced motion is enabled:

```css
@media (prefers-reduced-motion: reduce) {
  /* Remove continuous living motion. */
}
```

Replace animation with:

· static gradients
· static material shapes
· subtle opacity transitions
· minimal non-looping effects

The visual identity must remain intact without motion.

Any animation triggered by interaction must have a reduced-motion equivalent that removes the animation and keeps the state change visible.

---

25. Accessibility — WCAG 2.2 AA

Divine Blood must meet WCAG 2.2 Level AA in both visual modes.

Contrast (1.4.3, 1.4.11)

· Normal text: at least 4.5:1.
· Large text (24px+, or 18.66px+ bold): at least 3:1.
· Non-text UI components and graphics: at least 3:1.

Use the verified token table in Section 4. Apply the contrast rules listed there.

Focus Visible (2.4.7, 2.4.11)

· Every interactive element has a visible focus indicator.
· Indicator is at least 2px thick, offset at least 2px from the element.
· Light: --db-gold-700 (or an updated --db-focus that meets 3:1).
· Dark: --db-focus (#FBBF24).
· Focused elements must not be fully obscured by sticky headers or overlays. Use appropriate scroll margin for anchors.

Keyboard (2.1.1, 2.1.2, 2.4.3)

· All functionality is keyboard-operable.
· No keyboard traps.
· Focus order follows visual order.
· Skip link to main content.

Target Size (2.5.8)

· Interactive targets at least 24 × 24px.
· On coarse pointers, target at least 44 × 44px.

Text Scaling, Spacing, Reflow (1.4.4, 1.4.10, 1.4.12)

· Content remains usable at 200% zoom without loss of function.
· Content reflows without horizontal scrolling at 320px width.
· Text spacing overrides (letter-spacing, word-spacing, line-height, paragraph spacing) do not break content.

Not by Color Alone (1.4.1)

· Never use gold, crimson, or green alone to communicate meaning.
· Status always includes icon + text.

Motion (2.3.3)

· Animation from interaction can be disabled via the reduced-motion setting (Section 24).

Forms & Errors (3.3.1, 3.3.2, 3.3.3)

· Every input has a programmatically associated label.
· Errors are identified with text, an icon, and aria-invalid; the first error receives focus on submit.
· Error messages are announced (live region).

Understanding & Robustness

· Logical heading hierarchy and semantic HTML.
· Screen-reader labels for icon-only controls.
· Consistent help placement (Section 18).
· Content does not force redundant re-entry of information already provided in the session.
· Authentication does not rely solely on cognitive function tests; provide a password manager, copy-paste, or alternative sign-in path.

---

26. Focus

Focus must be visually obvious.

· Light: gold focus ring (--db-gold-700 or an updated --db-focus token meeting 3:1 against white).
· Dark: bright gold focus ring (--db-focus, #FBBF24).

Focus indicators must remain visible against both surfaces and borders.

Do not remove browser focus indicators without replacing them with a stronger equivalent.

---

27. Loading, Empty, Error States

Loading

Loading states should remain quiet.

Preferred:

· subtle shimmer
· controlled opacity
· skeleton surfaces
· restrained gold activity indicator

Avoid aggressive pulsing.

Steward may use a subtle breathing indicator while processing.

Empty States

Empty states provide an opportunity for subtle atmosphere.

Possible:

· static liquid gold
· small crimson current (Whisper level)
· Steward avatar
· minimal illustration
· restrained environmental motion

Do not fill empty states with excessive decoration.

Error States

Errors use crimson.

They must include:

· clear text
· icon
· actionable recovery where possible

Avoid dramatic animations.

The visual system should communicate: important, not frightening.

---

28. Content & Atmosphere

Imagery

Imagery should be editorial and premium.

Preferred:

· natural human photography
· architectural photography
· materials
· paper
· books
· financial objects
· subtle environmental imagery

Avoid:

· generic corporate stock photography
· neon cyberpunk imagery
· fantasy game art
· excessive gold imagery
· excessive crimson imagery

The living material may be layered into imagery where appropriate.

Editorial Character

Divine Blood should occasionally feel like a well-kept private archive.

Useful visual references include:

· financial ledgers
· old books
· correspondence
· private libraries
· archival documents
· refined stationery
· dark wood
· paper
· metal
· glass
· ink

These references should influence atmosphere, not become literal decoration everywhere.

Negative Space

Negative space is an active part of the design.

Do not fill every available area.

Large empty regions can be used for:

· breathing room
· visual hierarchy
· living material
· editorial atmosphere
· focus

The interface should feel expensive partly because it is not overcrowded.

---

29. Density

The shell is comfortable.

Financial data may be compact.

Therefore:

Area Density
Outer shell comfortable
Cards comfortable
Tables compact but readable
Financial records information-dense
Navigation compact

Density should increase inside data structures rather than across the entire application.

Row height in tables: 40–44px on desktop, 48px+ on touch.

---

30. Responsive Architecture

Breakpoints

Range Behavior
0–639px Mobile
640–1023px Tablet
1024–1439px Desktop
1440px+ Wide Desktop

Mobile

· edge-to-edge application
· no visible external frame
· single-column content
· bottom navigation
· sticky top bar
· compact hero
· horizontally scrollable KPI groups where necessary
· bottom sheets for secondary information
· Steward FAB
· minimum 44px touch targets

Tablet

· small application inset
· collapsible sidebar
· 1–2 content columns
· narrower secondary rails
· tablet spacing
· touch-aware controls

Desktop

· visible application frame
· full sidebar
· two or three content regions
· optional right rail
· full type scale
· larger negative space

Wide Desktop

Increase breathing room without allowing content to become excessively wide.

Use maximum content widths where appropriate.

Fold Devices

Foldable devices are treated according to available space rather than as a separate visual brand.

· Cover: treat as compact mobile.
· Inner portrait: treat as compact tablet.
· Inner landscape: treat as compact desktop.

Fold geometry must be respected. Content must not place important interactive elements across a hinge or unusable display region.

Flip Devices

Flip cover displays use the mobile system.

When expanded:

· portrait follows tablet/mobile rules
· landscape follows compact desktop rules where width permits

The layout must adapt continuously where possible.

Do not depend only on device names. Viewport geometry is the source of truth.

Safe Areas

Support:

· env(safe-area-inset-top)
· env(safe-area-inset-right)
· env(safe-area-inset-bottom)
· env(safe-area-inset-left)

Safe-area handling is required for:

· bottom navigation
· FABs
· full-screen drawers
· sticky headers
· modal surfaces
· edge-to-edge layouts

Touch

Coarse pointer targets should be at least 44 × 44px. Preferred: 44–48px.

Do not rely on hover-only interaction. Every hover interaction must have an equivalent touch/focus state.

Responsive Content Rules

Content should transform, not merely shrink.

· Desktop: Sidebar + Main + Right rail.
· Tablet: Collapsible navigation + Main + optional secondary panel.
· Mobile: Top bar + Main + Bottom navigation + Bottom sheets.
· Fold: Cover → mobile, inner portrait → tablet, inner landscape → desktop-like.

---

31. Print

When the application or a document is printed:

· Force the Light palette. Use white backgrounds and ink/black text.
· Remove living material and all animation.
· Remove interactive states (hover, focus, pressed).
· Print tables with full borders and full values; do not truncate.
· Numeric columns stay aligned (tabular figures).
· Use color-adjust: exact where brand color in charts must survive.
· Maximum content width applies to print layout.
· Include document headers/footers with identifiers and page numbers where applicable.

---

32. Localization

· Support right-to-left (RTL) layouts. Do not hardcode left/right alignment.
· Use text-transform for uppercase micro labels, not stored uppercase strings.
· Do not truncate by fixed character count; text length varies by locale.
· Numeric and currency formats follow the locale, using tabular figures.
· Keep type scale and density rules; allow text to expand without clipping.
· Micro labels and identifiers must not overflow their containers in translated text.

---

33. Do

· Keep Light predominantly Gold (38%) and White (62%).
· Use solid gold blocks, heroes, and panels as primary structural elements in Light mode.
· Keep Dark predominantly black and crimson.
· Allow controlled cross-color usage.
· Use Instrument Sans for human UI.
· Use JetBrains Mono for data.
· Make Steward calm and capable.
· Use the Steward eyepatch as a recognizable signature.
· Use blood and gold as rare living material.
· Respect the living-material no-go zones.
· Preserve large areas of negative space.
· Use hairline borders.
· Support Mobile, Tablet, Desktop, Fold, and Flip.
· Respect safe areas.
· Support reduced motion.
· Keep financial data highly readable.
· Make unusual elements discoverable rather than obvious.
· Meet WCAG 2.2 AA in both modes.

34. Do Not

· Do not use cream, beige, or warm off-whites anywhere.
· Do not use crimson-tinted borders in Dark mode.
· Do not create more than two visual modes.
· Do not create separate Gold Light and Crimson Dark themes.
· Do not create a rainbow theme system.
· Do not use blue as the brand accent.
· Do not make Light predominantly crimson.
· Do not make Dark predominantly gold.
· Do not use pure black for every Dark surface.
· Do not use pure white cards throughout Dark mode.
· Do not use excessive gradients.
· Do not use cursive typography.
· Do not use Arabic-style decorative typography.
· Do not use generic AI robot imagery for Steward.
· Do not make Steward look like a pirate.
· Do not use gore or blood splatter.
· Do not animate every component.
· Do not place living material in the no-go zones.
· Do not sacrifice readability for atmosphere.
· Do not use color alone to communicate meaning.
· Do not rely on hover for essential functionality.
· Do not force desktop layouts onto mobile.

---

35. Core Design Equation

Divine Blood can be summarized as:

```
LIGHT
Gold (38% - Identity)
+
White (62% - Canvas)
+
A Trace of Crimson (Risk)

DARK
Black (70% - Void)
+
Crimson (25% - Identity)
+
A Trace of Gold (5% - Premium)

-----------
Rules:
- No mixing. No cream. No warm greys.
- Gold and Crimson stand alone, never blended into surfaces or borders.
- Borders are silent, neutral structural lines.
- The user sees the accent, never the dilution.
```

Combined with:

```
Instrument Sans
+
JetBrains Mono
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

36. Final Brand Principle

Divine Blood should not look like a fantasy interface.

It should look like a serious, premium business application that happens to contain something ancient and alive beneath its surfaces.

The user should trust it first.

Then notice its personality.

Then discover its mysteries.

---

37. Design Source of Truth

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

38. Design Review Checklist

Use this checklist when reviewing any screen or component against Divine Blood.

Identity and Mode

☐ The dominant identity of the mode is obvious (gold/white in Light, black/crimson in Dark).
☐ Light mode achieves roughly 38% Gold visual presence.
☐ No fantasy, gothic, vampire, or gaming aesthetic leaks into the surface.
☐ The interface looks premium and serious, not generic SaaS and not theatrical.
☐ Not more than two modes exist.

Color and Contrast

☐ Normal text meets 4.5:1; large text and non-text meet 3:1.
☐ No ink-faint used for normal body text.
☐ No light-mode success token used for normal text without icon + text.
☐ Focus indicator is visible (2px, offset) and passes 3:1 in the mode.
☐ Status is never communicated by color alone.
☐ No cream, beige, or warm off-white anywhere.

Typography

☐ Instrument Sans only for human UI.
☐ JetBrains Mono only for data, metrics, identifiers, and micro labels.
☐ JetBrains Mono not used for long paragraphs.
☐ Micro labels use text-transform, not stored uppercase.

Components and Data

☐ shadcn/ui primitives used; no hand-built replacements for covered components.
☐ Tables: tabular figures, aligned numerics, no living material.
☐ Dashboards: KPI alignment, functional charts, breathing room. Gold hero section present.
☐ Search: keyboard-first, gold highlight not color alone, no living material in results.
☐ Navigation has all four states (rest, hover, active, focus) and aria-current.

Living Material

☐ Whisper / Presence / Event rarity respected (Level 3 at most once per session).
☐ No living material in any no-go zone.
☐ Reduced-motion path keeps identity intact without motion.

Accessibility and Response

☐ Keyboard operable, logical focus order, visible focus.
☐ 44px touch targets on coarse pointers.
☐ Content usable at 200% zoom and reflows at 320px.
☐ Errors include text + icon + actionable recovery.
☐ Safe areas respected on mobile surfaces.

---

39. Pre-Implementation Verification

Before implementation begins, confirm these decisions:

1. Instrument Sans and JetBrains Mono are both open-source (SIL OFL) – no license concerns.
2. Light --db-focus uses --db-gold-700 (#B45309) to meet 3:1 on white.
3. Dark --db-focus uses #FBBF24 to meet 3:1 on black.
4. Light --db-success usage rule: normal text paired with icon + text, or a darker success token.
5. Final product name, separate from the Divine Blood codename.
6. shadcn/ui registry and installed component set (see Section 13).
7. Audit that no form, input, or table in dark mode uses a crimson-tinted border.

---

The interface is rational. The environment is occasionally irrational.

```