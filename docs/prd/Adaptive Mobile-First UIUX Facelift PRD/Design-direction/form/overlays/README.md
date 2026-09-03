# Form Overlays — Android-First Design Prototype

> Status: Prototype — not production code
> Created: 2026-08-29
> Governing documents: `Design.md`, `21-surfaces-and-overlays.md`, `15-interaction-model.md`, `05-navigation-shell.md`

---

## 1. Design Intent

This prototype demonstrates how BIGDROPS form popups, sheets, dialogs, and pickers should look and behave under the approved design language. It extends the existing Slate Navy / Liquid Onyx visual identity into Android-first overlay interactions.

The prototype proves that the existing BIGDROPS form design language can scale consistently into modern mobile overlay patterns without inventing a new visual system.

---

## 2. Relationship to Existing Prototypes

| Prototype | Role |
|-----------|------|
| `invoice-form-inline-slate-navy.html` | Establishes the inline invoice form visual language |
| `invoice-form-popup-slate-navy.html` | Establishes the popup/modal variant |
| **This prototype** | Demonstrates overlay interactions that sit on top of the invoice form |

The base layer (visible behind overlays) uses the same visual tokens as the inline prototype: Slate Navy palette, Manrope + DM Mono typography, compact density, primary-tinted shadows.

---

## 3. Overlay Taxonomy

Seven overlay types are demonstrated, matching the canonical types defined in `21-surfaces-and-overlays.md`:

| # | Overlay | Canonical Type | Trigger | Dismiss |
|---|---------|---------------|---------|---------|
| 1 | Column Manager | Bottom Sheet (§4.1) | Toolbar button | Scrim tap, back, Apply, Cancel |
| 2 | Client Picker | Bottom Sheet (§4.1) | Client card tap | Scrim tap, back, row selection |
| 3 | Item Picker | Bottom Sheet (§4.1) | Add button | Scrim tap, back, row tap |
| 4 | Action Sheet | Bottom Sheet (§4.1) | Ellipsis button | Scrim tap, back, action tap |
| 5 | Confirmation | Confirmation Dialog (§4.4) | Delete button | Cancel, back |
| 6 | Form Config | Bottom Sheet (§4.1) | Settings trigger | Scrim tap, back, Apply |
| 7 | Compact Dialog | Centered Dialog (§4.3) | Reset trigger | Cancel, back, tap outside |

---

## 4. Android Conventions Demonstrated

### Bottom Sheets

- Attached to bottom edge, 24px top radius (`var(--overlay-radius)`)
- Grab handle (34×3px, `var(--surface-strong)`)
- Max-height 78dvh with independent scroll
- Scrim: `rgba(14,12,10,.38)` (standard from `21-surfaces-and-overlays.md`)
- Content scrolls independently; footer stays sticky
- Swipe-down implicit in the grab handle affordance

### Dialogs

- Centered, 12px radius, used only for confirmations and short decisions
- Not used for large forms or selection surfaces
- Scrim behind, non-dismissible by scrim tap (for destructive confirmations)

### Back Button Behavior

The "Back" button in the scenario bar simulates Android hardware back:

```
Android Back
    ↓
Open sheet? → close sheet
Open dialog? → close dialog
No overlay? → normal screen back behavior
```

### Touch Targets

All interactive elements are ≥44×44px:

- Toggle switches: 44×24px (touch area includes row)
- Drag handles: 44×52px (full row height)
- Action rows: 48px minimum height
- Sheet close button: 32×32px (with 44px touch area from padding)
- Footer buttons: 44px height

### Scrim + Back Integration

All overlays close on:
1. Scrim tap (where appropriate)
2. Android back button (via Escape key or back button simulation)
3. Explicit close/cancel action

---

## 5. Column Manager — Interaction Model

The Column Manager is the hero overlay. It demonstrates the redesigned mobile-first column configuration experience.

### Anatomy

