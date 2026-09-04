# BIGDROPS Design System — Visual Language & Theme Contract

> Status: Authoritative
> Last updated: 2026-08-29
> Default reference: `Design-direction/dashboard/mobile-dashboard-v6.html` (light)
> Dark reference: `Design-direction/reference/liquid-onyx.html` (dark)
> Governs: All future frontend screens and components in the BIGDROPS ERP

---

## 0. Purpose

This document is the design contract for the BIGDROPS ERP frontend. It defines the visual language, the design token architecture, the relationship between the base design system and themes, and the boundaries that prevent themes from becoming independent design systems.

A downstream frontend agent must be able to design a new BIGDROPS screen using only this document and the referenced PRDs. The agent must not invent a separate visual language.

This document does not prescribe implementation syntax. It defines visual rules. The rules remain useful even if the implementation mechanism changes.

---

## 1. Implementation Boundary

### What This Document Controls

- Visual language
- Theme rules
- Design token architecture
- Component visual rules
- Responsive visual rules
- Theme power boundaries

### What This Document Does NOT Control

- Database architecture
- Tenant resolution
- Authorization
- Business logic
- Routing architecture
- Backend APIs
- Application state management
- Component implementation details

---

## 2. Visual Identity

### Design Philosophy

BIGDROPS is a premium business management application for Nigerian SMEs. It handles invoices, quotations, waybills, CSR, BOQ, RFQ, and letters. The visual language communicates professionalism and trust.

The application must feel worth the subscription. It must not feel like a consumer social app or a generic admin template.

### Product Personality

| Trait | Expression |
|-------|-----------|
| Professional | Restrained colour, authoritative typography, consistent rhythm |
| Operational | Dense but readable information, one primary action per screen |
| Mobile-native | Touch-first, bottom navigation, bottom sheets, safe-area respect |
| Trustworthy | Stable hierarchy, predictable interactions, no decorative noise |

### What Makes BIGDROPS Recognisable

1. **Slate-navy palette**: Cool blue-gray backgrounds with dark navy primary accents
2. **Manrope + DM Mono**: Humanist sans-serif for UI, monospace for financial figures
3. **Compact density**: Small type sizes (7–17px), tight spacing (2–14px), high information per screen
4. **Primary-tinted shadows**: Shadows carry a hint of the primary colour, not pure black
5. **Gradient identity**: A 135-degree primary-to-secondary gradient on active tabs, FAB, brand mark, and key CTAs
6. **Grain texture**: A subtle SVG noise overlay (opacity 0.035) on the app shell
7. **18px card radius**: Consistent rounded card surfaces across the product
8. **Bottom sheet overlays**: Selection and action surfaces slide from the bottom, not modals

### Visual Hierarchy Principles

- Primary data or action is largest and boldest
- Secondary information is smaller and muted
- Tertiary details are visible but not prominent
- Colour signals status, not decoration
- Whitespace separates logical groups
- Progressive disclosure: summary first, detail on demand

### Density Philosophy

BIGDROPS uses compact density. Business users need to see data without excessive scrolling. "Premium" styling must not produce whitespace that reduces operational efficiency.

- Type sizes range from 6px (status badges) to 17px (metric values, sheet titles)
- Spacing ranges from 2px (micro gaps) to 14px (page margins, section spacing)
- Cards hold multiple data points, not one isolated metric

---

## 3. Colour System — Semantic Architecture

### Principle

Colours are semantic. Each colour has a purpose, not just a value. A downstream agent must understand why a colour is used, not merely what the hex code is.

### Semantic Colour Roles

| Role | Purpose | Light Token | Dark Token |
|------|---------|-------------|------------|
| Application background | Page canvas behind all content | `--bg` | `--bg` |
| Elevated surface | Cards, sheets, dialogs | `--surface` | `--surface` |
| Raised surface | Subtle elevation inside cards | `--surface-raised` | `--surface-raised` |
| Muted surface | Inactive states, backgrounds for controls | `--surface-muted` | `--surface-muted` |
| Strong surface | Grab handles, strong dividers | `--surface-strong` | `--surface-strong` |
| Primary text | Body text, headings, primary information | `--ink` | `--ink` |
| Muted UI text | One standardized UI text tone layer used by a recent facelift pass for consistent text/icon color across a subset of surfaces | `--bd-ink-muted` (implementation bridge) | `--bd-ink-muted` (implementation bridge) |
| Secondary text | Supporting text, descriptions | `--ink-2` | `--ink-2` |
| Tertiary text | Labels, metadata, timestamps | `--ink-3` | `--ink-3` |
| Primary accent | Brand colour, active states, key CTAs | `--primary` | `--primary` |
| Bright primary | Hover/highlight on primary | `--primary-bright` | `--primary-bright` |
| Soft primary | Background tint for primary elements | `--primary-soft` | `--primary-soft` |
| Secondary accent | Supporting accent, copper tones | `--secondary` | `--secondary` |
| Bright secondary | Hover/highlight on secondary | `--secondary-bright` | `--secondary-bright` |
| Soft secondary | Background tint for secondary elements | `--secondary-soft` | `--secondary-soft` |
| Attention / danger | Errors, overdue, destructive actions | `--attention` | `--attention` |
| Soft attention | Background tint for danger states | `--attention-soft` | `--attention-soft` |
| Sage | Neutral accent, waybill icon colour | `--sage` | `--sage` |
| Soft sage | Background tint for sage elements | `--sage-soft` | `--sage-soft` |
| Subtle border | Card borders, dividers | `--line` | `--line` |
| Strong border | Nav border, emphasis dividers | `--line-strong` | `--line-strong` |
| Nav background | Bottom navigation bar | `--nav` | `--nav` |

### Status Colours

| Status | Semantic Meaning | Usage |
|--------|-----------------|-------|
| Success | Positive trend, completed, paid | Trend arrows, success badges |
| Warning | Pending, approaching deadline | Pending status badges |
| Danger | Overdue, error, destructive | Overdue metrics, error states |
| Info | Informational, update | Update notifications |

