# Column Manager — Design Investigation & Implementation Plan

This report was written by Buffy on 2026-08-29 via Freebuff.

---

## 1. Executive Summary

The BIGDROPS Column Manager is a Radix Dialog-based bottom sheet that controls line-item table configuration in document forms. It supports drag-and-drop reordering, visibility toggles (display-only and full-hide for financial columns), custom column creation, label editing, per-row overrides, and a reset-to-defaults action.

**Current quality:** Functionally mature. The component handles complex state correctly. The dual reorder mechanism (drag-and-drop + arrow buttons) is intentional and serves accessibility. The primary mobile UX risk is touch-target size on reorder controls and the density of the sheet content at narrow viewports.

**DI-001 status:** Partially confirmed. One factual error found — grip handles are 14×20px (not 14×14px as originally claimed in the design issue ledger). The dual reorder mechanism is not cognitive overhead. Severity should remain Medium.

**Design readiness:** READY FOR DESIGN. The smallest safe redesign increases touch targets, improves accessibility semantics, and reduces visual density on mobile. Core functionality must remain unchanged.

---

## 2. Repository Evidence

All conclusions in this report are derived from the following source files:

| File | Role |
|------|------|
| `src/components/ColumnManager.tsx` | Main component (536 lines) |
| `src/components/document/SharedDocumentForm.tsx` | Primary consumer — Invoice/Quotation |
| `src/components/invoice/ActionsSheet.tsx` | Invoice quick-actions entry point |
| `src/components/waybill/WaybillForm.tsx` | Waybill consumer (separate implementation) |
| `src/components/useInvoiceColumns.tsx` | State management hook |
| `src/domain/invoice/columns.ts` | Column definitions and normalization |
| `src/domain/invoice/types.ts` | `ColumnConfig`, `InvoiceCustomFields` types |
| `src/domain/waybill/contracts/waybillContract.ts` | Waybill column definitions |
| `src/components/ui/sheet.tsx` | Sheet primitive (Radix Dialog) |
| `src/hooks/useInvoiceHydration.ts` | Column config hydration (line 91) |
| `src/hooks/useInvoiceSave.ts` | Column config persistence (line 200) |

---

## 3. Component & Consumer Map

### ColumnManager Props Interface

```typescript
interface ColumnManagerProps {
  columns: ColumnConfig[]
  onUpdate: (key: string, field: string, value: string | boolean) => void
  onToggle: (key: string) => void
  onToggleFull: (key: string) => void
  onAddCustom: () => void
  onRemoveCustom: (key: string) => void
  onReset: () => void
  onMove?: (key: string, dir: number) => void
  onClose: () => void
  items?: InvoiceItem[]
  onResetItemOverrides?: (fields: OverrideResetFields) => void
}
```

ColumnManager is stateless. All state lives in the parent.

### Consumer Chain

```
ActionsSheet (invoice toolbar)
  → onOpenColumnManager()
  → setShowColumnManager(true)
  → SharedDocumentForm renders <ColumnManager> inside <Suspense>
    → uses useInvoiceColumns hook for state
    → persists to invoice.custom_fields.columnConfig via useInvoiceSave
    → hydrates from invoice.custom_fields.columnConfig via useInvoiceHydration
```

### Consumers

| Consumer | Entry Point | Lazy Loaded | State Source | Persistence |
|----------|-------------|-------------|--------------|-------------|
| SharedDocumentForm (Invoice) | ActionsSheet → `setShowColumnManager(true)` | ✅ `React.lazy()` | `useInvoiceColumns` hook | `invoice.custom_fields.columnConfig` → Supabase |
| SharedDocumentForm (Quotation) | Same as Invoice | ✅ `React.lazy()` | `useInvoiceColumns` hook | `invoice.custom_fields.columnConfig` → Supabase |
| WaybillForm | Toolbar button → `setShowTableSettings(true)` | ❌ Synchronous import | Manual `useState` (3 separate states) | ❌ Local state only — lost on navigation |

---

## 4. Interaction Inventory

### All Interactive Elements