```
┌─────────────────────────────────┐
│          Invoice form           │ (underlying context visible)
│                                 │
├─────────────────────────────────┤
│             ─────               │  ← Grab handle
│  Columns                    ×   │  ← Title + close
│  Choose and arrange columns     │  ← Description
│                                 │
│  ┌─ ⠿ ─ Description ── [●] ─┐  │  ← Row with drag handle + toggle
│  ├─ ⠿ ─ Quantity ───── [●] ─┤  │
│  ├─ ⠿ ─ Unit ────────── [●] ─┤  │
│  ├─ ⠿ ─ Unit Price ──── [●] ─┤  │
│  ├─ ⠿ ─ Discount ────── [○] ─┤  │  ← Disabled state
│  ├─ ⠿ ─ VAT Rate ────── [●] ─┤  │
│  └─ ⠿ ─ Amount ──────── [●] ─┘  │  ← Fixed (no toggle)
│                                 │
│     Reset to default            │  ← Secondary action
│                                 │
│  [ Cancel ]       [ Apply ]     │  ← Sticky footer
└─────────────────────────────────┘
```

### States Demonstrated

| State | Visual Treatment |
|-------|-----------------|
| **Enabled** | Full opacity, toggle ON (primary color) |
| **Disabled** | 40% opacity, line-through on label, toggle OFF |
| **Fixed/System** | "FIXED" badge, toggle disabled, cannot reorder |
| **Dirty** | "Unsaved changes" bar appears at top |
| **Drag** | Row opacity reduced, grab handle highlights |

### Touch Interaction

- Drag handle: 44×52px touch area, grab cursor on hover
- Toggle: 44×24px, smooth animation on state change
- Row tap: not used (toggle is the action)

---

## 6. Light / Dark Theme

| Property | Slate Navy (Light) | Liquid Onyx (Dark) |
|----------|-------------------|-------------------|
| Canvas | `#f0f4f8` | `#0f172a` |
| Surface | `#ffffff` | `#1e293b` |
| Primary | `#1e3a5f` | `#60a5fa` |
| Ink | `#0f172a` | `#f1f5f9` |
| Gradient | `135deg, #1e3a5f, #0f172a` | `135deg, #60a5fa, #94a3b8` |
| Scrim | `rgba(14,12,10,.38)` | `rgba(0,0,0,.55)` |

Toggle between themes using the sun/moon button in the scenario bar.

---

## 7. Scenarios Included

| Scenario | What It Shows |
|----------|--------------|
| Column Manager | Full column configuration: drag, toggle, fixed columns, dirty state, reset |
| Client Picker | Searchable client list with recent section, selection state, empty search |
| Item Picker | Categorized item library with search, price display, add action |
| Actions | Document action sheet with edit, duplicate, export, share, record payment, delete |
| Confirm | Destructive confirmation dialog with danger styling |
| Config | Form configuration sheet with selects and toggles |
| Compact Dialog | Small centered dialog for focused decisions (reset confirmation) |

---

## 8. Known Prototype Limitations

1. **Swipe-to-dismiss** is not implemented (would require `vaul` or gesture library). The grab handle is visual only.
2. **Drag-and-drop reordering** in Column Manager is simulated (pointer visual feedback only, no actual reorder).
3. **Keyboard handling** is not demonstrated (would require Capacitor keyboard plugin integration).
4. **Safe-area inset** values are CSS `env()` only; actual values depend on device.
5. **Predictive back gesture** (Android 14+) is not simulated; only hardware back button behavior is shown.
6. **Animation timing** uses the approved `cubic-bezier(.2,.9,.24,1)` easing but may not perfectly match native Android spring physics.
7. **The invoice form base layer** is simplified for demonstration; it does not include all real form fields (header fields, notes, terms, bank details, signatory).

---

## 9. Verification

- Only new files created in `Design-direction/form/overlays/`
- No `src/` changes
- No `supabase/` changes
- No existing invoice prototype modifications
- No production source modified