Status colours are derived from the accent palette. They do not introduce new hue families. Success uses green (`#16a34a` light / `#4ad890` dark). Warning uses the secondary/amber range. Danger uses `--attention`. Info uses `--primary-bright`.

### State Colours

| State | Visual Treatment |
|-------|-----------------|
| Default | `--surface` background, `--ink` text |
| Hover | `--surface-raised` or `--bg` background |
| Active / pressed | `scale(0.965)` + `--surface-muted` background |
| Selected | `--primary-soft` background, `--primary` text, check icon |
| Focus | `2px solid var(--primary)`, `outline-offset: 2px` |
| Disabled | `opacity: 0.35–0.4`, `cursor: not-allowed` |
| Loading | `aria-busy="true"`, shimmer or spinner |

---

## 4. Light Theme — Default BIGDROPS Expression

### Source

The light theme derives from `Design-direction/dashboard/mobile-dashboard-v6.html`. This file is the primary default visual reference for BIGDROPS. Future screens must default to this visual language unless a documented theme or product requirement says otherwise.

### Background Hierarchy

| Level | Token | Value | Purpose |
|-------|-------|-------|---------|
| 0 | Body | Radial gradient mixing `--secondary` and `--primary` into white | Ambient page background |
| 1 | `--bg` | `#f0f4f8` | App canvas (cool gray-blue) |
| 2 | `--surface` | `#ffffff` | Cards, sheets, drawer |
| 3 | `--surface-raised` | `#f8fafc` | Top bar buttons, alert items |
| 4 | `--surface-muted` | `#e2e8f0` | Search box, close button, inactive controls |
| 5 | `--surface-strong` | `#cbd5e1` | Grab handles, strong dividers |

The body uses a radial gradient that mixes the secondary and primary colours into white. The app canvas (`--bg`) sits on top as a solid cool gray-blue. Cards (`--surface`) are pure white. This creates a three-level depth: ambient background → app canvas → white card.

### Surface Treatment

- Cards: `1px solid var(--line)` border, `--surface` background, `--shadow` box-shadow, 18px radius
- Sheets: `--surface` background, `0 -16px 40px rgba(0,0,0,.24)` shadow, 24px top radius
- Drawer: `--surface` background, `--shadow-float` shadow, 24px right radius
- Top bar: `linear-gradient(180deg, var(--bg) 72%, transparent)` — fades into content

### Border Treatment

- Card borders: `1px solid var(--line)` (`rgba(15,23,42,.07)`)
- Nav border: `1px solid var(--line-strong)` (`rgba(15,23,42,.14)`)
- Row dividers: `1px solid var(--line)`
- No borders on interactive elements (use background change for states)

### Text Hierarchy

| Level | Token | Value | Usage |
|-------|-------|-------|-------|
| Primary | `--ink` | `#0f172a` | Body text, headings, metric values |
| Secondary | `--ink-2` | `#475569` | Activity metadata, alert body, descriptions |
| Tertiary | `--ink-3` | `#94a3b8` | Labels, section titles, timestamps, chevrons |

### Accent Treatment

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#1e3a5f` (dark navy) | Active tab text, primary CTAs, invoice icons, focus ring |
| `--primary-bright` | `#3b82f6` | Bright variant for highlights |
| `--primary-soft` | 14% transparent primary | Active drawer row background, icon backgrounds |
| `--secondary` | `#0f172a` | Gradient endpoint, secondary accents |
| `--secondary-bright` | `#64748b` | FAB pulse ring |
| `--secondary-soft` | 13% transparent secondary | Quotation icon backgrounds |

### Gradient

```
--gradient: linear-gradient(135deg, var(--primary), var(--secondary))
```

Used on: active tab background, FAB, brand mark, reminder icon, primary-sm button, AI button, collect metric card. See §9 for full gradient rules.

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow` | `0 12px 28px color-mix(in srgb, var(--primary) 8%, transparent), 0 2px 6px rgba(15,23,42,.04)` | Cards, standard surfaces |
| `--shadow-float` | `0 18px 40px color-mix(in srgb, var(--primary) 18%, transparent), 0 3px 9px rgba(15,23,42,.07)` | Bottom nav, FAB, drawer |

Shadows are primary-tinted, not pure black. This is a signature BIGDROPS visual trait.

### Selected States

- Selected row: `--primary-soft` background, `--primary` text, check icon
- Active drawer row: `--primary` text, `--primary-soft` background
- Active tab: `--gradient` background, white text, `0 5px 12px color-mix(in srgb, var(--primary) 35%, transparent)` shadow

### Form Controls

- Input background: `--surface-muted` (search box) or `--surface-raised` (top bar buttons)
- Input border: `1px solid var(--line-strong)` or transparent
- Focus: `2px solid var(--primary)`, `outline-offset: 2px`
- Error: `--attention` border, `--attention-soft` background tint

---

## 5. Dark Theme — Approved Alternate Expression

### Source

The dark theme derives from `Design-direction/reference/liquid-onyx.html`. The dark theme is a visual skin of the same BIGDROPS product. It must remain recognisably the same application. Only the visual treatment changes.

### Identity Preservation Requirements

The dark theme must preserve:
- BIGDROPS identity (same layout, same component structure)
- Semantic colour meaning (success is still green, danger is still red)
- Hierarchy (primary text > secondary text > tertiary text)
- Density (same compact spacing, same type scale)
- Component structure (same radii, same geometry)
- Interaction behaviour (same ripple, same sheet, same back stack)
- Accessibility (WCAG AA minimum, AAA where possible)

### Background Hierarchy

| Level | Token | Value | Purpose |
|-------|-------|-------|---------|
| 0 | Body void | `#020204` | Pure black void behind app |
| 1 | `--bg` | `#0f172a` | App canvas (deep navy) |
| 2 | `--surface` | `#1e293b` | Cards, sheets, drawer |
| 3 | `--surface-raised` | `#253448` | Elevated surfaces inside cards |
| 4 | `--surface-muted` | `#334155` | Inactive controls, close buttons |
| 5 | `--surface-strong` | `#475569` | Grab handles, strong dividers |

