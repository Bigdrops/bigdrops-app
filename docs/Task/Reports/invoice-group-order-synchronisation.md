# Invoice Group Order Synchronisation

## Problem

`moveItem` in both `NewInvoice.tsx` and `EditInvoice.tsx` reorders `items[]` when a
`group_header` row is moved, but never updates `groups[]`.  The `FormLineItems`
component derives its display layout from `groups` directly (via `groupEntries`,
`FormLineItems.tsx:171–186`), so the UI continues to render groups in their
original order after a group has been dragged to a new position.

## Root cause

`moveItem` mutates `items[]` via `setItems()` while `groups[]` — the separate
metadata array tracking group names and `showSubtotal` flags — stays in its
initial insertion order.  `groupEntries` iterates `groups`, not `items`, so
it never sees the re-ordering.

## Solution

One shared synchronisation mechanism in the invoice domain layer.

### `syncGroupsFromItems()` — `src/domain/invoice/normalize.ts:19–52`

A pure function that derives group order from `item.group_header` rows in the
items array and returns a re-ordered `groups` array.  Returns the original
reference when order hasn't changed so callers can bail out of unnecessary
state updates.

### `useEffect` — `EditInvoice.tsx:119`, `NewInvoice.tsx:187`

```tsx
useEffect(() => {
  setGroups((current) => syncGroupsFromItems(items, current))
}, [items, setGroups])
```

Placed right after the existing `itemsRef` sync effect.  Runs after every
`items` change, but React bails out when `syncGroupsFromItems` returns the
same array reference (i.e. when group order hasn't changed).

## Files changed

| File | Change |
|---|---|
| `src/domain/invoice/normalize.ts` | Added `syncGroupsFromItems()` and `InvoiceGroup` type import |
| `src/pages/EditInvoice.tsx:16,119` | Import + `useEffect` sync |
| `src/pages/NewInvoice.tsx:15,187` | Import + `useEffect` sync |

## Edge cases covered

- **Group move via `moveItem`** — detected by the `useEffect`, groups re-ordered
- **Standard item edit** — items reference changes but group_header order stays
  the same, `syncGroupsFromItems` returns `currentGroups` (no-op)
- **Group deleted via `deleteGroup`** — both `groups` and `items` are consistent,
  no unnecessary update
- **Group header removed via `removeItem`** — `syncGroupsFromItems` drops the
  orphaned group from `groups` as a side benefit
- **No groups / no items** — empty arrays handled correctly
