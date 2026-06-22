# Waybill Canonical Contract v2 — Runtime Enforcement + Column Authority

**Prompt:** prompt86i
**Date:** 2026-06-19
**Status:** ✅ Complete

---

## Summary

Wired canonical contract assertions into runtime boundaries (normalize, persistence), established `STANDARD_ITEM_COLUMNS` as the single source of truth for column definitions across Form, PDF, and ViewWaybill, added `condition` to the canonical column set, and verified the full round-trip with golden tests.

**Tests:** 32/32 pass | **Typecheck:** 0 errors | **Audit:** clean

---

## Changes Made

### OBJECTIVE 1 — Runtime Enforcement

| File | Change | Line(s) |
|---|---|---|
| `src/components/waybill/waybillUtils.ts` | `normalizePrimitiveValue` now preserves booleans (`return value` instead of `return value ? 'Yes' : 'No'`). Return type updated to `string \| number \| boolean \| null`. | 639-644 |
| `src/components/waybill/waybillUtils.ts` | `custom_data` type annotation in `normalizeWaybillItem` changed from `Record<string, string \| number \| null>` to `WaybillItemCustomData`. | 412 |
| `src/components/waybill/waybillUtils.ts` | Added import for `assertNoExtensionFieldsOutsideCustomData` from contract module. | 3 |
| `src/components/waybill/waybillUtils.ts` | Wired `assertNoExtensionFieldsOutsideCustomData(result, 'normalizeWaybillItem')` after normalization return value construction. | 423-431 |
| `src/domain/waybill/waybillMutations.ts` | Added import for `assertNoExtensionFieldsOutsideCustomData`. | 6 |
| `src/domain/waybill/waybillMutations.ts` | Wired assertion loop: `for (const item of items) { assertNoExtensionFieldsOutsideCustomData(item, 'saveWaybill:pre-persist') }` before DB insert/update. | 33-36 |

**Key fix:** `normalizePrimitiveValue` was converting booleans to `'Yes'`/`'No'` strings, violating the v2 contract (`custom_data` allows `string | number | boolean | null`). Now preserves booleans as-is.

### OBJECTIVE 2 — Single Column Authority

| File | Change |
|---|---|
| `src/domain/waybill/contracts/waybillContract.ts` | Added `{ key: 'condition', label: 'Condition', defaultVisible: false }` to `STANDARD_ITEM_COLUMNS`. |
| `src/components/waybill/WaybillForm.tsx` | Replaced 6-column `DEFAULT_WAYBILL_COLUMNS` with `STANDARD_ITEM_COLUMNS.map(...)`. |
| `src/components/waybill/WaybillForm.tsx` | Replaced hardcoded `columnVisibility` default with `Object.fromEntries(STANDARD_ITEM_COLUMNS.map(c => [c.key, c.defaultVisible]))`. |
| `src/components/waybill/WaybillForm.tsx` | Replaced hardcoded `columnTitles` with `Object.fromEntries(STANDARD_ITEM_COLUMNS.map(c => [c.key, c.label]))`. |
| `src/components/waybill/WaybillForm.tsx` | Replaced hardcoded `columnOrder` with `STANDARD_ITEM_COLUMNS.map(c => c.key)`. |
| `src/components/waybill/WaybillForm.tsx` | Replaced hardcoded `onReset` column definitions with `STANDARD_ITEM_COLUMNS`-derived values. |
| `src/components/waybill/WaybillPDF.tsx` | Replaced inline `labels` map in `getColumnLabel` with `STANDARD_ITEM_COLUMNS.find(...)`. |
| `src/pages/ViewWaybill.tsx` | Replaced hardcoded `columnVisibility` and `columnTitles` props with `STANDARD_ITEM_COLUMNS`-derived values. |

**Column definitions before (6 duplicate locations):**

| Location | Keys |
|---|---|
| `waybillContract.ts` STANDARD_ITEM_COLUMNS | description, quantity, unit, make, partNo |
| WaybillForm DEFAULT_WAYBILL_COLUMNS | description, quantity, unit, make, partNo, condition |
| WaybillForm columnTitles | description, quantity, unit, make, partNo, condition |
| WaybillForm columnOrder | description, quantity, unit, make, partNo, condition |
| WaybillPDF getColumnLabel | description, quantity, unit, condition, make, partNo |
| ViewWaybill props | description, quantity, unit, condition, make, partNo |

**After (1 canonical source):**

All 6 locations now derive from `STANDARD_ITEM_COLUMNS` in `waybillContract.ts`: `description`, `quantity`, `unit`, `make`, `partNo`, `condition`.

### OBJECTIVE 3 — Golden Round-Trip Test

Added 2 golden round-trip tests to `src/tests/critical/waybillContract.test.js`:

1. **Full round-trip with booleans:** Source item with `make`, `partNo`, `isFragile` (boolean), `voltage` (number), `warehouse_location` (null) → normalize → DB save (custom_data included) → DB load → assert all 5 keys preserved with correct types.

2. **Empty custom_data chain:** Source with empty `custom_data` → normalize → DB save (custom_data omitted from payload) → DB load (defaults to `{}`) → assert no breakage.

---

## Files Modified

| File | Lines Changed |
|---|---|
| `src/components/waybill/waybillUtils.ts` | ~8 lines (normalizePrimitiveValue, type annotation, import, assertion) |
| `src/domain/waybill/waybillMutations.ts` | ~4 lines (import, assertion loop) |
| `src/domain/waybill/contracts/waybillContract.ts` | 1 line (condition added) |
| `src/components/waybill/WaybillForm.tsx` | ~20 lines (5 locations replaced with STANDARD_ITEM_COLUMNS) |
| `src/components/waybill/WaybillPDF.tsx` | ~6 lines (import, getColumnLabel) |
| `src/pages/ViewWaybill.tsx` | ~3 lines (import, props) |
| `src/tests/critical/waybillContract.test.js` | ~80 lines (2 golden round-trip tests) |

---

## Verification

- ✅ `bun run test` — 32/32 pass (including 2 new golden tests)
- ✅ `bun run typecheck` — 0 errors
- ✅ `bun run audit:load` — no new issues