The dark body uses a radial gradient mixing secondary and primary into near-black. This creates ambient depth without flat black.

### Contrast Strategy

Dark mode uses surface contrast instead of shadow contrast. The difference between `--bg` (`#0f172a`) and `--surface` (`#1e293b`) provides card separation. Borders are lighter (`rgba(241,245,249,.08)`) to remain visible against dark surfaces.

| Pair | Ratio | Level |
|------|-------|-------|
| Ink on surface | ~11:1 | AAA |
| Primary on surface | ~8:1 | AAA |

### Border Treatment

- Card borders: `1px solid var(--line)` (`rgba(241,245,249,.08)`)
- Nav border: `1px solid var(--line-strong)` (`rgba(241,245,249,.15)`)
- Borders are lighter in dark mode to remain visible

### Text Hierarchy

| Level | Token | Value | Usage |
|-------|-------|-------|-------|
| Primary | `--ink` | `#f1f5f9` | Body text, headings |
| Secondary | `--ink-2` | `#cbd5e1` | Descriptions, metadata |
| Tertiary | `--ink-3` | `#64748b` | Labels, timestamps |

### Accent Treatment

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#60a5fa` (bright blue) | Active states, focus ring, CTAs |
| `--primary-bright` | `#93c5fd` | Bright variant |
| `--primary-soft` | 20% transparent primary | Active backgrounds, icon backgrounds |
| `--secondary` | `#94a3b8` | Gradient endpoint |
| `--secondary-bright` | `#cbd5e1` | Bright variant |
| `--secondary-soft` | 18% transparent secondary | Secondary icon backgrounds |

The dark theme inverts the primary accent from dark navy (`#1e3a5f`) to bright blue (`#60a5fa`) to maintain contrast against dark surfaces.

### Gradient

```
--gradient: linear-gradient(135deg, var(--primary), var(--secondary))
```

The gradient structure is identical. Only the colour values change. This preserves the gradient identity across themes.

### Shadows and Glows

