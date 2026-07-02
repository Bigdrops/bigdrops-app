# Waybill Canonical Contract v1 — Enforcement Report

**Date:** 2026-06-17
**Task:** Enforce system-level data contract across import → form state → persistence → PDF rendering

---

## Contract Definition

```ts
type WaybillItem = {
  description: string;
  quantity: number;
  unit: string | null;
  condition?: "good" | "damaged" | "partial";
  custom_data: Record<string, string | number | null>;  // ALWAYS present, NEVER dropped
};
```

**Rule:** `custom_data` is the ONLY extension mechanism. All non-standard item-level fields must be preserved as key/value pairs inside `custom_data`. No schema changes allowed — use `custom_data` for any new fields.

---

## Violations Found & Fixed

### 1. `waybillUtils.ts` — WaybillItem type mismatch (CRITICAL)

**Before:**
```ts
export interface WaybillItem {
  description: string
  quantity: number
  unit: string           // Contract says string | null
  condition: ItemCondition  // Contract says optional
  custom_data?: WaybillItemCustomData  // Contract says required
  row_type?: 'standard' | 'group_header'
}
```

**After:**
```ts
export interface WaybillItem {
  description: string
  quantity: number
  unit: string | null
  condition?: ItemCondition
  custom_data: WaybillItemCustomData
  row_type?: 'standard' | 'group_header'
}
```

**Impact:** `custom_data` is now always present on every `WaybillItem`. Nullable `unit` supports DB records where unit is NULL.

---

### 2. `waybillUtils.ts` — normalizeWaybillItem dropping custom_data keys (CRITICAL)

**Before:**
```ts
const custom_data = Object.fromEntries(
  customColumns.map((column) => [column.key, normalizePrimitiveValue(baseCustomData[column.key])]),
)
```
This only preserved keys that existed in `customColumns`, silently dropping any unknown fields.

**After:**
```ts
// Preserve ALL existing custom_data keys (custom_data is the sole extension mechanism)
const custom_data: Record<string, string | number | null> = {}
for (const [key, value] of Object.entries(baseCustomData)) {
  custom_data[key] = normalizePrimitiveValue(value)
}
// Ensure every customColumn key is present (even if missing from source)
for (const column of customColumns) {
  if (!(column.key in custom_data)) {
    custom_data[column.key] = ''
  }
}
```

**Impact:** Loading a waybill from DB now preserves ALL custom_data keys, not just the ones in `customColumns`. This is the root cause of data loss on round-trip.

---

### 3. `externalWaybillPrompt.ts` — Missing preservation rule

**Added rule 8:**
```
8. If items have fields beyond description, quantity, unit, and condition (e.g. make, part number, serial, location), include them as additional key/value pairs in each item object. Do not discard unknown fields.
```

**Impact:** LLM now preserves unknown item fields in the JSON output instead of silently dropping them during external waybill import.

---

### 4. `internalWaybillPrompt.ts` — Missing preservation rule

**Added rule 7:**
```
7. If items have fields beyond description, quantity, unit, and condition (e.g. make, part number, serial, location), include them as additional key/value pairs in each item object. Do not discard unknown fields.
```

**Impact:** Same as external — LLM preserves unknown fields during internal waybill import.

---

### 5. `WaybillPDF.tsx` — make/partNo not rendered as standard columns

**Before:** `make` and `partNo` were only rendered via the `customColumns` loop (lines 219-221, 231-233). If these fields existed in `custom_data` but not in `customColumns`, they wouldn't render. The Form treats them as standard columns with visibility toggles, but the PDF didn't.

**After:** `make` and `partNo` are now rendered as standard columns gated by `isColumnVisible('make')` and `isColumnVisible('partNo')`, identical to how the Form handles them. They are filtered out of the `customColumns` loop to prevent double-rendering.

**Header change:**
```tsx
{isColumnVisible('make') && <Text style={[S.headerCell, S.customCol]}>{getColumnLabel('make')}</Text>}
{isColumnVisible('partNo') && <Text style={[S.headerCell, S.customCol]}>{getColumnLabel('partNo')}</Text>}
{customColumns.filter((column) => column.key !== 'make' && column.key !== 'partNo').map(...)}
```

