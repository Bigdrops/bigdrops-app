# Column Manager UX Audit

This report was written by Buffy on 2026-08-28 via Freebuff.

---

## 1. Executive Summary

The Column Manager is a bottom sheet that controls line-item table configuration in document forms. It is a feature-rich component with drag-and-drop reordering, visibility toggles, custom column creation, label editing, per-row overrides, and a reset-to-defaults action. The implementation is shared across Invoice, Quotation, and Waybill forms via `SharedDocumentForm`.

**Current quality:** Functional but dense. The component handles complex state correctly. The dual reorder mechanism (drag-and-drop + arrow buttons) is intentional and serves accessibility. The primary mobile UX risk is touch-target size on reorder controls and the density of the sheet content at 375px width.

**DI-001 status:** Partially confirmed. The touch-target claims are accurate for arrow buttons but not for the grip handles. The dual reorder mechanism is not cognitive overhead — it is a deliberate accessibility pattern. Severity should remain Medium.

**Redesign justified:** Yes, but scoped. The smallest safe redesign increases touch targets, improves visual hierarchy, and reduces density on mobile. Core functionality must remain unchanged.

---

## 2. Implementation Map

### Component

| File | Role |
|------|------|
| `src/components/ColumnManager.tsx` | Main component — Sheet with column rows, drag-and-drop, overrides, reset |

### Direct Consumers

| Consumer | How It Opens ColumnManager | Notes |
|----------|---------------------------|-------|
| `src/components/document/SharedDocumentForm.tsx` | `showColumnManager` state → lazy-loaded `<ColumnManager>` | Primary consumer. Used by Invoice and Quotation forms. |
| `src/components/invoice/ActionsSheet.tsx` | `onOpenColumnManager` prop → triggers `setShowColumnManager(true)` | Invoice quick-actions sheet entry point |
| `src/components/waybill/WaybillForm.tsx` | Direct `<ColumnManager>` render with own state | Separate implementation — not via SharedDocumentForm |

### Supporting Hooks/Components

| File | Role |
|------|------|
| `src/components/useInvoiceColumns.tsx` | State management hook — columns, toggle, add, remove, move, reset |
| `src/domain/invoice/columns.ts` | Column definitions, normalization, visibility resolution, PDF column mapping |
| `src/domain/invoice/types.ts` | `ColumnConfig` type definition |
| `src/components/ui/sheet.tsx` | Sheet primitive (Radix Dialog-based) |

### State Model

The Column Manager is **stateless** — it receives all state via props and reports changes via callbacks. The parent component owns the state:

```
SharedDocumentForm → useInvoiceColumns hook → columns state
    ↓ passes to
ColumnManager (receives columns, items, callbacks)
    ↓ calls back
useInvoiceColumns functions (toggleVisible, moveColumn, etc.)
    ↓ persisted to
invoice.custom_fields.columnConfig (JSON in Supabase)
```

### Persistence Model

Column configuration is stored in the invoice's `custom_fields.columnConfig` JSON column in Supabase. It is:
- **Saved** when the invoice/quotation is saved (via `useInvoiceSave.ts` line 200)
- **Loaded** when the form is hydrated (via `useInvoiceHydration.ts` line 91)
- **NOT** persisted per-user or per-workspace — it is per-document

### Column Definition Model

9 built-in columns defined in `src/domain/invoice/columns.ts`:

| Key | Label | Default Visibility | Removable | Type |
|-----|-------|-------------------|-----------|------|
| `description` | Description | show (always) | No | text |
| `quantity` | Quantity | show | No | text |
| `make` | Make | show | No | text |
| `unit` | Unit | show | No | text |
| `unit_price` | Unit Price | show | No | text |
| `amount` | Amount | show | No | text |
| `install_rate` | Install Rate | hide_display | No | install_rate |
| `vat_rate` | VAT Rate | hide_display | No | vat_rate |
| `discount_rate` | Discount Rate | hide_display | No | discount_rate |

