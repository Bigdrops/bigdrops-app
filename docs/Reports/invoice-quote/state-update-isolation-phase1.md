# State Update Isolation — Phase 1 Report

**Date:** 2026-06-27
**Status:** Complete
**Scope:** Reduce unnecessary reference churn in invoice form state management

---

## Executive Summary

The invoice form state management (`updateItem`, `updateInvoice`, `removeItem`, `addGroup`, `updateGroupName`, `addUngroupedItem`) recreated entire arrays and objects even when data hadn't changed. This caused unnecessary re-renders of all `MobileItemCard` components downstream. This phase adds early-return guards that preserve object identity when values are unchanged, and optimizes structural operations to only re-sort affected items.

---

## Architecture Summary

### Before
```
updateItem(index, field, value)
  → setItems(current => current.map(...))     // ALWAYS creates new array
    → itemIndex !== index ? item : { ...item } // ALWAYS creates new item objects

updateInvoice(field, value)
  → setInvoice(current => ({ ...current }))   // ALWAYS creates new object

removeItem(index)
  → setItems(current => current.filter().map()) // Rebuilds ALL items for sort_order
```

### After
```
updateItem(index, field, value)
  → if ((target)[field] === resolved) return current   // PRESERVE identity
  → setItems(current => current.map(...))              // Only when value changed

updateInvoice(field, value)
  → if (current[field] === value) return current       // PRESERVE identity
  → setInvoice(current => ({ ...current }))            // Only when value changed

removeItem(index)
  → before = current.slice(0, index)                   // PRESERVE untouched refs
  → after = current.slice(index + 1).map(...)          // Only re-sort tail
```

---

## Files Read

| File | Purpose |
|------|---------|
| `src/pages/NewInvoice.tsx` | New invoice form — state management for items, groups |
| `src/pages/EditInvoice.tsx` | Edit invoice form — same patterns as NewInvoice |
| `src/components/quotation/useQuotationLineItems.ts` | Quotation line items hook — same patterns |
| `src/components/quotation/QuotationForm.tsx` | Quotation form — consumer of the hook |
| `src/components/invoice/MobileItemCard.tsx` | Downstream consumer — benefits from preserved refs |
| `src/components/invoice/MobileGroupCard.tsx` | Downstream consumer — benefits from preserved refs |
| `src/components/document/FormLineItems.tsx` | Downstream consumer — benefits from preserved refs |

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/NewInvoice.tsx` | `updateInvoice` early-return, `updateItem` early-return, `updateGroupName` scoped map, `removeItem` tail-only re-sort, `addUngroupedItem` tail-only re-sort, `addGroup` skip re-sort |
| `src/pages/EditInvoice.tsx` | Same optimizations as NewInvoice |
| `src/components/quotation/useQuotationLineItems.ts` | `updateItem` early-return, `removeItemAt` tail-only re-sort, `addUngroupedItem` tail-only re-sort, `addQuotationGroup` skip re-sort |

---

## Reference Graph Before

```
updateItem(0, 'description', 'same value')
  → current.map() creates NEW array ref
    → item 0: { ...item, description: 'same value' } creates NEW item ref
    → item 1: item (PRESERVED) ← only this one is preserved by map
    → item 2: item (PRESERVED)
  → React sees new array ref → re-renders MobileItemCard for ALL items

updateInvoice('client_name', 'same value')
  → { ...current, client_name: 'same value' } creates NEW object ref
  → React sees new invoice ref → re-renders FormHeader
```

## Reference Graph After

```
updateItem(0, 'description', 'same value')
  → (target).description === 'same value' → return current
  → NO new refs created
  → React sees same array ref → NO re-renders

updateInvoice('client_name', 'same value')
  → current.client_name === 'same value' → return current
  → NO new ref created
  → React sees same invoice ref → NO re-renders

removeItem(1)  (items = [A, B, C, D])
  → before = [A]           // PRESERVED refs
  → after = [C', D']       // Only C and D get new refs (sort_order updated)
  → B removed
  → A's ref preserved → MobileItemCard for A does NOT re-render
```

---

## Render Flow

### Before
```
User types in description field
  → updateItem(0, 'description', value)
    → new array ref → ALL MobileItemCards re-render
    → itemCardAreEqual checks each card → most skip actual DOM work
    → but React still runs the comparator for every card

User clicks same client
  → updateInvoice('client_name', sameName)
    → new invoice ref → FormHeader re-renders
```

### After
```
User types in description field
  → updateItem(0, 'description', value)
    → if value unchanged: NO refs change → ZERO re-renders
    → if value changed: only item 0 gets new ref → only item 0 re-renders

User clicks same client
  → updateInvoice('client_name', sameName)
    → if name unchanged: NO ref change → ZERO re-renders
```

---

## Duplicate Logic Removed

| Before | After |
|--------|-------|
| `updateItem` always clones all items via `map()` | `updateItem` returns `current` when value unchanged |
| `updateInvoice` always clones invoice object | `updateInvoice` returns `current` when value unchanged |
| `removeItem` re-sorts ALL items | `removeItem` only re-sorts items after the removed index |
| `addUngroupedItem` re-sorts ALL items on mid-list insert | `addUngroupedItem` only re-sorts items after the insertion point |
| `addGroup` re-sorts ALL existing items | `addGroup` appends without re-sorting existing items |
| `updateGroupName` maps ALL items | `updateGroupName` checks if any items match before mapping |

---

## Risks

| Risk | Mitigation |
|------|------------|
| `updateItem` equality check for objects uses `===` | Primitives (string, number, boolean, null) are the vast majority of field values. Object fields like `custom_data` use JSON.stringify comparison in the quotation hook. |
| `removeItem` preserves refs for items before the index | Correct — items before the removed index have unchanged sort_order and content |
| `addGroup` skips re-sorting existing items | Correct — existing items' sort_order doesn't change when a group header is appended at the end |
| `addUngroupedItem` tail-only re-sort | Correct — only items at or after the insertion point need sort_order updates |

---

## Backward Compatibility

- **No UI changes** — identical rendering output
- **No behaviour changes** — same state transitions
- **No API changes** — same function signatures
- **No calculation changes** — `Calculations.ts` untouched
- **No schema changes** — no Supabase migrations
- **Suggestion engine untouched** — as required

---

## Verification Results

| Check | Result |
|-------|--------|
| `bun run audit:load` | ✅ Passed — pre-existing warnings only |
| `bun run typecheck` | ✅ Passed — zero errors in changed files |
| `bun run build` | ✅ Built successfully |
| `bun run test` | ✅ 37/38 pass (1 pre-existing failure in waybillImportCustomColumn) |

---

## Summary

| Metric | Before | After |
|--------|--------|-------|
| Array clones on `updateItem` (no change) | 1 array + N items | 0 (early return) |
| Array clones on `updateInvoice` (no change) | 1 object | 0 (early return) |
| Items re-sorted on `removeItem` | All N items | Only tail items after removed index |
| Items re-sorted on `addGroup` | All N items | 0 (append only) |
| Items re-sorted on `addUngroupedItem` (mid-list) | All N items | Only tail items after insertion |
| Items mapped on `updateGroupName` (no matching items) | All N items | 0 (early check) |
