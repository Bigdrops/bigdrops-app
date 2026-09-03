# Legacy Waybill Root-Level Data Auto-Repair

**Task:** Fix legacy waybill save failure — auto-repair root-level extension fields into `custom_data`
**Status:** ✅ Complete
**Date:** 2026-06-19

---

## Problem

Production error on legacy waybills (pre-Canonical Contract v2):

```
[saveWaybill:pre-persist] Extension field "make" found outside custom_data.
```

Root cause: `normalizeWaybillItem` constructs result with only canonical fields (`description`, `quantity`, `unit`, `condition`, `row_type`, `custom_data`) and does NOT migrate legacy root-level keys like `make`, `partNo` into `custom_data`. Items loaded from DB retain their original shape, triggering the assertion in `saveWaybill`.

## What Changed

### `src/components/waybill/waybillUtils.ts`

**Auto-repair loop in `normalizeWaybillItem`** (between line 410 and 412):

```ts
// Auto-repair: move legacy root-level extension fields into custom_data
// Legacy waybills (pre-Canonical Contract v2) may have keys like "make", "partNo"
// sitting at item root instead of inside custom_data. This migrates them silently.
for (const key of Object.keys(record)) {
  if (WAYBILL_ITEM_KEYS.has(key as keyof WaybillItem)) continue
  if (key === 'qty') continue // qty is a known alias for quantity, not an extension field
  if (key in baseCustomData) continue // already in custom_data, don't overwrite
  baseCustomData[key] = normalizePrimitiveValue(record[key])
}
```

**Behavior:**
1. Scans raw input `record` for keys NOT in `WAYBILL_ITEM_KEYS` (canonical: `description`, `quantity`, `unit`, `condition`, `custom_data`, `row_type`)
2. Skips `qty` (known alias for `quantity`, handled separately)
3. Skips keys already present in `baseCustomData` (preserves existing custom_data values)
4. Moves extension values into `baseCustomData` with `normalizePrimitiveValue` coercion
5. `baseCustomData` is now mutable (was `const` before)

**Import:** `WAYBILL_ITEM_KEYS` added to the import from `waybillContract.ts`.

### `src/tests/critical/waybillContract.test.js`

5 new contract-level tests (no `waybillUtils.ts` import — avoids `@/` ESM resolution):

| Test | Purpose |
|------|---------|
| `legacy item with root-level "make" normalizes to custom_data` | Core scenario: `make` at root → migrated to `custom_data` |
| `legacy item with "make" and "partNo" normalizes correctly` | Multiple root-level keys + `qty` alias |
| `legacy item with root-level keys AND existing custom_data merges` | Root keys merge into existing `custom_data` |
| `assertNoExtensionFieldsOutsideCustomData still throws for truly unknown fields` | Regression guard: new bugs still caught |
| `specific failing waybill: root-level "make" saves after auto-repair` | Exact production error scenario |

## Verification

- **Tests:** 37/37 pass (32 existing + 5 new)
- **TypeScript:** `bun run typecheck` clean
- **Audit:** No new warnings or errors
- **Assertion still works:** `assertNoExtensionFieldsOutsideCustomData` throws for any field not in `WAYBILL_ITEM_KEYS` or `qty` — the auto-repair only handles legacy keys, new violations are still caught

## What's Protected

| Scenario | Result |
|----------|--------|
| Legacy item with root-level `make` | Auto-repaired → `custom_data.make` |
| Legacy item with multiple root keys | All migrated to `custom_data` |
| Root key + existing `custom_data` with other keys | Merged, existing values preserved |
| Root key + `custom_data` with same key | `custom_data` value NOT overwritten |
| New unknown field (not a legacy key) | Assertion still throws |
| Empty `custom_data` | Defaults to `{}` |
| `qty` at root | Ignored (handled as quantity alias) |
