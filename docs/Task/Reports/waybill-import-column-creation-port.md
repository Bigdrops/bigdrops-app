# Waybill Import Custom Column Creation — Investigation Report

**Date:** 2026-06-19
**Status:** Complete — system verified WORKING for prompt-derived JSON shape

## Summary

Investigated whether Waybill import creates custom columns (e.g., `make`, `part number`) from AI-generated JSON and saves them correctly. The system already works end-to-end.

## Key Findings

1. **Prompt rule 8/7 exists** — Both `externalWaybillPrompt.ts` and `internalWaybillPrompt.ts` already instruct the AI to extract extra fields as root-level key/value pairs:
   > "If items have fields beyond description, quantity, unit, and condition (e.g. make, part number, serial, location), include them as additional key/value pairs in each item object. Do not discard unknown fields."

2. **Adapters already have column extraction logic** — Both `externalWaybillImportAdapter.ts` and `internalWaybillImportAdapter.ts` iterate over incoming item keys, detect non-standard keys, create `WaybillCustomColumn` entries, and remap root-level extra keys into `item.custom_data`.

3. **Prompt-derived JSON shape works** — AI produces `{ make: "...", "part number": "..." }` as root-level item keys (not nested under `custom_fields`). The adapter recognizes these, creates columns, and moves values to `custom_data`.

4. **Form already wires columns** — `WaybillForm.tsx:348` sets `customColumns: result.customColumns` into state. The visibility rule at line 273 (`columnVisibility[col.key] !== false`) defaults new columns to visible.

5. **Save validation passes** — `assertNoExtensionFieldsOutsideCustomData` confirms all extra keys are inside `custom_data`, none on the item root.

6. **`custom_fields` flattening fix is unnecessary** — The prompt never produces `custom_fields` wrapper. The flattening code added is harmless dead code for this flow.

## Tests

- `src/tests/critical/waybillContract.test.js` — 29 pass
- `src/tests/critical/waybillImportCustomColumn.test.js` — 10 pass (new)

## Files

| File | Role |
|---|---|
| `src/domain/waybill/externalWaybillImportAdapter.ts` | External adapter with column extraction loop |
| `src/domain/waybill/internalWaybillImportAdapter.ts` | Internal adapter, same pattern |
| `src/domain/waybill/externalWaybillPrompt.ts` | Prompt with rule 8 for extra field extraction |
| `src/domain/waybill/internalWaybillPrompt.ts` | Prompt with rule 7 for extra field extraction |
| `src/components/waybill/WaybillForm.tsx` | Column state wiring (line 348) and visibility (line 273) |
| `src/domain/waybill/contracts/waybillContract.ts` | `assertNoExtensionFieldsOutsideCustomData` |
| `src/tests/critical/waybillImportCustomColumn.test.js` | Tests for adapter import column flow |

## Verdict

**WORKING** — the import adapter correctly handles the prompt-derived JSON shape end-to-end: column creation, value storage in `custom_data`, visibility, and save validation all pass.