Dark mode shadows use pure black with higher opacity:

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow` | `0 12px 28px rgba(0,0,0,.38), 0 2px 6px rgba(0,0,0,.26)` | Cards, standard surfaces |
| `--shadow-float` | `0 18px 44px rgba(0,0,0,.52), 0 3px 10px rgba(0,0,0,.34)` | Bottom nav, FAB, drawer |

The liquid-onyx reference also introduces a subtle glow on gradient elements: `0 0 24px rgba(192,192,208,0.08)`. This glow replaces the primary-tinted shadow as the depth cue. It is optional — the canonical dark mode (v6 `[data-theme="dark"]`) uses pure black shadows without glow.

### Selected States

Identical to light theme in structure. Only colour values change:
- Selected row: `--primary-soft` background, `--primary` text, check icon
- Active drawer row: `--primary` text, `--primary-soft` background
- Active tab: `--gradient` background, `--ink` text (inverted), `0 5px 12px color-mix(in srgb, var(--primary) 35%, transparent)` shadow

### Controls

- Input background: `--surface-muted` or darker elevated surface
- Input border: `1px solid var(--line-strong)`
- Focus: `2px solid var(--primary)`, `outline-offset: 2px`
- Error: `--attention` border, `--attention-soft` background tint

---

## 6. Design Token Architecture

### Three Token Layers

| Layer | Purpose | Theme-Variant? | Example |
|-------|---------|---------------|---------|
| Foundation | Raw values that never change between themes | No | `--font: Manrope...`, `--space-md: 8px`, `18px` radius |
| Semantic | Meaningful names that map to foundation values | Colour: Yes. Structure: No | `--bg`, `--surface`, `--ink`, `--primary` |
| Component | Component-level usage rules referencing semantic tokens | No (rules, not values) | "Card border = `1px solid var(--line)`" |

### Foundation Tokens (Theme-Invariant)

These tokens do NOT change between themes. They are defined in `03-design-system.md` and remain stable.

#### Typography Foundation

| Token | Value |
|-------|-------|
| `--font` | `Manrope, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif` |
| `--number` | `"DM Mono", ui-monospace, SFMono-Regular, Menlo, monospace` |

#### Spacing Foundation

| Token | Value |
|-------|-------|
| `--space-xxs` | 2px |
| `--space-xs` | 4px |
| `--space-sm` | 6px |
| `--space-md` | 8px |
| `--space-lg` | 10px |
| `--space-xl` | 12px |
| `--space-xxl` | 14px |

#### Radius Foundation

| Context | Value |
|---------|-------|
| App shell (phone frame) | 40px |
| Bottom sheet | 24px |
| Drawer (right edge) | 0 24px 24px 0 |
| Cards | 18px |
| Alert items | 16px |
| Bottom nav bar | 20px |
| FAB | 18px |
| Top bar buttons | 12px |
| Activity icons | 11px |
| Sheet action icons | 12px |
| Status badges | 5px |
| Bottom nav tabs (active) | 15px |
| Search box | 13px |
| Toast | 12px |
| Buttons (primary-sm) | 10px |
| Dismiss button | 50% |

#### Elevation Foundation

| Token | Light Value | Dark Value |
|-------|-------------|------------|
| `--shadow` | Primary-tinted, low opacity | Pure black, higher opacity |
| `--shadow-float` | Primary-tinted, medium opacity | Pure black, high opacity |

The shadow structure (two-layer: spread + tight) is invariant. Only the colour values change.

#### Motion Foundation

| Transition | Duration | Easing |
|------------|----------|--------|
| Page enter | 0.2s | ease-out |
| Sheet open/close | 0.3s | cubic-bezier(.2,.9,.24,1) |
| Drawer open/close | 0.3s | cubic-bezier(.2,.9,.24,1) |
| Search overlay | 0.24s | cubic-bezier(.2,.9,.24,1) |
| Theme toggle | 0.34s | ease |
| Background transition | 0.36s | ease |
| Button press | scale(0.965) | — |

All motion respects `prefers-reduced-motion: reduce`.

### Semantic Tokens (Colour — Theme-Variant)

These tokens change between light and dark. See §3 for the full table.

### Component-Level Usage Rules

These are rules, not tokens. They reference semantic tokens. They do not change between themes.

| Component | Rule |
|-----------|------|
| Card | `1px solid var(--line)`, `var(--surface)` bg, `var(--shadow)`, 18px radius |
| Implementation bridge tokens from a recent facelift pass | `--bd-ink`, `--bd-ink-muted`, `--bd-ink-icon` were introduced in `src/index.css` for UI text and icon color across a subset of surfaces. These are coverage artifacts, not new design authority. | No | No |
| Sheet | `var(--surface)` bg, `0 -16px 40px rgba(0,0,0,.24)` shadow, 24px top radius |
| Drawer | `var(--surface)` bg, `var(--shadow-float)`, `0 24px 24px 0` radius |
| Active tab | `var(--gradient)` bg, white/ink text, `0 5px 12px` primary shadow |
| Status badge | 5px radius, 6px font, `var(--secondary-soft)` bg, `var(--secondary)` text |
| Divider | `1px solid var(--line)` |
| Focus | `2px solid var(--primary)`, `outline-offset: 2px` |

---

## 7. Typography

### Font Families

| Token | Value | Usage |
|-------|-------|-------|
| `--font` | Manrope | Body text, UI labels, headings |
| `--number` | DM Mono | Financial figures, document numbers, code |

### Type Scale

| Element | Size | Weight | Line Height | Letter Spacing | Usage |
|---------|------|--------|-------------|----------------|-------|
| Workspace label | 7px | 800 | 1.2 | 0.075em uppercase | Top bar workspace name |
| Section title | 9px | 800 | 1.2 | 0.105em uppercase | Section headers |
| Eyebrow | 8px | 800 | 1.2 | 0.11em uppercase | Dashboard eyebrow |
| Metric label | 8px | 800 | 1.2 | 0.07em uppercase | KPI card labels |
| Meta text | 8px | 500 | 1.3 | normal | Activity meta, dates |
| Body small | 9px | 700 | 1.4 | normal | Reminder body, alert body |
| Status badge | 6px | 800 | 1 | 0.07em uppercase | Status pills |
| Tab label | 7px | 800 | 1 | normal | Bottom nav labels |
| Activity primary | 11px | 800 | 1.2 | -0.025em | Document numbers |
| Owner name | 13px | 800 | 1.2 | -0.045em | Top bar owner name |
| Metric value | 17px | 500 | 1.2 | -0.075em | KPI numbers (monospace) |
| Sheet title | 17px | 800 | 1.2 | -0.05em | Bottom sheet headings |
| Empty state title | 16px | 800 | — | -0.05em | Empty state headings |
| Alert name | 10px | 800 | 1.25 | normal | Alert item names |
| Alert body | 8px | — | 1.4 | normal | Alert descriptions |
| Audit main | 9px | 700 | 1.25 | normal | Audit trail text |
| Reminder title | 12px | 800 | — | -0.04em | Reminder headings |
| Button text (sm) | 8px | 800 | — | 0.065em uppercase | Primary-sm buttons |

### Typography Rules

- Financial numbers always use `--number` (monospace)
- Uppercase text uses `letter-spacing: 0.07em – 0.11em`
- Negative letter-spacing on large display numbers (-0.045em to -0.075em)
- Weight 800 for labels and emphasis, 500–700 for body
- No font size below 6px in production
- Truncation: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` for names, document numbers, metadata

### Numerical Data

Financial figures use `--number` (DM Mono) at 17px, weight 500, letter-spacing -0.075em. This makes financial data scannable in columns. Document numbers in activity rows use `--number` at 10px, weight 500, letter-spacing -0.045em.

---

## 8. Spacing and Density

### Spacing Philosophy