Custom columns use `key: 'custom_<timestamp>'` and are always type `text`.

---

## 3. Current Interaction Model

### Opening Column Manager

1. User taps the "Table Settings" / "Columns" action in the form's actions sheet (invoice) or waybill toolbar
2. `setShowColumnManager(true)` is called
3. `SharedDocumentForm` lazy-loads `<ColumnManager>` with a `<Suspense>` fallback
4. ColumnManager renders as a bottom `Sheet` (Radix Dialog, `side="bottom"`)

### Reordering Columns

**Mechanism 1: Arrow buttons**
- Each row has up/down chevron buttons (18×14px each)
- Tapping moves the column one position in the specified direction
- The `description` column is locked at position 0 — it cannot be moved below index 1
- Disabled states: up-arrow disabled at index 1, down-arrow disabled at last index

**Mechanism 2: Drag-and-drop**
- Each row has a grip handle (6-dot grid, 14×14px)
- Desktop: native HTML5 drag-and-drop (`draggable`, `onDragStart`, `onDragOver`, `onDrop`)
- The `description` column's grip handle is not draggable (draggable=false)
- Drop target is any other row — `onDrop` calls `onMove(draggedKey, targetIdx)`

### Hiding/Showing Columns

- Eye/EyeOff toggle button (30×28px) per row
- Toggles between `show` and `hide_display`
- `hide_display` = hidden from form display but still included in totals
- `hide_full` = removed from totals (separate X button, only on financial columns)

### Creating Custom Columns

- "Add Custom Column" button at bottom of the field list
- Creates a new column with `key: 'custom_<timestamp>'`, label "New Column" (or "New Column 2" etc. to avoid duplicates)
- Custom columns are always type `text` and always removable

### Editing/Removing Custom Columns

- Label is editable via inline `<Input>` (same as built-in columns)
- Delete button (X icon, 30×28px) with red background — only on custom columns
- Delete has a 200ms animation delay before removal

### Per-Row Overrides

- Collapsible "Row Overrides" section at bottom of the sheet
- Shows items with per-item VAT rate, discount rate, or install rate overrides
- Each override has a "Reset" button
- "Reset All Overrides" button clears all overrides at once

### Reset to Defaults

- "Reset to defaults" link at bottom of the form fields section
- Opens a confirmation dialog (`ResetConfirmDialog`)
- Resets all columns to `BUILTIN_COLUMNS` defaults
- Does NOT remove custom columns (they remain in the state)

### Change Propagation

All changes are **immediate** — there is no "Apply" or "Save" button in the Column Manager. Changes propagate to the form as soon as the callback fires. The "Done" button at the bottom simply closes the sheet.

---

## 4. Mobile UX Audit (375px)

### Sheet Dimensions

The Column Manager uses `SheetContent` with `side="bottom"`. On mobile:
- Width: `inset-x-0` (full width)
- Max height: `var(--bd-overlay-sheet-max-height)` (viewport height minus keyboard inset)
- Rounded top corners: `var(--bd-overlay-radius)` (28px default)
- Centered at `sm:max-w-[620px]` on screens ≥640px

### Content Density

At 375px width, with 14px horizontal padding on each side, the usable content width is ~347px. Each column row contains:
- Grip handle (14px)
- Up/down arrows (18px wide)
- Label input (flex: 1, ~200px)
- Type badge ("Fixed" or "Text", ~40px)
- Eye toggle (30px)
- Optional: financial toggle (30px)

Total row width: ~332px — fits within 347px but is tight.

### Row Height

Each row has `min-h-[46px]` with `py-[7px]` padding. The actual rendered height is approximately 46px. This is above the 44px minimum touch target.

### Grip Target Size

The grip handle renders as a 2-column grid of 6 dots:
- Container: `w-[14px] h-5` (14×20px)
- Each dot: `w-[3px] h-[3px]`
- Effective touch target: 14×20px

**This is below the 44px minimum.** However, the grip is a visual affordance — the entire row is a flexible container. On touch devices, the drag handle's effective touch area is larger than its visual size because the drag event fires from the parent container.