| Element | Purpose | Rendered Dimensions | Keyboard | ARIA | Persists State |
|---------|---------|-------------------|----------|------|----------------|
| **GripHandle** | Drag-and-drop reorder affordance | 14×20px (w-[14px] h-5) | ✅ Focusable (draggable) | ❌ No aria-label | No (initiates drag) |
| **ReorderButtons — Up** | Move column one position up | 18×14px (w-[18px] h-[14px]) | ✅ Focusable, Enter/Space | ❌ No aria-label | Yes (calls `onMove`) |
| **ReorderButtons — Down** | Move column one position down | 18×14px (w-[18px] h-[14px]) | ✅ Focusable, Enter/Space | ❌ No aria-label | Yes (calls `onMove`) |
| **Eye Toggle** (BuiltIn) | Toggle column visibility (show/hide_display) | 30×28px (w-[30px] h-7) | ✅ Focusable | ✅ `title` attr | Yes (calls `onToggle`) |
| **Financial Toggle** (BuiltIn) | Toggle column visibility (show/hide_full) | 30×28px (w-[30px] h-7) | ✅ Focusable | ✅ `title` attr | Yes (calls `onToggleFull`) |
| **Delete Button** (Custom) | Remove custom column | 30×28px (w-[30px] h-7) | ✅ Focusable | ✅ `title` attr | Yes (calls `onRemoveCustom` with 200ms delay) |
| **Eye Toggle** (Custom) | Toggle custom column visibility | 30×28px (w-[30px] h-7) | ✅ Focusable | ✅ `title` attr | Yes (calls `onToggle`) |
| **Label Input** (all rows) | Edit column label | flex-1, h-9 (36px) | ✅ Focusable, editable | ✅ via `<Input>` | Yes (calls `onUpdate`) |
| **Install Rate Input** | Set install rate multiplier | w-[64px] h-7 (64×28px) | ✅ Focusable, editable | ✅ via `<NumericInput>` | Yes (calls `onUpdate`) |
| **Add Custom Column** | Create new custom column | Full-width button | ✅ Focusable | ❌ No aria-label | Yes (calls `onAddCustom`) |
| **Reset to Defaults** | Reset all columns to defaults | Full-width link | ✅ Focusable | ❌ No aria-label | Yes (opens confirm dialog) |
| **Row Overrides Toggle** | Expand/collapse overrides section | Full-width, h-11 (44px) | ✅ Focusable | ❌ No aria-label | No (local UI state) |
| **Reset Override** | Reset single item override | px-[10px] py-[4px] | ✅ Focusable | ❌ No aria-label | Yes (calls `onResetItemOverrides`) |
| **Reset All Overrides** | Reset all item overrides | Full-width button | ✅ Focusable | ❌ No aria-label | Yes (calls `onResetItemOverrides`) |
| **Done** | Close the sheet | Full-width, h-[54px] | ✅ Focusable | ❌ No aria-label (button text suffices) | No |
| **Close (header X)** | Close the sheet | h-10 w-10 (40×40px) | ✅ Focusable | ✅ `aria-label="Close"` | No |
| **Sheet drag handle** | Visual affordance for bottom sheet | w-12 h-[5px] (48×5px) | ❌ Not interactive | ❌ None | No |
| **Reset Confirm Dialog — Cancel** | Cancel reset | h-10 flex-1 | ✅ Focusable | ✅ Button text | No |
| **Reset Confirm Dialog — Reset** | Confirm reset | h-10 flex-1 | ✅ Focusable | ✅ Button text | Yes (calls `onReset`) |

### Key Observations

- **3 elements have NO accessible name at all:** GripHandle, ReorderButtons (both), and Row Overrides toggle.
- **3 elements have accessible names via `title` attribute only** (not `aria-label`): Eye Toggle, Financial Toggle, Delete Button. The `title` attribute provides an accessible name for screen readers but is not the recommended pattern — `aria-label` is preferred.
- **Section titles use `<div>` not `<h3>`** — not semantic headings for screen reader navigation.
- **No `aria-live` region** for visibility state changes — screen readers do not announce when a column is shown/hidden.

---

## 5. Mobile Layout Audit

### Sheet Behavior on Mobile

The Sheet uses `side="bottom"` with:
- Width: `inset-x-0` (full viewport width)
- Height: `auto` with `max-h-[var(--bd-overlay-sheet-max-height)]`
- Border radius: `rounded-t-[var(--bd-overlay-radius)]` (28px)
- Content padding: `px-4` (16px each side) at mobile, `sm:px-5` (20px) at sm+

