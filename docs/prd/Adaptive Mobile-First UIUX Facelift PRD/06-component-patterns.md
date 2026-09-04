# Component Patterns

> Status: Established
> Last updated: 2026-08-28

---

## Purpose

Document reusable visual and interaction patterns visible in the canonical v6 reference. Structure is separated from colour. Colour tokens come from [04-theme-system.md](./04-theme-system.md).

> **Design skills:** Load `mobile-app-ui-design` (`.agents/skills/mobile-app-ui-design/SKILL.md`) or `appllama-app-design-skill` (`.agents/skills/appllama-app-design-skill/SKILL.md`) when implementing or reviewing these component patterns on mobile. For animation polish, use `emil-design-eng` or `review-animations`.

---

## KPI Metric Card

### Structure

```
┌─────────────────────────┐
│  LABEL (uppercase 8px)  │
│  ─────────────────────  │
│  tickbar (20 ticks)     │
│  VALUE (mono 17px)      │
│  TREND (8px)            │
│  ○ (decorative circle)  │  offset: right -36px, bottom -42px
└─────────────────────────┘
```

### Properties

| Property | Value |
|----------|-------|
| Min height | 108px |
| Padding | 11px 12px 10px |
| Border | `1px solid var(--line)` |
| Border radius | 18px |
| Background | `var(--surface)` |
| Layout | Flex column |
| Grid | 2-column (`1fr 1fr`), gap 8px |

### Coverage Note

A facelift pass recorded in `22-facelift-pass-coverage-note.md` extended the canonical KPI card surface beyond the structural spec to include:

- layered box-shadow + subtle inset highlight in place of a single stroke on standard cards;
- KPI label and value typography tightened within the locked type scale;
- inactive tick color switched to a semantic UI text tone token (`--bd-ink-muted`) rather than a one-off variable.

This note is coverage status only. It does not change the structural properties above.

### Variants — Shipped Model (locked)

| Metric ID | Label | Format | Tone | Background | Use |
|-----------|-------|--------|------|------------|-----|
| `totalInvoiced` | Total Invoiced | `₦` currency (`formatNaira`) | `emerald` | `var(--surface)` | Cumulative invoiced value — ever created |
| `thisMonthCollections` | Collected This Month | `₦` currency | `emerald` | `var(--surface)` with `var(--gradient)` highlight option | Cash received since month start |
| `outstandingReceivables` | Outstanding Receivables | `₦` currency | `amber` | `var(--surface)` | Total still owed (`balance_due` sum) |
| `overdue` | Overdue Balance | `₦` currency | `rose` | `var(--surface)` | Past-due portion of outstanding |

> Supersedes prior sample set (Collected/Overdue/Awaiting(count)/Due-this-week). All four KPIs are currency-denominated; **no counts** (the old `Awaiting` count of `12` is removed). Trends: `totalInvoiced` vs `prevMonthInvoiced`, `thisMonthCollections` vs `prevMonthCollections` (good/bad polarity); `outstandingReceivables` and `overdue` render neutral trend (no comparison baseline — snapshot metrics). Bars: `outstanding/totalInvoiced` and `overdue/outstanding` ratios (`src/config/kpiCards.ts:12`, `src/hooks/useDashboardData.ts:185`). See `mobile-dashboard-v6.html:06` for markup.

### Tickbar

- 20 tick marks per bar
- Active ticks: `var(--metric)` color
- Inactive ticks: `var(--line-strong)`
- Each tick: 3px wide, 9px tall, 1.5px border-radius
- Gap between ticks: 2.5px

### Interaction

- Tap navigates to filtered view of that metric
- Hover (desktop): subtle shadow increase

---

## Activity Row

### Structure

```
┌─────────────────────────────────────────────┐
│  [icon 32×32]  DOC-0000 [status]   ₦amount │
│               Client name · Date       Date │
└─────────────────────────────────────────────┘
```

### Properties

| Property | Value |
|----------|-------|
| Padding | 9px 11px |
| Border top | `1px solid var(--line)` (first row: none) |
| Layout | Flex, gap 9px |
| Width | 100% |
| Interactive | Button element |

### Icon Variants

| Type | Background | Color |
|------|-----------|-------|
| Invoice | `var(--primary-soft)` | `var(--primary)` |
| Quotation | `var(--secondary-soft)` | `var(--secondary)` |
| Waybill | `var(--sage-soft)` | `var(--sage)` |

### Status Badges

| Status | Background | Color |
|--------|-----------|-------|
| Pending | `var(--secondary-soft)` | `var(--secondary)` |
| Draft | `var(--primary-soft)` | `var(--primary)` |
| Delivered | `var(--surface-muted)` | `var(--ink-2)` |

### Interaction

- Tap opens document detail
- Hover (desktop): background `var(--surface-raised)`

---

## Alert Card

### Structure

```
┌───────────────────────────────┐
│  [symbol 29×29]               │
│    OVERLINE (6px uppercase)   │
│    Name (10px bold)           │
│  Body text (8px)              │
│  ─────────────────────        │
│  Time ago          Read/Unread│
└───────────────────────────────┘
```

