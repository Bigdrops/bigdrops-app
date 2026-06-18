# Waybill Backlog Fixes Report

**Date:** 2026-06-18  
**Task:** Resolve confirmed Waybill backlog defects  
**Status:** All 5 issues resolved — typecheck passes clean

---

## ISSUE 1 — Condition column visibility bypass in PDF

**Symptom:** PDF ignores column visibility settings — condition column always renders regardless of toggle state.  
**Root cause:** Two defects:
1. `ViewWaybill.tsx:111` hardcoded `columnVisibility={{ description: true, quantity: true, unit: true, condition: true }}`, ignoring user settings stored in `customFields.columnVisibility`.
2. `columnVisibility` was not persisted in `custom_fields` JSONB — no `columnVisibility` key existed in `WaybillCustomFields` type.

**Fix:**
- `waybillUtils.ts`: Added `columnVisibility?: Record<string, boolean>` to `WaybillCustomFields` type
- `waybillUtils.ts`: `parseWaybillCustomFields` now passes through `columnVisibility`
- `waybillUtils.ts`: `buildWaybillCustomFields` merges `columnVisibility`
- `WaybillForm.tsx:96`: `columnVisibility` state now initializes from `initialData?.customFields?.columnVisibility`
- `WaybillForm.tsx:371`: `handleSave` now includes `columnVisibility` in the final fields passed to `buildWaybillCustomFields`
- `ViewWaybill.tsx:111`: Now reads `columnVisibility` from `customFields.columnVisibility` instead of hardcoding

---

## ISSUE 2 — Missing column labels in PDF rendering

**Symptom:** PDF renders undefined/blank labels for `make` and `partNo` columns.  
**Root cause:** `WaybillPDF.tsx` `getColumnLabel()` map (line ~150) was missing `make` and `partNo` keys.

**Fix:**
- `WaybillPDF.tsx`: Added `make: 'Make'` and `partNo: 'Part No.'` to the `getColumnLabel()` lookup

---

## ISSUE 3 — JSON import creates 0 columns (custom_data loss)

**Symptom:** Importing a JSON waybill with custom fields (e.g., `storage_location`) results in zero custom columns and empty `custom_data` on all items.  
**Root cause:** Both `externalWaybillImportAdapter.ts` and `internalWaybillImportAdapter.ts` stripped monetary keys from items, then discarded all remaining non-standard keys by setting `custom_data: {}` and returning `customColumns: []`.

**Fix:**
- `externalWaybillImportAdapter.ts`: Refactored `applyResult` to iterate over non-monetary item keys, normalize them via `normalizeDataKey()`, populate `custom_data` with `normalizePrimitiveValue()`, and derive `customColumns` from a `Map<string, WaybillCustomColumn>` (max 20 columns). Returns `customFields: { customColumns }`.
- `internalWaybillImportAdapter.ts`: Same refactoring applied.
- Added helper functions: `normalizeDataKey()`, `labelFromKey()`, `normalizePrimitiveValue()`.
- Added `STANDARD_KEYS` constant to exclude standard fields from custom column derivation.

---

## ISSUE 4 — Notes cleared on waybill edit

**Symptom:** Existing notes disappear after editing and saving a waybill.  
**Root cause:** `WaybillForm.tsx:112` `const [notes, setNotes] = useState('')` — notes initialized as empty string, never loaded from `initialData?.waybill?.notes`. On save, the `notes` local state was never written back to `waybill.notes` in the save payload.

**Fix:**
- `WaybillForm.tsx:116`: Changed to `useState(() => initialData?.waybill?.notes ?? '')` — initializes from DB data.
- `WaybillForm.tsx:371`: Changed save payload from `{ ...waybill, status: 'dispatched' }` to `{ ...waybill, notes, status: 'dispatched' }` — writes notes back on save.

---

## ISSUE 5 — Mobile Client label bleed ("CLIENT ent")

**Symptom:** On narrow mobile screens, the "Client" label visually overflows or bleeds, appearing as "CLIENT ent".  
**Root cause:** The uppercase "Client" label rendered with `text-[10px] font-extrabold uppercase tracking-[0.12em]` — letter-spacing on uppercase text caused visual overflow on constrained mobile widths.

**Fix:**
- `WaybillForm.tsx:456`: Added `overflow-hidden` to the Client label div
- `WaybillForm.tsx:507`: Added `overflow-hidden` to the Linked Invoice label div (linked state)
- `WaybillForm.tsx:531`: Added `overflow-hidden` to the Linked Invoice label div (unlinked state)

---

## Verification

- `bun run typecheck` — passes with zero errors
- No new files created — all changes are surgical fixes to existing files
- No new dependencies added
- No design system changes — only CSS overflow clipping applied