### Content Width at Different Viewports

| Viewport | Padding | Content Width | Fit Assessment |
|----------|---------|---------------|----------------|
| 320px | 32px (16×2) | 288px | ⚠️ Tight — label input compresses to ~120px with financial toggle |
| 375px | 32px | 343px | ⚠️ Tight — label input ~175px with financial toggle |
| 390px | 32px | 358px | ✅ Adequate |
| 430px | 32px | 398px | ✅ Comfortable |

### Row Layout at 375px (with financial toggle)

```
[Grip 14px] [Gap 8px] [Arrows 18px] [Gap 8px] [Label flex:1 ~175px] [Gap 8px] [Badge ~40px] [Gap 8px] [Eye 30px] [Gap 4px] [Financial 30px]
Total: 14+8+18+8+175+8+40+8+30+4+30 = 343px ✓
```

### Row Layout at 320px (with financial toggle)

```
[Grip 14px] [Gap 8px] [Arrows 18px] [Gap 8px] [Label flex:1 ~120px] [Gap 8px] [Badge ~40px] [Gap 8px] [Eye 30px] [Gap 4px] [Financial 30px]
Total: 14+8+18+8+120+8+40+8+30+4+30 = 288px ✓ (label input is very compressed)
```

### Scrolling Requirements

At 375px with 9 built-in columns + 2 custom columns + overrides section:
- Each row: ~46px height
- 11 rows × 46px = 506px
- Plus: header (~80px), section titles (~50px), Add Custom button (~44px), Reset link (~36px), Overrides section (~44px collapsed), Done button (~62px)
- Total: ~822px
- Viewport minus keyboard: ~300-350px
- **Vertical scrolling is required** — content overflows by ~470px

### Thumb Reach Concerns

The grip handles and arrow buttons are on the far left of each row. On large phones (e.g., iPhone Pro Max at 430px), reaching the left-side controls with a right thumb requires stretching. The Done button at the bottom is easily reachable.

---

## 6. Touch-Target Audit

### Verification Results

| Element | Source Class | Effective Size | 44px WCAG Min | Status |
|---------|-------------|---------------|---------------|--------|
| Grip handle | `w-[14px] h-5` | 14×20px | ❌ -30px width, -24px height | **FAIL** |
| Arrow button (each) | `w-[18px] h-[14px]` | 18×14px | ❌ -26px width, -30px height | **FAIL** |
| Eye toggle | `w-[30px] h-7` | 30×28px | ❌ -14px width, -16px height | **FAIL** |
| Financial toggle | `w-[30px] h-7` | 30×28px | ❌ -14px width, -16px height | **FAIL** |
| Delete button | `w-[30px] h-7` | 30×28px | ❌ -14px width, -16px height | **FAIL** |
| Close button | `h-10 w-10` | 40×40px | ❌ -4px width, -4px height | **MARGINAL** |
| Done button | `h-[54px] w-full` | Full×54px | ✅ | **PASS** |
| Add Custom Column | Full-width, py-[10px] | Full×~44px | ✅ | **PASS** |
| Row Overrides toggle | Full-width, h-11 | Full×44px | ✅ | **PASS** |
| Reset Override | py-[4px] | ~24px height | ❌ -20px height | **FAIL** |

### Previous Audit Accuracy

The previous audit (`column-manager-ux-audit.md`) correctly identified all failing elements. Its measurements were accurate within 1-2px. The only factual error in the design issue ledger was the grip handle height (claimed 14×14px, actually 14×20px).

---

## 7. Accessibility Audit

### ARIA Labels

| Element | Has accessible name? | Method | Recommendation |
|---------|---------------------|--------|----------------|
| Grip handle | ❌ No | — | Add `aria-label="Drag to reorder"` |
| Arrow up | ❌ No | — | Add `aria-label="Move column up"` |
| Arrow down | ❌ No | — | Add `aria-label="Move column down"` |
| Eye toggle | ✅ Yes | `title` attr | Migrate to `aria-label` for consistency |
| Financial toggle | ✅ Yes | `title` attr | Migrate to `aria-label` for consistency |
| Delete button | ✅ Yes | `title` attr | Migrate to `aria-label` for consistency |
| Close button | ✅ Yes | `aria-label="Close"` | Already correct |
| Done button | ✅ Yes | Button text | Already correct |
| Section titles | ❌ Not semantic | Styled `<div>` | Change to `<h3>` |

