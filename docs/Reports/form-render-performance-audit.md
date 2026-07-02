# Form Editing Render-Performance Audit

> **Status**: Complete (read-only)  
> **Date**: 2026-06-26  
> **Scope**: NumericInput, MobileItemCard, MobileGroupCard, FormLineItems, SharedDocumentForm, NewInvoice, suggestion system  
> **Constraint**: No files modified — diagnostic only  

---

## 1. One-Keystroke Trace (end-to-end)

```
User types "5" in NumericInput (quantity field, row index 2)
  │
  ├─ NumericInput.handleChange()                    [numeric-input.tsx:34]
  │   ├─ sanitizeNumberInput("5")                   [numberFormatting.ts:10]
  │   ├─ formatNumberInput("5")                     [numberFormatting.ts:35]
  │   ├─ setDisplayValue("5")                       ← local state update
  │   ├─ parseNumberInput("5") → 5
  │   ├─ onChange(5)                                ← callback to parent
  │   └─ setTimeout(0, cursorRestore)               ← macrotask after paint
  │
  ├─ NewInvoice.updateItem(2, "quantity", 5)        [NewInvoice.tsx:261]
  │   └─ setItems(current.map(...))                 ← full array clone
  │
  ├─ NewInvoice re-renders                          [NewInvoice.tsx:90]
  │   ├─ computeDocument({ items, columns, ... })    ← FULL calculation pipeline
  │   │   └─ iterates ALL items with Decimal math   [Calculations.ts:264-424]
  │   ├─ numberToWords(documentTotals.totalPayable)  ← recomputed
  │   └─ passes new { items, computedItems } down
  │
  ├─ SharedDocumentForm re-renders                  [SharedDocumentForm.tsx:23]
  │   ├─ taxableChargeRows — filters ALL extraCharges
  │   ├─ nonTaxChargeRows — filters ALL extraCharges
  │   ├─ summaryRows — builds array from 7 sources
  │   └─ passes new props to FormLineItems
  │
  ├─ FormLineItems re-renders                       [FormLineItems.tsx:37]
  │   ├─ lineItemsCount — filter ALL items          [useMemo, L62]
  │   ├─ computedAmountMap — forEach ALL items      [useMemo, L65-73]
  │   ├─ lineItemRows — for-loop ALL items          [useMemo, L86-129]
  │   ├─ groupEntries — map + filter ALL items×groups [useMemo, L133-147]
  │   ├─ groupedItemIndices — forEach ALL items     [useMemo, L149-157]
  │   └─ renders EVERY MobileGroupCard + ungrouped MobileItemCard
  │
  ├─ MobileItemCard (row 0) re-renders              ← unchanged
  ├─ MobileItemCard (row 1) re-renders              ← unchanged
  ├─ MobileItemCard (row 2) re-renders              ← the one that changed
  │   ├─ autoInstall — calls getColumn("install_rate") inline   [L177-182]
  │   ├─ useItemSuggestions("", ...) — fires effect, early-exit [L184-188]
  │   ├─ useEffect[debouncedDescription] — fires 180ms timer   [L121-127]
  │   └─ useEffect[resolvedItemId] — no-op (no item_id)        [L129-133]
  │
  └─ NumericInput (row 2) re-renders
      └─ useEffect[value] — syncs displayValue       [numeric-input.tsx:22-32]
          └─ formatNumberInput(5) → "5"
              └─ parseNumberInput("5") === parseNumberInput(displayValue)
                  └─ bail out (no setDisplayValue)
```

---

## 2. Render Tree (depth-first)

```
NewInvoice
 └─ SharedDocumentForm                        [not memoized, props: any]
     ├─ FormHeader
     ├─ FormLineItems                         [not memoized]
     │   ├─ MobileGroupCard (×N groups)       [not memoized]
     │   │   └─ MobileItemCard (×M per group) [not memoized]
     │   └─ MobileItemCard (×K ungrouped)     [not memoized]
     │       └─ NumericInput (×visible fields)[not memoized]
     ├─ FormCommercialTerms
     ├─ FormTotals
     ├─ FormNotesTerms
     └─ FormFooter
```

**Every level is un-memoized.** A change in any single `items[n]` propagates to ALL cards.

---

## 3. Dependency Graph — Re-render Sources

### 3.1 Computed-on-every-render (high cost)

| Expression | File:Line | Cost |
|---|---|---|
| `computeDocument(...)` full pipeline | NewInvoice.tsx:467-480 | O(items) with Decimal arithmetic |
| `numberToWords(...)` | NewInvoice.tsx:740 | String generation |
| `summaryRows` array build | SharedDocumentForm.tsx:148-161 | O(extraCharges) |
| `taxableChargeRows` + `nonTaxChargeRows` | SharedDocumentForm.tsx:129-146 | O(extraCharges) × 2 |