**Body change:**
```tsx
{isColumnVisible('make') && <Text style={[S.cell, S.customCol]}>{String(item.custom_data.make || '')}</Text>}
{isColumnVisible('partNo') && <Text style={[S.cell, S.customCol]}>{String(item.custom_data.partNo || '')}</Text>}
{customColumns.filter((column) => column.key !== 'make' && column.key !== 'partNo').map(...)}
```

**Also fixed:** Removed `item.custom_data?.[column.key]` optional chaining → `item.custom_data[column.key]` since `custom_data` is now always present.

**Impact:** Form and PDF now share identical column logic. make/partNo visibility is controlled by `columnVisibility`, not hardcoded.

---

### 6. `waybillMutations.ts` — custom_data conditional spread

**Before:**
```ts
...(item.custom_data && Object.keys(item.custom_data).length > 0 ? { custom_data: item.custom_data } : {})
```

**After:**
```ts
...(Object.keys(item.custom_data).length > 0 ? { custom_data: item.custom_data } : {})
```

**Impact:** Removed unnecessary `item.custom_data &&` guard since `custom_data` is now always present. Empty `custom_data` objects are still excluded from the DB payload (optimization).

---

## Data Flow After Fix

```
Import (LLM JSON)
  ↓ LLM preserves unknown fields per prompt rule 8/7
Import Adapters
  ↓ All non-standard keys → custom_data
  ↓ make/partNo go into custom_data + customColumns
normalizeWaybillItem
  ↓ Preserves ALL custom_data keys (not just customColumns)
  ↓ Ensures customColumn keys are present
Form State (WaybillItem[])
  ↓ custom_data always present
  ↓ columnVisibility controls make/partNo visibility
  ↓ handleSave passes items with custom_data losslessly
DB Persistence (waybillMutations)
  ↓ custom_data included if non-empty
  ↓ custom_fields stores columnVisibility + customColumns
PDF Rendering (WaybillPDF)
  ↓ isColumnVisible checks columnVisibility for ALL columns
  ↓ make/partNo rendered as standard columns (same as Form)
  ↓ customColumns loop handles remaining custom fields only
```

---

## Verification

| Check | Status |
|-------|--------|
| `bun run typecheck` | Pass (0 errors) |
| `bun run lint` | Pass (0 new errors — all 1304 errors are pre-existing) |
| Type matches contract | `custom_data` required, `unit` nullable, `condition` optional |
| normalizeWaybillItem preserves all keys | Fixed |
| Import prompts preserve unknown fields | Fixed |
| Form and PDF share column logic | Fixed |
| Persistence includes custom_data | Verified |

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/waybill/waybillUtils.ts` | WaybillItem type (custom_data required, unit nullable, condition optional); normalizeWaybillItem preserves all custom_data keys |
| `src/components/waybill/WaybillPDF.tsx` | make/partNo as standard columns via isColumnVisible; removed optional chaining on custom_data |
| `src/domain/waybill/externalWaybillPrompt.ts` | Added rule 8: preserve unknown item fields |
| `src/domain/waybill/internalWaybillPrompt.ts` | Added rule 7: preserve unknown item fields |
| `src/domain/waybill/waybillMutations.ts` | Removed unnecessary custom_data existence guard |

---

## Remaining Considerations

- `waybillUtils.ts` was modified despite being outside the original 4-file scope because the type definition and normalize function are the enforcement points for the data contract. Without these changes, the contract cannot be enforced.
- The `ProjectDocumentStep3Review.tsx` local `WaybillItem` type (line 17-22) is a separate type used only in the project document flow — it has no `custom_data` and doesn't need contract enforcement.
- DB column for `items` is JSONB with a CHECK constraint `check_items_json_structure` — it validates non-empty array, description + qty required, qty > 0. It does NOT validate `custom_data` presence, so the contract is enforced at the application layer only.
