# Custom Columns System Inspection

> Read-only audit conducted 2026-07-01. No code was modified.

## Executive Summary

Two production defects reported:

| Issue | Description | Root Cause | Scope |
|---|---|---|---|
| **A** | Custom columns cannot be drag-reordered | `WaybillForm.onMove` operates on `columnOrder` (built-in keys only); custom column keys are filtered out, so `indexOf` returns `-1` and move aborts | Waybill only |
| **B** | Custom columns default to numeric keyboard on mobile | `MobileItemCard.tsx` renders all custom column cells as `<NumericInput>` unconditionally, ignoring `col.type` | Invoice, Quotation, Waybill (all document types) |

---

## Architecture: Two Independent Implementations

### 1. Invoice / Quotation — `useInvoiceColumns` hook

- **Single source of truth:** `columns: InvoiceColumn[]` array containing both built-in and custom columns (`custom_*` keys).
- **Custom columns** are inserted directly into the `columns` array by `addCustomColumn`.
- **Column type** (`'text'` / `'number'`) is stored in the `ColumnConfig.type` field and defaults to `'text'` on creation (`useInvoiceColumns.tsx:110`).
- **File:** `src/components/useInvoiceColumns.tsx`

### 2. Waybill — inline state

- **Split state:** `columnOrder: string[]` (built-in keys only) + `customColumns: WaybillCustomColumn[]` (custom keys only).
- The `columns` array passed to components is a **merged view** constructed at render time (`WaybillForm.tsx:240-259`): `columnOrder` (filtered to exclude `custom_` keys) `.concat(customColumns)`.
- **`WaybillCustomColumn` interface** (`waybillUtils.ts:21-24`) has only `key` and `label` — **no `type` field**.
- **File:** `src/components/waybill/WaybillForm.tsx`, `src/components/waybill/waybillUtils.ts`

---

## Issue A: Drag-Reorder Broken (Waybill Only)

### Root Cause

`WaybillForm.tsx:309-319`:

```typescript
onMove: (key: string, dir: number) => {
  setColumnOrder(prev => {
    const idx = prev.indexOf(key)   // ← custom key NOT in prev
    if (idx < 0) return prev        // ← returns unchanged array, no move happens
    ...
  })
},
```

The `columnOrder` state array is **filtered** at line 241:

```typescript
const columns: ColumnConfig[] = columnOrder
  .filter(key => !key.startsWith('custom_'))  // ← custom keys excluded
  ...
```

Because `columnOrder` only holds built-in column keys, `prev.indexOf(key)` for any custom column key returns `-1`, and the function returns the array unchanged.

### ColumnManager's role

`ColumnManager.tsx:484-491` finds the target index from the merged `columns` array (which includes custom keys) and passes it to `onMove`. The target index is correct — the problem is the `onMove` handler itself.

### Invoice/Quotation — NOT affected

`useInvoiceColumns.moveColumn` (`useInvoiceColumns.tsx:124-145`) operates on the full `columns` array which includes custom keys. Custom columns can be reordered freely (only `description` is locked at index 0).

---

## Issue B: Numeric Keyboard Default (All Document Types)

### Root Cause

`MobileItemCard.tsx:384-399` renders every custom column cell as `<NumericInput />` unconditionally:

```typescript
{customColumns?.map((col: any) => {
  if (!isVisible(col.key)) return null
  const val = (item.custom_data || {})[col.key] ?? ''
  return (
    <div key={col.key} className="min-w-0">
      <label className={labelCls}>{col.label}</label>
      <NumericInput                    // ← ALWAYS NumericInput
        value={val}
        onChange={(nextVal) => {
          onUpdate(index, 'custom_data', { ...(item.custom_data || {}), [col.key]: nextVal })
        }}
        ...
      />
    </div>
  )
})}
```

`NumericInput` (`src/components/ui/numeric-input.tsx`) renders as `<Input type="text" inputMode="decimal">` — this triggers a numeric keyboard on mobile devices, even for text-type custom columns.

### Why `col.type` is ignored

| Document | `col.type` presence | Behavior |
|---|---|---|
| Invoice | `ColumnConfig.type` is `'text'` (default) or `'number'` (user-set) | Always NumericInput — ignores type |
| Quotation | Same as Invoice | Always NumericInput — ignores type |
| Waybill | `WaybillCustomColumn` has **no `type` field** | Always NumericInput — type undefined |

The `col` object passed from `customColumns?.map` is:
- For Invoice/Quotation: a `ColumnConfig` from the `columns` array (has `.type`)
- For Waybill: a `WaybillCustomColumn` (only `.key` and `.label`)

### No desktop-specific component

There is no `InvoiceItemCard.tsx` — `MobileItemCard.tsx` is the **only** item card component used for all document types in both desktop and mobile contexts.

---

## Render Chain (All Document Types)

```
WaybillForm / SharedDocumentForm
  └─► FormLineItems.tsx
      └─► SortableLineItem.tsx
          └─► MobileItemCard.tsx   ← custom column cells here (line 384-399)
```

The `updateField` function (`MobileItemCard.tsx:97-111`) dispatches writes to `custom_data` based on `ITEM_FIELD_POLICY`, but this is only relevant for non-custom fields. Custom column writes always go through the `onUpdate(index, 'custom_data', ...)` path in the inline `onChange`.

---

## Affected Files Summary

| File | Lines | Role |
|---|---|---|
| `src/components/waybill/WaybillForm.tsx` | 240-259, 309-319 | **Issue A** — `columns` filter excludes custom keys; `onMove` operates on filtered `columnOrder` |
| `src/components/useInvoiceColumns.tsx` | 124-145 | **Issue A** — NOT affected, works on full columns array |
| `src/components/invoice/MobileItemCard.tsx` | 384-399 | **Issue B** — all custom columns rendered as `NumericInput` |
| `src/components/ui/numeric-input.tsx` | — | Renders `inputMode="decimal"`, causes numeric keyboard on mobile |
| `src/components/waybill/waybillUtils.ts` | 21-24 | `WaybillCustomColumn` missing `type` field |
| `src/components/ColumnManager.tsx` | 484-491 | Correctly computes target index from merged columns |
| `src/components/document/FormLineItems.tsx` | — | Pass-through for custom columns |

---

## Fix Approaches (not designed, not implemented)

### Issue A (Waybill reorder)

**Option 1:** Change `onMove` to operate on the merged `columns` array instead of `columnOrder`. Parse out the new order after the move.

**Option 2:** Add custom column keys to `columnOrder` (remove the filter at line 241) and rely on a separate `isCustom` flag or prefix check when iterating.

### Issue B (keyboard type)

**Option 1 (Invoice/Quotation):** Check `col.type` — use `<NumericInput>` for `'number'`, `<Input type="text">` for `'text'`.

**Option 2 (Waybill):** Either add `type: 'text' | 'number'` to `WaybillCustomColumn` defaulting to `'text'`, or default to `<Input type="text">` when `col.type` is undefined.
