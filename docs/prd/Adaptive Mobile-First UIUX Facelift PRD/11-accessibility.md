# Accessibility

> Status: Established
> Last updated: 2026-08-28

---

## Purpose

Define baseline accessibility requirements for BIGDROPS. Ensure the application is usable by people with disabilities across all platform tiers.

---

## Touch Targets

| Platform | Minimum Size | Minimum Spacing |
|----------|-------------|-----------------|
| Phone | 44×44px | 8px |
| Foldable | 44×44px | 8px |
| Tablet | 44×44px | 8px |
| Desktop | 32×32px | 4px |

No interactive element may be smaller than the minimum for its platform. This includes:
- Buttons
- Links
- Icons (when standalone)
- Form inputs
- Tab items
- List items (when tappable)
- Toggle switches

---

## Contrast

### Minimum Ratios (WCAG 2.2)

| Element | Minimum Ratio | Level |
|---------|--------------|-------|
| Normal text (< 18px) | 4.5:1 | AA |
| Large text (≥ 18px bold or ≥ 24px) | 3:1 | AA |
| Interactive elements | 3:1 | AA |
| Focus indicators | 3:1 | AA |
| Status badges | 4.5:1 | AA |

### Current Theme Contrast

| Pair | Ratio | Status |
|------|-------|--------|
| v6 light: ink on surface | ~12:1 | ✅ AAA |
| v6 dark: ink on surface | ~11:1 | ✅ AAA |
| v6 light: primary on surface | ~7:1 | ✅ AAA |
| v6 dark: primary on surface | ~8:1 | ✅ AAA |

---

## Keyboard Support

### Focus Management

| Rule | Implementation |
|------|---------------|
| All interactive elements are focusable | `tabindex="0"` or native elements |
| Focus order follows visual order | DOM order matches layout |
| Focus is visible | `outline: 2px solid var(--primary); outline-offset: 2px` |
| Focus is not suppressed | Never use `outline: none` without replacement |
| Skip links exist | Skip to main content link at top of page |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Tab | Move focus forward |
| Shift+Tab | Move focus backward |
| Enter/Space | Activate focused element |
| Escape | Close overlay/sheet/drawer |
| Arrow keys | Navigate within lists/grids |
| Ctrl+S | Save draft (form pages) |
| Ctrl+Enter | Finalize document |

### Focus Trapping

When a modal/sheet/drawer is open:
- Focus is trapped inside the overlay
- Tab wraps from last to first focusable element
- Escape closes the overlay and returns focus to the trigger
- Focus returns to the trigger element on close

---

## Screen Readers

### ARIA Requirements

| Element | ARIA |
|---------|------|
| Pages | `role="main"` |
| Navigation | `role="navigation"` with `aria-label` |
| Buttons | `aria-label` when icon-only |
| Sheets/Drawers | `role="dialog"` with `aria-modal="true"` |
| Status badges | `role="status"` or `aria-label` |
| Form errors | `aria-live="polite"` |
| Loading states | `aria-busy="true"` |
| Notifications | `aria-live="assertive"` |
| Tabs | `role="tablist"`, `role="tab"`, `role="tabpanel"` |
| Lists | `role="list"` with `role="listitem"` |

### Content Structure

- Heading hierarchy: h1 → h2 → h3 (no skips)
- Landmarks: header, nav, main, footer
- Images: `alt` text (or `aria-hidden="true"` for decorative)
- Lists: proper `<ul>`/`<ol>` markup
- Tables: `<th>` with `scope` attribute

---

## Reduced Motion

### Rule

When `prefers-reduced-motion: reduce` is active:
- All animations stop
- All transitions reduce to near-instant
- No auto-playing animations
- Page transitions are instant
- Loading overlays fade instantly

### Implementation

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

This must be present in:
- Global CSS
- Every component with animation
- Every sheet/drawer transition
- Every page transition

---

## Semantic Controls

### Use Native Elements

| Control | Use | Not |
|---------|-----|-----|
| `<button>` | Actions | `<div onclick>` |
| `<a>` | Navigation | Button styled as link |
| `<input>` | Text input | ContentEditable div |
| `<select>` | Dropdowns | Custom div dropdown |
| `<table>` | Data tables | Grid divs |
| `<nav>` | Navigation regions | Generic divs |
| `<header>` | Page header | Generic divs |
| `<main>` | Main content | Generic divs |
| `<section>` | Content sections | Generic divs |
| `<article>` | Self-contained content | Generic divs |

### Custom Controls

When native elements are insufficient:
- Provide `role` attribute
- Provide `aria-label` or `aria-labelledby`
- Implement keyboard interaction per WAI-ARIA patterns
- Test with screen reader

---

## Orientation

- Content must work in both portrait and landscape
- No orientation lock in the web app
- Navigation must remain accessible in both orientations
- Safe areas change with orientation — handle dynamically
- Minimum width: 320px (portrait phone)
- No content loss in landscape

---

## Dynamic Text and Content

| Rule | Detail |
|------|--------|
| Text resize | Layout must not break at 200% text zoom |
| Reflow | Content must reflow at 320px width (no horizontal scroll for text) |
| Line height | 1.5× for body text, 1.2× for headings |
| Paragraph spacing | 2× font size |
| Letter spacing | 0.12× for body text |
| Word spacing | 0.16× for body text |

---

## Color Independence

- Never use color as the only indicator of state
- Status must be communicated by: color + text + icon
- Error states: red border + error message + icon
- Success states: green indicator + text confirmation
- Required fields: asterisk + label text (not just red)

---

## Testing Checklist

- [ ] All interactive elements are keyboard accessible
- [ ] Focus is visible on every interactive element
- [ ] Focus trapping works in modals/sheets
- [ ] Screen reader can navigate all content
- [ ] ARIA labels are present on icon-only buttons
- [ ] Form errors are announced by screen reader
- [ ] Reduced motion preference is respected
- [ ] Color contrast meets WCAG AA
- [ ] Text is readable at 200% zoom
- [ ] No content is lost in landscape orientation
- [ ] Touch targets meet minimum size
- [ ] Skip link is present and functional
