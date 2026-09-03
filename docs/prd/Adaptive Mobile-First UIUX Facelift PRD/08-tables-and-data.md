# Tables and Data

> Status: Established
> Last updated: 2026-08-28

---

## Purpose

Define how data-heavy surfaces behave across all platform tiers. Cover mobile data presentation, column priority, responsive behaviour, sorting, filtering, and touch interaction.

---

## Mobile Data Presentation (Phone)

### Card-Based Layout

On phone, data rows render as **cards**, not table rows.

```
┌──────────────────────────────────┐
│  INV-0045 [Pending]              │
│  Lagos Steel Works               │
│  ₦120,000          Aug 15       │
└──────────────────────────────────┘
```

### Card Properties

| Property | Value |
|----------|-------|
| Border | `1px solid var(--line)` |
| Border radius | 18px |
| Background | `var(--surface)` |
| Padding | 10px 12px |
| Shadow | `var(--shadow)` |
| Gap between cards | 8px |

### Information Hierarchy

1. **Primary:** Document number + status badge (11px, 800 weight)
2. **Secondary:** Client name (9px, muted color)
3. **Tertiary:** Amount (monospace) + date (7px, muted)

---

## Horizontal Overflow

### Rules

1. **Default:** No horizontal scroll on phone. Content wraps or truncates.
2. **Exception:** Data tables on tablet/desktop may scroll horizontally when columns exceed viewport.
3. **Never:** Force horizontal scroll on phone for text content.
4. **Allowed:** Horizontal scroll for wide data tables on tablet/desktop only.

### Truncation

| Element | Truncation Method |
|---------|-------------------|
| Client name | Text overflow ellipsis |
| Document number | No truncation (always visible) |
| Amount | No truncation (always visible) |
| Date | No truncation |
| Status | No truncation (badge is compact) |
| Long descriptions | Text overflow ellipsis, max 2 lines |

---

## Column Priority (Phone)

When data must be presented in a table-like format on phone, columns are prioritized:

| Priority | Column | Visible by Default |
|----------|--------|-------------------|
| 1 | Document number | ✅ Always |
| 2 | Status | ✅ Always |
| 3 | Client name | ✅ Always |
| 4 | Amount | ✅ Always |
| 5 | Date | ✅ Always (compact) |
| 6 | Due date | ⚠️ Secondary (may be hidden) |
| 7 | WHT status | ❌ Hidden (detail view only) |
| 8 | Notes | ❌ Hidden (detail view only) |

### Priority Implementation

- Priority 1–5: Always shown in card layout
- Priority 6: Shown if space allows, hidden with "more" indicator
- Priority 7–8: Only in detail view or expanded card

---

## Responsive Columns

### Phone

- Card layout (described above)
- 1 column of cards
- No table view

### Foldable

- Card layout or compact table
- 1–2 columns of cards depending on width
- Optional: list + detail side-by-side

### Tablet

- Full table view with responsive columns
- 2–3 columns visible by default
- Additional columns available via horizontal scroll or column selector
- Sticky first column (document number)

### Desktop

- Full table view with all columns visible
- 4–6 columns visible
- Column reordering via drag
- Column visibility toggle

---

## Sorting

### Default Sort

- By date (newest first) for document lists
- By amount (highest first) for financial summaries
- By status priority (Overdue → Pending → Draft → Delivered)

### Sort Indicators

| Property | Value |
|----------|-------|
| Active sort | Arrow icon next to column header |
| Direction | ↑ ascending, ↓ descending |
| Color | `var(--primary)` when active |
| Tap | Toggles direction |

### Sort Interaction

- Tap column header to sort
- Tap again to reverse
- Long press on mobile for sort menu
- Click on desktop

---

## Filtering

### Filter Chips

Active filters shown as removable chips above the data list.

| Property | Value |
|----------|-------|
| Background | `var(--primary-soft)` |
| Text | `var(--primary)`, 8px, 800 weight |
| Border radius | 5px |
| Padding | 2px 8px |
| Remove | × icon, tap to remove |

### Filter Interaction

- Tap filter icon in top bar to open filter sheet
- Select filters from sheet
- Filters apply immediately
- Clear all button in filter sheet

---

## Sticky Behaviour

### Phone

- Top bar is sticky (already implemented)
- Bottom nav is fixed (already implemented)
- No sticky table headers (card layout)

### Tablet

- First column (document number) is sticky on horizontal scroll
- Table header is sticky on vertical scroll
- Section headers are sticky below table header

### Desktop

- Table header is sticky
- First column is sticky
- Sidebar navigation is persistent (not sticky — fixed)

---

## Touch Interaction

| Gesture | Action |
|---------|--------|
| Tap | Open detail view |
| Swipe left | Quick action (delete, archive) |
| Swipe right | Quick action (mark paid, send) |
| Long press | Multi-select mode |
| Pull down | Refresh |
| Pinch | Zoom (detail view only) |

### Swipe Actions

| Direction | Action | Color |
|-----------|--------|-------|
| Swipe left | Delete | Red |
| Swipe right | Mark as paid | Green |

---

## Desktop Expansion

On desktop, data tables gain:

- All columns visible (no horizontal scroll needed)
- Column resizing via drag
- Column reordering via drag
- Row hover highlight
- Right-click context menu
- Bulk selection with checkboxes
- Export actions in table header
- Inline editing (double-click cell)

---

## Empty States

When no data matches the current filter or search:

```
┌──────────────────────────────────┐
│        [icon 58×58]              │
│        No invoices yet           │
│        Create your first         │
│        invoice to get started.   │
│        [Create Invoice]          │
└──────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Padding top | 60px |
| Icon | Document icon, `var(--primary-soft)` background |
| Title | 16px, 800 weight |
| Description | 10px, `var(--ink-2)`, max-width 200px, centered |
| CTA button | Primary style |