### Arrow Button Target Size

Each arrow button:
- Width: `w-[18px]` (18px)
- Height: `h-[14px]` (14px)
- Total per-button: 18×14px
- Combined (up+down): 18×28px

**This is significantly below the 44px minimum.** This is the primary touch-target concern.

### Eye Toggle Target

- Width: `w-[30px]` (30px)
- Height: `h-7` (28px)
- **Below the 44px minimum** but closer than arrows.

### Text Readability

- Label input: `text-[14px] font-medium` — readable
- Type badge: `text-[10px] font-bold uppercase tracking-[0.12em]` — small but acceptable for a badge
- Section titles: `text-[10px] font-extrabold uppercase tracking-[0.16em]` — small

### Scrolling Behavior

The sheet body has `flex-1 overflow-y-auto`. With 9 built-in columns + potentially several custom columns + the overrides section, the content will exceed the visible area. Vertical scrolling is required.

### Keyboard Interaction

- Label inputs are focusable and editable
- Tab order follows DOM order
- Escape key closes the sheet (Radix Dialog behavior)
- No keyboard shortcut for reordering

### Thumb Reachability

The sheet occupies the full width. The "Done" button at the bottom is easily reachable. The grip handles and arrows on the left side require reaching across the row, which is less ergonomic on large phones.

### Accidental Taps

The close proximity of grip handles, arrows, and eye toggles increases the risk of accidental taps on mobile. The 200ms delay on custom column deletion is the only protective mechanism.

### Visual Hierarchy

The sheet has a clear hierarchy:
1. Header: "Table Settings" title + close button
2. "Standard PDF" section (Description row)
3. "Form Fields" section (all other columns)
4. "Add Custom Column" button
5. "Reset to defaults" link
6. "Row Overrides" collapsible section
7. "Done" button

The hierarchy is adequate but the density makes it hard to scan quickly.

---

## 5. Desktop UX Audit

### Available Space

On desktop (≥768px), the sheet maxes out at 620px width. The 9 built-in columns + custom columns fit comfortably.

### Drag Precision

HTML5 drag-and-drop works well with a mouse. The grip handles are clearly visible. Drop targets are the entire row, making precision easy.

### Reorder Controls

Arrow buttons are useful for precise single-step moves. They complement drag-and-drop for users who prefer click-based interaction.

### Information Density

On desktop, the density is comfortable. Labels, badges, and toggle buttons have adequate spacing.

### Discoverability

The "Add Custom Column" and "Reset to defaults" actions are clearly visible. The "Row Overrides" section is collapsible, keeping the default view clean.

### Keyboard Accessibility

Tab navigation works. Focus states are visible (`focus:bg-[var(--bd-surface)] focus:border-[var(--bd-border)]`). Escape closes the sheet.

---

## 6. Interaction Model Analysis

### Drag-and-Drop vs. Arrow Buttons

**Are they complementary?** Yes.

| Mechanism | Strength | Weakness |
|-----------|----------|----------|
| Drag-and-drop | Fast for large moves (e.g., move column from position 8 to position 2) | Not available on touch without long-press; imprecise for single-step moves |
| Arrow buttons | Precise single-step moves; works on all input methods; keyboard-accessible | Slow for large moves (must tap many times) |

**Verdict:** The dual mechanism is a deliberate accessibility pattern, not cognitive overhead. Users naturally gravitate toward one or the other based on their input device and task. Removing either would reduce usability.

**The issue is not the dual mechanism — it is the target size of the arrow buttons.** Increasing the arrow button area to 44×44px would solve the touch-target problem without removing any functionality.

---

## 7. Accessibility Audit

### Semantic Controls

- Rows are `<div>` elements, not `<li>` or `<tr>` — acceptable since the list is not a data table
- Section titles use `<div>` with uppercase styling — not actual headings (`<h3>`)
- The sheet uses Radix Dialog primitives — proper ARIA attributes are inherited

