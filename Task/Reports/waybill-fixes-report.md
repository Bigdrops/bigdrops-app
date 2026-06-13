# Waybill Fixes Report

## Summary

All fixes from the waybill implementation session.

---

### 1. Fix: Remove inline ColumnManager, replace FAB with FormFooter

- **File:** `src/components/waybill/WaybillForm.tsx`
- **Change:** Replaced the inline `ColumnManager` component (rendered inside a `Sheet`) with the shared `TableSettingsModal` component. Replaced the FAB (floating action button) with the standard shared `FormFooter` component used by invoices and quotations.
- **Commit:** `f56eb74`

---

### 2. Fix: `saveWaybill` missing `time` field in payload

- **File:** `src/domain/waybill/waybillMutations.ts`
- **Change:** Moved `nullIfEmpty` helper before its first usage. Added `time: dbTime` to the mutation payload so the waybill's scheduled time is persisted.
- **Commit:** `c6614c3` (included in the same commit as the FormLineItems change)

---

### 3. Fix: Toast text overflow/readability

- **Files:** `src/lib/feedback.ts`, `src/styles/formTheme.css`
- **Change:** Reduced toast max-width from `90vw` to `85vw`. Added `overflow-wrap: break-word` and `word-break: break-word` to prevent long text from overflowing the toast container.
- **Commit:** `c6614c3`

---

### 4. Fix: Make Add Group button conditional in FormLineItems

- **Files:** `src/components/document/FormLineItems.tsx`, `src/components/waybill/WaybillForm.tsx`
- **Change:** Made `onAddGroup` prop optional in `FormLineItemsProps`. Wrapped the "Add group" button in `{onAddGroup && (...)}` so it only renders when the callback is provided. Removed the empty `onAddGroup={() => {}}` stub from `WaybillForm.tsx`.
- **Impact:** The "Add group" button no longer appears in waybill forms. Invoice and quotation forms are unaffected (they still pass `onAddGroup`).
- **Commit:** `c6614c3`

---

## Verification

- `bun run typecheck` passes with no errors.
- All changes have been pushed to `origin/main`.
