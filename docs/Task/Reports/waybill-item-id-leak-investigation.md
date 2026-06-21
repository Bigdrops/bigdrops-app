# Waybill PDF — `item_id` Column Leak Investigation

**Date:** 2026-06-21
**Report type:** Root-cause analysis & fix
**Files changed:**
- `src/domain/waybill/engine/resolvers/table.ts` — primary fix
- `src/components/waybill/waybillUtils.ts` — secondary defense-in-depth fixes

---

## Problem

An `item_id` column was appearing in waybill PDF table headers for some users. The `item_id` is a DB internal primary key of the `waybill_items` table and should never be rendered in any PDF.

---

## Root Cause

The leak is a **self-perpetuating cycle** across three layers with no filtering:

### Layer 1 — Entry vector: `normalizeWaybillImport()` (import path)

```typescript
// src/components/waybill/waybillUtils.ts:569 — normalizeWaybillImport
Object.entries(item).forEach(([key, value]) => {
  const normalizedKey = normalizeDataKey(key)
  if (!normalizedKey) return
  if (['description', 'quantity', 'unit', 'condition'].includes(normalizedKey)) return
  // ❌ NO forbidden-key check here
  custom_data[normalizedKey] = normalizePrimitiveValue(value)
  if (!customColumnsMap.has(normalizedKey)) {
    customColumnsMap.set(normalizedKey, makeWaybillCustomColumn(...))
  }
})
```

When JSON import data included `item_id`, the function blindly added it to both `custom_data` and `customColumnsMap`. This was the **original entry point**.

### Layer 2 — Persistence cycle: `collectWaybillCustomColumns()` + `saveWaybill()`

```typescript
// src/components/waybill/waybillUtils.ts:550 — collectWaybillCustomColumns
items.forEach((item) => {
  Object.keys(item.custom_data || {}).forEach((key) => {
    // ❌ NO forbidden-key check here either
    map.set(normalizedKey, makeWaybillCustomColumn(...))
  })
})
```

Once `item_id` was in `custom_data`, `collectWaybillCustomColumns()` would read it back and create a column entry. This column list was then saved to `custom_fields` in Supabase, and the cycle repeated forever on every load.

### Layer 3 — Engine pass-through: `resolveColumns()`

```typescript
// src/domain/waybill/engine/resolvers/table.ts:6 — resolveColumns (BEFORE)
export function resolveColumns(columns: ResolvedColumn[]): PrintColumn[] {
  return columns.map((col) => ({ key: col.key, label: col.label }))
  // ❌ Blind pass-through — whatever columns arrives, goes to PDF
}
```

The engine is the **final gate** before the PDF template. It did zero filtering. And in `buildRows()`:

```typescript
for (const col of columns) {
  if (BASE_KEYS.has(col.key)) continue
  const val = item.custom_data?.[col.key]  // ❌ reads custom_data by column key
  cells[col.key] = val != null ? String(val) : ''
}
```

If `item_id` was in both `columns` and `custom_data`, it leaked into `cells`.

### Template layer (innocent)

- `GreenTemplate.tsx` — renders `model.table.columns` and `model.table.rows[i].cells[col.key]` as-is. It's a dumb renderer — correct behavior.
- `blankWaybillTemplate.tsx` — same, no filtering.
- `WaybillPDF.tsx` — thin wrapper, no mutation.

---

## Fix (3 layers of defense)

### Fix 1 — Engine: `resolveColumns()` in `resolvers/table.ts`

Added a `FORBIDDEN_DB_KEYS` whitelist filter. This is the **primary fix** at the engine level, as requested.

```typescript
const FORBIDDEN_DB_KEYS = new Set([
  'item_id', 'id', 'created_at', 'updated_at',
  'unit_price', 'rate', 'vat', 'discount', 'subtotal', 'grand_total', 'custom_data',
])

export function resolveColumns(columns: ResolvedColumn[]): PrintColumn[] {
  return columns
    .filter((col) => {
      if (FORBIDDEN_DB_KEYS.has(col.key)) return false  // HARD BLOCK
      return true
    })
    .map((col) => ({ key: col.key, label: col.label }))
}
```

### Fix 2 — Import: `normalizeWaybillImport()` in `waybillUtils.ts`

Added `FORBIDDEN_DB_KEYS` skip in the import item processing loop, preventing `item_id` from ever entering `custom_data` or `customColumnsMap` via JSON import.

### Fix 3 — Collection: `collectWaybillCustomColumns()` in `waybillUtils.ts`

Added `COLLECT_FORBIDDEN_DB_KEYS` skip when scanning `custom_data` for column candidates, breaking the self-perpetuating cycle at the persistence layer.

---

## Verification

- **Test #5 "Forbidden fields excluded from all rows"** in `waybillRenderEngine.test.ts` — passes (11/11 tests pass)
- The test creates sample input with clean `custom_data`, but our `resolveColumns()` filter is now applied to all rows regardless of source

---

## Open items

- [ ] Existing records with `item_id` stuck in `custom_fields.customColumns` on Supabase will need a one-time migration to clean up stale column entries. This is a data fix, not a code fix — the code now prevents re-introduction.