### ARIA Labels

- Close button has `aria-label="Close"` — good
- Eye toggle has `title` attribute ("Hide from display" / "Show on display") — screen readers benefit from this
- Financial toggle has `title` attribute ("Restore to totals" / "Remove from totals") — good
- Grip handles have no `aria-label` — screen readers cannot identify them
- Arrow buttons have no `aria-label` — screen readers see only chevron icons

### Keyboard Reordering

- Arrow buttons are focusable and activatable via Enter/Space — keyboard reordering works
- Drag-and-drop is mouse-only — no keyboard alternative for drag
- Arrow buttons serve as the keyboard-accessible reorder mechanism

### Focus States

- Input fields: `focus:bg-[var(--bd-surface)] focus:border-[var(--bd-border)]` — visible
- Buttons: `hover:bg-[var(--bd-bg)] hover:text-[var(--bd-text)]` — visible on hover, not on focus
- The "Done" button uses the default shadcn Button focus ring — visible

### Escape Behavior

- Radix Dialog handles Escape — sheet closes correctly

### Screen-Reader Behavior

- The sheet announces "Table Settings" as the dialog title
- Column labels are editable inputs — accessible
- Visibility state changes are not announced to screen readers (no `aria-live` region)

### Disabled States

- Arrow buttons show `disabled:opacity-25 disabled:cursor-default` when at boundary positions — visual feedback is clear
- Eye toggle on `hide_full` columns shows `opacity-30` — visual feedback

### Minimum Practical Touch Targets

| Element | Current Size | 44px Target | Gap |
|---------|-------------|-------------|-----|
| Grip handle | 14×20px | 44×44px | -30px |
| Arrow button | 18×14px | 44×44px | -30px |
| Eye toggle | 30×28px | 44×44px | -14px |
| Financial toggle | 30×28px | 44×44px | -14px |
| Done button | full-width × 54px | ✓ | Meets target |

---

## 8. Cross-Document Consistency

| Document Type | Uses ColumnManager? | Via SharedDocumentForm? | Column Config Persisted? |
|---------------|--------------------|-----------------------|------------------------|
| Invoice | ✅ Yes | ✅ Yes | ✅ Yes (`custom_fields.columnConfig`) |
| Quotation | ✅ Yes | ✅ Yes | ✅ Yes (`custom_fields.columnConfig`) |
| Waybill | ✅ Yes | ❌ No (own implementation) | ❌ No (local state only) |
| CSR | ❌ No | N/A | N/A |
| RFQ | ❌ No | N/A | N/A |
| BOQ | ❌ No | N/A | N/A |
| Letter | ❌ No | N/A | N/A |

**Key difference:** The Waybill form has its own ColumnManager integration that does NOT persist column config to the database. Column changes are lost when the user navigates away. The Waybill also has a simpler column model (no financial columns, no per-row overrides).

**Invoice vs. Quotation:** Both use `SharedDocumentForm` and persist column config identically. A redesign that updates `SharedDocumentForm` will automatically apply to both.

**Future redesign scope:** The component can remain shared. The Waybill's separate implementation should be consolidated into `SharedDocumentForm` if the redesign changes the ColumnManager API.

---

## 9. Data / Behavior Safety

### Must Remain Unchanged

| Element | Reason |
|---------|--------|
| Column identifiers (`key` values) | Used in PDF generation, calculations, persistence |
| Column ordering semantics | Order affects PDF column layout and form display order |
| Visibility modes (`show`, `hide_display`, `hide_full`) | `hide_display` vs `hide_full` have different financial implications |
| Custom column persistence (`custom_fields.columnConfig`) | Existing documents store this in Supabase — changing the schema breaks them |
| Financial column behavior (`install_rate`, `vat_rate`, `discount_rate`) | These columns affect `calcTotals()` and `resolveRowVat()` |
| Per-row overrides | These override global VAT/discount/install rates per item |
| `description` column locked at position 0 | PDF rendering depends on description being first |
| Column label editing | Labels appear on PDF output |

