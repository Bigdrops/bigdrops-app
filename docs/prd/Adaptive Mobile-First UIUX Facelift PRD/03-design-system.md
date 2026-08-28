# Design System — Structural Tokens

> Status: Established
> Last updated: 2026-08-28

---

## Purpose

Define the structural design system independently from colour themes. These tokens are theme-invariant. They do not change when the theme changes.

See [04-theme-system.md](./04-theme-system.md) for colour tokens.

---

## Typography

### Font Families

| Token | Value | Usage |
|-------|-------|-------|
| `--font` | Manrope, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif | Body text, UI labels, headings |
| `--number` | "DM Mono", ui-monospace, SFMono-Regular, Menlo, monospace | Financial figures, document numbers, code |

### Type Scale

| Element | Size | Weight | Line Height | Letter Spacing | Usage |
|---------|------|--------|-------------|----------------|-------|
| Workspace label | 7px | 800 | 1.2 | 0.075em uppercase | Top bar workspace name |
| Section title | 9px | 800 | 1.2 | 0.105em uppercase | Section headers ("Recent activity") |
| Eyebrow | 8px | 800 | 1.2 | 0.11em uppercase | Dashboard eyebrow ("Finance pulse") |
| Metric label | 8px | 800 | 1.2 | 0.07em uppercase | KPI card labels |
| Meta text | 8px | 500 | 1.3 | normal | Activity meta, dates, audit timestamps |
| Body small | 9px | 700 | 1.4 | normal | Reminder body, alert body |
| Status badge | 6px | 800 | 1 | 0.07em uppercase | Status pills (Pending, Draft) |
| Tab label | 7px | 800 | 1 | normal | Bottom nav tab labels |
| Activity primary | 11px | 800 | 1.2 | -0.025em | Document numbers in activity |
| Owner name | 13px | 800 | 1.2 | -0.045em | Top bar owner name |
| Metric value | 17px | 500 | 1.2 | -0.075em | KPI numbers (monospace) |
| Sheet title | 17px | 800 | 1.2 | -0.05em | Bottom sheet headings |

### Typography Rules

- Financial numbers always use `--number` (monospace)
- Uppercase text uses `letter-spacing: 0.07em – 0.11em`
- Negative letter-spacing on large display numbers
- Weight 800 for labels and emphasis, 500–700 for body
- No font size below 6px in production

---

## Spacing

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

### Spacing Rules

- Grid gaps: 8px (metric grid, activity rows)
- Card internal padding: 10–12px
- Page horizontal padding: 14px
- Section vertical spacing: 14px
- Between sections title and content: 8px

---

## Border Radius

| Element | Radius | Token |
|---------|--------|-------|
| App shell (phone frame on desktop) | 40px | — |
| Bottom sheet | 24px | — |
| Drawer (right edge) | 0 24px 24px 0 | — |
| Cards | 18px | — |
| Alert items | 16px | — |
| Bottom nav bar | 20px | — |
| FAB | 18px | — |
| Metric cards | 18px | — |
| Top bar buttons | 12px | — |
| Activity icons | 11px | — |
| Status badges | 5px | — |
| Bottom nav tabs (active) | 15px | — |
| Search box | 13px | — |
| Toast | 12px | — |

---

## Elevation

### Shadow Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow` | `0 12px 28px color-mix(in srgb, var(--primary) 8%, transparent), 0 2px 6px rgba(15,23,42,.04)` | Cards, standard surfaces |
| `--shadow-float` | `0 18px 40px color-mix(in srgb, var(--primary) 18%, transparent), 0 3px 9px rgba(15,23,42,.07)` | Floating elements (bottom nav, FAB) |

### Elevation Rules

- Cards use `--shadow`
- Floating elements (bottom nav, FAB) use `--shadow-float`
- Shadows are primary-tinted (not pure black)
- Dark mode shadows use pure black with higher opacity
- No drop shadows on inline elements

---

## Borders

### Border Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--line` | `rgba(15, 23, 42, .07)` | Subtle dividers, card borders |
| `--line-strong` | `rgba(15, 23, 42, .14)` | Bottom nav border, emphasis borders |

### Border Rules

- Card borders: `1px solid var(--line)`
- Bottom nav border: `1px solid var(--line-strong)`
- Divider lines: `1px solid var(--line)`
- No border on interactive elements (use background change for states)
- Focus outline: `2px solid var(--primary)`, `outline-offset: 2px`

---

## Control Sizing

### Buttons

| Element | Height | Padding | Radius | Font |
|---------|--------|---------|--------|------|
| Top bar icon button | 36×36px | — | 12px | — |
| FAB | 50×50px | — | 18px | — |
| Bottom sheet action | auto | 8px | 14px | 11px |
| Primary action (sheet) | auto | 7px 10px | 10px | 8px uppercase |
| Dismiss button | 28×28px | — | 50% | — |

### Touch Targets

| Platform | Minimum |
|----------|---------|
| Phone/Foldable/Tablet | 44×44px |
| Desktop | 32×32px |

---

## Icon Sizing

| Context | Size | Stroke Width |
|---------|------|-------------|
| Top bar buttons | 17×17px | 1.9 |
| Activity icons | 15×15px | 1.9 |
| Tab bar icons | 17×17px | 1.9 |
| Sheet action icons | 16×16px | 1.9 |
| Alert symbols | 14×14px | 1.9 |
| Status inline | 12×12px | 1.9 |
| Reminder icon | 16×16px | 1.9 |

**Icon library:** Lucide (stroke-based, consistent weight)

---

## Layout Primitives

### App Shell

```
┌─────────────────────────────┐
│  Top Bar (sticky)           │  workspace + actions
├─────────────────────────────┤
│                             │
│  Scroll Area                │  main content
│  (padding: 0 14px           │
│   bottom: 106px + safe)     │
│                             │
├─────────────────────────────┤
│  FAB (absolute)             │  above bottom nav
├─────────────────────────────┤
│  Bottom Nav (absolute)      │  5 tabs
└─────────────────────────────┘
```

### Card

```
┌─────────────────────────────┐
│  border: 1px solid --line   │
│  border-radius: 18px        │
│  background: --surface      │
│  box-shadow: --shadow       │
│                             │
│  [content]                  │
│                             │
└─────────────────────────────┘
```

### Bottom Sheet

```
┌─────────────────────────────┐
│  grab handle (34×3px)       │
├─────────────────────────────┤
│  title + close button       │
├─────────────────────────────┤
│  [content]                  │
│                             │
└─────────────────────────────┘
Slides up from bottom, max-height: 78%
```

### Drawer

```
┌──────────┬──────────────────┤
│          │                  │
│  Drawer  │  Scrim (behind)  │
│  (left)  │                  │
│  width:  │                  │
│  min(84%,│                  │
│  340px)  │                  │
│          │                  │
└──────────┴──────────────────┘
Slides in from left, border-radius: 0 24px 24px 0
```