BIGDROPS uses compact density. The spacing scale is tight (2–14px). This allows more information per screen without feeling cluttered. Whitespace separates logical groups; it does not fill screens with emptiness.

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xxs` | 2px | Micro gaps (icon to text) |
| `--space-xs` | 4px | Tight gaps (tab items, badge padding) |
| `--space-sm` | 6px | Small gaps (button padding, action rows) |
| `--space-md` | 8px | Standard gaps (card padding, grid gaps) |
| `--space-lg` | 10px | Content padding (inside cards) |
| `--space-xl` | 12px | Section spacing (between sections) |
| `--space-xxl` | 14px | Page margins (horizontal padding) |

### Application

| Context | Value |
|---------|-------|
| Page horizontal padding | 14px |
| Section vertical spacing | 14px |
| Card internal padding | 10–12px |
| Grid gaps | 8px |
| Between section title and content | 8px |
| Row spacing | 9px padding, 1px border between rows |
| Form field spacing | 12px between groups |
| Drawer padding | 14px head, 8px list, 14px foot |
| Sheet padding | 8px 13px + safe-area-inset-bottom |

### Mobile vs Desktop Density

Density increases by showing more content, not by making content smaller. Font sizes and touch targets remain consistent across breakpoints.

| Tier | Density | What Changes |
|------|---------|-------------|
| Phone | Standard | Single column, one view per screen |
| Foldable | Medium | Wider content, optional side-by-side |
| Tablet | High | Multi-column, more rows visible |
| Desktop | Maximum | Full tables, multi-panel, no scrolling for standard views |

---

## 9. Shape Language

### Radius Hierarchy

The radius scale creates a visual relationship: larger surfaces have larger radii, smaller controls have smaller radii. This is not a collection of unrelated values.

| Surface Type | Radius | Relationship |
|--------------|--------|-------------|
| App shell (phone frame) | 40px | Largest — contains everything |
| Bottom sheet | 24px | Large overlay |
| Drawer | 0 24px 24px 0 | Large overlay (right edge only) |
| Bottom nav bar | 20px | Prominent floating element |
| Cards | 18px | Standard content surface |
| Alert items | 16px | Slightly smaller content surface |
| FAB | 18px | Matches cards |
| Top bar buttons | 12px | Controls |
| Sheet action icons | 12px | Icon containers |
| Activity icons | 11px | Smaller icon containers |
| Active tab | 15px | Between nav bar and buttons |
| Search box | 13px | Input control |
| Primary-sm button | 10px | Small CTA |
| Status badge | 5px | Minimal — status is information, not shape |
| Dismiss button | 50% | Circle — dismiss is a special action |

### Shape Rules

- Rounded surfaces (cards, sheets) hold content
- Smaller radii (10–13px) on controls and inputs
- Minimal radius (5px) on status badges — status is text, not a shape
- Circles (50%) only on dismiss, avatars, and decorative dots
- No sharp corners (0px) on interactive elements
- The radius scale is theme-invariant

---

## 10. Elevation, Shadows, and Surfaces

### Depth Strategy

BIGDROPS communicates depth through three mechanisms:

1. **Surface contrast**: Different background colours separate layers (page → canvas → card)
2. **Shadows**: Primary-tinted shadows lift cards and floating elements
3. **Borders**: Subtle 1px borders define card edges without heavy lines

### Shadow Rules

| Element | Shadow | Token |
|---------|--------|-------|
| Cards, standard surfaces | Primary-tinted, low spread | `--shadow` |
| Bottom nav, FAB, drawer | Primary-tinted, wider spread | `--shadow-float` |
| Sheets | Downward shadow | `0 -16px 40px rgba(0,0,0,.24)` |
| Active tab | Primary glow | `0 5px 12px color-mix(in srgb, var(--primary) 35%, transparent)` |
| FAB open pulse | Secondary ring | `1.5px solid var(--secondary-bright)` at 0.55 opacity |

### Light vs Dark Depth

| Mechanism | Light Theme | Dark Theme |
|-----------|-------------|------------|
| Shadow colour | Primary-tinted | Pure black, higher opacity |
| Surface contrast | White card on gray-blue canvas | Dark slate card on deep navy canvas |
| Border visibility | Subtle dark-on-light | Subtle light-on-dark |
| Glow | Not used | Optional on gradient elements (liquid-onyx reference) |

### What Elevation Is NOT

- Elevation is NOT communicated by `backdrop-filter: blur()` (glassmorphism removed per `00-index.md` locked decision)
- Elevation is NOT Material elevation levels (0–5)
- Elevation is NOT decorative drop shadows on inline elements

---

## 11. Gradient Language

### The BIGDROPS Gradient

```
linear-gradient(135deg, var(--primary), var(--secondary))
```

This is the single brand gradient. It appears on specific high-emphasis surfaces. It is not a general-purpose decoration.

### Where Gradients Are Appropriate

| Surface | Rationale |
|---------|-----------|
| Active tab background | Signals the current navigation destination |
| FAB | The primary creation action |
| Brand mark | BIGDROPS identity in the drawer |
| Reminder icon | Calls attention to the reminder |
| Primary-sm button | Small CTA inside cards |
| AI button | The AI assistant entry point |
| Collect metric card | Highlights the primary positive metric |

### Where Gradients Are Inappropriate

- Body text or headings
- Standard cards
- List rows
- Form inputs
- Table cells
- Status badges
- Dividers
- Page backgrounds (the body radial gradient is ambient, not a surface gradient)

### Gradient Rules

1. One gradient direction: 135deg
2. One gradient colour pair: primary → secondary
3. Gradients signal the most important action or identity on a surface
4. Gradients do not appear on more than one element per visual zone
5. Text on gradient surfaces is white (light mode) or `--ink` (dark mode)
6. The gradient structure is theme-invariant; only colours change

### Decorative Gradients

Two decorative gradient effects exist in the v6 reference:

| Effect | Location | Purpose |
|--------|----------|---------|
| Radial gradient (bottom-right) | Metric card corner | Subtle metric colour tint |
| Conic gradient | Reminder card corner | Decorative ring |

These are decorative. They do not carry information. They use `--metric-soft` colours at low opacity (0.5–0.85). They must not interfere with text readability.

---

## 12. Component Visual Language

### Buttons

| Type | Background | Text | Radius | Height | Usage |
|------|-----------|------|--------|--------|-------|
| Primary (gradient) | `var(--gradient)` | `#fff` / `var(--ink)` | 10–18px | 38–50px | FAB, primary CTA |
| Secondary | `var(--surface-muted)` | `var(--ink)` | 12px | 36px | Top bar buttons |
| Ghost | Transparent | `var(--ink-2)` | — | — | Low-emphasis actions |
| Danger | `var(--attention-soft)` | `var(--attention)` | — | — | Destructive actions |
| Disabled | — | — | — | — | `opacity: 0.35`, `cursor: not-allowed` |

All buttons: `button:active { transform: scale(0.965) }`, `button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px }`.

### Icon Buttons

36×36px, 12px radius, `1px solid var(--line)` border, `var(--surface-raised)` background. Icons: 17×17px, Lucide, stroke-width 1.9.

### Inputs