### 3.2 useMemo — recomputed every render (new items reference)

| Expression | File:Line | Deps | Cost |
|---|---|---|---|
| `lineItemsCount` | FormLineItems.tsx:62 | `[items]` | O(items) filter |
| `computedAmountMap` | FormLineItems.tsx:65-73 | `[computedItems, items]` | O(items) forEach |
| `lineItemRows` | FormLineItems.tsx:86-129 | `[groupMap, items]` | O(items) for-loop + nested while |
| `groupIdSet` | FormLineItems.tsx:131 | `[groups]` | O(groups) |
| `groupEntries` | FormLineItems.tsx:133-147 | `[groups, items]` | O(groups × items) map + filter |
| `groupedItemIndices` | FormLineItems.tsx:149-157 | `[items, groupIdSet]` | O(items) forEach |
| `computedGroupMap` | FormLineItems.tsx:75-78 | `[computedGroups]` | O(groups) |

**Total per-render cost in FormLineItems alone: ~6× iteration over `items` + 2× over `groups`.**

### 3.3 useEffect — async side effects per card

| Effect | File:Line | Fires when | Notes |
|---|---|---|---|
| 180ms debounce → `debouncedDescription` | MobileItemCard.tsx:121-127 | `item.description` changes | Starts 180ms timer on every keystroke |
| Clear suggestion context | MobileItemCard.tsx:129-133 | `resolvedItemId` clears | Low cost |
| Exact match: `resolveExactItemMatch` | MobileItemCard.tsx:135-158 | `debouncedDescription` (≥2 chars, stable) | Async Supabase query, cancelled on unmount |
| Price context: `loadItemPriceContext` | MobileItemCard.tsx:160-175 | `resolvedItemId` changes | Async Supabase query |
| `useItemSuggestions`: `loadSuggestions` | useItemSuggestions.ts:10-41 | `searchText` changes | Async, dedup via `cancelled` flag |

### 3.4 Inline functions/objects — new reference every render

| Expression | File:Line | Effect |
|---|---|---|
| `getItemNumber` closure | FormLineItems.tsx:80-81 | New function every render |
| `getComputedAmount` closure | FormLineItems.tsx:83-84 | New function every render, passed to MobileGroupCard |
| `onMoveUp={(idx) => onMoveItem(idx, -1)}` | FormLineItems.tsx:225 | Inline arrow in JSX |
| `onMoveDown={(idx) => onMoveItem(idx, 1)}` | FormLineItems.tsx:226 | Inline arrow in JSX |
| `getComputedAmount(item)` call | MobileGroupCard.tsx:105 | Inline invocation → new return value reference |
| `autoInstall` | MobileItemCard.tsx:177-182 | Calls `getColumn()` during render |

---

## 4. Ranking by Render Cost Impact

| Rank | Source | Cost Type | Severity |
|---|---|---|---|
| **1** | **`computeDocument()` on every render** (NewInvoice.tsx:467) | CPU — Decimal math for ALL items | **HIGH** |
| **2** | **No React.memo on MobileItemCard** (479 lines, 6 inputs) | Re-render cascade — ALL cards | **HIGH** |
| **3** | **FormLineItems recomputes 6× per render** (L62-157) | CPU — O(items) × 6 + O(items×groups) | **HIGH** |
| **4** | **No React.memo on FormLineItems** (256 lines, 20+ props) | Re-render cascade to entire item list | **HIGH** |
| **5** | **new items array on every updateItem** (NewInvoice.tsx:261) | Reference break — all useMemos invalidate | **HIGH** |
| **6** | **Inline `getComputedAmount` closure** (FormLineItems.tsx:83) | New ref every render → breaks memo | **MEDIUM** |
| **7** | **MobileItemCard `autoInstall` calls `getColumn` in render** (L177) | Unnecessary work on every card | **MEDIUM** |
| **8** | **No React.memo on MobileGroupCard** (157 lines, 14+ props) | Re-render cascade to all grouped cards | **MEDIUM** |
| **9** | **Async suggestion hooks fire on every `debouncedDescription` change** | Network overhead per keystroke | **MEDIUM** |
| **10** | **`setTimeout(0)` cursor restore in NumericInput** (L57-81) | Forces extra repaint cycle | **LOW** |

---

## 5. Largest Single Bottleneck

### `computeDocument()` called unconditionally on every render — NewInvoice.tsx:467-480