### Keyboard Navigation

- Tab order follows DOM order through all interactive elements
- Arrow buttons are focusable and activatable via Enter/Space — keyboard reordering works
- Drag-and-drop is mouse/touch only — arrow buttons serve as the keyboard-accessible reorder mechanism
- Escape key closes the sheet (Radix Dialog behavior)
- Focus trap within the sheet is handled by Radix Dialog

### Focus States

- Input fields: `focus:bg-[var(--bd-surface)] focus:border-[var(--bd-border)]` — visible
- Arrow buttons: `hover:text-[var(--bd-text)]` — hover-only, no visible focus ring
- Grip handle: `opacity-35 hover:opacity-100` — opacity change only, no focus ring
- Eye/Financial/Delete toggles: No explicit focus styling beyond browser default
- Done button: Inherits shadcn Button focus ring

### Screen-Reader Behavior

- Sheet announces "Table Settings" as the dialog title (via Radix Dialog)
- Column labels are editable inputs — accessible
- **Visibility state changes are NOT announced** — no `aria-live` region exists
- **Drag-and-drop state changes are NOT announced** — no live region for reorder feedback

### Missing Semantic Structure

- Section titles ("Standard PDF", "Form Fields") use `<div>` with uppercase styling, not `<h3>` or `<h4>`
- Row items are `<div>` elements, not `<li>` or `<tr>` — acceptable since the list is not a data table
- The overrides section uses a collapsible pattern without `aria-expanded` on the toggle button

---

## 8. Behaviour & Data-Safety Audit

### Path from Interaction to Persistence

**Invoice/Quotation (via SharedDocumentForm):**

```
User action → ColumnManager callback → useInvoiceColumns function → setColumns(state)
  ↓ on save
useInvoiceSave.ts:200 → columnConfig: columns → Supabase invoice.custom_fields.columnConfig
  ↓ on load
useInvoiceHydration.ts:91 → parsed.columnConfig → resolveFinancialColumns() → setColumns()
```

**Waybill:**

```
User action → ColumnManager callback → WaybillForm setState → local columnVisibility/columnTitles/columnOrder
  ↓ on save
buildWaybillCustomFields() → waybill.custom_fields.columnVisibility (NOT columnConfig)
  ↓ on load
parseWaybillCustomFields() → columnVisibility from custom_fields
```

### What Must Remain Unchanged

| Element | Reason |
|---------|--------|
| Column identifiers (`key` values) | Used in PDF generation, calculations, persistence, custom_data mapping |
| Column ordering semantics | Order affects PDF column layout and form display |
| Visibility modes (`show`, `hide_display`, `hide_full`) | `hide_display` hides from form but includes in totals; `hide_full` removes from totals — different financial implications |
| Custom column creation (`custom_<timestamp>`) | Existing documents store these in Supabase |
| Custom column persistence (`custom_fields.columnConfig`) | Changing the schema breaks existing documents |
| Financial column behavior (`install_rate`, `vat_rate`, `discount_rate`) | These columns affect `calcTotals()` and `resolveRowVat()` |
| Per-row overrides (`onResetItemOverrides`) | Override global VAT/discount/install rates per item |
| `description` column locked at position 0 | `moveColumn` enforces `newIdx >= 1` |
| Column label editing | Labels appear on PDF output |
| `TOTAL_AFFECTING_COLUMNS` set | Determines which columns can be fully hidden and which affect totals |
| The `formula` field on `install_rate` | Used as a multiplier in `resolveInstallRate()` |
| Lazy loading via `React.lazy()` | Performance optimization — column manager code is not in main bundle |

### Potential Behavior Risks in Redesign

| Risk | Mitigation |
|------|-----------|
| Changing `onMove` signature could break WaybillForm | Keep `(key: string, targetIdx: number)` interface |
| Changing visibility mode strings could break `resolveColumnBehavior()` | Keep `show`/`hide_display`/`hide_full` as-is |
| Removing custom column animation delay could cause data loss | Keep the 200ms delay or replace with a confirmation |
| Changing the Sheet primitive could break focus management | Keep Radix Dialog-based Sheet |
| Adding `aria-live` region could cause screen reader announcement spam | Use `aria-live="polite"` with debouncing |

