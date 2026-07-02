# Form Render Isolation — Verification Report

> Verified: 2026-06-27

## Goal

Ensure that typing in one invoice line item does not cause other line items to re-render. The render boundary chain should isolate re-renders to the affected group and its affected item.

## Verified Artifacts

| Check | Status |
|---|---|
| `tsc --noEmit` (typecheck) | ✅ clean |
| `bun run build` (production build) | ✅ passes |
| `bun run test` (38 critical tests) | ✅ 37 pass, 1 pre-existing fail (`externalWaybillPrompt` missing module — unrelated) |
| Temporary `console.count` counters | ✅ removed |

## Changes (Phase 2)

### Files Modified

| File | Change |
|---|---|
| `src/components/document/FormLineItems.tsx` | Pre-compute `computedAmount` in `groupEntries` useMemo; remove `getComputedAmount` from MobileGroupCard props; keep `getComputedAmount` useCallback for ungrouped items only |
| `src/components/invoice/MobileGroupCard.tsx` | Remove `getComputedAmount` prop; read `computedAmount` from items entry; comparator checks `entry.item` reference + `computedAmount` |
| `src/components/invoice/MobileItemCard.tsx` | Remove non-existent `discount` field from comparator; remove duplicate `install_rate` check |
| `src/components/document/useInvoiceColumns.tsx` | Wrap `isVisible` and `getColumn` in `useCallback` (stable refs for comparator) |
| `src/components/document/SharedDocumentForm.tsx` | No code changes (already memo'd from Phase 1) |

### Architectural Change

The **critical bug** was that `getComputedAmount` was a `useCallback` depending on `computedAmountMap`, which was derived from `computedItems`. Since `computeDocument()` always returns a new `computedItems` reference, `computedAmountMap` was always a new Map, causing `getComputedAmount` to change identity every render. This made React.memo on **every** MobileGroupCard worthless — all groups re-rendered on every keystroke.

**Fix:** Removed `getComputedAmount` from MobileGroupCard props entirely. Pre-compute `computedAmount` in `groupEntries` (which already recalculates every render because `items` changes identity). MobileGroupCard now receives `computedAmount` as a direct, stable value per item in the group.

### Data Flow After Fix

Typing in item at index 2 of group G:
1. `setInvoice` → new `items` array, new item object at index 2
2. `computeDocument` → new `computedItems` (always new — unavoidable)
3. `FormLineItems` → `groupEntries` recalculates:
   - For group NOT containing index 2: `entry.item` reference unchanged, `computedAmount` unchanged → **MobileGroupCard memo HOLDS** ✅
   - For group containing index 2: `entry.item` reference changed → **MobileGroupCard memo BREAKS** → re-render
4. Inside that group: `MobileItemCard` at index 2 receives new `item` → re-renders
5. Other `MobileItemCard`s in same group: comparator detects all fields unchanged → **memo HOLDS** ✅

### Memo Boundaries (4 levels)

```
NewInvoice (no memo — entry point, computeDocument)
  └─ SharedDocumentForm (React.memo)                ✓ Phase 1
      └─ FormLineItems (React.memo)                 ✓ Phase 1
          └─ MobileGroupCard (React.memo + custom)  ✓ Phase 2 (fix critical bug)
              └─ MobileItemCard (React.memo + deep) ✓ Phase 1 + 2 (cleanup)
```

### Key Comparator Details

**MobileItemCard comparator** — explicit field-by-field check:

- `prev.item.description`, `sub_description`, `qty`, `rate`, `unit`, `row_type`
- `prev.item.discount_rate`, `vat`, `install_rate`, `make`, `partNo`
- `prev.item.computedAmount` (added Phase 2)
- `prev.item.unit_price`, `subtotal`, `grand_total`
- `JSON.stringify(prev.item.custom_data)` (dynamic keys — use stringify)
- `prev.imageCount`, `prev.compact`, `prev.computedAmount`
- `prev.computedAmount !== next.computedAmount` (extra safety)

**MobileGroupCard comparator** — hybrid reference + field check:

- `entry.item !== nextEntry.item` (reference identity — critical for detecting when any item in the group changed)
- `entry.computedAmount !== nextEntry.computedAmount`
- `group`, `isExpanded`, `isMoveUpDisabled`, `isMoveDownDisabled`, `isVisible`, `getColumn`
- Group items length match + item reference check for all items

### Removed `console.count` Counters

| Component | Lines |
|---|---|
| `NewInvoice.tsx` | 1 |
| `SharedDocumentForm.tsx` | 1 |
| `FormLineItems.tsx` | 1 |
| `MobileGroupCard.tsx` | 1 |
| `MobileItemCard.tsx` | 1 |

### Constraints Preserved

- `src/lib/Calculations.ts` — untouched
- `computeDocument` — untouched
- No changes to suggestion ranking, item repository, Supabase queries, NumericInput formatting, debounce timings, or capability profiles
- Visual UI identical — zero functional behaviour changes