```typescript
const documentTotals = computeDocument({     // ← runs every render
  items,                                      // ← new array every updateItem
  columns,
  document: { ...invoice, ... },
  cf: { extraCharges, calculationInputs },
})
```

This invokes the full `calcTotals()` pipeline (`Calculations.ts`):
- Phase 1: `pass1` — iterates all items, computes per-row values with Decimal math
- Phase 2: per-row discount allocation (percent + fixed proportion)
- Phase 3: per-row VAT computation
- Phase 4: group accumulation
- Phase 5: extra charges, WHT, grand total

**Why it's the bottleneck**: It's the root computation that produces `computedItems` and `computedGroups`, which cascade into ALL `useMemo`s in `FormLineItems`. Every single keystroke in any item triggers this full pipeline for ALL items, even though only one field changed.

---

## 6. Render Cascade on One Keystroke

```
User types in row 2's Qty field
  │
  ├─ NumericInput.onChange(5)
  ├─ NewInvoice.updateItem(2, "quantity", 5)
  ├─ setItems(map(...))  ── new items[] reference
  ├─ computeDocument()   ── new computedItems[] reference
  │
  ├─ SharedDocumentForm re-render
  ├─ FormLineItems re-render       ← all 7 useMemos recompute
  ├─ MobileGroupCard A re-render   ← items prop changed
  │   └─ MobileItemCard 0          ← receives new onUpdate, getComputedAmount refs
  ├─ MobileGroupCard B re-render   ← items prop changed
  │   └─ MobileItemCard 1          ← same (unnecessary, no data change)
  ├─ MobileItemCard 2 re-render    ← this is the one that actually changed
  └─ MobileItemCard 3 re-render    ← same (unnecessary, no data change)
```

**For N rows, 1 keystroke causes N card re-renders + N² useMemo passes.**

---

## 7. Complexity Estimates

| Operation | Complexity Per Render | Notes |
|---|---|---|
| `computeDocument()` | O(N) × Decimal | N = items; each row has ~50 Decimal ops |
| `computedAmountMap` | O(N) | forEach all items |
| `lineItemRows` | O(N) | for-loop with nested while |
| `groupEntries` | O(G × N) | G = groups, N = items |
| `computedAmountMap` lookup per card | O(1) | Map.get but called N times |
| `getItemNumber` calls | O(N²) worst | slice(0, index+1).filter(...) — called inside loops |
| MobileItemCard re-renders | O(N) | All cards re-render |

---

## 8. Async Execution Paths (Suggestion System)

### Exact match resolution — MobileItemCard.tsx:135-158
```
debouncedDescription changes (after 180ms)
  → cancelled flag created
  → resolveExactItemMatch(trimmedDescription, clientId)
    → loadSuggestions(description, 10, clientId)
      → getItemSuggestions(normalized, 10, clientId)   [Supabase query]
      → rankItemSuggestions(results)
    → findExactItemSuggestionMatch(description, suggestions)
  → if matched: updateField("item_id", match.item_id)
  → on unmount/change: cancelled = true
```

### Price context load — MobileItemCard.tsx:160-175
```
resolvedItemId changes (e.g. from exact match)
  → loadItemPriceContext(itemId, clientId)
    → getItemPriceContext(itemId, clientId)   [Supabase query]
  → setSelectedSuggestionContextText(...)
```

### Item suggestions — useItemSuggestions.ts:5-43
```
searchText changes (debouncedDescription while focused)
  → loadSuggestions(searchText, limit, clientId)   [Supabase query]
  → setData(results)
  → on unmount/change: cancelled = true
```

**Identical-request dedup**: None at the hook level. Each effect uses a `cancelled` flag but overlapping queries to `loadSuggestions` with the same `searchText` are not deduplicated between `useItemSuggestions` and `resolveExactItemMatch`.

---

## 9. Summary

| Property | Value |
|---|---|
| Un-memoized components in render path | **4 of 4** (FormLineItems, MobileGroupCard, MobileItemCard, SharedDocumentForm) |
| Per-keystroke full calculations | **Yes** — `computeDocument()` on every render |
| Re-render ratio (keystroke/cards) | 1:N — all cards re-render for any change |
| useMemo recompute per render | ~6× full-item iterations in FormLineItems alone |
| Inline function/object breakages | 6+ per render cycle |
| Async side effects per card | Up to 3 concurrent effects (debounce + exact match + suggestions) |
| **Largest bottleneck** | `computeDocument()` at NewInvoice.tsx:467 — runs full Decimal pipeline on every render, triggered by the `items[]` reference change from `updateItem` |