---

## 9. Invoice / Quotation / Waybill Comparison

| Aspect | Invoice/Quotation (SharedDocumentForm) | Waybill (WaybillForm) |
|--------|---------------------------------------|----------------------|
| **Column state management** | `useInvoiceColumns` hook (single `useState<ColumnConfig[]>`) | 3 separate `useState` calls: `columnVisibility`, `columnTitles`, `columnOrder` |
| **Column definitions** | 9 built-in (incl. 3 financial) | 6 standard (description, qty, unit, make, partNo, condition) |
| **Financial columns** | ✅ install_rate, vat_rate, discount_rate | ❌ None |
| **Per-row overrides** | ✅ Supported | ❌ Not supported |
| **onToggleFull** | ✅ Active (hide_full removes from totals) | ❌ No-op (empty function) |
| **onResetItemOverrides** | ✅ Passed | ❌ Not passed |
| **Persistence** | `invoice.custom_fields.columnConfig` → Supabase | `waybill.custom_fields.columnVisibility` — NOT `columnConfig` |
| **Lazy loading** | ✅ `React.lazy()` with `<Suspense>` | ❌ Synchronous import |
| **Column limit** | No explicit limit | `WAYBILL_COLUMN_LIMIT` enforced |
| **Duplicate label check** | Not enforced | ✅ Enforced via `feedback.error()` |
| **Entry point** | ActionsSheet → `onOpenColumnManager` | Toolbar button → `setShowTableSettings` |
| **Additional settings** | None | "More Settings" dialog (Terms & Conditions toggle) |
| **Column ordering** | Description locked at position 0; others free | All columns reorderable (no position 0 restriction) |
| **onMove signature** | `onMove(key, targetIdx)` — targetIdx is absolute | Same signature — `onMove(key, dir)` where `dir` is treated as absolute index |

### Key Differences

1. **Waybill has no persistence** — column changes are lost when navigating away.
2. **Waybill has a column limit** — Invoice does not.
3. **Waybill has duplicate label validation** — Invoice does not.
4. **Waybill lacks financial columns** — no install_rate, vat_rate, discount_rate.
5. **Waybill has no per-row overrides** — no `onResetItemOverrides` prop.
6. **Waybill reimports ColumnManager synchronously** — not lazy-loaded.

### Future Redesign Scope

The component can remain shared. If the redesign changes the ColumnManager API (e.g., adding new props), the Waybill's adapter layer must be updated. The Waybill's separate column model (no financial columns, no hide_full) should be preserved as a valid configuration.

---

## 10. Design-System Alignment

### Token Usage

ColumnManager uses the `--bd-*` token system consistently:

| Token Category | Tokens Used |
|---------------|-------------|
| Backgrounds | `--bd-bg`, `--bd-bg2`, `--bd-surface` |
| Text | `--bd-text`, `--bd-text3`, `--bd-text4` |
| Borders | `--bd-border`, `--bd-border-soft` |
| Brand/Semantic | `--bd-rose`, `--bd-rose-bg`, `--bd-rose-border` |
| Overlay | `--bd-overlay-sheet-max-height`, `--bd-overlay-radius` |

**No hardcoded color values** in ColumnManager — all use theme tokens. This is good.

### Hardcoded Dimensions

All interactive element sizes use Tailwind arbitrary values:

- `w-[14px]`, `w-[18px]`, `w-[30px]` — not from the token system
- `h-5`, `h-[14px]`, `h-7`, `h-[54px]` — mix of Tailwind scale and arbitrary values
- `rounded-[6px]`, `rounded-[12px]`, `rounded-[18px]` — arbitrary radius values

### PRD Alignment

Per the Facelift PRD (`04-theme-system.md`):
- Themes change color only — ColumnManager already follows this ✅
- Structural properties (spacing, dimensions) must NOT be theme-dependent ✅
- The touch-target issue is a structural problem, not a theme problem

Per the Facelift PRD (`02-mobile-first-model.md`):
- Mobile includes phone, foldable, tablet — Column Manager must work at all these widths
- The 44px minimum touch target applies across all mobile tiers

---

## 11. DI-001 Reconciliation

