# Mobile-First Platform Model

> Status: Established
> Last updated: 2026-08-28

---

## Core Principle

Design mobile-first, then progressively unlock additional space and capability.

"Mobile" includes phone, foldable, and tablet. Desktop is an adaptive tier — not the source design.

---

## Platform Tiers

### Tier 1: Phone (Primary)

The primary design target. All design decisions start here.

| Property | Value |
|----------|-------|
| Width range | 320px – 429px |
| Canonical width | 430px |
| Layout | Single column |
| Navigation | Bottom tab bar (5 tabs) |
| Content density | Standard — one primary view per screen |
| FAB | Present — floating action button above bottom nav |
| Top bar | Sticky, workspace identity + action icons |
| Scroll | Vertical only, overscroll-behavior: contain |
| Safe areas | Respected on all sides (notch, home indicator) |

**Phone behaviors:**
- Bottom navigation is the primary navigation model
- Sheets slide up from bottom
- Drawers slide in from left
- Search is a full-screen overlay
- AI assistant is a bottom sheet
- Forms use stacked or 2-column field layouts
- Tables scroll horizontally when columns exceed viewport

---

### Tier 2: Foldable (Mobile Extension)

The phone experience that adapts when the device unfolds.

| Property | Value |
|----------|-------|
| Unfolded width range | 500px – 700px (typical) |
| Layout | Single column or side-by-side panels |
| Navigation | Bottom tab bar (same as phone) |
| Content density | Medium — can show list + detail side by side |
| Posture | Flat (tabletop) or fully open |

**Foldable behaviors:**
- When folded: behaves as phone
- When unfolded in portrait: wider single column, same navigation
- When unfolded in landscape: side-by-side panels possible
  - Left panel: list/navigation
  - Right panel: detail/edit view
- Bottom nav remains unless screen width exceeds tablet breakpoint
- Touch targets remain finger-sized
- No hover-dependent interactions

**Posture considerations:**
- Flat/tabletop: content may be viewed at angle — ensure contrast
- Tent mode: may be used for presentation — consider read-only mode
- Fully open: primary use case — full foldable layout

---

### Tier 3: Tablet (Expanded Mobile)

A richer mobile experience with more visible content. NOT a desktop shrunk down.

| Property | Value |
|----------|-------|
| Width range | 768px – 1024px (typical) |
| Layout | Multi-column content |
| Navigation | Persistent side panel or bottom bar (TBD) |
| Content density | High — more columns, more visible data |
| Side-by-side | Common — list + detail, form + preview |

**Tablet behaviors:**
- Multi-column content layouts
- Higher data density — more rows visible, more columns in tables
- Side-by-side panels for document editing
- Navigation may shift from bottom bar to persistent side rail
- Forms can use wider field layouts
- Sheets may become inline panels instead of overlays
- Touch targets remain finger-sized

**Navigation decision pending:** Whether tablet uses bottom nav (phone pattern) or side rail (desktop pattern). See [05-navigation-shell.md](./05-navigation-shell.md).

---

### Tier 4: Desktop (Adaptive)

The largest screen tier. An adaptation of the mobile experience, not a separate design.

| Property | Value |
|----------|-------|
| Width range | 1024px+ |
| Layout | Sidebar + content area |
| Navigation | Persistent sidebar with labels |
| Content density | Maximum — full data tables, multi-panel layouts |
| Interaction | Mouse + keyboard coexistence with touch |

**Desktop behaviors:**
- Sidebar navigation replaces bottom tabs
- Full-width data tables with all columns visible
- Multi-panel layouts (list + detail + actions)
- Hover states become available (but not required)
- Keyboard shortcuts for power users
- Right-click context menus (optional)
- Forms use horizontal field layouts where appropriate
- Sheets may become side panels or modals

**Desktop does NOT:**
- Change the design system
- Change component structure
- Change color themes
- Introduce desktop-only components
- Remove touch support

---

## Breakpoint Strategy

