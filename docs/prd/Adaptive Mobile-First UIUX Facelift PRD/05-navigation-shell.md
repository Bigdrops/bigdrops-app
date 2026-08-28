# Navigation Shell

> Status: Established
> Last updated: 2026-08-28

---

## Navigation Model

BIGDROPS uses a **5-tab bottom navigation** on phone. The tabs are:

| Tab | Icon | Label | Page |
|-----|------|-------|------|
| 1 | house | Home | Dashboard |
| 2 | folder-kanban | Projects | Projects |
| 3 | chart-no-axes-combined | Sales | Sales |
| 4 | contact-round | Clients | Clients |
| 5 | ellipsis | More | Additional menu |

---

## Phone Navigation

### Bottom Tab Bar

| Property | Value |
|----------|-------|
| Position | Absolute, bottom |
| Height | 62px + 4px padding |
| Left/Right inset | 10px |
| Bottom inset | `max(8px, env(safe-area-inset-bottom))` |
| Border | `1px solid var(--line-strong)` |
| Border radius | 20px |
| Background | `var(--nav)` with `backdrop-filter: blur(23px) saturate(150%)` |
| Shadow | `var(--shadow-float)` |
| Grid | `grid-template-columns: repeat(5, 1fr)` |

### Tab Item

| Property | Inactive | Active |
|----------|----------|--------|
| Color | `var(--ink-3)` | `#fff` |
| Background | transparent | `var(--gradient)` |
| Box shadow | none | `0 5px 12px color-mix(in srgb, var(--primary) 35%, transparent)` |
| Border radius | 15px | 15px |
| Font size | 7px | 7px |
| Font weight | 800 | 800 |
| Icon size | 17×17px | 17×17px |
| Layout | Column (icon + label) | Column (icon + label) |
| Gap | 2px | 2px |

### Tab Behavior

- Tapping a tab scrolls to top of that page
- The "Sales" and "More" tabs open bottom sheets instead of navigating
- Active tab has gradient background with primary-tinted shadow
- Tab bar is always visible (not hidden on scroll)

---

## Top Bar

| Property | Value |
|----------|-------|
| Position | Sticky, top: 0 |
| Height | 58px + env(safe-area-inset-top) |
| Padding | 8px + safe-area-inset-top (top), 0 (sides), 8px (bottom) |
| Background | `linear-gradient(180deg, var(--bg) 72%, transparent)` |
| z-index | 10 |
| Layout | Flex, space-between |

### Left Side

- **Menu button:** 36×36px, border-radius 12px, opens drawer
- **Identity block:** Workspace label (7px uppercase) + Owner name (13px bold)

### Right Side

- **Theme toggle:** 36×36px, toggles light/dark
- **Notifications:** 36×36px, bell icon with pip indicator (6px red dot)
- **Search:** 36×36px, opens search overlay
- **AI:** 36×36px, gradient background, opens AI sheet

---

## Drawer (Side Navigation)

| Property | Value |
|----------|-------|
| Position | Absolute, left, full height |
| Width | `min(84%, 340px)` |
| Background | `var(--surface)` |
| Border radius | `0 24px 24px 0` |
| Shadow | `var(--shadow-float)` |
| Transform (closed) | `translateX(-105%)` |
| Transform (open) | `translateX(0)` |
| Transition | `0.3s cubic-bezier(.2, .9, .24, 1)` |
| z-index | 42 |

### Drawer Content

- Brand mark (32×32px gradient square) + brand name + subtitle
- Navigation rows (9px padding, 12px radius, icon + label + chevron)
- Active row: `var(--primary)` text, `var(--primary-soft)` background
- Footer: user avatar + name + role

### Scrim

- Position: absolute, full inset
- Background: `rgba(14, 12, 10, .38)`
- Backdrop filter: `blur(2px)`
- z-index: 40

---

## Search Overlay

| Property | Value |
|----------|-------|
| Position | Absolute, full inset |
| Background | `var(--bg)` |
| z-index | 50 |
| Transform (closed) | `translateY(-104%)` |
| Transform (open) | `translateY(0)` |
| Transition | `0.24s cubic-bezier(.2, .9, .24, 1)` |

### Search Content

- Search row: input box (height 40px, radius 13px) + cancel button
- Suggestions section with recent/suggested items
- Keyboard opens automatically on show

---

## Bottom Sheets

| Property | Value |
|----------|-------|
| Position | Absolute, left: 0, right: 0, bottom: 0 |
| Max height | 78% |
| Border radius | 24px 24px 0 0 |
| Background | `var(--surface)` |
| Shadow | `0 -16px 40px rgba(0, 0, 0, .24)` |
| Transform (closed) | `translateY(106%)` |
| Transform (open) | `translateY(0)` |
| z-index | 43 |
| Padding | 8px 13px (16px + safe-area-inset-bottom) |

### Sheet Anatomy

- Grab handle: 34×3px, centered, `var(--surface-strong)` color
- Header: title (17px) + description (9px) + close button
- Content: scrollable action list
- Action items: icon (34×34px) + title (11px) + description (8px)

### Available Sheets

| Sheet | Trigger | Content |
|-------|---------|---------|
| Notification | Bell icon | Notification list |
| AI Assistant | AI button | Quick prompts + free text input |
| Theme Colors | Gear icon in drawer | Hex color picker + reset |
| Actions | FAB tap | Quick create actions |
| Sales | Sales tab | Sales-specific actions |
| More | More tab | Additional navigation |

---

## FAB (Floating Action Button)

| Property | Value |
|----------|-------|
| Position | Absolute, right: 16px |
| Bottom | `calc(82px + env(safe-area-inset-bottom))` |
| Size | 50×50px |
| Border radius | 18px |
| Background | `var(--gradient)` |
| Color | `#fff` |
| Shadow | `0 10px 24px color-mix(in srgb, var(--primary) 40%, transparent)` |
| z-index | 31 |
| Icon | Plus (21×21px) |

---

## Adaptive Navigation (Foldable/Tablet/Desktop)

**Phone:** Bottom tab bar (described above).

**Foldable (unfolded):** Same bottom tab bar. Wider content area. Optional side-by-side panels.

**Tablet:** TBD — decision pending. Options:
- Persistent bottom bar (phone pattern extended)
- Side rail with labels (desktop pattern at tablet width)
- Hybrid: bottom bar that transforms to side rail at breakpoint

**Desktop:** Sidebar navigation with labels. Bottom bar is removed. Sidebar is persistent.

See [02-mobile-first-model.md](./02-mobile-first-model.md) for platform tiers.

---

## Page Transitions

| Transition | Duration | Easing |
|------------|----------|--------|
| Page enter | 0.2s | ease-out |
| Sheet open/close | 0.3s | cubic-bezier(.2, .9, .24, 1) |
| Drawer open/close | 0.3s | cubic-bezier(.2, .9, .24, 1) |
| Search overlay | 0.24s | cubic-bezier(.2, .9, .24, 1) |
| Theme toggle | 0.34s | ease |
| Background transition | 0.36s | ease |
| Button press | scale(0.965) | — |

All transitions respect `prefers-reduced-motion`.