| DI-001 Claim | Evidence | Verdict |
|-------------|----------|---------|
| "Grip handles are 14×14px" | Source: `w-[14px] h-5` = 14×20px | **Incorrect** — height is 20px, not 14px |
| "Reorder buttons are 18×14px" | Source: `w-[18px] h-[14px]` per button | **Confirmed** |
| "Small touch targets below 44px minimum" | All controls below 44px | **Confirmed** |
| "Dual reorder mechanism creates cognitive overhead" | Dual mechanism is intentional and beneficial | **Not confirmed** — the dual mechanism is a deliberate accessibility pattern |
| "Dense interaction surface" | 9 columns + overrides + custom + reset | **Confirmed** |
| "Cramped on mobile" | 343px usable width, 6+ controls per row | **Confirmed** |
| "Missing aria-labels on icon-only controls" | Grip and arrow buttons have no aria-label | **Confirmed** |
| "Missing semantic headings" | SectionTitle uses div, not h3 | **Confirmed** |

**DI-001 severity:** Remains **Medium**. The touch-target issue is real and affects mobile usability. The density issue is real but not critical. One factual error found (grip handle height).

---

## 12. Confirmed Problems

| # | Problem | Severity | Evidence |
|---|---------|----------|----------|
| 1 | Arrow buttons (18×14px) are below 44px minimum | High | `w-[18px] h-[14px]` in ReorderButtons |
| 2 | Grip handle (14×20px) is below 44px minimum | High | `w-[14px] h-5` in GripHandle |
| 3 | Eye/Financial/Delete toggles (30×28px) are below 44px minimum | Medium | `w-[30px] h-7` in BuiltInColumnRow, CustomColumnRow |
| 4 | Grip handle and arrow buttons have no aria-label | Medium | No `aria-label` attribute in source |
| 5 | Section titles use `<div>` not `<h3>` | Low | SectionTitle renders `<div>` |
| 6 | Row Overrides toggle has no aria-expanded | Low | `<button>` without `aria-expanded` |
| 7 | No aria-live region for visibility state changes | Low | No live region in source |
| 8 | Close button is 40×40px (marginally below 44px) | Low | `h-10 w-10` = 40×40px |

---

## 13. Rejected / Unproven Claims

| Claim | Status | Reason |
|-------|--------|--------|
| "Dual reorder creates cognitive overhead" | Rejected | The dual mechanism is intentional and serves different device/accessibility needs |
| "Grip handle is 14×14px" | Incorrect | Actual dimensions are 14×20px |
| "Drag-and-drop should be removed" | Rejected | HTML5 drag-and-drop is the primary desktop reorder mechanism |

---

## 14. Recommended Future Design

### MUST CHANGE

| Change | Reason | Files Affected |
|--------|--------|----------------|
| Increase arrow button touch targets to 44×44px | Current 18×14px fails WCAG 2.5.5 | `ColumnManager.tsx` |
| Increase grip handle touch target to 44×44px | Current 14×20px fails WCAG 2.5.5 | `ColumnManager.tsx` |
| Add `aria-label` to arrow buttons | Screen readers cannot identify chevron icons | `ColumnManager.tsx` |
| Add `aria-label` to grip handles | Screen readers cannot identify drag affordance | `ColumnManager.tsx` |

### SHOULD CHANGE

| Change | Reason | Files Affected |
|--------|--------|----------------|
| Increase eye/financial/delete toggle targets to 44×44px | 30×28px is below 44px minimum | `ColumnManager.tsx` |
| Change section titles from `<div>` to `<h3>` | Better screen reader navigation | `ColumnManager.tsx` |
| Add `aria-expanded` to Row Overrides toggle | Standard collapsible pattern | `ColumnManager.tsx` |
| Add `aria-live="polite"` region for visibility changes | Announce column show/hide to screen readers | `ColumnManager.tsx` |
| Increase close button to 44×44px | 40×40px is marginally below minimum | `ColumnManager.tsx` |
| Reduce visual density on mobile (increase row height, spacing) | 9 columns + overrides is dense at 375px | `ColumnManager.tsx` |

### MUST NOT CHANGE

