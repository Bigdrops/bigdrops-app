# Forms

> Status: Established
> Last updated: 2026-08-28

---

## Purpose

Define how forms adapt across phone, foldable, tablet, and desktop. Cover invoice forms, document creation, and data entry surfaces.

Reference: `Design-direction/form/invoice-form-2col.html`

---

## Form Layout Principles

1. **Mobile-first.** Forms start as stacked single-column on phone.
2. **Progressive enhancement.** More columns on wider screens.
3. **Row Total prominence.** Financial summaries are visually distinct.
4. **Touch-first.** All inputs are finger-friendly on mobile.
5. **Clear validation.** Errors are inline, adjacent to the field.

---

## Phone Layout (Primary)

### Line Item Grid

Each line item uses a **2-column grid** for compact fields:

```
┌──────────────────────────────────┐
│  Description (full width)        │
├──────────────────┬───────────────┤
│  Qty             │  Unit         │
├──────────────────┴───────────────┤
│  ▌ ROW TOTAL (full width, dark)  │  prominent readout
├──────────────────┬───────────────┤
│  Make            │  Rate         │
├──────────────────┼───────────────┤
│  Part No.        │  VAT %        │
├──────────────────┼───────────────┤
│  Disc %          │               │
└──────────────────┴───────────────┘
```

### Field Layout Rules

| Field | Width | Position |
|-------|-------|----------|
| Description | Full width | Top of row item |
| Qty | 1fr (half) | Left column |
| Unit | 1fr (half) | Right column |
| Row Total | Full width | Own prominent row |
| Make | 1fr (half) | Left column |
| Rate | 1fr (half) | Right column |
| Part No. | 1fr (half) | Left column |
| VAT % | 1fr (half) | Right column |
| Disc % | 1fr (half) | Left column |

### Row Total Bar

| Property | Value |
|----------|-------|
| Background | Dark gradient (`var(--readout-bg)` or equivalent) |
| Text color | Bright accent (`var(--readout-text)` or equivalent) |
| Font | `var(--number)` (monospace) |
| Font size | 13px, 600 weight |
| Border radius | 8px |
| Padding | 8px 10px |
| Width | Full width (takes entire row) |

### Header Section

The form header (document type, client, date) uses exposed section cards:

```
┌──────────────────────────────────┐
│  DOCUMENT TYPE HEADER            │
│  (gradient background, dark)     │
├──────────────────────────────────┤
│  Client name                     │
│  Document number                 │
│  Date                            │
└──────────────────────────────────┘
```

### Group Headers

| Property | Value |
|----------|-------|
| Background | Dark gradient |
| Text color | White/bright |
| Border | 1px accent border |
| Border radius | 12px |
| Padding | 10px 12px |

---

## Foldable Layout

Same as phone. The 2-column field grid works well at foldable widths.

### Optional Enhancement

- Line item rows may display side-by-side when unfolded
- Form header + line items in a scrollable split view

---

## Tablet Layout

### Field Grid Expansion

| Phone (2-col) | Tablet (3-col) |
|---------------|----------------|
| Qty + Unit | Qty + Unit + Make |
| Make + Rate | Rate + VAT + Disc |
| Part No. + VAT | Part No. + (remaining) |

### Form Structure

- Left panel: form fields (scrollable)
- Right panel: live preview or line item summary
- Sticky header with save/cancel actions

---

## Desktop Layout

### Full-Width Form

- Horizontal field layout where appropriate
- 3–4 column field grids
- Side panel for item library or preview
- Keyboard shortcuts for common actions
- Tab order follows field sequence

### Field Layout (Desktop)

```
┌──────────┬──────────┬──────────┬──────────┐
│  Qty     │  Unit    │  Make    │  Rate    │
├──────────┼──────────┼──────────┼──────────┤
│  Part No.│  VAT %   │  Disc %  │  Total   │
└──────────┴──────────┴──────────┴──────────┘
```

---

## Input Styles

### Text Input

| Property | Value |
|----------|-------|
| Height | 40px |
| Border | `1px solid var(--line)` |
| Border radius | 12px |
| Background | `var(--surface-raised)` |
| Text color | `var(--ink)` |
| Font | `var(--font)`, 12px |
| Padding | 0 12px |
| Focus | `2px solid var(--primary)`, `box-shadow: 0 0 0 3px var(--primary-soft)` |

### Select

Same as text input with custom dropdown arrow.

### Textarea

| Property | Value |
|----------|-------|
| Min height | 80px |
| Resize | Vertical |
| Padding | 10px 12px |

### Disabled State

| Property | Value |
|----------|-------|
| Opacity | 0.4 |
| Cursor | not-allowed |
| Pointer events | none |

### Error State

| Property | Value |
|----------|-------|
| Border | `1px solid var(--attention)` |
| Box shadow | `0 0 0 3px var(--attention-soft)` |
| Error message | 8px, `var(--attention)`, 600 weight, 4px below field |

---

## Validation Rules

1. Required fields: visual indicator + inline error on blur
2. Numeric fields: validate on change, show error inline
3. Date fields: validate format, show error inline
4. Client name: required, show autocomplete suggestions
5. Save button: disabled until required fields are valid

---

## Form Actions

### Button Bar

| Button | Style | Position |
|--------|-------|----------|
| Save | Primary (gradient) | Left |
| Cancel | Secondary (surface) | Right of Save |
| Delete | Danger (red) | Left, below Save |
| Duplicate | Ghost (transparent) | Right of Delete |

### Button Sizing

| Property | Value |
|----------|-------|
| Height | auto |
| Padding | 7px 10px |
| Border radius | 10px |
| Font | 8px, 800 weight, uppercase, 0.065em letter-spacing |
| Layout | Flex row, gap 6px |

---

## Line Item Management

### Add Line Item

- FAB or "Add row" button at bottom of line items
- Tap inserts new empty row at the end
- Focus moves to Description field of new row

### Remove Line Item

- Swipe left on mobile (or delete button on desktop)
- Confirmation not required for empty rows
- Confirmation required for rows with data

### Reorder Line Items

- Drag handle on left side of each row
- Long press to initiate drag on mobile
- Mouse drag on desktop
- Visual feedback: item lifts with shadow during drag
