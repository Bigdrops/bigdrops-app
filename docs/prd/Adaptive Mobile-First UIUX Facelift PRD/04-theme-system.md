# Theme System — Color-Only Architecture

> Status: Established
> Last updated: 2026-08-28

---

## Theme Contract

**THEME = COLOUR ONLY.**

A theme is a named set of colour tokens. It changes nothing else.

### What a Theme May Change

- Background colours
- Surface colours
- Text colours
- Border colours
- Accent colours
- Semantic colours (success, warning, error, info)
- Gradients (where purely colour treatment)
- Shadow colour tinting (primary-tinted shadows adapt to theme)

### What a Theme MUST NOT Change

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

---

## Token Categories

### Structural Tokens (Theme-Invariant)

These tokens do NOT change between themes. They are defined in [03-design-system.md](./03-design-system.md).

```
Typography:  --font, --number
Spacing:     --space-xxs through --space-xxl
Radius:      border-radius values (18px, 12px, etc.)
Elevation:   --shadow, --shadow-float (structure, not color)
Sizing:      control dimensions, touch targets, icon sizes
```

### Dimensional Tokens (Theme-Invariant)

```
App max-width:     430px (phone)
Bottom nav height: 62px
FAB size:          50×50px
Top bar height:    58px + safe-area-inset-top
Card min-height:   108px (KPI cards)
```

### Colour Tokens (Theme-Variant)

These are the ONLY tokens that change between themes.

| Token | Light Mode (v6) | Dark Mode (v6) | Description |
|-------|-----------------|----------------|-------------|
| `--bg` | `#f0f4f8` | `#0f172a` | Page background |
| `--surface` | `#ffffff` | `#1e293b` | Card/sheet background |
| `--surface-raised` | `#f8fafc` | `#253448` | Elevated surface |
| `--surface-muted` | `#e2e8f0` | `#334155` | Muted surface |
| `--surface-strong` | `#cbd5e1` | `#475569` | Strong surface |
| `--ink` | `#0f172a` | `#f1f5f9` | Primary text |
| `--ink-2` | `#475569` | `#cbd5e1` | Secondary text |
| `--ink-3` | `#94a3b8` | `#64748b` | Tertiary text |
| `--primary` | `#1e3a5f` | `#60a5fa` | Primary accent |
| `--primary-bright` | `#3b82f6` | `#93c5fd` | Bright primary |
| `--primary-soft` | 14% transparent | 20% transparent | Soft primary |
| `--secondary` | `#0f172a` | `#94a3b8` | Secondary accent |
| `--secondary-bright` | `#64748b` | `#cbd5e1` | Bright secondary |
| `--secondary-soft` | 13% transparent | 18% transparent | Soft secondary |
| `--attention` | `#ef4444` | `#f87171` | Error/attention |
| `--attention-soft` | `#fee2e2` | `#3b1518` | Soft attention |
| `--sage` | `#64748b` | `#94a3b8` | Neutral accent |
| `--sage-soft` | `#f1f5f9` | `#1e293b` | Soft neutral |
| `--line` | rgba(15,23,42,.07) | rgba(241,245,249,.08) | Subtle border |
| `--line-strong` | rgba(15,23,42,.14) | rgba(241,245,249,.15) | Strong border |
| `--nav` | rgba(255,255,255,.88) | rgba(15,23,42,.88) | Nav background |

### Gradient Tokens (Theme-Variant)

| Token | Light (v6) | Dark (v6) |
|-------|-----------|-----------|
| `--gradient` | `linear-gradient(135deg, var(--primary), var(--secondary))` | Same structure, different values |

---

## Light/Dark Mode

Every theme provides both light and dark colour sets. The mode is toggled via `data-theme` attribute on `<html>`.

| Attribute | Mode |
|-----------|------|
| `data-theme="light"` | Light mode |
| `data-theme="dark"` | Dark mode |

Dark mode is implemented via CSS selector `[data-theme="dark"]`. The structural tokens remain identical. Only colour values change.

---

## Current Default Theme

**Slate Navy** (from `mobile-dashboard-v6.html`) is the **locked final palette** — confirmed over alternatives, not "canonical by accident."

> Locked per `00-index.md:00` (2026-08-28). This overrides any prior "TBD palette" status.

| Property | Light | Dark |
|----------|-------|------|
| Background | `#f0f4f8` (cool gray-blue) | `#0f172a` (deep navy) |
| Surface | `#ffffff` (white) | `#1e293b` (dark slate) |
| Primary | `#1e3a5f` (dark navy) | `#60a5fa` (bright blue) |
| Accent feel | Professional, restrained | High contrast, clear |

Shipped mockup `mobile-dashboard-v6.html:13` (light `#f0f4f8`/`#1e3a5f`, dark `#0f172a`/`#60a5fa`) is the normative reference. Other theme variants in `Design-direction/dashboard/themes/` remain structural duplicates with colour-only differences — they are not alternative palettes under consideration.

---

## Theme Candidates

The following colour variants exist as reference material. They are structurally identical to v6. Only colour tokens differ.

| Theme | File | Primary (Light) | Character |
|-------|------|----------------|-----------|
| Slate Navy (default) | `v6.html` | `#1e3a5f` | Professional blue-gray |
| Amber Terracotta | `v2.html` | `#b45309` | Warm amber/gold |
| Ocean Teal | `v3.html` | `#0d9488` | Cool teal |
| Rose Gold | `v4.html` | `#be185d` | Warm rose |
| Forest Green | `v5.html` | `#15803d` | Natural green |
| Warm Cocoa | `v7.html` | `#7c4a1a` | Earthy brown |

All files are in `Design-direction/dashboard/themes/`.

---

## Colour Naming Convention

The v6 naming convention is the standard:

| Pattern | Example | Meaning |
|---------|---------|---------|
| `--{name}` | `--primary` | Base colour |
| `--{name}-bright` | `--primary-bright` | Lighter/brighter variant |
| `--{name}-soft` | `--primary-soft` | Transparent variant for backgrounds |
| `--{surface}` | `--surface` | Surface colour |
| `--{surface}-raised` | `--surface-raised` | Elevated surface |
| `--{surface}-muted` | `--surface-muted` | Muted surface |
| `--{surface}-strong` | `--surface-strong` | Emphasized surface |
| `--ink` | `--ink` | Primary text |
| `--ink-2` | `--ink-2` | Secondary text |
| `--ink-3` | `--ink-3` | Tertiary text |
| `--line` | `--line` | Subtle border |
| `--line-strong` | `--line-strong` | Strong border |

This convention must be used consistently across all themes. Do NOT introduce alternative naming (e.g. `--text-primary`, `--accent`, `--bg-base`) in new theme definitions.

---

## Do Not

- Do NOT allow "theme" to become another word for "layout"
- Do NOT create theme-specific component variants
- Do NOT create theme-specific typography
- Do NOT create theme-specific spacing
- Do NOT create separate mobile/tablet/desktop themes
- Do NOT use colour tokens for structural decisions
- Do NOT hardcode colour values in component CSS (always use tokens)
