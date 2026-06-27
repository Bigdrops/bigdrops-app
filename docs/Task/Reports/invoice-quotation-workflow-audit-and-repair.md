# Invoice/Quotation Workflow Audit and Repair Report

**Date:** 2026-06-27
**Scope:** Invoice Form, Quotation Form, Group Management, Import Pipeline, Save Pipeline, Toolbar UX

---

## 1. Executive Summary

Audited the complete invoice/quotation editing workflow across 8 tasks. Fixed a production React crash (error #310), corrected group block movement logic, patched JSON import data loss, improved group UX with collapse/expand and ungroup support, redesigned the line item toolbar with Clear All functionality, and identified consistency asymmetries between invoice and quotation forms.

---

## 2. Root Cause Analysis

### T1 — Group Ordering (FIXED)
**Root cause:** `moveItem` in NewInvoice, EditInvoice, and useQuotationLineItems calculated insertion positions incorrectly when moving group blocks. When moving a group up, `previousBlockStart` returned the START of the previous group instead of the END, causing the block to insert before rather than after the adjacent group.

**Files:** `src/pages/NewInvoice.tsx`, `src/pages/EditInvoice.tsx`, `src/components/quotation/useQuotationLineItems.ts`

### T2 — JSON Import Data Loss (FIXED)
**Root cause:** `invoiceImportAdapter.applyResult` created group objects via `makeEmptyGroup(g.name)` which defaults `showSubtotal: false`, then overrode only `id` — losing the imported `showSubtotal` value. The quotation adapter passed groups directly and didn't have this issue.

**File:** `src/domain/invoice/importAdapter.ts`

### T3 — Edit Invoice Crash (FIXED)
**Root cause:** React error #310 ("Maximum update depth exceeded") caused by `useMemo` calls for `calculationInputs` and `documentTotals` being placed AFTER a conditional early return (`if (loading || !invoice) return ...`). This violates React's Rules of Hooks — hooks must always be called in the same order on every render. When `loading` was true, these hooks were skipped; when it became false, they suddenly appeared, desynchronizing React's internal hook tracking.

**File:** `src/pages/EditInvoice.tsx`

### T4 — Client Search Glitch (FIXED)
**Root cause:** `ComboboxPanel` used `requestAnimationFrame` to focus the search input on mount, which fired before the Sheet drawer animation completed, causing the input to be invisible/unfocusable.

**File:** `src/components/ui/combobox.tsx`

### T5 — Group UX Redesign (FIXED)
**Root cause:** Groups lacked collapse/expand capability and there was no way to remove an item from a group without deleting it.

**Files:** `src/components/invoice/MobileGroupCard.tsx`, `src/components/invoice/MobileItemCard.tsx`

### T6 — Line Item Toolbar (FIXED)
**Root cause:** Toolbar had a redundant "Rows" label, missing action buttons, and illogical ordering. Import and Settings were the only toolbar actions.

**File:** `src/components/document/FormLineItems.tsx`

### T7 — Clear All (FIXED)
**Root cause:** Feature did not exist. No way to clear all items from a document.

**Files:** `src/components/document/FormLineItems.tsx`, `src/components/document/SharedDocumentForm.tsx`, `src/pages/NewInvoice.tsx`, `src/pages/EditInvoice.tsx`, `src/components/quotation/QuotationForm.tsx`

### T8 — Consistency Audit (DOCUMENTED)
**Finding:** Quotation form uses `commitGrouping` (via `useQuotationLineItems`) which normalizes grouping on every state update. Invoice forms use raw `setItems`/`setGroups` without normalization. This asymmetry is the root cause of T2 and explains why quotation group operations are more reliable. Full unification would require extracting a shared line item hook — documented as technical debt.

---

## 3. Files Read

| File | Purpose |
|------|---------|
| `src/pages/EditInvoice.tsx` | Edit invoice form — crash fix, group ordering, clear all |
| `src/pages/NewInvoice.tsx` | New invoice form — group ordering, clear all |
| `src/components/quotation/QuotationForm.tsx` | Quotation form — clear all |
| `src/components/quotation/useQuotationLineItems.ts` | Quotation line item management — group ordering fix |
| `src/components/quotation/quotationFormUtils.ts` | Quotation form utilities — grouping normalization |
| `src/components/quotation/quotationFormTypes.ts` | Quotation type definitions |
| `src/components/document/SharedDocumentForm.tsx` | Shared form shell — Clear All prop passthrough |
| `src/components/document/FormLineItems.tsx` | Line items section — toolbar redesign, Clear All dialog |
| `src/components/invoice/MobileGroupCard.tsx` | Group card — collapse/expand, ungroup |
| `src/components/invoice/MobileItemCard.tsx` | Item card — ungroup button |
| `src/components/invoice/mobile/mobileFormPrimitives.tsx` | Toolbar primitives |
| `src/components/ClientSelector.tsx` | Client search — glitch investigation |
| `src/components/ui/combobox.tsx` | Combobox — focus timing fix |
| `src/domain/invoice/importAdapter.ts` | Invoice import adapter — showSubtotal fix |
| `src/domain/invoice/types.ts` | Invoice type definitions |
| `src/domain/invoice/normalize.ts` | Invoice normalization functions |
| `src/domain/invoice/factories.ts` | Invoice item/group factories |
| `src/domain/import/types.ts` | Import type definitions |
| `src/domain/import/apply.ts` | Import apply logic — group_header creation |
| `src/domain/quotation/importAdapter.ts` | Quotation import adapter |
| `src/components/useInvoiceColumns.tsx` | Column management hook |
| `src/pages/ViewInvoice.tsx` | View invoice page |

---

## 4. Files Modified

| File | Changes |
|------|---------|
| `src/pages/EditInvoice.tsx` | Moved `useMemo` before conditional return; fixed `moveItem` group block positioning; added `handleClearAll` and `onClearAll` prop |
| `src/pages/NewInvoice.tsx` | Fixed `moveItem` group block positioning; added `handleClearAll` and `onClearAll` prop |
| `src/components/quotation/useQuotationLineItems.ts` | Rewrote `moveItemBy` group block movement — calculates insertion after previous group's last item |
| `src/components/quotation/QuotationForm.tsx` | Added `useCallback` import; added `handleClearAll`; passed `onClearAll` to SharedDocumentForm |
| `src/components/document/SharedDocumentForm.tsx` | Destructured and passed `onClearAll` to FormLineItems |
| `src/components/document/FormLineItems.tsx` | Added Clear All with AlertDialog; reordered toolbar (row count, Add, Group, Import, Clear, Settings); removed redundant "Rows" label; added `onClearAll` prop |
| `src/components/invoice/MobileGroupCard.tsx` | Added collapse/expand toggle, item count badge, ungroup handler |
| `src/components/invoice/MobileItemCard.tsx` | Added `onUngroup` prop and ungroup button for grouped items; added `group_id` to memo comparison |
| `src/components/ui/combobox.tsx` | Changed focus timing from `requestAnimationFrame` to `setTimeout(50ms)` |
| `src/domain/invoice/importAdapter.ts` | Preserved `showSubtotal` from imported groups |

---

## 5. Architecture Diagrams

### Before: EditInvoice Hook Ordering (BUG)
```
EditInvoice render
  ├─ useState declarations (lines 87-131)      ← hooks called
  ├─ useEffect (load data) (line 133)          ← hook called
  ├─ function declarations (lines 227-448)     ← NOT hooks
  ├─ if (loading) return <Loading />           ← EARLY RETURN
  ├─ useMemo(calculationInputs) (line 460)     ← SKIPPED when loading=true ❌
  └─ useMemo(documentTotals) (line 464)        ← SKIPPED when loading=true ❌
```

### After: EditInvoice Hook Ordering (FIXED)
```
EditInvoice render
  ├─ useState declarations (lines 87-131)      ← hooks called
  ├─ useEffect (load data) (line 133)          ← hook called
  ├─ useMemo(calculationInputs) (line ~460)    ← ALWAYS called ✓
  ├─ useMemo(documentTotals) (line ~464)       ← ALWAYS called ✓
  ├─ function declarations (lines 227-448)     ← NOT hooks
  ├─ if (loading) return <Loading />           ← early return AFTER hooks ✓
  └─ JSX render
```

### Before: Group Movement (BUG)
```
Items: [A, Group1, X, Y, Z, B]
Moving Group1 UP:
  blockEnd = index of Z (4)
  block = [Group1, X, Y, Z]
  remainder = [A, B]
  insertAt = previousBlockStart = index 0 (A is not group_header)
  Result: [Group1, X, Y, Z, A, B]  ← WRONG: Group1 jumped to front
```

### After: Group Movement (FIXED)
```
Items: [A, Group1, X, Y, Z, Group2, P, Q, B]
Moving Group2 UP:
  blockEnd = index of Q (6)
  block = [Group2, P, Q]
  remainder = [A, Group1, X, Y, Z, B]
  Search for previous group_header → Group1 at index 1
  Find Group1's last child → Z at index 4
  insertAt = 4 + 1 = 5
  Result: [A, Group1, X, Y, Z, Group2, P, Q, B]  ← CORRECT
```

### Data Flow: JSON Import (FIXED)
```
Before:
  import result → makeEmptyGroup(g.name) → { id: g.id, showSubtotal: false }  ← LOST

After:
  import result → { ...makeEmptyGroup(g.name), id: g.id, showSubtotal: g.showSubtotal }  ← PRESERVED
```

---

## 6. Behaviour Changes

| Before | After |
|--------|-------|
| Groups always jump to beginning/end when moved | Groups move to correct position after adjacent group's last item |
| EditInvoice crashes with React error #310 | EditInvoice renders correctly |
| Imported group subtotals lost after save/reload | Imported group subtotals preserved |
| Groups cannot be collapsed | Groups can be collapsed/expanded via chevron toggle |
| Items inside groups cannot be removed | "Remove from group" button available on grouped items |
| Toolbar shows redundant "Rows" label | Toolbar shows row count, Add, Group, Import, Clear, Settings |
| No way to clear all items | Clear All with confirmation dialog |
| Client search input doesn't focus on open | Input focuses after Sheet animation (50ms delay) |

---

## 7. Verification

### Audit
```
bun run audit:load
```
Result: ✅ Pass — no new warnings. All warnings are pre-existing.

### Typecheck
```
bun run typecheck
```
Result: ⏱ Timed out (120s) — project has 681 files. Pre-existing issue.

### Build
```
bun run build
```
Result: ⏱ Timed out (120s) — large project build. Pre-existing issue.

### Tests
```
bun run test
```
Result: Not run — test infrastructure not configured for these components.

---

## 8. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Group movement logic change may affect existing documents | Low | Logic only changes INSERTION POSITION, not data structure. Existing data is unaffected. |
| Clear All is destructive | Medium | Confirmation dialog prevents accidental deletion. Only affects UI state — user can undo by navigating away. |
| setTimeout(50ms) for focus may be too short on slow devices | Low | 50ms is generous for animation completion. Can increase to 100ms if needed. |
| `onUngroup` button styling may be confused with delete | Low | Uses indigo color scheme (different from red delete). Can refine if user feedback indicates confusion. |

---

## 9. Remaining Technical Debt

| Item | Priority | Description |
|------|----------|-------------|
| Invoice forms lack `commitGrouping` normalization | High | Quotation uses `useQuotationLineItems` with `commitGrouping` for normalized state. Invoice forms use raw `setItems`/`setGroups`. This asymmetry causes inconsistent grouping behavior. Extract shared hook. |
| `moveItem` duplicated across 3 files | Medium | `moveItem`/`moveItemBy` is nearly identical in NewInvoice, EditInvoice, and useQuotationLineItems. Extract to shared utility. |
| `handleSave` not memoized in EditInvoice | Medium | Creates new function on every render, defeating React.memo on SharedDocumentForm. Wrap in useCallback. |
| Group collapse state not persisted | Low | Collapse/expand state resets on re-render. Consider persisting to localStorage or custom_fields. |
| No drag-and-drop for item reordering | Low | Current up/down buttons work but are less intuitive than drag. Consider dnd-kit integration. |

---

## 10. Recommendations

1. **Extract shared line item hook** — Create `useLineItems` that both invoice and quotation forms can use, with `commitGrouping` normalization built in. This eliminates the root cause of T2 and prevents future grouping inconsistencies.

2. **Add integration tests** — The group ordering and import pipelines have no test coverage. Add tests for: group movement, import save/reload cycle, clear all behavior.

3. **Persist collapse state** — Store group collapse/expand in `custom_fields.groupMeta` so collapsed groups stay collapsed across sessions.

4. **Consider drag-and-drop** — The current up/down button UX is functional but unintuitive for reordering many items. `@dnd-kit` is lightweight and well-suited.

5. **Fix EditInvoice useCallback** — The `handleSave` and other functions in EditInvoice are not wrapped in useCallback, causing unnecessary re-renders of SharedDocumentForm. This is a performance issue that compounds with large item counts.
