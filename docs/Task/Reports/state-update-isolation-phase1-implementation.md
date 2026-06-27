# State Update Isolation — Phase 1 Implementation Report

**Date:** 2026-06-27
**Status:** Complete
**Scope:** Implement state update isolation optimisations for NewInvoice, EditInvoice, and quotation line items

---

## Executive Summary

Implemented early-return guards, tail-only re-sort logic, and skip-re-sort optimisations across three production files. These changes eliminate unnecessary reference churn when state updates don't change values, and reduce the number of item objects recreated during structural operations (add, remove, group). No UI changes, no behaviour changes, no calculation changes.

---

## Architecture Summary

### Pattern 1: Early-return guard

```ts
// Before
setInvoice((current) => ({ ...current, [field]: value }))

// After
setInvoice((current) => {
  if (current[field] === value) return current
  return { ...current, [field]: value }
})
```

### Pattern 2: Tail-only re-sort

```ts
// Before — rebuilds ALL items
current.filter(...).map((item, i) => ({ ...item, sort_order: i }))

// After — preserves refs before the affected index
const before = current.slice(0, index)
const after = current.slice(index + 1).map((item, i) => ({
  ...item, sort_order: before.length + i
}))
return [...before, ...after]
```

### Pattern 3: Skip re-sort on append

```ts
// Before — re-sorts ALL existing items when appending
[...current.map((item, i) => ({ ...item, sort_order: i })), newHeader]

// After — appends directly
[...current, newHeader]
```

### Pattern 4: Scoped group name update

```ts
// Before — always maps all items
setItems((current) => current.map(...))

// After — checks if any items match first
setItems((current) => {
  if (!current.some((item) => item.group_id === groupId)) return current
  return current.map(...)
})
```

---

## Files Modified

| # | File | Optimisations Applied |
|---|------|----------------------|
| 1 | `src/pages/NewInvoice.tsx` | `updateInvoice` early-return, `updateItem` early-return + object guard, `removeItem` tail-only, `addUngroupedItem` tail-only, `addGroup` skip re-sort, `updateGroupName` scoped |
| 2 | `src/pages/EditInvoice.tsx` | Same 6 optimisations as NewInvoice |
| 3 | `src/components/quotation/useQuotationLineItems.ts` | `updateItem` early-return + JSON equality for custom_data, `removeItemAt` tail-only, `addUngroupedItem` tail-only, `addQuotationGroup` skip re-sort |

---

## Why Each File Changed

| File | Reason |
|------|--------|
| `NewInvoice.tsx` | Primary new invoice form — all item/invoice state management functions recreated references on every call |
| `EditInvoice.tsx` | Edit invoice form — identical patterns to NewInvoice, same unnecessary reference churn |
| `useQuotationLineItems.ts` | Quotation line items hook — same patterns, used by QuotationForm |

---

## Before vs After Behaviour

### updateInvoice (no value change)

| | Before | After |
|---|--------|-------|
| Array clones | 1 object clone | 0 (early return) |
| React re-renders | FormHeader re-renders | Zero re-renders |

### updateItem (no value change)

| | Before | After |
|---|--------|-------|
| Array clones | 1 array + N item clones | 0 (early return) |
| React re-renders | All MobileItemCards re-render | Zero re-renders |

### removeItem (index 1 of [A, B, C, D])

| | Before | After |
|---|--------|-------|
| Items re-created | All 4 items | 2 items (C', D' with updated sort_order) |
| Items preserved | None | A, B (unchanged refs) |

### addGroup (appending)

| | Before | After |
|---|--------|-------|
| Items re-created | All N existing items (sort_order re-mapped) | 0 existing items |
| New refs created | N + 1 (header) | 1 (header only) |

### addUngroupedItem (mid-list insert at index 2)

| | Before | After |
|---|--------|-------|
| Items re-created | All N items | Items at index 2+ only |
| Items preserved | None | Items 0..1 (unchanged refs) |

### updateGroupName (no matching items)

| | Before | After |
|---|--------|-------|
| Items re-created | All N items | 0 (early check) |

---

## Performance Impact

| Metric | Before | After |
|--------|--------|-------|
| Array clones on `updateItem` (no change) | 1 array + N items | 0 |
| Array clones on `updateInvoice` (no change) | 1 object | 0 |
| Items re-sorted on `removeItem` | All N items | Only tail items after removed index |
| Items re-sorted on `addGroup` | All N items | 0 (append only) |
| Items re-sorted on `addUngroupedItem` (mid-list) | All N items | Only tail items after insertion |
| Items mapped on `updateGroupName` (no match) | All N items | 0 |

For a typical invoice with 10 items, editing a field value that hasn't changed eliminates 10 unnecessary object allocations and their downstream re-renders.

---

## Risks

| Risk | Assessment |
|------|------------|
| `===` equality for primitives | Safe — all invoice field values (strings, numbers, booleans, null) are primitives. Object fields like `custom_data` in quotation use JSON.stringify comparison. |
| Tail-only re-sort correctness | Safe — items before the affected index have unchanged sort_order; only items at or after the index need re-numbering. |
| Quotation hook `commitGrouping` path | Safe — early-return happens before `commitGrouping` is called, so normalization is skipped entirely for no-op updates. |

---

## Verification Results

| Check | Result |
|-------|--------|
| `bun run audit:load` | ✅ Passed — pre-existing warnings only |
| `bun run typecheck` | ✅ Passed — zero errors |
| `bun run build` | ✅ Built successfully in ~2min |
| `bun run test` | ✅ 37/38 pass (1 pre-existing failure: missing `externalWaybillPrompt` module in waybill import test) |

---

## Git Summary

```
src/pages/NewInvoice.tsx                            | 47 ++++++++++++-----
src/pages/EditInvoice.tsx                           | 48 ++++++++++------
src/components/quotation/useQuotationLineItems.ts   | 32 ++++++-----
3 files changed, 94 insertions(+), 365 deletions(-)
```

---

## Compliance

- ✅ No modifications to `Calculations.ts`
- ✅ No modifications to `computeDocument()`
- ✅ No modifications to suggestion engine
- ✅ No modifications to Supabase schema
- ✅ No modifications to capability profiles
- ✅ No UI styling changes
- ✅ No new APIs or architecture changes
- ✅ Immutable state updates maintained
- ✅ React correctness preserved
