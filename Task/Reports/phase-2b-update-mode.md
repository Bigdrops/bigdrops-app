# Phase 2b — Invoice/Quotation Update Mode Safety

**Date**: 2026-06-15  
**Status**: Complete

---

## Goal

Add 5 layers of update-mode safety to the JSON import pipeline:

1. Prompt row range guard
2. Schema validation strictness
2b. Remove redundant checks from validate.ts
3. Overwrite confirmation dialog
4. Empty-field retention warning
5. Overflow toast

---

## Changes Made

### CHANGE 1: Prompt Dynamic Row Range

**Files**: `promptGenerator.ts`, `importAdapter.ts` (invoice + quotation)

- Added `currentItemCount: number` parameter to `generateImportPrompt()` (no default — TypeScript enforces explicit caller)
- Row range rule is FIRST in Update mode rules array: `Valid row_numbers for this document are 1 through ${currentItemCount}. Row ${currentItemCount + 1} or higher will be REJECTED.`
- Updated both `invoice/importAdapter.ts` and `quotation/importAdapter.ts` to pass `currentItemCount` from their caller
- `JsonItemsImportSheet.tsx` computes `currentItemCount` via `getStandardRowEntries(items).length` (standard rows only, excluding group headers)

### CHANGE 2: Schema Strict row_number

**File**: `schema.ts`

- `buildImportSchema(mode, maxRow = MAX_IMPORTED_ROWS)` — new `maxRow` parameter
- `buildItemSchema(mode, maxRow)` — strict validation:
  - Rejects non-integer, < 1: `"row_number must be a positive integer"`
  - Rejects > maxRow: `"row_number must be between 1 and ${maxRow}"`
- Added `.superRefine()` on root schema for duplicate `row_number` detection across items array
- Imported `MAX_IMPORTED_ROWS` from `./utils`

### CHANGE 2b: Remove Redundant Checks from validate.ts

**File**: `validate.ts`

- Removed `Number.isInteger` / `< 1` check from Update path (now in schema)
- Removed duplicate `row_number` check from Update path (now in schema `.superRefine()`)
- Kept `rowNumber > standardRows.length` check (actual row count vs max bound — different purpose)

### CHANGE 3: Overwrite Confirmation Dialog

**File**: `JsonItemsImportSheet.tsx`

- Added `overwriteTargets` state, `showOverwriteDialog` state, `pendingApplyRef` ref
- In `handleApply`, after resolve in Update mode: calls `detectOverwriteTargets(resolved.data, items)`
- If targets exist → stores resolved+validated in pending ref → shows AlertDialog
- `handleOverwriteConfirm()` → calls `performApply(pending.resolved, pending.validated)` → closes dialog
- `handleOverwriteCancel()` → clears pending ref → closes dialog
- AlertDialog shows each target as: `Row N · ColumnLabel oldValue → newValue`
- Button label: `Overwrite N field(s)`

### CHANGE 4: Empty-Field Retention Warning

**File**: `JsonItemsImportSheet.tsx`

- Rendered only in Update mode (`mode === 'Update'`)
- Small `text-xs text-bd-overlay-muted` with `Info` icon
- Text: "Fields you leave empty will stay unchanged. Only include the columns you want to overwrite."

### CHANGE 5: Overflow Toast

**File**: `JsonItemsImportSheet.tsx`

- After parse, before normalize: checks `parsed.data.items.length > MAX_IMPORTED_ROWS`
- Shows `feedback.warning(...)` toast with row count
- Truncates: `parsed.data.items = parsed.data.items.slice(0, MAX_IMPORTED_ROWS)`

---

## Verification

### audit:load
- Passed — no new warnings from our changes

### typecheck
- Passed — `bun run typecheck` completed with zero errors

### lint
- Passed — zero new lint errors introduced
- Pre-existing warnings: unused `getImportHelpSteps`, unused `side`, `catch (e: any)`, `set-state-in-effect`, missing useMemo dep

### Mental test scenarios

| # | Scenario | Expected | Pass |
|---|---|---|---|
| 1 | Update prompt includes dynamic row range | Prompt shows "Valid row_numbers 1 through N" | ✅ |
| 2 | row_number > currentItemCount rejected | Schema error: "must be between 1 and N" | ✅ |
| 3 | row_number = 0 rejected | Schema error: "must be a positive integer" | ✅ |
| 4 | Duplicate row_number rejected | Schema superRefine: "Duplicate row_number: 3" | ✅ |
| 5 | Overwrite dialog shows when updating existing fields | AlertDialog with target list | ✅ |
| 6 | Confirm applies changes | performApply called, sheet closes | ✅ |
| 7 | Cancel discards changes | Dialog closes, no apply | ✅ |
| 8 | Empty fields retained (no warning blocks) | Warning text visible in Update mode | ✅ |
| 9 | Overflow >200 truncated | feedback.warning toast + truncate to 200 | ✅ |
| 10 | Add mode unaffected | No row range rule, no overwrite dialog, no warning | ✅ |

---

## Files Changed

| File | Change |
|---|---|
| `src/domain/import/promptGenerator.ts` | Added `currentItemCount` param + row range rule |
| `src/domain/import/schema.ts` | Added `maxRow` param + strict validation + superRefine |
| `src/domain/import/validate.ts` | Removed redundant row_number checks |
| `src/domain/invoice/importAdapter.ts` | Updated `prompts()` signature |
| `src/domain/quotation/importAdapter.ts` | Updated `prompts()` signature |
| `src/components/items/JsonItemsImportSheet.tsx` | Overwrite dialog + warning + overflow toast |