| Tier | Width | Breakpoint | Layout Change |
|------|-------|------------|---------------|
| Phone | < 430px | — | Single column, bottom nav |
| Phone (wide) | 430px – 499px | — | Single column, centered phone frame |
| Foldable | 500px – 767px | — | Expanded single column, optional panels |
| Tablet | 768px – 1023px | `@media (min-width: 768px)` | Multi-column, persistent nav |
| Desktop | 1024px+ | `@media (min-width: 1024px)` | Sidebar + content, full density |

**Note:** Exact breakpoint values are TBD pending implementation research. The values above are informed estimates based on common device widths. Test on actual devices before finalizing.

---

## Width Adaptation

The application uses a max-width container approach:

| Tier | Container Behavior |
|------|-------------------|
| Phone | Full width, edge-to-edge |
| Phone (wide on larger screen) | Centered 430px frame with visual border (phone mockup preview) |
| Foldable | Full width, up to 768px |
| Tablet | Full width, max-width: TBD |
| Desktop | Full width, max-width: TBD, sidebar takes fixed width |

---

## Orientation

| Tier | Portrait | Landscape |
|------|----------|-----------|
| Phone | Primary. Full design. | Secondary. Content reflows. Bottom nav may compress. |
| Foldable | Depends on hinge position. | Primary when fully open. |
| Tablet | Common. Multi-column. | Common. More horizontal space. |
| Desktop | Rare. Content vertical. | Primary. Full sidebar + content. |

**Orientation rules:**
- Never lock orientation in the web app
- Content must work in both orientations
- Navigation must remain accessible in both
- Safe areas change with orientation — handle dynamically

---

## Safe Areas

The application must respect system-provided safe areas on all platforms.

| Area | Phone | Foldable | Tablet | Desktop |
|------|-------|----------|--------|---------|
| Top (notch/status bar) | `env(safe-area-inset-top)` | `env(safe-area-inset-top)` | Varies | N/A |
| Bottom (home indicator) | `env(safe-area-inset-bottom)` | `env(safe-area-inset-bottom)` | Varies | N/A |
| Left (side notch on foldable) | `env(safe-area-inset-left)` | `env(safe-area-inset-left)` | N/A | N/A |
| Right | `env(safe-area-inset-right)` | `env(safe-area-inset-right)` | N/A | N/A |

**Implementation:** Use CSS `env()` values. Do not hardcode safe area values. See [12-capacitor-native.md](./12-capacitor-native.md) for Capacitor-specific handling.

---

## Touch Targets

| Platform | Minimum Target Size | Spacing |
|----------|-------------------|---------|
| Phone | 44×44px | 8px minimum between targets |
| Foldable | 44×44px | 8px minimum |
| Tablet | 44×44px | 8px minimum |
| Desktop | 32×32px (mouse-optimized) | 4px minimum |

Touch targets do not shrink on desktop. The minimum remains finger-friendly even when mouse is the primary input.

---

## Content Density

| Tier | Density Level | What Changes |
|------|--------------|--------------|
| Phone | Standard | Single column, one view at a time |
| Foldable | Medium | Wider content, optional side-by-side |
| Tablet | High | Multi-column, more rows visible, more data per screen |
| Desktop | Maximum | Full tables, multi-panel, no scrolling for standard views |

Density increases by showing more content, not by making content smaller. Font sizes and touch targets remain consistent.

---

## Multi-Column Behavior

| Tier | Columns | Layout |
|------|---------|--------|
| Phone | 1 | Stack vertically |
| Foldable | 1–2 | Stack or side-by-side |
| Tablet | 2–3 | Grid layout |
| Desktop | 3–4 | Grid with sidebar |

---

## Keyboard and Mouse Coexistence

Desktop adds keyboard and mouse support without removing touch support.

- All interactive elements must work with both touch and click
- Focus states must be visible (keyboard navigation)
- No hover-only information (hover enhances, never reveals)
- Keyboard shortcuts are additive, not required
- Tab order follows visual order
