# Import Persistence Boundary Fix

**Date:** 2026-06-28
**Status:** Fixed
**Error:** `Could not find the 'temp_ref' column of 'quotation_items' in the schema cache`

---

## Problem

When importing a quotation via JSON, the import succeeds but saving fails because `temp_ref` (an import-only field used for group membership mapping) leaks into the Supabase INSERT payload. Neither `invoice_items` nor `quotation_items` tables have a `temp_ref` column.

## Root Cause

`temp_ref` enters the editor state through the import pipeline:

1. `src/domain/import/normalize.ts:121` — `BASE_FIELDS` Set includes `temp_ref`
2. `src/domain/import/apply.ts:62` — `assignResolvedFields()` copies `baseFields` (including `temp_ref`) onto the `InvoiceItem` object via `(nextItem as Record<string, unknown>)[key] = value`
3. After import, each `InvoiceItem` has `temp_ref` as a runtime extra property (not in the TypeScript type, but present on the object)

When saving, `toDbItem()` in `src/domain/invoice/factories.ts:96` used `...rest` to capture remaining properties:

```typescript
const { install_rate_override, _uiKey, id: _id, created_at: _ca, updated_at: _ua, ...rest } = item
return { ...rest, invoice_id: invoiceId, ... }
```

The `...rest` spread included `temp_ref`, which then appeared in the DB payload. Supabase PostgREST rejected it because the column doesn't exist.

Both invoice and quotation paths are affected because `toQuotationItem()` delegates to `toDbItem()`.

## Fix

### 1. `src/domain/invoice/factories.ts` (line 96)

Added `temp_ref: _tempRef` to the destructuring exclusion list:

```typescript
// Before:
const { install_rate_override, _uiKey, id: _id, created_at: _ca, updated_at: _ua, ...rest } = item

// After:
const { install_rate_override, _uiKey, id: _id, created_at: _ca, updated_at: _ua, temp_ref: _tempRef, ...rest } = item
```

### 2. `src/domain/invoice/types.ts` (InvoiceItem interface)

Added `temp_ref?: string` as an optional property so TypeScript recognizes the destructuring:

```typescript
export interface InvoiceItem {
  // ... existing properties ...
  temp_ref?: string  // import-only — stripped by toDbItem(), never persisted
}
```

## Verification

- `bun run typecheck` — passes cleanly
- `bun run audit:load` — no new warnings introduced
- `bun run build` — timed out (pre-existing environment issue, not related to this change)

## Files Changed

| File | Change |
|------|--------|
| `src/domain/invoice/factories.ts` | Added `temp_ref` to destructuring exclusion in `toDbItem()` |
| `src/domain/invoice/types.ts` | Added `temp_ref?: string` to `InvoiceItem` interface |

## Impact

- Fixes quotation import + save flow (the reported production failure)
- Also fixes invoice import + save flow (same code path via `toDbItem()`)
- No schema changes required
- No migration needed
- `group_id` remains untouched (it IS a valid DB column on both tables)
