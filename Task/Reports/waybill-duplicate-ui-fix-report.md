# Waybill Form: Duplicate Line Items UI Fix

## Summary

Removed duplicate "Line Items" section label in `WaybillForm.tsx` that was rendering twice — once from a standalone `<SectionLabel>` wrapper and once from `<FormLineItems>`. Fixed default column visibility to include the `unit` column. Synced column toggle behavior so custom columns default to visible.

## Changes

### FIX 1: Remove Duplicate Line Items UI Label

**File:** `src/components/waybill/WaybillForm.tsx`

- Removed the outer `<SectionLabel>` wrapper containing "Line Items" label and item count.
- Removed the wrapping `<div>` that surrounded it.
- Removed the unused `List` import from `lucide-react`.
- The `<FormLineItems>` component already renders its own label, counter, and toolbar — no need for a duplicate.

### FIX 2: Default `unit` Column to Visible

**File:** `src/components/waybill/WaybillForm.tsx`

Three locations changed:

1. **Initial `columnVisibility` state** — added `unit: true` to the default `Record<string, boolean>`.
2. **`DEFAULT_WAYBILL_COLUMNS`** — added `{ key: "unit", label: "Unit", visible: true }` so the ColumnManager defaults include it.
3. **Reset function** — `unit` included in the reset object so resetting columns restores unit visibility.

### FIX 3: Default Custom Columns to Visible in `isColumnVisible`

**File:** `src/components/waybill/WaybillForm.tsx`

- Added `custom_` prefix check to `isColumnVisible`: if a column key starts with `custom_` and is not explicitly toggled off, it defaults to `true`.

## Verification

| Check | Result |
|---|---|
| `bun run audit:load` | Passed (pre-existing warnings only) |
| `bun run typecheck` | Passed (0 errors) |
| `bun run build` | Passed (built in 3m 33s) |
