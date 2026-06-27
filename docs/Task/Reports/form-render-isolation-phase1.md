# Form Render Isolation — Phase 1

> **Status**: Complete
> **Date**: 2026-06-26
> **Scope**: React.memo + useCallback stabilization for NewInvoice → SharedDocumentForm → FormLineItems → MobileGroupCard → MobileItemCard → NumericInput
> **Constraint**: No changes to computeDocument, Calculations.ts, suggestion ranking, item repository, Supabase queries, NumericInput formatting/debounce, capability profiles, or financial/operational separation. Visual UI must be identical.

---

## Summary

Phase 1 adds React.memo with custom comparators and useCallback stabilization across the 5-level document editing component chain. The goal is to prevent cascading re-renders of all item/group cards when a single field changes. This phase is purely additive — no component is restructured, no business logic changes.

---

## Files Modified

| File | Change |
|---|---|
| `src/components/useInvoiceColumns.tsx` | Wrapped `isVisible` and `getColumn` in `useCallback` to stabilize references across renders |
| `src/components/invoice/MobileItemCard.tsx` | Added `React.memo` with custom comparator that deep-compares item data fields (description, qty, prices, vat, discount, row_type, image_url, sub_description, make, partNo, condition, install fields, custom_data, _uiKey, id, item_id) plus stable callbacks |
| `src/components/invoice/MobileGroupCard.tsx` | Added `React.memo` with custom comparator checking `group.id`, `group.name`, `group.showSubtotal`, `items.length`, `groupSubtotal`, and reference equality for callbacks |
| `src/components/document/FormLineItems.tsx` | Added `React.memo` (shallow compare), wrapped `getComputedAmount` in `useCallback` with `computedAmountMap` dependency, wrapped `handleMoveUp`/`handleMoveDown` in `useCallback` with `onMoveItem` |
| `src/components/document/SharedDocumentForm.tsx` | Added `React.memo` (shallow compare), stabilized all inline JSX callbacks (`onOpenImport`, `onOpenTableSettings`, `onClientChange`, `updateReferenceLink`, `removeReferenceLink`, `addReferenceLink`, `onClose`) with `useCallback` |
| `src/pages/NewInvoice.tsx` | Wrapped all handlers (`updateInvoice`, `updateItem`, `resetItemOverrides`, `addUngroupedItem`, `addItem`, `removeItem`, `insertItemAfter`, `moveItem`, `addGroup`, `updateGroupName`, `toggleGroupSubtotal`, `deleteGroup`, `addItemToGroup`, `handleImportApply`, `handleSave`, plus all field/charge/custom-fields handlers) in `useCallback`; replaced inline JSX arrow functions with stable `useCallback` variables |

---

## Render Tree (After Phase 1)

```
NewInvoice                                          ← NO MEMO (entry point)
 ├─ computeDocument()                               ← OUT OF SCOPE (Phase 2B)
 ├─ GroupsHeader                                    ← not memoized (single, not on hot path)
 └─ SharedDocumentForm                              ← React.memo (shallow) 🔒
     ├─ ... form-level fields
     ├─ ImportButton (onOpenImport stable)           ← already memoized
     ├─ TableSettings (onOpenTableSettings stable)   ← not memoized but one-off
     ├─ ClientSelector (onClientChange stable)       ← already memoized
     ├─ ... header/additional/extra-charge fields
     └─ FormLineItems                                ← React.memo (shallow) 🔒
         ├─ GroupsHeader                            ← not memoized
         ├─ MobileGroupCard(group=1)                ← React.memo (custom) 🔒
         │   ├─ MobileItemCard(item=1, group=1)     ← React.memo (custom) 🔒
         │   │   └─ NumericInput(field=quantity)    ← NO MEMO (terminal)
         │   ├─ MobileItemCard(item=2, group=1)     ← React.memo (custom) 🔒
         │   │   └─ NumericInput(field=quantity)
         │   └─ MobileItemCard(item=3, group=1)     ← React.memo (custom) 🔒
         │       └─ NumericInput(field=quantity)
         ├─ MobileGroupCard(group=2)                ← React.memo (custom) 🔒
         │   ├─ MobileItemCard(item=4, group=2)     ← React.memo (custom) 🔒
         │   │   └─ NumericInput(field=quantity)
         │   └─ MobileItemCard(item=5, group=2)     ← React.memo (custom) 🔒
         │       └─ NumericInput(field=quantity)
         └─ MobileItemCard(item=6, ungrouped)       ← React.memo (custom) 🔒
             └─ NumericInput(field=quantity)
```

**Legend**: `🔒` = memo boundary blocks re-render when props haven't changed per comparator

---

## Key Design Decisions

### 1. MobileItemCard — Value-based deep compare
- `items` array is always a new reference from `computeDocument` (out of scope)
- But numeric values (qty, price, vat, etc.) for unchanged items remain identical
- Custom comparator compares every relevant item field by value, plus callback references
- Result: editing field in card 2 does NOT re-render cards 1, 3, 4, 5, 6

### 2. MobileGroupCard — Hybrid compare
- `group` object reference changes every render (from computeDocument)
- Compare `group.id`, `group.name`, `group.showSubtotal` by value
- Compare `items.length` (structural change detection) and `groupSubtotal` by value
- Compare callbacks by reference
- Result: group with no item changes skips re-render

### 3. FormLineItems — computedAmountMap as dependency
- `getComputedAmount` must be stable for MobileGroupCard comparator to work
- Use `useCallback` with `computedAmountMap` (a `Map<id, number>`) — new render creates a new Map, but values for unchanged items are identical

### 4. useInvoiceColumns — isVisible/getColumn stabilization
- Without this, every render creates new `isVisible`/`getColumn` functions
- Any MobileItemCard comparing these by reference would always re-render
- Solution: wrap in `useCallback` with `columns` dependency (stable after column edit)

### 5. NewInvoice — useCallback for all handler props
- Handlers using only functional `set*` updaters → `useCallback(fn, [])` (infinitely stable)
- Handlers reading state directly (e.g., `groups.find`) → `useCallback(fn, [dependency])`
- `handleSave` has many deps but is NOT on the hot path (only called on button click)
- All inline JSX arrow functions replaced with pre-defined `useCallback` variables

---

## Remaining Work (Phase 2)

### Phase 2A — Props that still change on every render
- `computedItems` (new reference from NewInvoice each render) — FormLineItems memo always breaks
- `items`, `groups` arrays (new reference from setState) — passed to FormLineItems
- `documentTotals` (new reference each render)
- Potential fix: pass only what's needed, or batch state updates

### Phase 2B — computeDocument() optimization
- Runs on every NewInvoice render, iterates ALL items with Decimal math
- Only items whose fields actually changed need recomputation
- Requires `React.useMemo` with deep comparison of inputs, or smarter data flow

### Phase 2C — NumericInput debounce optimization
- Already has debounced `setTimeout(0)` for cursor, but no input debounce
- Consider adding debounce (e.g., 50ms) before calling `onChange` to batch renders during fast typing

---

## Verification

- `bun run typecheck`: ✅ Passes (exit 0)
- `bun run build`: ✅ Passes (exit 0)
- `bun run test`: 37/38 pass (1 pre-existing failure: waybillImportCustomColumn module resolution — unrelated)