### Properties

| Property | Value |
|----------|-------|
| Width | 200px (min) |
| Padding | 10px |
| Border | `1px solid var(--line)` |
| Border radius | 16px |
| Background | `var(--surface-raised)` |
| Layout | Horizontal scroll container, gap 8px |

### Symbol Variants

| Type | Background | Color |
|------|-----------|-------|
| Warning | `var(--attention-soft)` | `var(--attention)` |
| Info | `var(--primary-soft)` | `var(--primary)` |

---

## Audit Row

### Structure

```
┌─────────────────────────────────┐
│  ● (6px dot)  Description      │
│                Timestamp        │
└─────────────────────────────────┘
```

### Properties

| Property | Value |
|----------|-------|
| Padding | 9px 0 |
| Border top | `1px solid var(--line)` (first row: none) |
| Layout | Flex, gap 8px |
| Dot | 6px circle, `var(--primary)`, `box-shadow: 0 0 0 3px var(--primary-soft)` |

### Dot Variants

| Type | Color | Ring |
|------|-------|------|
| Primary | `var(--primary)` | `var(--primary-soft)` |
| Copper | `var(--secondary)` | `var(--secondary-soft)` |

---

## Reminder Banner

### Structure

```
┌─────────────────────────────────┐
│  [icon 34×34]  KICKER           │
│                Title            │
│                Description      │
│                [Action] [Ghost] │
│                          [×]    │
│  ○ (decorative conic gradient)  │
└─────────────────────────────────┘
```

### Properties

| Property | Value |
|----------|-------|
| Padding | 12px |
| Border | `1px solid var(--line)` |
| Border radius | 18px |
| Background | `var(--surface)` |
| Position | Relative (overflow hidden for decorative element) |

---

## Sheet Action Item

### Structure

```
┌─────────────────────────────────┐
│  [icon 34×34]  Title (11px)     │
│                Description (8px)│
└─────────────────────────────────┘
```

### Properties

| Property | Value |
|----------|-------|
| Padding | 8px (8px 8px 8px 10px) |
| Border radius | 14px |
| Layout | Flex, gap 9px |
| Active state | `var(--surface-muted)` background |

---

## Section Header

### Structure

```
┌─────────────────────────────────┐
│  SECTION TITLE     Action Link  │
└─────────────────────────────────┘
```

### Properties

| Property | Value |
|----------|-------|
| Margin | 0 2px 8px |
| Title | 9px, 800 weight, uppercase, 0.105em letter-spacing, `var(--ink-3)` |
| Action | 9px, `var(--primary)`, 800 weight |

---

## Empty State

### Structure

```
┌─────────────────────────────────┐
│        [icon 58×58]             │
│        Title (16px)             │
│        Description (10px)       │
└─────────────────────────────────┘
```

### Properties

| Property | Value |
|----------|-------|
| Padding top | 60px |
| Icon container | 58×58px, radius 20px, `var(--primary-soft)` bg, `var(--primary)` color |
| Title | 16px, 800 weight, -0.05em tracking |
| Description | 10px, max-width 200px, centered, `var(--ink-2)`, line-height 1.45 |

---

## Status Indicator

### Pill Badge

| Property | Value |
|----------|-------|
| Border radius | 5px |
| Font size | 6px |
| Letter spacing | 0.07em |
| Text transform | uppercase |
| Padding | 2px 5px |
| Font weight | 800 |

### Colours

| Status | Background | Text |
|--------|-----------|------|
| Pending | `var(--secondary-soft)` | `var(--secondary)` |
| Draft | `var(--primary-soft)` | `var(--primary)` |
| Delivered | `var(--surface-muted)` | `var(--ink-2)` |

---

## Toast Notification

| Property | Value |
|----------|-------|
| Position | Top center, fixed |
| z-index | 60 |
| Transform (hidden) | `translate(-50%, -12px)` |
| Transform (visible) | `translate(-50%, 0)` |
| Background | `var(--ink)` |
| Color | `var(--bg)` |
| Border radius | 12px |
| Font size | 9px, 800 weight |
| Duration | Auto-dismiss after ~2.2s |

---

## Decorative Elements

### Grain Texture

Applied to the app shell for subtle texture.

- Opacity: 0.035
- Blend mode: multiply
- Source: SVG noise filter
- Pointer events: none

### Metric Card Radial

Each metric card has a decorative radial gradient in the bottom-right corner:

- Size: 84×84px
- Position: right -36px, bottom -42px
- Border radius: 50%
- Opacity: 0.5
- Background: radial-gradient(circle at 35% 35%, var(--metric-soft), var(--metric) 140%)

### Top Circle Border

Each metric card has a decorative circle border in the top-right:

- Size: 34×34px
- Position: right 10px, top -14px
- Border: 2px solid var(--metric-soft)
- Border radius: 50%
- Opacity: 0.55
