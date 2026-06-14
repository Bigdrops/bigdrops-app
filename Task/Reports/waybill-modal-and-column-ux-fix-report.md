# Waybill Modal Stacking & Column UX Fix Report

## Date
2026-06-14

## Fix 1: Waybill Delete Modal Blocked by Action Sheet

### Problem
The Waybill action sheet used `closeOnClick: false` on delete/archive actions to prevent the action sheet from closing (which would null out `activeWaybill` needed by the handlers). However, this kept the action sheet open on top of the confirmation dialog, making the dialog unclickable (especially on mobile).

### Root Cause
The action sheet's `open` prop was simply `Boolean(activeWaybill)` — it only closed when `activeWaybill` was set to null. Since `closeOnClick: false` prevented the action sheet from closing, the `ConfirmActionDialog` rendered underneath the still-open action sheet, causing a modal stacking issue.

### Solution
Applied the same pattern used in `Invoices.tsx`:

- **Before:** `open={Boolean(activeWaybill)}`
- **After:** `open={Boolean(activeWaybill) && !archiveId && !deleteId}`

When the delete/archive action's `onClick` sets `deleteId`/`archiveId`, the action sheet's `open` prop re-evaluates to `false` (because `!deleteId` or `!archiveId` becomes `false`), causing the sheet to close. Simultaneously, the `ConfirmActionDialog` opens because it reads the same `deleteId`/`archiveId` state. The `closeOnClick: false` is preserved to prevent the sheet from calling `onOpenChange(false)` which would null out `activeWaybill`.

### Files Changed
- `src/pages/Waybills.tsx:224` — changed `open` prop on `InvoiceListActionSheet`

---

## Fix 2: Column Duplicate Name Toast Feedback

### Problem
Renaming a column to an existing name in the Column Manager (Table Settings) silently rejected the update with no user-visible feedback. Users had no indication why their rename didn't work.

### Root Cause
The `onUpdate` handler in `WaybillForm.tsx` performed a duplicate name check via `allColumns.some(...)`, but when a duplicate was detected, it simply `return`ed without any feedback call.

### Solution
Added `feedback.error(...)` call before the `return` statement in the duplicate detection path, matching the pattern used elsewhere in the codebase (e.g., `feedback.warning` for column limit).

### Files Changed
- `src/components/waybill/WaybillForm.tsx:290` — added `feedback.error(...)` call on duplicate column rename

---

## Verification
- `bun run typecheck` — passes clean
- No runtime errors expected (no logic changes, only UX flow and feedback additions)
