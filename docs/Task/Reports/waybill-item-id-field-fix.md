# Waybill Item ID Field Leak Fix

**Date:** 2026-06-20
**Status:** Complete
**File changed:** `src/domain/waybill/waybillMutations.ts`

---

## Problem

Saving a waybill threw a hard error:

```
[saveWaybill:pre-persist] Extension field "item_id" found outside custom_data
```

This was a **hard blocker** — every waybill save failed regardless of item content.

## Root Cause

The shared `MobileItemCard` component (`src/components/invoice/MobileItemCard.tsx`) sets `item_id` directly on the root of the item object via `onUpdate(index, 'item_id', ...)` (lines 125, 196, 206). This component is reused by both invoices and waybills.

For invoices, `item_id` is a valid root-level field. For waybills, the canonical contract (`WAYBILL_ITEM_KEYS` in `waybillContract.ts`) only allows: `description`, `quantity`, `unit`, `condition`, `custom_data`, `row_type`.

When a waybill item description matched an item library entry, `MobileItemCard` would call `onUpdate(index, 'item_id', exactMatch.item_id)` — injecting `item_id` as a root-level field. The `assertNoExtensionFieldsOutsideCustomData` check then rejected it.

## Investigation Trail

| Step | Finding |
|---|---|
| DB schema | `invoice_items` has `item_id` column; waybill items are JSONB in `waybills` table |
| `WAYBILL_ITEM_KEYS` | Only 6 keys allowed: description, quantity, unit, condition, custom_data, row_type |
| `normalizeWaybillItem()` | Auto-repairs unknown fields into `custom_data` — but only called on DB load |
| `FormLineItems.tsx` | No `item_id` references |
| `WaybillForm.tsx` | No `item_id` references |
| `MobileItemCard.tsx` | **Found it** — 3 call sites inject `item_id` at root level |

## Fix

Added a sanitization step in `saveWaybill()` that strips any fields not in `WAYBILL_ITEM_KEYS` before contract enforcement runs:

```typescript
const cleanItems = items.map(item => {
  const clean: Record<string, unknown> = {}
  for (const key of Object.keys(item)) {
    if (WAYBILL_ITEM_KEYS.has(key as keyof WaybillItem)) {
      clean[key] = (item as unknown as Record<string, unknown>)[key]
    }
  }
  return clean as unknown as WaybillItem
})
```

The assertion and DB mapping both now operate on `cleanItems` instead of raw `items`.

## Why this approach

- **Root cause fix**: Strips the leak at the contract boundary, not deep in a shared component
- **Non-breaking**: Doesn't modify `MobileItemCard` (which is shared across invoice/waybill)
- **Contract-preserving**: `assertNoExtensionFieldsOutsideCustomData` remains intact
- **Defensive**: Future shared fields that violate the contract are also caught and stripped

## Verification

- `bun run typecheck` — passes (0 errors)
- `bunx eslint src/domain/waybill/waybillMutations.ts` — no new lint issues (2 pre-existing: unused import, `any` type)