| Property | Value |
|----------|-------|
| Height | 40px |
| Radius | 12–13px |
| Background | `var(--surface-muted)` or `var(--surface-raised)` |
| Border | `1px solid var(--line-strong)` or transparent |
| Font | `var(--font)`, 12px |
| Focus | `2px solid var(--primary)`, `outline-offset: 2px` |
| Error | `var(--attention)` border, `var(--attention-soft)` tint |
| Placeholder | `var(--ink-3)` |
| Disabled | `opacity: 0.4`, `cursor: not-allowed` |

### Selects

Same as inputs. Custom dropdown arrow (SVG, `var(--ink-3)` colour). `appearance: none` to remove native select styling.

### Cards

`1px solid var(--line)` border, `var(--surface)` background, `var(--shadow)` box-shadow, 18px radius. Overflow hidden for decorative elements.

### Lists

Rows: 9px padding, 1px top border (`var(--line)`), flex layout with gap. First row: no top border. Row tap: ripple + `var(--surface-muted)` active background.

### Tables

Tables scroll horizontally when columns exceed viewport on mobile. On desktop, full-width tables show all columns. Financial figures use `--number` (monospace). Headers use uppercase 8px labels.

### Navigation Items (Drawer)

9px padding, 12px radius, icon (16×16px) + label (11px, weight 700) + optional chevron. Active: `var(--primary)` text, `var(--primary-soft)` background. Inactive: `var(--ink-2)` text.

### Bottom Sheets

Max height 78%, 24px top radius, `var(--surface)` background, downward shadow. Grab handle: 34×3px, `var(--surface-strong)`. Close button: 28×28px, 50% radius, `var(--surface-muted)` background.

### Dialogs

Used for confirmations (reset, delete). Centered modal with `var(--surface)` background, 12px radius, `var(--shadow)` shadow.

### Menus

Dropdown menus use `var(--surface)` background, 12px radius, `var(--shadow)` shadow. Menu items: 8px padding, 14px radius, icon + title + description.

### Badges / Status Pills

5px radius, 6px font, 800 weight, 0.07em uppercase letter-spacing, 2px 5px padding. Background uses soft variant of status colour. Text uses full status colour.

### Alerts

Alert items: 200px min-width, 16px radius, `1px solid var(--line)` border, `var(--surface-raised)` background. Alert symbol: 29×29px, 10px radius, soft background. Alert overline: 6px, 0.13em uppercase. Alert name: 10px, 800 weight.

### Empty States

58×58px icon container, 20px radius, `var(--primary-soft)` background, `var(--primary)` colour. Title: 16px, 800 weight, -0.05em. Description: 10px, `var(--ink-2)`, max-width 200px, centered.

### Loading States

`aria-busy="true"` on loading containers. Shimmer or spinner using `var(--primary)` colour. See `10-loading-and-refresh.md`.

### Error States

`var(--attention)` border on inputs. `var(--attention-soft)` background tint. Error message: 8px, `var(--attention)`, weight 600. Error toast: `var(--ink)` background, `var(--bg)` text.

---

## 13. Mobile-First Rules

### Primary Design Target

Phone (320–429px) is the primary design target. All design decisions start here and progressively unlock additional space.

### Touch Targets

| Platform | Minimum |
|----------|---------|
| Phone/Foldable/Tablet | 44×44px |
| Desktop | 32×32px |

Touch targets do not shrink on desktop. The minimum remains finger-friendly even when mouse is the primary input.

### Content Hierarchy

- One primary view per screen
- One primary action per screen (FAB)
- Summary first, detail on demand
- Vertical scroll only, `overscroll-behavior: contain`

### Bottom Sheet Usage

Bottom sheets are the default overlay for selection and action surfaces. They slide from the bottom, max-height 78%, swipe-to-dismiss. See `15-interaction-model.md` §2.

### Drawer Usage

The left-hand drawer opens from the hamburger menu button. Width: `min(84%, 340px)`. Contains brand, navigation, and footer. See `05-navigation-shell.md`.

### Mobile Navigation

5-tab bottom navigation: Home, Projects, Sales, Clients, More. Active tab has gradient background. See `05-navigation-shell.md`.

### Mobile Forms

Stacked or 2-column field layouts. 40px input height. 12px field gap. Form cards: 14px padding, 18px radius.

### Mobile Tables

Horizontal scroll when columns exceed viewport. Card-based layout for single records. See `08-tables-and-data.md`.

### Scrolling Behaviour

- Vertical scroll only on phone
- `overscroll-behavior: contain` — no scroll chaining
- Hidden scrollbars (`scrollbar-width: none`, `::-webkit-scrollbar { display: none }`)
- Bottom padding: `calc(106px + env(safe-area-inset-bottom))` to clear nav + FAB

### Safe Areas

All safe areas respected via `env()` CSS functions. Top: status bar. Bottom: home indicator. Left/Right: foldable hinge. See `02-mobile-first-model.md` and `12-capacitor-native.md`.

---

## 14. Responsive Design

### Breakpoint Strategy

| Tier | Width | Layout Change |
|------|-------|---------------|
| Phone | < 600px | Single column, bottom nav |
| Foldable | 600–839px | Expanded single column, optional panels |
| Tablet | 840–1199px | Multi-column, bottom nav (expanded) |
| Desktop | 1200px+ | Sidebar + content, full density |

### What Adapts

- Layout: single column → multi-column → sidebar + content
- Content density: more columns, more rows visible
- Navigation: bottom tabs (phone/tablet) → sidebar (desktop)
- Sheets: bottom sheet (phone) → side panel or modal (desktop)

### What Does NOT Adapt

- Hierarchy
- Semantic meaning
- Component identity (a card is a card at every breakpoint)
- Accessibility
- Interaction consistency
- Typography scale
- Spacing scale
- Touch target minimums
- Colour semantics

### Responsive Rules

1. The information architecture remains consistent across breakpoints
2. Desktop adapts the container, not the information architecture
3. A component that is a bottom sheet on phone may become a side panel on desktop, but it contains the same content
4. Density increases by showing more content, not by making content smaller

---

## 15. Theme Architecture