| Element | Reason |
|---------|--------|
| Column ordering semantics | `description` locked at position 0; `onMove(key, targetIdx)` interface |
| Visibility mode behavior | `show`/`hide_display`/`hide_full` — different financial implications |
| Custom column creation and persistence | Existing documents store `custom_<timestamp>` keys |
| Per-row overrides | Valuable power-user feature |
| Financial column behavior | Affects `calcTotals()` and `resolveRowVat()` |
| The dual reorder mechanism (drag + arrows) | Complementary accessibility pattern |
| The Sheet primitive (Radix Dialog) | Accessibility foundation |
| Lazy loading via `React.lazy()` | Performance optimization |
| `TOTAL_AFFECTING_COLUMNS` set | Determines financial column behavior |
| `formula` field on `install_rate` | Used as multiplier in `resolveInstallRate()` |
| The `onUpdate` callback signature | Used by both Invoice/Quotation and Waybill |
| The `onMove` callback signature | Used by both Invoice/Quotation and Waybill |
| The `onToggleFull` callback signature | Active for Invoice/Quotation, no-op for Waybill |

### OUT OF SCOPE

| Work | Why |
|------|-----|
| Dashboard redesign | Separate facelift phase |
| Navigation redesign | Separate facelift phase |
| Document form redesign | Separate facelift phase |
| PDF column redesign | Separate facelift phase |
| Schema changes | No database changes in this pass |
| Toast consolidation | DI-005 — separate fix |
| CSS Module deduplication | DI-003 — separate fix |
| framer-motion removal | DI-004 — separate fix |
| Waybill persistence consolidation | Requires separate investigation |

---

## 15. Implementation Scope Proposal

### Phase 1: Touch Targets & Accessibility (Safe)

**Scope:** `ColumnManager.tsx` only.

1. Increase arrow button container to 44×44px (visual icon stays small, padding expands)
2. Increase grip handle container to 44×44px (visual dots stay small, padding expands)
3. Increase eye/financial/delete toggle containers to 44×44px
4. Add `aria-label` to grip handles, arrow buttons, Row Overrides toggle
5. Add `aria-expanded` to Row Overrides toggle
6. Change section titles from `<div>` to `<h3>`
7. Add close button to 44×44px

**Risk:** Low. Visual appearance changes but all callback/API surfaces remain identical.

### Phase 2: Mobile Density (Moderate)

**Scope:** `ColumnManager.tsx` only.

1. Increase row minimum height from 46px to 52px on mobile
2. Increase padding inside rows for better touch spacing
3. Consider hiding the install_rate multiplier input behind a tap-to-expand pattern on mobile

**Risk:** Low. Layout changes but no behavioral changes.

### Phase 3: Waybill Investigation (Separate)

**Scope:** Investigate whether Waybill should persist column config like Invoice/Quotation.

**Risk:** Requires understanding Waybill save flow.

---

## 16. Acceptance Criteria for Future Implementation

1. All interactive elements meet 44×44px minimum touch target
2. All icon-only controls have `aria-label`
3. Section titles use semantic headings
4. Row Overrides toggle has `aria-expanded`
5. Visibility state changes are announced to screen readers
6. Column ordering semantics unchanged
7. Visibility mode semantics unchanged
8. Custom column creation and persistence unchanged
9. Financial column behavior unchanged
10. Per-row overrides behavior unchanged
11. Dual reorder mechanism preserved
12. Sheet primitive (Radix Dialog) preserved
13. Lazy loading preserved
14. `onMove(key, targetIdx)` signature unchanged
15. `onToggleFull(key)` signature unchanged
16. `onUpdate(key, field, value)` signature unchanged
17. `bun run typecheck` passes
18. `git status` confirms only intended files changed

---

## 17. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Increasing touch targets may change row layout at narrow viewports | Medium | Low | Test at 320px; may need responsive row layout |
| Adding aria-live may cause excessive screen reader announcements | Low | Medium | Use `polite` with appropriate debouncing |
| Waybill's separate column model may diverge from Invoice/Quotation over time | Medium | Medium | Document the divergence; consolidate in separate pass |
| Keyboard reorder may feel slow for many columns | Low | Low | Arrow buttons already exist for this; consider keyboard shortcuts in future |

---

## 18. Final Recommendation

**READY FOR DESIGN**

The Column Manager has genuine mobile UX issues that justify a scoped redesign. The smallest safe scope is Phase 1 (touch targets + accessibility), which touches only `ColumnManager.tsx` and changes no behavioral semantics.

STOP — Column Manager implementation is not authorized in this pass.