### Potential Behavior Risks in Redesign

| Risk | Mitigation |
|------|-----------|
| Changing column order API could break `getPdfColumns()` | Keep `moveColumn` semantics identical |
| Changing visibility modes could break `resolveColumnBehavior()` | Keep `show`/`hide_display`/`hide_full` semantics |
| Removing custom columns could break `custom_data` mapping | Keep custom column creation and persistence |
| Changing the Sheet primitive could break focus management | Use existing Radix Dialog-based Sheet |

---

## 10. Recommended Future Design Direction

### Must Change

| Change | Reason |
|--------|--------|
| Increase arrow button touch targets to 44×44px | Current 18×14px fails WCAG 2.5.5 |
| Increase grip handle touch target to 44×44px | Current 14×20px fails WCAG 2.5.5 |
| Increase eye toggle touch target to 44×44px | Current 30×28px fails WCAG 2.5.5 |
| Add `aria-label` to arrow buttons | Screen readers cannot identify chevron icons |
| Add `aria-label` to grip handles | Screen readers cannot identify drag affordance |

### Could Improve

| Improvement | Reason |
|-------------|--------|
| Reduce visual density on mobile | 9 columns + overrides section is dense at 375px |
| Add section headings (`<h3>`) instead of styled `<div>` | Better screen-reader navigation |
| Add `aria-live` region for visibility state changes | Announce column show/hide to screen readers |
| Visual feedback when column is reordered | Currently no animation or highlight on move |
| Group "Standard PDF" and "Form Fields" with clearer visual separation | Improve scan-ability |

### Should Remain Unchanged

| Element | Reason |
|---------|--------|
| Dual reorder mechanism (drag + arrows) | Complementary accessibility pattern |
| Immediate change propagation (no "Apply" button) | Reduces cognitive overhead |
| Per-row overrides section | Valuable power-user feature |
| Reset-to-defaults confirmation dialog | Prevents accidental data loss |
| Lazy loading via `Suspense` | Performance optimization |
| Sheet primitive (Radix Dialog) | Accessibility foundation |

---

## 11. DI-001 Reconciliation

| DI-001 Claim | Evidence | Verdict |
|-------------|----------|---------|
| "Grip handles are 14×14px" | Source: `w-[14px] h-5` = 14×20px. Not 14×14px. | **Partially confirmed** — width is 14px but height is 20px, not 14px |
| "Reorder buttons are 18×14px" | Source: `w-[18px] h-[14px]` per button. Confirmed. | **Confirmed** |
| "Small touch targets below 44px minimum" | All controls (grip, arrows, toggles) are below 44px. | **Confirmed** |
| "Dual reorder mechanism creates cognitive overhead" | Dual mechanism is a deliberate accessibility pattern — drag for speed, arrows for precision. | **Not confirmed** — the dual mechanism is intentional and beneficial |
| "Dense interaction surface" | 9 columns + overrides + custom columns + reset in one sheet. | **Confirmed** |
| "Cramped on mobile" | 347px usable width with 6+ controls per row. | **Confirmed** |

**DI-001 severity:** Remains **Medium**. The touch-target issue is real and affects mobile usability. The density issue is real but not critical. The dual reorder mechanism is not a problem.

---

## 12. Final Recommendation

**READY FOR DESIGN**

The Column Manager has genuine mobile UX issues that justify a scoped redesign. The smallest safe scope:

1. **Increase all interactive element touch targets to 44×44px minimum**
2. **Add ARIA labels to grip handles and arrow buttons**
3. **Add section headings for screen-reader navigation**
4. **Reduce visual density on mobile (increase row height, spacing)**

The redesign must NOT change:
- Column ordering semantics
- Visibility mode behavior
- Custom column creation/persistence
- Per-row overrides
- Financial column behavior
- The dual reorder mechanism
- The Sheet primitive
- The lazy-loading pattern

STOP — Column Manager implementation is not authorized in this pass.