### Base Design System vs Themes

| Layer | Owns | Does NOT Change |
|-------|------|-----------------|
| **Base Design System** | Layout principles, typography hierarchy, spacing, component geometry, interaction model, information hierarchy, accessibility, responsive behaviour, navigation patterns | — |
| **Themes** | Colour values (backgrounds, surfaces, text, accents, borders, status, shadow colours) | Everything else |

A theme is a visual skin of BIGDROPS. A theme is NOT a separate design system.

### What a Theme May Change

- Background colours
- Surface colours
- Text colours
- Border colours
- Accent colours (primary, secondary)
- Semantic status colours (success, warning, danger, info)
- Shadow colour tinting and opacity
- Gradient colour values (the gradient structure remains 135deg primary→secondary)

### What a Theme Must NOT Change

- Layout
- Responsive behaviour
- Component structure
- Navigation model
- Information architecture
- Spacing
- Typography (font family, size, weight, line height)
- Component dimensions (width, height, padding, border-radius)
- Interaction behaviour (tap, swipe, hover)
- Motion behaviour (transition duration, animation)
- Icon sizing
- Touch target sizing

### Theme Switching

Themes are switched via `data-theme` attribute on `<html>` (v6 reference) or `.dark` class (current app). The mechanism is CSS-only. No JavaScript state beyond toggling the attribute/class.

---

## 16. Theme Power Matrix

| Design Property | Theme Control | Rule |
|-----------------|--------------|------|
| Colour palette | **Allowed** | Must preserve semantic meaning (success=green, danger=red) |
| Surface colours | **Allowed** | Must preserve contrast ratios (WCAG AA minimum) |
| Accent colour | **Allowed** | Must remain accessible against surface |
| Text colours | **Allowed** | Must preserve hierarchy (primary > secondary > tertiary) |
| Border colours | **Allowed** | Must remain visible against surfaces |
| Status colours | **Allowed** | Must preserve semantic meaning |
| Shadow intensity | **Allowed** | Dark mode may use higher opacity / pure black |
| Gradient colours | **Allowed** | Structure remains 135deg primary→secondary |
| Shadow structure | **Restricted** | Two-layer (spread + tight) remains; only colours change |
| Typography hierarchy | **Restricted** | Scale and hierarchy remain fixed |
| Font family | **Forbidden** | Manrope + DM Mono are product identity |
| Font sizes | **Forbidden** | The type scale is product identity |
| Font weights | **Forbidden** | Weight assignments are product identity |
| Spacing | **Forbidden** | The spacing scale is product identity |
| Component geometry | **Forbidden** | No arbitrary redesign of component shapes |
| Border radius | **Forbidden** | The radius scale is product identity |
| Layout | **Forbidden** | Theme cannot restructure the application |
| Navigation | **Forbidden** | Theme cannot change information architecture |
| Interaction model | **Forbidden** | Theme cannot change interaction behaviour |
| Accessibility | **Forbidden** | Never weaken accessibility |
| Motion | **Forbidden** | Transition durations and easings are product identity |

### Should the Existing Theme System Be Nerfed?

**Yes — partially.**

The current implementation (`src/styles/formTheme.css`) exposes typography tokens (`--bd-font-family`, `--bd-font-body-size`, `--bd-font-h1-size`, etc.) and spacing tokens (`--bd-space-xs` through `--bd-space-xl`) and layout tokens (`--bd-layout-density`, `--bd-layout-padding`, `--bd-layout-content-max`) as overridable variables. The `.dark` class override block in `formTheme.css` does not currently change these values, but the architecture permits it.

The `04-theme-system.md` PRD already establishes the "color-only" contract. The `formTheme.css` implementation violates this contract by placing structural tokens in the same override layer as colour tokens.

**Recommendation**: Restrict the theme override surface to colour tokens only. Move typography, spacing, radius, and layout tokens out of the theme-override layer. These tokens should be defined once in `:root` and never overridden in `.dark` or `[data-theme="dark"]`.

This is a documentation recommendation. Implementation is outside the scope of this document.

---

## 17. Default Theme

The default theme is **Slate Navy (Light)**, derived from `Design-direction/dashboard/mobile-dashboard-v6.html`.

| Property | Value |
|----------|-------|
| Background | `#f0f4f8` (cool gray-blue) |
| Surface | `#ffffff` (white) |
| Primary | `#1e3a5f` (dark navy) |
| Accent feel | Professional, restrained |
| Mode | Light |

This reference represents the preferred baseline visual direction for BIGDROPS. Future screens must default to this visual language unless a documented theme or product requirement says otherwise.

---

## 18. Dark Theme

The dark theme is **Liquid Onyx (Dark)**, derived from `Design-direction/reference/liquid-onyx.html`.

| Property | Value |
|----------|-------|
| Background | `#0f172a` (deep navy) |
| Surface | `#1e293b` (dark slate) |
| Primary | `#60a5fa` (bright blue) |
| Accent feel | High contrast, clear |
| Mode | Dark |

### Identity Preservation Checklist

- [x] Same layout (430px phone frame, bottom nav, drawer, sheets)
- [x] Same typography (Manrope + DM Mono, same scale)
- [x] Same spacing (2–14px scale)
- [x] Same radii (18px cards, 24px sheets, 20px nav)
- [x] Same component structure (cards, rows, badges, tabs)
- [x] Same interaction model (ripple, sheet, back stack)
- [x] Same navigation (5-tab bottom nav)
- [x] Same accessibility (44px touch targets, focus visible, reduced motion)
- [x] Semantic colours preserved (success=green, danger=red)
- [x] Hierarchy preserved (primary > secondary > tertiary text)

Only the visual treatment changes. The dark theme is a theme of the same product, not a separate product identity.

---

## 19. Anti-Patterns

Future designers and developers must NOT do the following:

| # | Anti-Pattern | Why It Is Wrong |
|---|-------------|-----------------|
| 1 | Arbitrary colour palettes | Colours are semantic; introducing new hues breaks meaning |
| 2 | Unrelated design languages | BIGDROPS has one design system; modules do not get their own |
| 3 | Excessive gradients | Gradients signal high-emphasis only; overuse destroys hierarchy |
| 4 | Glassmorphism / `backdrop-filter: blur()` for elevation | Removed per locked decision; elevation uses shadow + surface contrast |
| 5 | Excessive shadows | Shadows are functional, not decorative; one shadow per elevation level |
| 6 | Inconsistent radii | The radius scale is fixed; do not invent new radius values |
| 7 | Oversized controls | Compact density is product identity; do not inflate spacing |
| 8 | Desktop-first layouts | Mobile is the primary design target; design phone-first |
| 9 | Decorative elements that reduce usability | Every visual element must support information or action |
| 10 | Low-contrast dark mode | Dark mode must meet WCAG AA minimum (4.5:1 for text) |
| 11 | Theme-specific component redesigns | A theme changes colours, not component structure |
| 12 | Changing navigation structure through themes | Navigation is base system, not themeable |
| 13 | Changing interaction behaviour through themes | Interaction is base system, not themeable |
| 14 | Creating a new visual system for individual modules | All modules use the same BIGDROPS design system |
| 15 | Using sans-serif for financial numbers | Financial numbers use DM Mono (`--number`) |
| 16 | Using emoji as icons | Use Lucide icons (stroke-based, consistent weight) |
| 17 | Hover-only information | Hover enhances; it never reveals required information |
| 18 | Hardcoding colour values in component CSS | Always use tokens (`var(--token-name)`) |
| 19 | Font sizes below 6px | 6px is the minimum production size |
| 20 | Material 3 / Material You terminology or tokens | BIGDROPS is not Material; see `15-interaction-model.md` §7 |

---

## 20. Design Decision Record

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | `mobile-dashboard-v6.html` is the primary default visual reference | It is the locked canonical dashboard structure per `00-index.md` |
| 2 | `liquid-onyx.html` is the approved dark-mode reference | It preserves BIGDROPS identity while inverting the colour treatment |
| 3 | Themes are variations of one BIGDROPS design system | A theme is a visual skin, not a separate product |
| 4 | Themes must not become independent design systems | Preserves product consistency across themes |
| 5 | Mobile-first and Android-oriented interaction rules remain authoritative | Phone is the primary design target per `02-mobile-first-model.md` |
| 6 | Visual customization must not weaken usability or accessibility | Accessibility is forbidden from theme variation |
| 7 | Business information hierarchy must remain stable across themes | Hierarchy is product identity, not theme preference |
| 8 | Manrope + DM Mono are the fixed typography | Font family is product identity |
| 9 | The 2–14px spacing scale is fixed | Spacing is product identity |
| 10 | The radius scale (5–40px) is fixed | Shape language is product identity |
| 11 | Shadows are primary-tinted in light mode, pure black in dark mode | Signature BIGDROPS visual trait |
| 12 | The 135deg primary→secondary gradient is the single brand gradient | Gradient identity is product identity |
| 13 | Glassmorphism is removed and forbidden | Locked decision per `00-index.md` |
| 14 | The current theme system should be nerfed to colour-only | `formTheme.css` exposes structural tokens; this violates the color-only contract |
| 15 | Compact density is product identity | BIGDROPS serves business users who need data density |

---

## 21. Quick Reference

### Light Mode Quick Reference

- Text: `var(--ink)` = `#0f172a`
- Background: `var(--bg)` = `#f0f4f8`
- Surface (cards): `var(--surface)` = `#ffffff`
- Primary: `var(--primary)` = `#1e3a5f`
- Border: `var(--line)` = `rgba(15,23,42,.07)`
- Gradient: `linear-gradient(135deg, #1e3a5f, #0f172a)`
- Shadow: primary-tinted, low opacity

### Dark Mode Quick Reference

- Text: `var(--ink)` = `#f1f5f9`
- Background: `var(--bg)` = `#0f172a`
- Surface (cards): `var(--surface)` = `#1e293b`
- Primary: `var(--primary)` = `#60a5fa`
- Border: `var(--line)` = `rgba(241,245,249,.08)`
- Gradient: `linear-gradient(135deg, #60a5fa, #94a3b8)`
- Shadow: pure black, high opacity

### Component Quick Reference

- Card: `1px solid var(--line)`, `var(--surface)`, `var(--shadow)`, 18px radius
- Sheet: `var(--surface)`, 24px top radius, max-height 78%, swipe-to-dismiss
- Active tab: `var(--gradient)`, white/ink text, primary glow shadow
- Status badge: 5px radius, 6px font, soft bg, full colour text
- Input: 40px height, 12px radius, `var(--surface-muted)` bg, `var(--primary)` focus
- FAB: 50×50px, 18px radius, `var(--gradient)`, 50px from bottom + safe area

---

## 22. Cross-References

| Topic | Document |
|-------|----------|
| Design vision and principles | `01-design-vision.md` |
| Platform tiers and breakpoints | `02-mobile-first-model.md` |
| Structural tokens (typography, spacing, radius, elevation) | `03-design-system.md` |
| Colour tokens and theme contract | `04-theme-system.md` |
| Navigation shell (drawer, bottom nav, sheets) | `05-navigation-switchers.md` |
| Component patterns (KPI cards, activity, alerts) | `06-component-patterns.md` |
| Forms | `07-forms.md` |
| Tables and data | `08-tables-and-data.md` |
| Accessibility (WCAG, touch targets, screen readers) | `11-accessibility.md` |
| Capacitor native (safe areas, status bar) | `12-capacitor-native.md` |
| Interaction model (Android patterns, ripple, back) | `15-interaction-model.md` |
| Context switchers (company/workspace) | `16-context-switchers.md` |
